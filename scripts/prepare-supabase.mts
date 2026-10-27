import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
const files = readdirSync('supabase/migrations')
  .filter((file) => /^\d+_.*\.sql$/.test(file))
  .sort();
const checks = ['administrators', 'directory_drafts', 'publications', 'audit_events']
  .map((table) => `to_regclass('public.${table}') is not null`)
  .join(' or ');
const sql = `-- QROTECT first-time hosted setup. Preferred route: Supabase CLI db push.\n-- Run this alternative in the intended project's SQL Editor only if QROTECT is not installed.\n-- Existing QROTECT objects cause an error; nothing is dropped or overwritten.\nbegin;\ndo $$ begin\nif ${checks} then\nraise exception 'QROTECT objects already exist. Use versioned migrations instead of first-time setup.';\nend if;\nend $$;\n\n${files.map((file) => `-- ${file}\n${readFileSync(`supabase/migrations/${file}`, 'utf8')}`).join('\n')}\nnotify pgrst, 'reload schema';\ncommit;\n`;
mkdirSync('.local', { recursive: true });
writeFileSync('.local/supabase-bootstrap.sql', sql, { mode: 0o600 });
console.log(
  'Prepared .local/supabase-bootstrap.sql from the versioned migrations. No remote changes made.',
);
