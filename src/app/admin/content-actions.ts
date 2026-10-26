'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/auth';
import { snapshotSchema, publicationIssues } from '@/lib/directory/schema';
import { z } from 'zod';
export async function saveDraft(input: unknown, revision: number) {
  const { client } = await requireAdmin();
  const parsed = snapshotSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .slice(0, 5)
        .join(' '),
    };
  if (parsed.data.fixture || !Number.isSafeInteger(revision) || revision < 0)
    return { ok: false, message: 'Invalid draft or revision.' };
  const { data, error } = await client.rpc('save_directory', {
    document: parsed.data,
    expected_revision: revision,
  });
  return error
    ? {
        ok: false,
        message:
          error.code === '40001'
            ? 'Another administrator saved changes. Reload before saving.'
            : 'Save failed. Check the content and reconnect before trying again.',
      }
    : {
        ok: true,
        message: 'Draft saved. Public content is unchanged until publication.',
        revision: data,
      };
}
export async function publishDraft(revision: number) {
  const { client } = await requireAdmin();
  if (!Number.isSafeInteger(revision) || revision < 0)
    return { ok: false, message: 'Invalid revision.' };
  const { data: draft, error: loadError } = await client
    .from('directory_drafts')
    .select('payload,revision')
    .single();
  if (loadError || !draft || draft.revision !== revision)
    return {
      ok: false,
      message: 'The draft changed or could not be loaded. Reload before publishing.',
    };
  const parsed = snapshotSchema.safeParse(draft.payload);
  if (!parsed.success) return { ok: false, message: 'The saved draft is invalid.' };
  const issues = publicationIssues(parsed.data);
  if (issues.length) return { ok: false, message: issues.join(' ') };
  const { error } = await client.rpc('publish_directory', { expected_revision: revision });
  if (error)
    return {
      ok: false,
      message:
        'Publication failed. The current public version remains unchanged. Reload and try again.',
    };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Published. Connected visitors will receive the new directory.' };
}
export async function restorePublication(id: string, revision: number) {
  const { client } = await requireAdmin();
  if (!z.uuid().safeParse(id).success || !Number.isSafeInteger(revision))
    return { ok: false, message: 'Invalid publication.' };
  const { error } = await client.rpc('restore_directory', {
    source_id: id,
    expected_revision: revision,
  });
  if (error)
    return {
      ok: false,
      message: 'Restore failed. Reload the draft; the current publication is unchanged.',
    };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Restored as a new publication. Reload to see the updated draft.' };
}
export async function uploadMap(form: FormData) {
  const { client } = await requireAdmin();
  const file = form.get('file');
  if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || !file.size)
    return { ok: false, message: 'Choose a PNG, JPEG, or WebP image up to 5 MB.' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png = bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10';
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!png && !jpeg && !webp)
    return { ok: false, message: 'The file contents must be a PNG, JPEG, or WebP image.' };
  const id = crypto.randomUUID(),
    ext = png ? 'png' : jpeg ? 'jpg' : 'webp',
    assetPath = `${id}.${ext}`;
  const { error } = await client.storage.from('campus-maps').upload(assetPath, bytes, {
    contentType: png ? 'image/png' : jpeg ? 'image/jpeg' : 'image/webp',
    upsert: false,
  });
  return error
    ? { ok: false, message: 'Upload failed. Reconnect and try again.' }
    : {
        ok: true,
        message: 'Image uploaded privately. Complete its reviewed text before saving.',
        id,
        assetPath,
      };
}
