import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Home quick call opens confirmation in one action', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText('Emergency Hotline System');
  await page.getByRole('button', { name: /Call Fire: Sample fire station/ }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('dialog')).toContainText('Sample fire station');
  await expect(page.getByRole('dialog')).toContainText('Check the number, then swipe');
  await expect(
    page.getByRole('dialog').getByRole('link', { name: 'Open Phone instead' }),
  ).toHaveAttribute('href', 'tel:09123456789');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('area filters and browser back preserve navigation', async ({ page }) => {
  await page.goto('/directory?category=fire');
  await page.getByRole('button', { name: 'Filters (1)', exact: true }).click();
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
  await expect(page.getByRole('article').getByRole('status')).toContainText(
    'Select the visible number',
  );
});
test('Guide has practical help while unapproved safety content and map stay hidden', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Campus map' }),
  ).toHaveCount(0);
  await page.goto('/guidance');
  await expect(page.getByRole('heading', { name: 'How to call a contact' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Emergency guidance', exact: true })).toHaveCount(
    0,
  );
  await page.goto('/campus-map');
  await expect(
    page.getByText('An approved campus evacuation map is not available yet.'),
  ).toBeVisible();
  await page.goto('/practice');
  await expect(page).toHaveURL(/\/directory$/);
  await expect(page.getByRole('link', { name: 'Practice the phone dialer' })).toHaveCount(0);
});
test('invalid refreshed payload keeps the last complete directory', async ({ page }) => {
  // Inject before startup so the test does not race an already-running refresh.
  // Server-rendered valid contacts must survive invalid background validation.
  await page.addInitScript(() => {
    const original = window.fetch;
    window.fetch = (input, init) =>
      String(input) === '/api/public/snapshot'
        ? Promise.resolve(new Response(JSON.stringify({ invalid: true }), { status: 200 }))
        : original(input, init);
  });
  await page.goto('/directory');
  await expect(
    page.getByText(
      'Could not check for updates. Reconnect and try again. Displayed information may be out of date',
      { exact: true },
    ),
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
  await page.getByRole('button', { name: 'Call', exact: true }).click();
  await page.screenshot({ path: '.impeccable/review/dialog-mobile.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('hil');
  await expect(
    page.getByRole('link', { name: 'Mag-sign in ang administrador', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '.impeccable/review/hiligaynon-mobile.png', fullPage: true });
});

test('Guide and About explain internet access without promising saved access', async ({ page }) => {
  await page.goto('/guidance');
  await expect(page.getByRole('heading', { name: 'Accessing the website' })).toBeVisible();
  await expect(page.getByText(/Keep an internet connection/)).toBeVisible();
  await expect(page.getByText(/Available offline|Using the directory offline/)).toHaveCount(0);
  await page.goto('/about');
  await expect(page.getByText(/An internet connection is needed/)).toBeVisible();
  await page.locator('.language-label select').selectOption('hil');
  await expect(page.getByText(/Kinahanglan internet para mabuksan/)).toBeVisible();
});
