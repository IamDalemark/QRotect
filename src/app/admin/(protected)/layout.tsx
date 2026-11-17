import { requireAdmin } from '@/lib/admin/auth';
import { AdminShell } from '@/components/admin/admin-shell';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
