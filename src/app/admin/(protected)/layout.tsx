import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { signOut } from '../auth-actions';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="admin-header container">
        <Link href="/admin" className="admin-brand">
          QROTECT / Administration
        </Link>
        <form action={signOut}>
          <button className="button secondary">Sign out</button>
        </form>
      </header>
      <div className="admin-layout container">
        <nav aria-label="Administrator navigation">
          {[
            ['', 'Overview'],
            ['contacts', 'Contacts'],
            ['guidance', 'Guidance'],
            ['map', 'Campus map'],
            ['publish', 'Preview & publish'],
            ['history', 'History'],
            ['password', 'Password'],
          ].map(([url, label]) => (
            <Link key={url} href={`/admin${url ? `/${url}` : ''}`}>
              {label}
            </Link>
          ))}
          <Link href="/">Public directory ↗</Link>
        </nav>
        <main className="admin-main">{children}</main>
      </div>
    </>
  );
}
