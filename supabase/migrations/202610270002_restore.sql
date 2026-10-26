create function public.restore_directory(source_id uuid, expected_revision bigint) returns uuid language plpgsql security definer set search_path = '' as $$
declare document jsonb; next_revision bigint;
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select snapshot into document from public.publications where id=source_id;
 if document is null then raise exception 'Publication not found'; end if;
 select public.save_directory(document,expected_revision) into next_revision;
 return public.publish_directory(next_revision);
end $$;
revoke execute on function public.restore_directory(uuid,bigint) from public;
grant execute on function public.restore_directory(uuid,bigint) to authenticated;
