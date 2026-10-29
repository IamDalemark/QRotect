import { expect, test } from '@playwright/test';
import { fixtureSnapshot } from '../../src/lib/directory/fixtures';

test('map reserves its viewport during a slow download and preserves zoom and text', async ({
  page,
}) => {
  const id = '30000000-0000-4000-8000-000000000001';
  const snapshot = structuredClone(fixtureSnapshot);
  snapshot.map = {
    id,
    assetPath: `${id}.png`,
    approved: true,
    description: { en: 'Layout test image', hil: 'Layout test image' },
    instructions: [{ en: 'Test description', hil: 'Test description' }],
    source: 'https://example.test/map',
    reviewedAt: '2026-10-29',
    reviewer: 'Test reviewer',
  };
  await page.route('**/api/public/snapshot', (route) => route.fulfill({ json: snapshot }));
  let release!: () => void;
  const imageReady = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/public/maps/${id}`, async (route) => {
    await imageReady;
    await route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=',
        'base64',
      ),
    });
  });
  await page.goto('/campus-map', { waitUntil: 'domcontentloaded' });
  const viewport = page.locator('.map-viewport');
  await expect(viewport).toBeVisible();
  const before = await viewport.boundingBox();
  const instructionsBefore = await page
    .getByText('Test description', { exact: true })
    .boundingBox();
  expect(before!.height).toBeGreaterThan(100);
  release();
  await expect
    .poll(() => viewport.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(1);
  const after = await viewport.boundingBox();
  const instructionsAfter = await page.getByText('Test description', { exact: true }).boundingBox();
  expect(after!.height).toBeCloseTo(before!.height, 0);
  expect(instructionsAfter!.y).toBeCloseTo(instructionsBefore!.y, 0);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(viewport.locator('img')).toHaveAttribute('style', /width: 150%/);
  expect((await viewport.boundingBox())!.height).toBeCloseTo(before!.height, 0);
  await page.getByRole('button', { name: 'Reset zoom', exact: true }).click();
  await expect(viewport.locator('img')).toHaveAttribute('style', /width: 100%/);
  await expect(page.getByRole('link', { name: 'Download map', exact: true })).toHaveAttribute(
    'href',
    `/api/public/maps/${id}`,
  );
});
