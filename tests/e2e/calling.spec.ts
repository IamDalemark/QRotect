import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fixtureSnapshot } from '../../src/lib/directory/fixtures';

async function interceptPhone(page: Page) {
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.defineProperty(window, '__phoneAttempts', { value: calls });
    document.addEventListener(
      'click',
      (event) => {
        const link =
          event.target instanceof Element ? event.target.closest('a[href^="tel:"]') : null;
        if (link) {
          event.preventDefault(); // Never hand automated tests to an external phone application.
          calls.push(link.getAttribute('href')!);
        }
      },
      true,
    );
  });
}
async function attempts(page: Page) {
  return page.evaluate(() => (window as unknown as { __phoneAttempts: string[] }).__phoneAttempts);
}
async function openFire(page: Page) {
  await page.goto('/directory?category=fire');
  await page.getByRole('button', { name: 'Call', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Sample fire station');
}
async function swipe(page: Page, fraction: number, release = true) {
  const handle = await page.locator('.swipe-handle').boundingBox();
  const track = await page.locator('.swipe-track').boundingBox();
  if (!handle || !track) throw new Error('Swipe controls are missing.');
  const x = handle.x + handle.width / 2,
    y = handle.y + handle.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + (track.width - 66) * fraction, y, { steps: 12 });
  if (release) await page.mouse.up();
}

test.beforeEach(async ({ page }) => interceptPhone(page));

test('opening, tapping, partial swipe and cancelling never initiate a call', async ({ page }) => {
  await openFire(page);
  expect(await attempts(page)).toEqual([]);
  await page.locator('.swipe-handle').click();
  expect(await attempts(page)).toEqual([]);
  await swipe(page, 0.6);
  expect(await attempts(page)).toEqual([]);
  await expect(page.locator('.swipe-handle')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await swipe(page, 1, false);
  expect(await attempts(page)).toEqual([]); // Reaching the end alone is insufficient.
  await page.locator('.swipe-handle').dispatchEvent('pointercancel');
  await page.mouse.up();
  expect(await attempts(page)).toEqual([]);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Call', exact: true })).toBeFocused();
});

test('completed swipe hands the selected number off once and can be retried after closing', async ({
  page,
}, info) => {
  await openFire(page);
  await swipe(page, 1);
  expect(await attempts(page)).toEqual(['tel:09123456789']);
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'Continue in your phone app',
  );
  await expect(page.locator('.swipe-track')).toHaveCount(0);
  await page.screenshot({ path: `.impeccable/review/call-handoff-${info.project.name}.png` });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Call', exact: true }).click();
  await swipe(page, 1);
  expect(await attempts(page)).toEqual(['tel:09123456789', 'tel:09123456789']);
});

test('accessible alternative works from the keyboard and dialog passes accessibility checks', async ({
  page,
}) => {
  await openFire(page);
  const violations = (
    await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  ).violations;
  expect(violations).toEqual([]);
  await page.getByRole('link', { name: 'Open Phone instead' }).focus();
  await page.keyboard.press('Enter');
  expect(await attempts(page)).toEqual(['tel:09123456789']);
  await expect(page.getByRole('dialog')).not.toContainText('connected');
});

test('calling works in Hiligaynon', async ({ page }) => {
  await page.goto('/directory?category=fire');
  await page.goto('/directory?category=fire');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('hil');
  await page.getByRole('button', { name: 'Tawag', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Tawgan ini nga kontak?');
  await swipe(page, 1);
  expect(await attempts(page)).toEqual(['tel:09123456789']);
});

test('selected number, label and extension remain stable while a new directory queues', async ({
  page,
}) => {
  const snapshot = structuredClone(fixtureSnapshot);
  const contact = snapshot.contacts.find((c) => c.category === 'fire')!;
  contact.numbers.push({
    ...contact.numbers[0],
    id: '20000000-0000-4000-8000-000000000099',
    label: { en: 'Second line', hil: 'Ikaduha nga linya' },
    display: '(033) 320 0000',
    dial: '+63333200000',
    extension: '123',
  });
  contact.numbers.push({
    ...contact.numbers[0],
    id: '20000000-0000-4000-8000-000000000098',
    label: { en: 'Messages', hil: 'Mensahe' },
    channel: 'text',
  });
  await page.addInitScript((data) => {
    const original = window.fetch;
    window.fetch = (input, init) =>
      String(input) === '/api/public/snapshot'
        ? Promise.resolve(Response.json(data))
        : original(input, init);
  }, snapshot);
  await page.goto('/directory?category=fire');
  await expect(page.getByText('Second line', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Call', exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Call', exact: true }).nth(1).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Second line');
  await expect(dialog).toContainText('(033) 320 0000');
  await expect(dialog).toContainText('123');
  await page.evaluate((next) => {
    next.contacts.find((c) => c.category === 'fire')!.numbers[1].dial = '09123456789';
    next.contacts.find((c) => c.category === 'fire')!.numbers[1].display = 'Replacement line';
    const state = window as unknown as { replacementFetched: boolean };
    state.replacementFetched = false;
    window.fetch = () => {
      state.replacementFetched = true;
      return Promise.resolve(Response.json(next));
    };
  }, snapshot);
  // Wait for the replacement refresh before closing the frozen contact card.
  await expect
    .poll(() =>
      page.evaluate(() => {
        window.dispatchEvent(new Event('online'));
        return (window as unknown as { replacementFetched: boolean }).replacementFetched;
      }),
    )
    .toBe(true);
  await expect(dialog).toContainText('(033) 320 0000');
  await dialog.getByRole('link', { name: 'Open Phone instead' }).click();
  expect(await attempts(page)).toEqual(['tel:+63333200000']);
  await page.keyboard.press('Escape');
  await expect(page.getByText('Replacement line', { exact: true })).toBeVisible();
});

test('legacy all-zero placeholders never receive a usable call action', async ({ page }) => {
  const snapshot = structuredClone(fixtureSnapshot);
  snapshot.contacts.forEach((c) =>
    c.numbers.forEach((n) => {
      n.dial = '000';
      n.display = '09XX XXX XXXX';
    }),
  );
  await page.addInitScript((data) => {
    const original = window.fetch;
    window.fetch = (input, init) =>
      String(input) === '/api/public/snapshot'
        ? Promise.resolve(Response.json(data))
        : original(input, init);
  }, snapshot);
  await page.goto('/directory?category=fire');
  await expect(page.getByText('09XX XXX XXXX', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Call', exact: true })).toBeDisabled();
  expect(await attempts(page)).toEqual([]);
});

test('featured national contact uses the same confirmation without dialing on open', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('region', { name: 'National emergency line' })
    .getByRole('button', { name: 'Call', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('911');
  await expect(page.getByRole('link', { name: 'Open Phone instead' })).toHaveAttribute(
    'href',
    'tel:911',
  );
  expect(await attempts(page)).toEqual([]);
  await page.keyboard.press('Escape');
});

test('touch swipe opens the selected number on the Android browser profile', async ({
  page,
  context,
}, info) => {
  test.skip(
    info.project.name !== 'android-chromium',
    'Uses Chromium touch input, other engines have pointer coverage.',
  );
  await openFire(page);
  const handle = await page.locator('.swipe-handle').boundingBox();
  const track = await page.locator('.swipe-track').boundingBox();
  if (!handle || !track) throw new Error('Missing swipe controls.');
  const session = await context.newCDPSession(page);
  const x = handle.x + handle.width / 2,
    y = handle.y + handle.height / 2;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 12; step++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + ((track.width - 66) * step) / 12, y }],
    });
  expect(await attempts(page)).toEqual([]);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await attempts(page)).toEqual(['tel:09123456789']);
  await session.detach();
});

test('confirmation stays usable at narrow widths and enlarged text', async ({ page }, info) => {
  test.skip(
    info.project.name !== 'desktop-chromium',
    'One layout matrix covers the shared component.',
  );
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await openFire(page);
    const panel = page.getByRole('dialog');
    expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect(panel.getByRole('link', { name: 'Open Phone instead' })).toBeVisible();
    await page.screenshot({ path: `.impeccable/review/call-${width}.png` });
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/directory?category=fire');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('hil');
  await page.getByRole('button', { name: 'Tawag', exact: true }).click();
  await page.screenshot({ path: '.impeccable/review/call-hiligaynon.png' });
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  const labelFits = await page.locator('.swipe-track').evaluate((el) => {
    const label = el.querySelector('.swipe-label')!.getBoundingClientRect();
    const track = el.getBoundingClientRect();
    return label.top >= track.top && label.bottom <= track.bottom;
  });
  expect(labelFits).toBe(true);
  const panel = page.getByRole('dialog');
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await panel.getByRole('link', { name: 'Buksan ang Telepono' }).scrollIntoViewIfNeeded();
  await expect(panel.getByRole('link', { name: 'Buksan ang Telepono' })).toBeVisible();
  await page.screenshot({ path: '.impeccable/review/call-enlarged.png' });
  await page.keyboard.press('Escape');
});
