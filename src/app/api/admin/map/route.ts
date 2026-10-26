import { requireAdmin } from '@/lib/admin/auth';
export async function GET(request: Request) {
  const { client } = await requireAdmin();
  const path = new URL(request.url).searchParams.get('path') || '';
  if (!/^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(path))
    return new Response('Invalid map', { status: 400 });
  const { data, error } = await client.storage.from('campus-maps').download(path);
  if (error || !data) return new Response('Unavailable', { status: 404 });
  return new Response(data, {
    headers: {
      'Content-Type': data.type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
