import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const copied: string[] = [],
      phones: string[] = [];
    Object.assign(window, { __copiedNumbers: copied, __phoneAttempts: phones });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          copied.push(value);
        },
      },
    });
    document.addEventListener(
      'click',
      (event) => {
        const link =
          event.target instanceof Element ? event.target.closest('a[href^="tel:"]') : null;
        if (link) {
          event.preventDefault();
          phones.push(link.getAttribute('href')!);
        }
      },
      true,
    );
  });
});

test('Home and confirmation copy exact visible numbers without opening Phone', async ({ page }) => {
  await page.goto('/');
  const national = page.getByRole('region', { name: 'National emergency line', exact: true });
  await expect(
    national.getByRole('button', { name: 'Copy number: National emergency line' }),
  ).toHaveText('Copy number');
  await national.getByRole('button', { name: 'Copy number: National emergency line' }).click();
  await expect(national.getByRole('status')).toHaveText('Copied');
  const fire = page.locator('.home-category').filter({ hasText: 'Sample fire station' });
  await expect(fire.locator('.phone-number')).toHaveText('0912 345 6789');
  const copy = fire.getByRole('button', { name: 'Copy number: Sample fire station' });
  await expect(copy).toHaveText('Copy number');
  await copy.focus();
  await page.keyboard.press('Enter');
  await expect(fire.getByRole('status')).toHaveText('Copied');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await fire.getByRole('button', { name: /Call Fire/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Copy number: Sample fire station' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Copied');
  await expect(dialog.getByRole('link', { name: 'Open Phone instead' })).toHaveAttribute(
    'href',
    'tel:09123456789',
  );
  expect(
    await page.evaluate(() => (window as unknown as { __copiedNumbers: string[] }).__copiedNumbers),
  ).toEqual(['911', '0912 345 6789', '0912 345 6789']);
  expect(
    await page.evaluate(() => (window as unknown as { __phoneAttempts: string[] }).__phoneAttempts),
  ).toEqual([]);
});

test('clipboard failure offers manual recovery on Home and in confirmation', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('Denied');
        },
      },
    });
  });
  await page.goto('/');
  const fire = page.locator('.home-category').filter({ hasText: 'Sample fire station' });
  await fire.getByRole('button', { name: 'Copy number: Sample fire station' }).click();
  await expect(fire.getByRole('status')).toContainText('Select the visible number');
  await fire.getByRole('button', { name: /Call Fire/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Copy number: Sample fire station' })
    .click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'Select the visible number',
  );
  expect(
    await page.evaluate(() => (window as unknown as { __phoneAttempts: string[] }).__phoneAttempts),
  ).toEqual([]);
});

test('copy feedback uses the selected interface language', async ({ page }) => {
  await page.goto('/');
  await page.locator('.language-label select').selectOption('hil');
  const fire = page.locator('.home-category').filter({ hasText: 'Sample fire station' });
  const copy = fire.getByRole('button', { name: 'Kopyaha ang numero: Sample fire station' });
  await expect(copy).toHaveText('Kopyaha');
  await expect(copy).toHaveAttribute('title', 'Kopyaha ang numero');
  await expect(page.locator('.emergency-number-group button')).toHaveText('Kopyaha');
  await copy.click();
  await expect(fire.getByRole('status')).toHaveText('Nakopya');
  await expect(copy).toHaveText('Nakopya');
});

for (const route of ['/', '/directory']) {
  test(`copy success resets after three seconds and restarts on repeat at ${route}`, async ({
    page,
  }) => {
    await page.goto(route);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    const control = page.locator('.copy-control').first();
    const button = control.getByRole('button');
    await expect(button).toHaveText('Copy number');
    await button.click();
    await expect(button).toHaveText('Copied');
    await expect(button.locator('.lucide-check')).toHaveCount(1);
    await expect(control.getByRole('status')).toHaveClass(/sr-only/);
    await page.clock.runFor(2000);
    await button.click();
    await page.clock.runFor(2000);
    await expect(button).toHaveText('Copied');
    await page.clock.runFor(1000);
    await expect(button).toHaveText('Copy number');
    await expect(button.locator('.lucide-copy')).toHaveCount(1);
    await expect(control.getByRole('status')).toBeEmpty();
  });
}

test('short Hiligaynon Home copy labels stay beside numbers at mobile and desktop widths', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.language-label select').selectOption('hil');
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const row of await page.locator('.emergency-number-group, .home-category-number').all()) {
      const number = await row.locator('.emergency-number, .phone-number').boundingBox();
      const button = await row.getByRole('button').boundingBox();
      expect(number).not.toBeNull();
      expect(button).not.toBeNull();
      expect(
        Math.abs(number!.y + number!.height / 2 - button!.y - button!.height / 2),
      ).toBeLessThan(2);
      expect(button!.height).toBeGreaterThanOrEqual(48);
    }
  }
});
