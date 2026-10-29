export const dynamic = 'force-dynamic';
import { dashboard } from '@/lib/admin/data';
import { PublicProvider } from '@/components/public/context';
import { PublicShell } from '@/components/public/shell';
import { HomeScreen } from '@/components/public/home-screen';
import { DirectoryScreen } from '@/components/public/directory-screen';
import { GuidanceScreen } from '@/components/public/guidance-screen';
export default async function Page() {
  const { initial } = await dashboard('preview');
  return (
    <PublicProvider initial={initial} preview>
      <PublicShell>
        <p className="sample-notice">
          Private content preview. This page does not publish changes.
        </p>
        <HomeScreen />
        <DirectoryScreen initialSearch="" />
        <GuidanceScreen />
      </PublicShell>
    </PublicProvider>
  );
}
