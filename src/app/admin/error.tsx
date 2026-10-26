'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container auth-page">
      <h1>Administrator page unavailable</h1>
      <p>
        Your session may have expired, or the database connection could not be reached. Reconnect
        and try again.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
