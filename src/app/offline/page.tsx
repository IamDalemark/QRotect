import { PublicProvider } from '@/components/public/context';
import { PublicShell } from '@/components/public/shell';
import { OfflineScreen } from '@/components/public/offline-screen';
export default function Page() {
  return (
    <PublicProvider initial={null}>
      <PublicShell>
        <OfflineScreen />
      </PublicShell>
    </PublicProvider>
  );
}
