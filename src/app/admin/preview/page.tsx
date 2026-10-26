import { dashboard } from '@/lib/admin/data';
import { PublicProvider } from '@/components/public/context';
import { PublicShell } from '@/components/public/shell';
import { DirectoryScreen, GuidanceScreen } from '@/components/public/screens';
export default async function Page() {
  const { initial } = await dashboard();
  return (
    <PublicProvider initial={initial}>
      <PublicShell>
        <p className="sample-notice">
          Private draft preview. Use the language switch to review both versions.
        </p>
        <DirectoryScreen initialSearch="" />
        <GuidanceScreen />
      </PublicShell>
    </PublicProvider>
  );
}
