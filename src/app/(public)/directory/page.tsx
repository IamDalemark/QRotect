import { DirectoryScreen } from '@/components/public/screens';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const values = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (typeof value === 'string') params.set(key, value);
  return <DirectoryScreen initialSearch={`?${params}`} />;
}
