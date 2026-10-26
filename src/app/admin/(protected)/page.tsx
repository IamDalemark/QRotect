import { dashboard } from '@/lib/admin/data';
import { Workbench } from '@/components/admin/workbench';
export default async function Page() {
  const data = await dashboard();
  return <Workbench {...data} section="overview" />;
}
