import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fixtureSnapshot } from '../../src/lib/directory/fixtures';
import { categoryIds } from '../../src/lib/directory/schema';
import { quickCallLabels } from '../../src/lib/directory/labels';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const attempts: string[] = [];
    Object.defineProperty(window, '__phoneAttempts', { value: attempts });
    document.addEventListener(
      'click',
      (event) => {
        const link =
          event.target instanceof Element ? event.target.closest('a[href^="tel:"]') : null;
        if (link) {
          event.preventDefault();
          attempts.push(link.getAttribute('href')!);
        }
      },
      true,
    );
  });
});

test('all six Home shortcuts open exact confirmation in one action without navigation or fetch', async ({
  page,
}) => {
  await page.goto('/');
  const group = page.getByRole('region', { name: 'Quick call', exact: true });
  await expect(group.getByRole('button')).toHaveCount(6);
  await expect(page.getByText('Available offline', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  for (const category of categoryIds) {
    const trigger = group.getByRole('button', {
      name: new RegExp(quickCallLabels[category].en.replace('/', '\\/')),
    });
    const contact = fixtureSnapshot.contacts.find((c) => c.category === category)!;
    requests.length = 0;
    await trigger.click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('dialog')).toContainText(contact.agency);
    await expect(page.getByRole('dialog')).toContainText('0912 345 6789');
    await expect(
      page.getByRole('dialog').getByRole('link', { name: 'Open Phone instead' }),
    ).toHaveAttribute('href', 'tel:09123456789');
    expect(requests.filter((url) => url.includes('/api/public/snapshot'))).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
  expect(
    await page.evaluate(() => (window as unknown as { __phoneAttempts: string[] }).__phoneAttempts),
  ).toEqual([]);
  await page.goto('/directory?category=police');
  await expect(page.getByRole('region', { name: 'Quick call', exact: true })).toHaveCount(0);
});

test('saved Home shortcuts work offline in Hiligaynon with the tap alternative', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.getByText('Available offline', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await context.setOffline(true);
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('hil');
  await page.getByRole('button', { name: /Tawag sa Pulis/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Sample police station');
  await page.getByRole('dialog').getByRole('link', { name: 'Buksan ang Telepono' }).click();
  expect(
    await page.evaluate(() => (window as unknown as { __phoneAttempts: string[] }).__phoneAttempts),
  ).toEqual(['tel:09123456789']);
});

test('withdrawn assignments offer category browsing without selecting another contact', async ({
  page,
}) => {
  const snapshot = structuredClone(fixtureSnapshot);
  snapshot.quickCalls = [];
  snapshot.publishedAt = new Date().toISOString();
  await page.route('**/api/public/snapshot', (route) => route.fulfill({ json: snapshot }));
  await page.goto('/');
  const group = page.getByRole('region', { name: 'Quick call', exact: true });
  await expect(group.getByRole('button')).toHaveCount(0);
  await expect(group.getByText('Quick call unavailable', { exact: true })).toHaveCount(6);
  await group.getByRole('link', { name: 'Browse contacts' }).first().click();
  await expect(page).toHaveURL(/directory\?category=police$/);
});

test('Home actions reflow in both languages and pass accessibility checks', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Viewport matrix runs once.');
  await page.goto('/');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const language of ['en', 'hil']) {
      await page.locator('.language-label select').selectOption(language);
      await expect(page.locator('.quick-call-button')).toHaveCount(6);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      for (const button of await page.locator('.quick-call-button').all()) {
        const box = await button.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(48);
        expect(box!.width).toBeGreaterThanOrEqual(48);
      }
      await page.screenshot({
        path: `.impeccable/review/quick-call-${width}-${language}.png`,
        fullPage: true,
      });
    }
  }
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 320, height: 960 });
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: '.impeccable/review/quick-call-320-hil-enlarged.png',
    fullPage: true,
  });
});
