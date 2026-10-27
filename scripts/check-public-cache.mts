import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';
import { fixtureSnapshot } from '../src/lib/directory/fixtures';

// Production-cache integration check against an isolated fake PostgREST origin.
// Requires a current `pnpm build`. No hosted data, administrator credentials or
// test-only application routes are used. Waits once for the real 60-second TTL.
let reads = 0;
let fail = false;
let snapshot = {
  ...structuredClone(fixtureSnapshot),
  version: `cache-check-${crypto.randomUUID()}`,
};
const origin = createServer(async (request, response) => {
  if (!request.url?.startsWith('/rest/v1/publications')) {
    response.writeHead(404).end();
    return;
  }
  reads++;
  await delay(200);
  response.writeHead(fail ? 503 : 200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(fail ? { message: 'Injected outage' } : [{ snapshot }]));
});
await new Promise<void>((resolve) => origin.listen(0, '127.0.0.1', resolve));
const address = origin.address();
assert(address && typeof address !== 'string');
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3111'],
  {
    env: {
      ...process.env,
      QROTECT_REVIEW_MODE: '',
      SUPABASE_URL: `http://127.0.0.1:${address.port}`,
      SUPABASE_PUBLISHABLE_KEY: 'isolated-cache-check',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
let ready = false;
child.stdout.on('data', (chunk: Buffer) => {
  if (chunk.toString().includes('Ready in')) ready = true;
});
child.stderr.resume(); // Expected background refresh errors are injected below.
const url = 'http://127.0.0.1:3111/api/public/snapshot';
const timings: number[] = [];
async function read() {
  const start = performance.now();
  const response = await fetch(url);
  assert.equal(response.status, 200);
  const data = (await response.json()) as typeof snapshot;
  timings.push(Math.round(performance.now() - start));
  return { data, response };
}
try {
  for (let tries = 0; !ready; tries++) {
    assert.equal(child.exitCode, null, 'Production server exited; port 3111 must be available.');
    assert(tries < 100, 'Production server did not become ready.');
    await delay(100);
  }
  const manifest = JSON.parse(await readFile('.next/prerender-manifest.json', 'utf8'));
  for (const route of ['/', '/directory', '/about', '/guidance', '/campus-map'])
    assert.equal(
      manifest.routes[route].initialRevalidateSeconds,
      60,
      `${route} must be pre-rendered`,
    );
  assert.equal(manifest.routes['/admin'], undefined);
  fail = true;
  assert.equal((await fetch(url)).status, 503, 'A cold-cache outage must fail honestly.');
  fail = false;
  const first = await read();
  assert.equal(first.data.version, snapshot.version);
  const warmedReads = reads;
  for (let i = 0; i < 5; i++) assert.equal((await read()).data.version, snapshot.version);
  assert.equal(reads, warmedReads, 'Warm requests must not query the database.');
  const conditional = await fetch(url, {
    headers: { 'If-None-Match': first.response.headers.get('etag')! },
  });
  assert.equal(conditional.status, 304);
  assert.equal(await conditional.text(), '');
  fail = true;
  assert.equal((await read()).data.version, snapshot.version);
  assert.equal(reads, warmedReads);
  console.log(
    JSON.stringify({
      stage: 'warm-cache',
      originLatencyMs: 200,
      responseMs: timings,
      extraDatabaseReads: reads - warmedReads,
      unchangedStatus: conditional.status,
    }),
  );
  await delay(61_000);
  assert.equal(
    (await read()).data.version,
    snapshot.version,
    'Stale data must remain usable during an outage.',
  );
  await delay(500);
  assert.equal(
    (await read()).data.version,
    snapshot.version,
    'Failed refresh must not replace the last valid publication.',
  );
  const health = await fetch('http://127.0.0.1:3111/api/health');
  assert.equal(
    health.status,
    503,
    'Health must inspect the database, not hide outages behind the cache.',
  );
  fail = false;
  snapshot = { ...snapshot, version: `withdrawal-${crypto.randomUUID()}`, contacts: [] };
  let recovered = false;
  for (let i = 0; i < 20; i++) {
    const next = await read();
    if (next.data.version === snapshot.version) {
      assert.equal(
        next.data.contacts.length,
        0,
        'Withdrawn contacts must disappear after recovery.',
      );
      recovered = true;
      break;
    }
    await delay(250);
  }
  assert(recovered, 'The cache did not recover after the origin returned.');
  console.log(
    JSON.stringify({
      stage: 'outage-and-recovery',
      staleRetained: true,
      healthStatus: health.status,
      withdrawalAdopted: true,
    }),
  );
} finally {
  child.kill('SIGTERM');
  origin.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    origin.close((error) => (error ? reject(error) : resolve())),
  );
}
