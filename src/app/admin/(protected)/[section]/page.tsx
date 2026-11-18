import { notFound, redirect } from 'next/navigation';
import { loadAdminEditor } from '@/lib/admin/data';
import { Workbench } from '@/components/admin/workbench';
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === 'publish') redirect('/admin');
  if (
    section !== 'contacts' &&
    section !== 'quick-calls' &&
    section !== 'guidance' &&
    section !== 'map'
  )
    notFound();
  const data = await loadAdminEditor(section);
  return <Workbench key={section} {...data} section={section} />;
}
