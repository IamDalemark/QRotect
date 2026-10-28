-- Scope replacement writes for Supabase API sessions with safeupdate enabled.
-- No setting or safety protection is disabled.
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

  delete from public.quick_call_assignments where draft_id;
  delete from public.contact_numbers where contact_id in (select id from public.contacts where draft_id);
  delete from public.contacts where draft_id;
  delete from public.guidance where draft_id;
  delete from public.campus_maps where draft_id;
  for c in select value from jsonb_array_elements(document->'contacts') loop
    insert into public.contacts(id,category_id,service_area_id,position,agency,branch,description_en,description_hil,aliases,hours,source_url,verified_at,approved,active,legacy_priority)
    values((c->>'id')::uuid,c->>'category',c->>'area',ci,c->>'agency',c->>'branch',c->'description'->>'en',c->'description'->>'hil',
      array(select jsonb_array_elements_text(c->'aliases')),c->>'hours',c->>'source',nullif(c->>'verifiedAt','')::date,
      (c->>'approved')::boolean,(c->>'active')::boolean,(c->>'priority')::boolean);
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
revoke all on function public._replace_directory_content(jsonb) from public,anon,authenticated;

notify pgrst, 'reload schema';
commit;
