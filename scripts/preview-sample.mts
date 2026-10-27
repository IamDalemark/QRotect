import { spawn } from 'node:child_process';
const child = spawn('pnpm', ['start', '--hostname', '127.0.0.1', '--port', '3100'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    QROTECT_REVIEW_MODE: 'sample',
    NEXT_PUBLIC_SUPABASE_URL: '',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
  },
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
