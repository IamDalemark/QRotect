-- Additive item publishing. Existing save/publish/restore APIs remain compatible.
begin;

create or replace function public._patch_directory_item(document jsonb, item_kind text, item_key text, item jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare field_name text; result jsonb; found boolean;
begin
  if item_kind = 'map' then return jsonb_set(document,'{map}',coalesce(item,'null'::jsonb)); end if;
  field_name := case item_kind when 'contact' then 'contacts' when 'guidance' then 'guidance' when 'quick-call' then 'quickCalls' end;
  if field_name is null then raise exception 'Unknown item type' using errcode='22023'; end if;
  select coalesce(jsonb_agg(case when value->>(case when item_kind='quick-call' then 'category' else 'id' end)=item_key then item else value end order by ordinality)
    filter(where value->>(case when item_kind='quick-call' then 'category' else 'id' end)<>item_key or (item is not null and item<>'null'::jsonb)),'[]'::jsonb),
    coalesce(bool_or(value->>(case when item_kind='quick-call' then 'category' else 'id' end)=item_key),false)
  into result,found from jsonb_array_elements(coalesce(document->field_name,'[]'::jsonb)) with ordinality;
  if not found and item is not null and item<>'null'::jsonb then result:=result||jsonb_build_array(item); end if;
  return jsonb_set(document,array[field_name],result);
end $$;
revoke all on function public._patch_directory_item(jsonb,text,text,jsonb) from public,anon,authenticated;

create or replace function public.publish_directory_item(item_kind text, item_key text, item jsonb, expected_revision bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare working jsonb; published jsonb; checked jsonb; current_revision bigint; next_id uuid:=gen_random_uuid(); target jsonb:=nullif(item,'null'::jsonb);
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  select revision into strict current_revision from public.directory_drafts where id for update;
  if expected_revision is null or expected_revision<>current_revision then raise exception 'Changes were published by another administrator. Reload before publishing.' using errcode='40001'; end if;
  if item_kind not in ('contact','guidance','map','quick-call') or item_kind is null or item_key is null then raise exception 'Unknown item type' using errcode='22023'; end if;
  if item_kind in ('contact','guidance') and item_key !~ '^[0-9a-f-]{36}$' then raise exception 'Invalid item identifier' using errcode='22023'; end if;
  if item_kind='map' and item_key<>'campus-map' then raise exception 'Invalid map identifier' using errcode='22023'; end if;
  if item_kind='quick-call' and item_key not in ('police','fire','medical','hospital','disaster','school') then raise exception 'Invalid category' using errcode='22023'; end if;
  if target is not null and item_kind in ('contact','guidance') and target->>'id' is distinct from item_key then raise exception 'Item identifier does not match' using errcode='22023'; end if;
  if target is not null and item_kind='quick-call' and target->>'category' is distinct from item_key then raise exception 'Category does not match' using errcode='22023'; end if;
  working:=public._directory_document();
  select snapshot into published from public.publications where current;
  if published is null then
    published:=jsonb_build_object('schemaVersion',1,'version','unpublished','publishedAt',null,'mode','research','fixture',false,'contacts','[]'::jsonb,'guidance','[]'::jsonb,'quickCalls','[]'::jsonb,'map',null,'testContact',null);
  end if;
  -- Validate only the selected item against full shape and review requirements.
  -- Unchanged legacy/demo publications are preserved, not silently re-approved.
  checked:=jsonb_build_object('schemaVersion',1,'version','validation','publishedAt',null,'mode','research','fixture',false,'contacts','[]'::jsonb,'guidance','[]'::jsonb,'map',null,'testContact',null);
  if item_kind<>'quick-call' then checked:=public._patch_directory_item(checked,item_kind,item_key,target); end if;
  if not coalesce(public.valid_directory(checked),false) then raise exception 'Complete the selected item fields' using errcode='22023'; end if;
  if target is not null then
    if item_kind='contact' and (target->>'active')::boolean and (not (target->>'approved')::boolean or target->>'source'='' or target->>'verifiedAt'='' or target->>'verifiedAt'>current_date::text or target->'description'->>'hil'='' or exists(select 1 from jsonb_array_elements(target->'numbers') n where n->'label'->>'hil'='')) then raise exception 'Complete contact verification and both languages' using errcode='22023'; end if;
    if item_kind='guidance' and (not (target->>'approved')::boolean or target->'title'->>'hil'='' or target->>'reviewedAt'>current_date::text or exists(select 1 from jsonb_array_elements(target->'steps') s where s->>'hil'='')) then raise exception 'Complete guidance review and both languages' using errcode='22023'; end if;
    if item_kind='map' and (not (target->>'approved')::boolean or target->'description'->>'hil'='' or target->>'reviewedAt'>current_date::text or exists(select 1 from jsonb_array_elements(target->'instructions') s where s->>'hil'='')) then raise exception 'Complete map review and both languages' using errcode='22023'; end if;
  end if;
  working:=public._patch_directory_item(working,item_kind,item_key,target);
  published:=public._patch_directory_item(published,item_kind,item_key,case when item_kind='contact' and target is not null and not (target->>'active')::boolean then null else target end);
  if not coalesce(public.valid_directory(published),false) then raise exception 'Invalid published item' using errcode='22023'; end if;
  -- Both working and public shortcuts must still name the exact active voice line.
  foreach checked in array array[working,published] loop
    if (select count(*) from jsonb_array_elements(checked->'contacts')) <> (select count(distinct c->>'id') from jsonb_array_elements(checked->'contacts') c) or
       (select count(*) from jsonb_array_elements(checked->'contacts') c, lateral jsonb_array_elements(c->'numbers') n) <> (select count(distinct n->>'id') from jsonb_array_elements(checked->'contacts') c, lateral jsonb_array_elements(c->'numbers') n) then raise exception 'Phone line identifiers must be unique' using errcode='23505'; end if;
    if exists(select 1 from jsonb_array_elements(coalesce(checked->'quickCalls','[]'::jsonb)) q where not exists(
      select 1 from jsonb_array_elements(checked->'contacts') c, lateral jsonb_array_elements(c->'numbers') n
      where c->>'id'=q->>'contactId' and c->>'category'=q->>'category' and (c->>'active')::boolean
      and n->>'id'=q->>'numberId' and n->>'channel'='voice' and n->>'dial' !~ '^\+?0+$'
    )) then raise exception 'Clear or reassign the Home quick call before changing its contact or phone line. Assignments must use a published contact.' using errcode='23503'; end if;
  end loop;
  perform public._replace_directory_content(working);
  update public.directory_drafts set revision=revision+1,updated_at=now() where id returning revision into current_revision;
  published:=jsonb_set(jsonb_set(published,'{version}',to_jsonb(next_id::text)),'{publishedAt}',to_jsonb(now()));
  update public.publications set current=false where current;
  insert into public.publications(id,snapshot,current,source_revision,published_by) values(next_id,published,true,current_revision,auth.uid());
  insert into public.audit_events(actor_id,action,draft_revision,publication_id) values(auth.uid(),'publish '||item_kind||' '||item_key,current_revision,next_id);
  return current_revision;
end $$;
revoke all on function public.publish_directory_item(text,text,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.publish_directory_item(text,text,jsonb,bigint) to authenticated;
notify pgrst, 'reload schema';
commit;
