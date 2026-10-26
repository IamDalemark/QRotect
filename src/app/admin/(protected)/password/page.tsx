import { AuthForm } from '@/components/admin/auth-form';
export default function Page() {
  return (
    <>
      <h1>Update password</h1>
      <AuthForm configured password />
    </>
  );
}
