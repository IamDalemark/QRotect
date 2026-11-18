import { GuidanceScreen } from '@/components/public/guidance-screen';
import { categoryIds } from '@/lib/directory/schema';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const { category } = await searchParams;
  return <GuidanceScreen category={categoryIds.find((id) => id === category)} />;
}
