import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('category to safe call simulation takes two actions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Sample directory —', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Fire', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sample fire station' })).toBeVisible();
  await page.getByRole('button', { name: 'Practice call', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('No call was placed');
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('area filters and browser back preserve navigation', async ({ page }) => {
  await page.goto('/directory?category=fire');
  await page.getByRole('combobox', { name: 'Service area', exact: true }).selectOption('cpu');
  await expect(page.getByText('No approved contacts match your search.')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Sample fire station' })).toBeVisible();
});
test('language preserves filters and survives reload', async ({ page }) => {
  await page.goto('/directory?category=medical&q=bulig');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('hil');
  await expect(
    page.getByRole('heading', { name: 'Medikal / Ambulansya', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/category=medical&q=bulig/);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Lengguwahe', exact: true })).toHaveValue('hil');
});
test('copy failure gives selectable-number recovery', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('Denied')) },
    });
  });
  await page.goto('/directory?category=fire');
  await page.getByRole('button', { name: 'Copy number: Sample fire station' }).click();
  await expect(page.getByRole('status')).toContainText('Select the visible number');
});
test('unapproved guidance and map are hidden and unavailable directly', async ({ page }) => {
  await page.goto('/');
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Campus map' }),
  ).toHaveCount(0);
  await page.goto('/guidance');
  await expect(page.getByText('Approved emergency guidance is not available yet.')).toBeVisible();
  await page.goto('/campus-map');
  await expect(
    page.getByText('An approved campus evacuation map is not available yet.'),
  ).toBeVisible();
  await page.goto('/practice');
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
});
test('saved directory survives offline direct links and language switching', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.getByText('Available offline', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await context.setOffline(true);
  await page.goto('/directory?category=fire');
  await expect(page.getByRole('heading', { name: 'Sample fire station' })).toBeVisible();
  await page.getByRole('button', { name: 'Practice call', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('No call was placed');
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('hil');
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: 'Parte sa QROTECT' })).toBeVisible();
});
test('invalid refreshed payload keeps the last complete directory', async ({ page }) => {
  await page.goto('/directory');
  await expect(page.getByText('Available offline', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  // WebKit routing cannot intercept fetches from a service-worker-controlled page.
  // Fault-inject the next server payload while retaining the real cache and worker.
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = (input, init) =>
      String(input) === '/api/public/snapshot'
        ? Promise.resolve(
            new Response('{"schemaVersion":999}', {
              headers: { 'Content-Type': 'application/json' },
            }),
          )
        : original(input, init);
    window.dispatchEvent(new Event('online'));
  });
  await expect(
    page.getByText('Could not refresh — showing saved information', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sample fire station' })).toBeVisible();
});
test('unavailable storage preserves online directory and language controls', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'caches', {
      get() {
        throw new Error('Storage unavailable');
      },
    });
    Storage.prototype.setItem = () => {
      throw new Error('Storage unavailable');
    };
    Storage.prototype.getItem = () => {
      throw new Error('Storage unavailable');
    };
  });
  await page.goto('/directory?category=fire');
  await expect(page.getByRole('heading', { name: 'Sample fire station' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('hil');
  await expect(page.getByRole('heading', { name: 'Sunog', exact: true })).toBeVisible();
});
test('public cache excludes administrator and authentication responses', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Available offline', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Administrator sign in' })).toBeVisible();
  const paths = await page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys())
      for (const req of await (await caches.open(name)).keys())
        paths.push(new URL(req.url).pathname);
    return paths;
  });
  expect(paths.some((path) => /^\/(admin|auth|api\/admin)(\/|$)/.test(path))).toBe(false);
});
test('responsive screens have no overflow or automated accessibility violations', async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== 'desktop-chromium',
    'One viewport matrix suffices across shared browser profiles.',
  );
  for (const width of [320, 390, 1120]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Find the right emergency contact.' }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  for (const path of ['/', '/directory', '/admin/login']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/');
  await page.screenshot({ path: '.impeccable/review/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.impeccable/review/mobile.png', fullPage: true });
  await page.goto('/directory?category=fire');
  await page.screenshot({ path: '.impeccable/review/directory-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Practice call', exact: true }).click();
  await page.screenshot({ path: '.impeccable/review/dialog-mobile.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('hil');
  await expect(
    page.getByRole('link', { name: 'Mag-sign in ang administrador', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '.impeccable/review/hiligaynon-mobile.png', fullPage: true });
});
