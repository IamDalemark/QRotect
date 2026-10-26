import { currentSnapshot } from '@/lib/directory/server';
import { PublicProvider } from '@/components/public/context';
import { PublicShell } from '@/components/public/shell';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: React.ReactNode }) {
  const snapshot = await currentSnapshot().catch(() => null);
  return (
    <PublicProvider initial={snapshot}>
      <PublicShell>{children}</PublicShell>
    </PublicProvider>
  );
}
