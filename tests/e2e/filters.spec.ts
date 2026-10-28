import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('filters are collapsed, counted and applied locally; clearing preserves search', async ({
  page,
}) => {
  await page.goto('/directory?category=fire&q=fire');
  const toggle = page.getByRole('button', { name: 'Filters (1)', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('combobox', { name: 'Service area', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Sample fire station' })).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('combobox', { name: 'Service area', exact: true }).selectOption('iloilo');
  await expect(page.getByRole('button', { name: 'Filters (2)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Filters (2)', exact: true }).click();
  await page.getByRole('button', { name: 'Filters (2)', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Service area', exact: true })).toHaveValue(
    'iloilo',
  );
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page).toHaveURL(/\/directory\?q=fire$/);
  await expect(page.getByRole('searchbox', { name: 'Search contacts' })).toHaveValue('fire');
  await expect(page.getByRole('button', { name: 'Filters', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.locator('.result-count')).toHaveText('1 contacts');
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Filters (2)', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Choose a category' })).toHaveValue('fire');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('hil');
  await expect(page.getByRole('button', { name: 'Mga filter (2)', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.getByRole('combobox', { name: 'Lugar sang serbisyo' })).toHaveValue('iloilo');
});

test('keyboard disclosure keeps focus stable and hidden controls out of tab order', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Shared keyboard path covered once.');
  await page.goto('/directory');
  const toggle = page.locator('.filter-toggle');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Choose a category' })).toBeFocused();
  await page.getByRole('combobox', { name: 'Choose a category' }).selectOption('fire');
  await expect(page.getByRole('combobox', { name: 'Choose a category' })).toBeFocused();
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Call', exact: true })).toBeFocused();
  await expect(page.getByRole('region', { name: 'Contact results' })).not.toHaveAttribute(
    'aria-live',
    'polite',
  );
  await expect(page.locator('.result-count')).toHaveAttribute('role', 'status');
});

test('loaded-directory filtering makes no requests and empty reset clears all restrictions', async ({
  page,
}) => {
  const refreshed = page.waitForResponse((response) =>
    response.url().endsWith('/api/public/snapshot'),
  );
  await page.goto('/directory');
  await refreshed;
  let requests = 0;
  page.on('request', () => requests++);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('combobox', { name: 'Choose a category' }).selectOption('fire');
  await page.getByRole('combobox', { name: 'Service area', exact: true }).selectOption('cpu');
  await page.getByRole('searchbox').fill('missing contact');
  await expect(page.locator('.result-count')).toHaveText('0 contacts');
  await expect(page.getByText('No approved contacts match your search.')).toBeVisible();
  await page
    .locator('.empty-state')
    .getByRole('button', { name: 'Clear filters', exact: true })
    .click();
  await expect(page).toHaveURL(/\/directory$/);
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await expect(page.locator('.result-count')).toHaveText('6 contacts');
  expect(requests).toBe(0);
});

test('toolbar and panel reflow in both languages with accessible open and closed states', async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== 'desktop-chromium',
    'One viewport and text-size matrix covers shared CSS.',
  );
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/directory?category=fire');
    for (const language of ['en', 'hil']) {
      await page.locator('.language-label select').selectOption(language);
      const toggle = page.locator('.filter-toggle');
      const input = await page.getByRole('searchbox').boundingBox();
      const button = await toggle.boundingBox();
      expect(Math.abs(input!.y - button!.y)).toBeLessThan(2);
      expect(button!.height).toBeGreaterThanOrEqual(48);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `.impeccable/review/filters-${width}-${language}-closed.png`,
        fullPage: true,
      });
      await toggle.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `.impeccable/review/filters-${width}-${language}-open.png`,
        fullPage: true,
      });
      if (width === 390 && language === 'en') {
        const violations = (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
            .analyze()
        ).violations;
        expect(violations).toEqual([]);
      }
      await toggle.click();
    }
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  await page.locator('.filter-toggle').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('region', { name: 'Mga filter sang listahan' })).toBeVisible();
  await page.screenshot({
    path: '.impeccable/review/filters-320-hil-enlarged.png',
    fullPage: true,
  });
});
