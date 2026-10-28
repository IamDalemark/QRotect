-- Relational private editing, with the existing v1 public snapshot contract.
-- Apply with its matching application release. Historical snapshots are not rewritten.
begin;

lock table public.directory_drafts in access exclusive mode;
lock table public.publications in share row exclusive mode;

create table public.categories (
  id text primary key check (id in ('police','fire','medical','hospital','disaster','school')),
  name_en text not null,
  name_hil text not null,
  sort_order integer not null unique
);
insert into public.categories values
  ('police','Police','Pulis',0), ('fire','Fire','Sunog',1),
  ('medical','Medical / Ambulance','Medikal / Ambulansya',2),
  ('hospital','Hospitals','Mga ospital',3),
  ('disaster','Disaster response','Bulig sa kalamidad',4),
  ('school','School emergency','Emerhensya sa eskwelahan',5);
create table public.service_areas (
  id text primary key check (id in ('cpu','iloilo','national')),
  name_en text not null,
  name_hil text not null
);
insert into public.service_areas values
  ('cpu','Campus','Kampus'), ('iloilo','Iloilo City','Iloilo City'),
  ('national','Nationwide','Bug-os nga pungsod');

-- Scalar compatibility metadata only; no competing full-directory JSON payload.
alter table public.directory_drafts
  add column document_version text not null default 'unpublished',
  add column document_published_at text,
  add column legacy_test_contact jsonb,
  add column quick_calls_defined boolean not null default false;

create table public.contacts (
  id uuid primary key,
  draft_id boolean not null default true references public.directory_drafts(id),
  category_id text not null references public.categories(id),
  service_area_id text not null references public.service_areas(id),
  position integer not null check (position >= 0),
  agency text not null check (length(agency) between 1 and 160),
  branch text not null default '' check (length(branch) <= 160),
  description_en text not null check (length(description_en) between 1 and 2000),
  description_hil text not null default '' check (length(description_hil) <= 2000),
  aliases text[] not null default '{}',
  hours text not null default '' check (length(hours) <= 100),
  source_url text not null default '' check (source_url = '' or source_url ~ '^https?://'),
  verified_at date,
  approved boolean not null default false,
  active boolean not null default true,
  legacy_priority boolean not null default false,
  unique (draft_id, position)
);
create index contacts_category on public.contacts(category_id);
create index contacts_service_area on public.contacts(service_area_id);
create table public.contact_numbers (
  id uuid primary key,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  position integer not null check (position >= 0),
  label_en text not null check (length(label_en) between 1 and 2000),
  label_hil text not null default '' check (length(label_hil) <= 2000),
  display_number text not null check (length(display_number) between 1 and 50),
  dial_number text not null check (dial_number ~ '^\+?[0-9]{3,15}$'),
  extension text not null default '' check (extension ~ '^[0-9]{0,8}$'),
  channel text not null check (channel in ('voice','text')),
  unique (contact_id, position)
);
create table public.quick_call_assignments (
  category_id text primary key references public.categories(id),
  number_id uuid not null unique references public.contact_numbers(id),
  draft_id boolean not null default true references public.directory_drafts(id),
  position integer not null unique check (position between 0 and 5)
);
create table public.guidance (
  id uuid primary key,
  draft_id boolean not null default true references public.directory_drafts(id),
  category_id text not null references public.categories(id),
  position integer not null check (position >= 0),
  title_en text not null,
  title_hil text not null,
  steps jsonb not null check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) between 1 and 12),
  source_url text not null check (source_url ~ '^https?://'),
  reviewed_at date not null,
  reviewer_name text not null,
  approved boolean not null default false,
  unique (draft_id, position)
);
create index guidance_category on public.guidance(category_id);
create table public.campus_maps (
  id uuid primary key,
  draft_id boolean not null default true unique references public.directory_drafts(id),
  asset_path text not null check (asset_path ~ '^[0-9a-f-]{36}\.(png|jpg|webp)$'),
  description_en text not null,
  description_hil text not null,
  instructions jsonb not null check (jsonb_typeof(instructions) = 'array' and jsonb_array_length(instructions) between 1 and 20),
  source_url text not null check (source_url ~ '^https?://'),
  reviewed_at date not null,
  reviewer_name text not null,
  approved boolean not null default false
);

alter table public.publications
  add column source_revision bigint,
  add column published_by uuid references auth.users(id) on delete set null;
alter table public.audit_events rename column actor to actor_id;
alter table public.audit_events rename column revision to draft_revision;
alter table public.audit_events drop constraint audit_events_actor_fkey;
alter table public.audit_events
  add constraint audit_events_actor_id_fkey foreign key(actor_id) references auth.users(id) on delete set null,
  add column publication_id uuid references public.publications(id);
create index publications_published_by on public.publications(published_by);
create index audit_events_actor_id on public.audit_events(actor_id);
create index audit_events_publication_id on public.audit_events(publication_id);

-- Only controlled save/publish functions can mutate the private working tables.
do $$
declare table_name text;
begin
  foreach table_name in array array['categories','service_areas','contacts','contact_numbers','quick_call_assignments','guidance','campus_maps'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on public.%I from public, anon, authenticated',table_name);
    execute format('grant select on public.%I to authenticated',table_name);
    execute format('create policy admin_read on public.%I for select to authenticated using(public.is_admin())',table_name);
  end loop;
end $$;

-- Private importer. Its caller must lock/check the draft and validate the document.
create function public._replace_directory_content(document jsonb) returns void
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

create function public._directory_document() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'schemaVersion',1,'mode','research','fixture',false,
    'version',d.document_version,'publishedAt',d.document_published_at,'testContact',d.legacy_test_contact,
    'contacts',coalesce((select jsonb_agg(jsonb_build_object(
      'id',c.id,'agency',c.agency,'branch',c.branch,'category',c.category_id,'area',c.service_area_id,
      'description',jsonb_build_object('en',c.description_en,'hil',c.description_hil),
      'aliases',to_jsonb(c.aliases),'hours',c.hours,'source',c.source_url,'verifiedAt',coalesce(c.verified_at::text,''),
      'approved',c.approved,'active',c.active,'priority',c.legacy_priority,
      'numbers',coalesce((select jsonb_agg(jsonb_build_object(
        'id',n.id,'label',jsonb_build_object('en',n.label_en,'hil',n.label_hil),
        'display',n.display_number,'dial',n.dial_number,'extension',n.extension,'channel',n.channel
      ) order by n.position) from public.contact_numbers n where n.contact_id=c.id),'[]'::jsonb)
    ) order by c.position) from public.contacts c where c.draft_id=d.id),'[]'::jsonb),
    'guidance',coalesce((select jsonb_agg(jsonb_build_object(
      'id',g.id,'category',g.category_id,'title',jsonb_build_object('en',g.title_en,'hil',g.title_hil),
      'steps',g.steps,'source',g.source_url,'reviewedAt',g.reviewed_at::text,'reviewer',g.reviewer_name,'approved',g.approved
    ) order by g.position) from public.guidance g where g.draft_id=d.id),'[]'::jsonb),
    'map',(select jsonb_build_object('id',m.id,'assetPath',m.asset_path,
      'description',jsonb_build_object('en',m.description_en,'hil',m.description_hil),
      'instructions',m.instructions,'source',m.source_url,'reviewedAt',m.reviewed_at::text,'reviewer',m.reviewer_name,'approved',m.approved
    ) from public.campus_maps m where m.draft_id=d.id)
  ) || case when d.quick_calls_defined then jsonb_build_object('quickCalls',coalesce((
    select jsonb_agg(jsonb_build_object('category',q.category_id,'contactId',n.contact_id,'numberId',q.number_id) order by q.position)
    from public.quick_call_assignments q join public.contact_numbers n on n.id=q.number_id where q.draft_id=d.id
  ),'[]'::jsonb)) else '{}'::jsonb end
  from public.directory_drafts d where d.id;
$$;
revoke all on function public._directory_document() from public,anon,authenticated;

-- Backfill and compare before retiring the old payload. Any invalid reference,
-- duplicate identifier or mismatch aborts the entire migration without data loss.
do $$
declare original jsonb;
begin
  select payload into strict original from public.directory_drafts where id;
  perform public._replace_directory_content(original);
  if public._directory_document() is distinct from original then
    raise exception 'Relational backfill did not preserve the original directory';
  end if;
end $$;

create function public.get_directory_draft() returns table(payload jsonb, revision bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  return query select public._directory_document(),d.revision from public.directory_drafts d where d.id;
end $$;
revoke all on function public.get_directory_draft() from public,anon,authenticated;
grant execute on function public.get_directory_draft() to authenticated;

create or replace function public.save_directory(document jsonb, expected_revision bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare current_revision bigint;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  select revision into strict current_revision from public.directory_drafts where id for update;
  if expected_revision is null or current_revision <> expected_revision then
    raise exception 'Conflict: another administrator saved changes. Reload before saving.' using errcode='40001';
  end if;
  perform public._replace_directory_content(document);
  update public.directory_drafts set revision=revision+1,updated_at=now() where id returning revision into current_revision;
  insert into public.audit_events(actor_id,action,draft_revision) values(auth.uid(),'save',current_revision);
  return current_revision;
end $$;

-- Publication validation is retained below, now reading the relational document.
create or replace function public.publish_directory(expected_revision bigint) returns uuid language plpgsql security definer set search_path = '' as $$
declare draft public.directory_drafts; next_id uuid := gen_random_uuid(); document jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select * into draft from public.directory_drafts where id for update;
 if expected_revision is null or draft.revision <> expected_revision then raise exception 'Conflict: draft changed. Reload before publishing.' using errcode='40001'; end if;
 document := public._directory_document();
 if not coalesce(public.valid_directory(document),false) then raise exception 'Invalid working directory'; end if;
 if (document->>'fixture')::boolean then raise exception 'Sample content cannot be published'; end if;
 if exists(select 1 from jsonb_array_elements(document->'contacts') c where (c->>'active')::boolean and (not (c->>'approved')::boolean or c->>'source'='' or c->>'verifiedAt'='' or c->>'verifiedAt'>current_date::text or c->'description'->>'hil'='' or exists(select 1 from jsonb_array_elements(c->'numbers') n where n->'label'->>'hil'=''))) then raise exception 'Contacts require approval, source, verification, and both languages'; end if;
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
          and (c->>'active')::boolean and n->>'id'=q->>'numberId'
          and n->>'channel'='voice' and n->>'dial' !~ '^\+?0+$'
          and (select count(*) from jsonb_array_elements(c->'numbers') line where line->>'id'=q->>'numberId')=1
      )
 ) or (select count(*) from jsonb_array_elements(coalesce(document->'quickCalls','[]'::jsonb))) <>
      (select count(distinct q->>'category') from jsonb_array_elements(coalesce(document->'quickCalls','[]'::jsonb)) q)
 then raise exception 'Quick calls require one explicit active category contact and callable voice line'; end if;
 document := jsonb_set(document,'{contacts}',coalesce((select jsonb_agg(c) from jsonb_array_elements(document->'contacts') c where (c->>'active')::boolean),'[]'::jsonb));
 document := jsonb_set(jsonb_set(document,'{version}',to_jsonb(next_id::text)),'{publishedAt}',to_jsonb(now()));
 update public.publications set current=false where current;
 insert into public.publications(id,snapshot,current,source_revision,published_by) values(next_id,document,true,draft.revision,auth.uid());
 insert into public.audit_events(actor_id,action,draft_revision,publication_id) values(auth.uid(),'publish',draft.revision,next_id);
 return next_id;
end $$;


-- Existing restore calls save_directory then publish_directory in one transaction.
-- A failed restore rolls back all working rows, revision changes and audit events.

alter table public.directory_drafts drop column payload;

-- Snapshots and their provenance cannot be edited or deleted after publication.
-- FK account removal can clear published_by without changing snapshot content.
create function public._protect_publication() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Publication history is immutable'; end if;
  if new.id is distinct from old.id or new.snapshot is distinct from old.snapshot
    or new.source_revision is distinct from old.source_revision or new.created_at is distinct from old.created_at
    or (new.published_by is distinct from old.published_by and new.published_by is not null) then
    raise exception 'Published content and provenance are immutable';
  end if;
  return new;
end $$;
revoke all on function public._protect_publication() from public,anon,authenticated;
create trigger publication_immutable before update or delete on public.publications
  for each row execute function public._protect_publication();

notify pgrst, 'reload schema';
commit;
