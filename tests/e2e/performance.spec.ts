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

test('returning navigation uses the saved shell without waiting for a document response', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Available offline', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  // The new page cannot wait for an origin document: the browser's own fetch
  // confirms that the service worker supplied the dedicated public shell.
  const response = await page.goto('/directory?category=fire');
  expect(response?.fromServiceWorker()).toBe(true);
  const savedShell = await page.evaluate(async () =>
    (await caches.match('/offline', { ignoreSearch: true }))?.text(),
  );
  expect((await response!.text()) === savedShell).toBe(true);
  await expect(page.getByRole('heading', { name: 'Sample fire station' })).toBeVisible();
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = (input, init) =>
      String(input) === '/api/public/snapshot'
        ? Promise.reject(new Error('Origin unavailable'))
        : original(input, init);
    window.dispatchEvent(new Event('online'));
  });
  await expect(
    page.getByText('Could not refresh — showing saved information', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Call', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('0912 345 6789');
});

test('refresh triggers are deduplicated during worker setup and resume', async ({ page }) => {
  let requests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/public/snapshot')) requests++;
  });
  await page.goto('/');
  await expect(page.getByText('Available offline', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  expect(requests).toBe(1);
  await page.evaluate(() => {
    navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  // Readiness and a recent tab resume must not start another refresh.
  await expect.poll(() => requests).toBe(1);
});

test('offline navigation preserves the original saved-at time', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByText('Available offline', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  const savedAt = await page.evaluate(async () => {
    const cache = await caches.open('qrotect-public-data-v1');
    const response = await cache.match('/__qrotect/saved-directory');
    const saved = await response!.json();
    saved.savedAt = Date.now() - 8 * 86400000;
    await cache.put('/__qrotect/saved-directory', Response.json(saved));
    return saved.savedAt as number;
  });
  await context.setOffline(true);
  await page.goto('/directory?category=fire');
  await expect(page.getByRole('heading', { name: 'Sample fire station' })).toBeVisible();
  expect(
    await page.evaluate(
      async () =>
        (
          await (await (
            await caches.open('qrotect-public-data-v1')
          ).match('/__qrotect/saved-directory'))!.json()
        ).savedAt,
    ),
  ).toBe(savedAt);
});
