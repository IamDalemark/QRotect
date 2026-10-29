-- Use the same Philippine calendar as administrator/browser validation.
-- Function settings are restored on return; authorization and content are unchanged.
begin;
alter function public.publish_directory_item(text,text,jsonb,bigint) set timezone = 'Asia/Manila';
alter function public.publish_directory(bigint) set timezone = 'Asia/Manila';
notify pgrst, 'reload schema';
commit;
