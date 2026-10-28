import { expect, test } from '@playwright/test';

test('contacts render before background validation and unchanged data returns 304', async ({
  page,
}) => {
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/public/snapshot', async (route) => {
    await hold;
    await route.continue();
  });
  await page.goto('/directory?category=fire', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Sample fire station' })).toBeVisible();
  await page.getByRole('button', { name: 'Call', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('0912 345 6789');
  const response = page.waitForResponse((response) =>
    response.url().endsWith('/api/public/snapshot'),
  );
  release();
  expect((await response).status()).toBe(304);
  await page.keyboard.press('Escape');
});

test('navigation uses network documents and no worker or saved directory is created', async ({
  page,
}) => {
  const refreshed = page.waitForResponse((r) => r.url().endsWith('/api/public/snapshot'));
  await page.goto('/');
  await refreshed;
  const response = await page.goto('/directory?category=fire');
  expect(response?.fromServiceWorker()).toBe(false);
  await expect(page.getByRole('heading', { name: 'Sample fire station' })).toBeVisible();
  expect(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
  ).toBe(0);
  expect(
    await page.evaluate(async () => (await caches.keys()).filter((n) => n.startsWith('qrotect-'))),
  ).toEqual([]);
  await expect(page.getByText('Available offline', { exact: true })).toHaveCount(0);
  await page.goto('/offline');
  await expect(page).toHaveURL('/directory');
});

test('recent visibility changes do not repeat a completed background refresh', async ({ page }) => {
  let requests = 0;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/public/snapshot')) requests++;
  });
  const refreshed = page.waitForResponse((r) => r.url().endsWith('/api/public/snapshot'));
  await page.goto('/');
  await refreshed;
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(requests).toBe(1);
});

test('retirement worker clears only legacy QROTECT caches and unregisters', async ({ page }) => {
  // Sign-in has no public provider, so activation itself must perform cleanup.
  await page.goto('/admin/login');
  await page.evaluate(async () => {
    await (
      await caches.open('qrotect-public-data-v1')
    ).put('/__qrotect/saved-directory', Response.json({ old: true }));
    await (await caches.open('qrotect-public-maps-v1')).put('/old-map', new Response('old'));
    await (
      await caches.open('serwist-precache-v2-legacy')
    ).put('/offline', new Response('old shell'));
    await (await caches.open('unrelated-cache')).put('/other', new Response('keep'));
    await navigator.serviceWorker.register('/sw.js');
  });
  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
    )
    .toBe(0);
  await expect
    .poll(() => page.evaluate(async () => (await caches.keys()).sort()))
    .toEqual(['unrelated-cache']);
  const response = await page.goto('/directory?category=fire');
  expect(response?.fromServiceWorker()).toBe(false);
  await expect(page.getByRole('heading', { name: 'Sample fire station' })).toBeVisible();
});
