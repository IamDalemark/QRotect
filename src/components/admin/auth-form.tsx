'use client';
import { useActionState, useState } from 'react';
import { signIn, requestRecovery, updatePassword } from '@/app/admin/auth-actions';
export function AuthForm({
  configured,
  password = false,
}: {
  configured: boolean;
  password?: boolean;
}) {
  const [recovery, setRecovery] = useState(false);
  const [state, action, pending] = useActionState(
    password ? updatePassword : recovery ? requestRecovery : signIn,
    { message: '' },
  );
  return (
    <>
      <form action={action} className="admin-form">
        {!password && (
          <label>
            Email
            <input type="email" name="email" autoComplete="username" required />
          </label>
        )}
        {(!recovery || password) && (
          <label>
            {password ? 'New password' : 'Password'}
            <input
              type="password"
              name="password"
              autoComplete={password ? 'new-password' : 'current-password'}
              minLength={password ? 12 : 1}
              required
            />
          </label>
        )}
        {password && (
          <label>
            Confirm new password
            <input
              type="password"
              name="confirm"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
        )}
        <p role="status">{state.message}</p>
        <button className="button primary" disabled={pending || !configured}>
          {pending
            ? 'Please wait…'
            : password
              ? 'Update password'
              : recovery
                ? 'Send recovery link'
                : 'Sign in'}
        </button>
      </form>
      {!password && (
        <button className="button secondary" onClick={() => setRecovery(!recovery)}>
          {recovery ? 'Back to sign in' : 'Forgot password?'}
        </button>
      )}
    </>
  );
}
