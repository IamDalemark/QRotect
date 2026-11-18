import { requireAdminForRender } from '@/lib/admin/auth';
import { AdminShell } from '@/components/admin/admin-shell';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAdminForRender();
  return <AdminShell>{children}</AdminShell>;
}
