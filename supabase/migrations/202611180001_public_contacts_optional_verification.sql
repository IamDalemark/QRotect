-- Contacts are public after publishing; source/date metadata is optional.
-- Keep the legacy active field readable and normalize it on all imports/restores.
begin;

create or replace function public._replace_directory_content(document jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare c jsonb; n jsonb; g jsonb; m jsonb; q jsonb; ci integer := 0; ni integer; gi integer := 0; qi integer := 0;
begin
  if not coalesce(public.valid_directory(document),false) or (document->>'fixture')::boolean then
    raise exception 'Invalid directory document' using errcode='22023';
  end if;
  -- Do not silently change a submitted shortcut's owner when reconstructing it.
  if exists (
    select 1 from jsonb_array_elements(coalesce(document->'quickCalls','[]'::jsonb)) a
    where not exists (
      select 1 from jsonb_array_elements(document->'contacts') b,
        lateral jsonb_array_elements(b->'numbers') num
      where b->>'id'=a->>'contactId' and num->>'id'=a->>'numberId'
    )
  ) then raise exception 'Reassign or clear quick calls before removing their contact or line' using errcode='23503'; end if;

  delete from public.quick_call_assignments;
  delete from public.contact_numbers;
  delete from public.contacts;
  delete from public.guidance;
  delete from public.campus_maps;
  for c in select value from jsonb_array_elements(document->'contacts') loop
    insert into public.contacts(id,category_id,service_area_id,position,agency,branch,description_en,description_hil,aliases,hours,source_url,verified_at,approved,active,legacy_priority)
    values((c->>'id')::uuid,c->>'category',c->>'area',ci,c->>'agency',c->>'branch',c->'description'->>'en',c->'description'->>'hil',
      array(select jsonb_array_elements_text(c->'aliases')),c->>'hours',c->>'source',nullif(c->>'verifiedAt','')::date,
      (c->>'approved')::boolean,true,(c->>'priority')::boolean);
    ni := 0;
    for n in select value from jsonb_array_elements(c->'numbers') loop
      insert into public.contact_numbers(id,contact_id,position,label_en,label_hil,display_number,dial_number,extension,channel)
      values((n->>'id')::uuid,(c->>'id')::uuid,ni,n->'label'->>'en',n->'label'->>'hil',n->>'display',n->>'dial',n->>'extension',n->>'channel');
      ni := ni+1;
    end loop;
    ci := ci+1;
  end loop;
  for q in select value from jsonb_array_elements(coalesce(document->'quickCalls','[]'::jsonb)) loop
    insert into public.quick_call_assignments(category_id,number_id,position)
    values(q->>'category',(q->>'numberId')::uuid,qi);
    qi := qi+1;
  end loop;
  for g in select value from jsonb_array_elements(document->'guidance') loop
    insert into public.guidance(id,category_id,position,title_en,title_hil,steps,source_url,reviewed_at,reviewer_name,approved)
    values((g->>'id')::uuid,g->>'category',gi,g->'title'->>'en',g->'title'->>'hil',g->'steps',g->>'source',(g->>'reviewedAt')::date,g->>'reviewer',(g->>'approved')::boolean);
    gi := gi+1;
  end loop;
  m := document->'map';
  if m <> 'null'::jsonb then
    insert into public.campus_maps(id,asset_path,description_en,description_hil,instructions,source_url,reviewed_at,reviewer_name,approved)
    values((m->>'id')::uuid,m->>'assetPath',m->'description'->>'en',m->'description'->>'hil',m->'instructions',m->>'source',(m->>'reviewedAt')::date,m->>'reviewer',(m->>'approved')::boolean);
  end if;
  update public.directory_drafts set document_version=document->>'version',
    document_published_at=document->>'publishedAt', legacy_test_contact=document->'testContact',
    quick_calls_defined=document ? 'quickCalls' where id;
end $$;

create or replace function public.publish_directory(expected_revision bigint) returns uuid language plpgsql security definer set search_path = '' set timezone = 'Asia/Manila' as $$
declare draft public.directory_drafts; next_id uuid := gen_random_uuid(); document jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select * into draft from public.directory_drafts where id for update;
 if expected_revision is null or draft.revision <> expected_revision then raise exception 'Conflict: draft changed. Reload before publishing.' using errcode='40001'; end if;
 document := public._directory_document();
 if not coalesce(public.valid_directory(document),false) then raise exception 'Invalid working directory'; end if;
 if (document->>'fixture')::boolean then raise exception 'Sample content cannot be published'; end if;
 if exists(select 1 from jsonb_array_elements(document->'contacts') c where (not (c->>'approved')::boolean or c->>'verifiedAt'>current_date::text or c->'description'->>'hil'='' or exists(select 1 from jsonb_array_elements(c->'numbers') n where n->'label'->>'hil'=''))) then raise exception 'Contacts require approval and both languages'; end if;
 if (select count(*) from jsonb_array_elements(document->'contacts')) <> (select count(distinct c->>'id') from jsonb_array_elements(document->'contacts') c) then raise exception 'Duplicate contact identifiers'; end if;
 if exists(select 1 from jsonb_array_elements(document->'guidance') g where not (g->>'approved')::boolean or g->'title'->>'hil'='' or exists(select 1 from jsonb_array_elements(g->'steps') s where s->>'hil'='')) then raise exception 'Guidance requires reviewed translations'; end if;
 if document->'map' <> 'null'::jsonb and (not (document->'map'->>'approved')::boolean or document->'map'->'description'->>'hil'='' or exists(select 1 from jsonb_array_elements(document->'map'->'instructions') s where s->>'hil'='')) then raise exception 'Map requires reviewed translations'; end if;
 if exists(
   select 1 from jsonb_array_elements(coalesce(document->'quickCalls','[]'::jsonb)) q
   where (select count(*) from jsonb_array_elements(document->'contacts') c where c->>'id'=q->>'contactId') <> 1
      or not exists(
        select 1 from jsonb_array_elements(document->'contacts') c,
          lateral jsonb_array_elements(c->'numbers') n
        where c->>'id'=q->>'contactId' and c->>'category'=q->>'category'
          and n->>'id'=q->>'numberId'
          and n->>'channel'='voice' and n->>'dial' !~ '^\+?0+$'
          and (select count(*) from jsonb_array_elements(c->'numbers') line where line->>'id'=q->>'numberId')=1
      )
 ) or (select count(*) from jsonb_array_elements(coalesce(document->'quickCalls','[]'::jsonb))) <>
      (select count(distinct q->>'category') from jsonb_array_elements(coalesce(document->'quickCalls','[]'::jsonb)) q)
 then raise exception 'Quick calls require one explicit category contact and callable voice line'; end if;
 document := jsonb_set(jsonb_set(document,'{version}',to_jsonb(next_id::text)),'{publishedAt}',to_jsonb(now()));
 update public.publications set current=false where current;
 insert into public.publications(id,snapshot,current,source_revision,published_by) values(next_id,document,true,draft.revision,auth.uid());
 insert into public.audit_events(actor_id,action,draft_revision,publication_id) values(auth.uid(),'publish',draft.revision,next_id);
 return next_id;
end $$;

create or replace function public.publish_directory_item(item_kind text, item_key text, item jsonb, expected_revision bigint) returns bigint
language plpgsql security definer set search_path = '' set timezone = 'Asia/Manila' as $$
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
  if item_kind='contact' and target is not null then target:=jsonb_set(target,'{active}','true'::jsonb); end if;
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
    if item_kind='contact' and (not (target->>'approved')::boolean or target->>'verifiedAt'>current_date::text or target->'description'->>'hil'='' or exists(select 1 from jsonb_array_elements(target->'numbers') n where n->'label'->>'hil'='')) then raise exception 'Complete contact approval and both languages' using errcode='22023'; end if;
    if item_kind='guidance' and (not (target->>'approved')::boolean or target->'title'->>'hil'='' or target->>'reviewedAt'>current_date::text or exists(select 1 from jsonb_array_elements(target->'steps') s where s->>'hil'='')) then raise exception 'Complete guidance review and both languages' using errcode='22023'; end if;
    if item_kind='map' and (not (target->>'approved')::boolean or target->'description'->>'hil'='' or target->>'reviewedAt'>current_date::text or exists(select 1 from jsonb_array_elements(target->'instructions') s where s->>'hil'='')) then raise exception 'Complete map review and both languages' using errcode='22023'; end if;
  end if;
  working:=public._patch_directory_item(working,item_kind,item_key,target);
  published:=public._patch_directory_item(published,item_kind,item_key,target);
  if not coalesce(public.valid_directory(published),false) then raise exception 'Invalid published item' using errcode='22023'; end if;
  -- Both working and public shortcuts must still name the exact voice line.
  foreach checked in array array[working,published] loop
    if (select count(*) from jsonb_array_elements(checked->'contacts')) <> (select count(distinct c->>'id') from jsonb_array_elements(checked->'contacts') c) or
       (select count(*) from jsonb_array_elements(checked->'contacts') c, lateral jsonb_array_elements(c->'numbers') n) <> (select count(distinct n->>'id') from jsonb_array_elements(checked->'contacts') c, lateral jsonb_array_elements(c->'numbers') n) then raise exception 'Phone line identifiers must be unique' using errcode='23505'; end if;
    if exists(select 1 from jsonb_array_elements(coalesce(checked->'quickCalls','[]'::jsonb)) q where not exists(
      select 1 from jsonb_array_elements(checked->'contacts') c, lateral jsonb_array_elements(c->'numbers') n
      where c->>'id'=q->>'contactId' and c->>'category'=q->>'category'
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

-- Expose previously hidden records in a new publication. Preserve immutable history
-- and current published values for all other records, including private edits.
-- Approval is still required; an unreviewed hidden record must be reviewed before rollout.
do $$
declare hidden jsonb; contact jsonb; published jsonb; next_id uuid:=gen_random_uuid(); current_revision bigint;
begin
  select revision into current_revision from public.directory_drafts where id for update;
  lock table public.contacts, public.publications in share row exclusive mode;
  select coalesce(jsonb_agg(c order by ordinality),'[]'::jsonb) into hidden
    from jsonb_array_elements(public._directory_document()->'contacts') with ordinality as records(c,ordinality)
    where not (c->>'active')::boolean;
  if jsonb_array_length(hidden)>0 then
    if exists(select 1 from jsonb_array_elements(hidden) c where not (c->>'approved')::boolean
      or c->'description'->>'hil'='' or c->>'verifiedAt'>(now() at time zone 'Asia/Manila')::date::text
      or exists(select 1 from jsonb_array_elements(c->'numbers') n where n->'label'->>'hil'='')) then
      raise exception 'Review existing hidden contacts before applying the public-contact update' using errcode='22023';
    end if;
    select snapshot into published from public.publications where current;
    if published is null then
      published:=jsonb_build_object('schemaVersion',1,'version','unpublished','publishedAt',null,'mode','research','fixture',false,'contacts','[]'::jsonb,'guidance','[]'::jsonb,'quickCalls','[]'::jsonb,'map',null,'testContact',null);
    end if;
    for contact in select value from jsonb_array_elements(hidden) loop
      contact:=jsonb_set(contact,'{active}','true'::jsonb);
      published:=public._patch_directory_item(published,'contact',contact->>'id',contact);
    end loop;
    if not coalesce(public.valid_directory(published),false) then raise exception 'Invalid public-contact migration'; end if;
    if exists(select 1 from jsonb_array_elements(published->'contacts') c, lateral jsonb_array_elements(c->'numbers') n
      group by n->>'id' having count(*)>1) then raise exception 'Duplicate phone line in public-contact migration'; end if;
    if exists(select 1 from jsonb_array_elements(coalesce(published->'quickCalls','[]'::jsonb)) q where not exists(
      select 1 from jsonb_array_elements(published->'contacts') c, lateral jsonb_array_elements(c->'numbers') n
      where c->>'id'=q->>'contactId' and c->>'category'=q->>'category' and n->>'id'=q->>'numberId'
        and n->>'channel'='voice' and n->>'dial' !~ '^\+?0+$')) then raise exception 'Reassign affected Home quick calls before rollout'; end if;
    update public.contacts set active=true where not active;
    update public.directory_drafts set revision=revision+1,updated_at=now() where id returning revision into current_revision;
    published:=jsonb_set(jsonb_set(published,'{version}',to_jsonb(next_id::text)),'{publishedAt}',to_jsonb(now()));
    update public.publications set current=false where current;
    insert into public.publications(id,snapshot,current,source_revision) values(next_id,published,true,current_revision);
    insert into public.audit_events(action,draft_revision,publication_id) values('make contacts public',current_revision,next_id);
  end if;
end $$;
alter table public.contacts add constraint contacts_always_public check(active);
notify pgrst, 'reload schema';
commit;
