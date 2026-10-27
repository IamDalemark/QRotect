import { execFileSync, spawn } from 'node:child_process';
const status = JSON.parse(
  execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
);
if (new URL(status.API_URL).hostname !== '127.0.0.1')
  throw new Error('Administrator review requires local Supabase.');
const child = spawn('pnpm', ['start', '--hostname', '127.0.0.1', '--port', '3102'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    QROTECT_REVIEW_MODE: 'local',
    SUPABASE_URL: status.API_URL,
    SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY || status.ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY || status.ANON_KEY,
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3102',
  },
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
