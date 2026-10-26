import { currentSnapshot, publicDatabase } from '@/lib/directory/server';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const snapshot = await currentSnapshot();
    if (!snapshot.map || snapshot.map.id !== id)
      return new Response('Map unavailable', { status: 404 });
    const { data, error } = await publicDatabase()
      .storage.from('campus-maps')
      .download(snapshot.map.assetPath);
    if (error || !data) return new Response('Map unavailable', { status: 503 });
    return new Response(data, {
      headers: {
        'Content-Type': data.type,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Map unavailable', { status: 503 });
  }
}
