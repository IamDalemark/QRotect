import Link from 'next/link';
import { AuthForm } from '@/components/admin/auth-form';
import { databaseConfigured } from '@/lib/directory/server';
export default function Page() {
  const configured = databaseConfigured();
  return (
    <main className="container auth-page">
      <Link className="back-link" href="/">
        ← QROTECT directory
      </Link>
      <h1>Administrator sign in</h1>
      <p>Invited school and research administrators maintain the directory here.</p>
      {!configured && (
        <p className="sample-notice">
          The database connection is not configured. Add the Supabase settings in the local
          environment before sign-in.
        </p>
      )}
      <AuthForm configured={configured} />
    </main>
  );
}
