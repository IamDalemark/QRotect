import { currentSnapshot } from '@/lib/directory/server';
import { PublicProvider } from '@/components/public/context';
import { PublicShell } from '@/components/public/shell';
export const revalidate = 60;
export default async function Layout({ children }: { children: React.ReactNode }) {
  const snapshot = await currentSnapshot();
  return (
    <PublicProvider initial={snapshot}>
      <PublicShell>{children}</PublicShell>
    </PublicProvider>
  );
}
