import { notFound } from 'next/navigation';
import { dashboard } from '@/lib/admin/data';
import { Workbench } from '@/components/admin/workbench';
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!['contacts', 'quick-calls', 'guidance', 'map', 'publish', 'history'].includes(section))
    notFound();
  const data = await dashboard();
  return <Workbench key={section} {...data} section={section} />;
}
