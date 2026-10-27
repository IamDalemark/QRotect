import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { snapshotSchema } from '../src/lib/directory/schema';
const filename = process.argv[2];
if (!filename || !/^\d{12,14}_[a-z_]+\.sql$/.test(filename))
  throw new Error('Supply a new timestamped validation migration filename.');
const schema = z.toJSONSchema(snapshotSchema);
// Zod's URL protocol option is not represented by toJSONSchema.
// Keep the same HTTP-only boundary when a client calls database functions directly.
function constrainSources(value: unknown) {
  if (!value || typeof value !== 'object') return;
  const object = value as Record<string, unknown>;
  if (object.format === 'uri') object.pattern = '^https?://';
  for (const child of Object.values(object)) constrainSources(child);
}
constrainSources(schema);
writeFileSync(
  `supabase/migrations/${filename}`,
  `-- Generated from snapshotSchema; do not overwrite previously applied migrations.\ncreate or replace function public.valid_directory(document jsonb) returns boolean language sql immutable set search_path = '' as $$ select extensions.jsonb_matches_schema($schema$${JSON.stringify(schema)}$schema$::json, document); $$;\n`,
  { flag: 'wx' },
);
