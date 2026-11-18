import { philippineDate } from '../../src/lib/directory/date';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const adminOrigin = process.env.QROTECT_E2E_ADMIN_ORIGIN || 'http://127.0.0.1:3102';
test('administrator publishes individual items with inline validation, reviewed guidance and drag/drop maps', async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== 'desktop-chromium' || !process.env.QROTECT_E2E_ADMIN_EMAIL,
    'Uses one isolated local test account.',
  );
  let observeNavigation = () => {};
  const navigationRequested = new Promise<void>((resolve) => {
    observeNavigation = resolve;
  });
  let releaseNavigation = () => {};
  const navigationGate = new Promise<void>((resolve) => {
    releaseNavigation = resolve;
  });
  await page.route('**/admin/contacts?*', async (route) => {
    observeNavigation();
    await navigationGate;
    await route.continue();
  });
  await page.goto(`${adminOrigin}/admin`);
  await page.getByLabel('Email', { exact: true }).fill(process.env.QROTECT_E2E_ADMIN_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.QROTECT_E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Directory overview' })).toBeVisible();
  await page.getByRole('link', { name: 'Contacts', exact: true }).click();
  await navigationRequested;
  await expect(page.getByRole('navigation', { name: 'Administrator navigation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Expand navigation', exact: true })).toBeEnabled();
  const pending = page.getByRole('status').filter({ hasText: 'Loading administrator content…' });
  await expect(pending).toBeVisible();
  await expect(page.locator('main[inert] h1')).toHaveText('Directory overview');
  releaseNavigation();
  await expect(page.getByRole('heading', { name: 'Manage contacts', exact: true })).toBeVisible();
  await expect(pending).toHaveCount(0);
  await expect(page.locator('main[inert]')).toHaveCount(0);
  await page.unroute('**/admin/contacts?*');
  await page.getByRole('button', { name: 'Add contact', exact: true }).click();
  await expect(page.getByLabel('Last verified date (optional)', { exact: true })).toHaveValue(
    philippineDate(),
  );
  await expect(page.getByLabel('Show this contact publicly', { exact: true })).toHaveCount(0);
  await page.getByLabel('Agency', { exact: true }).fill('QROTECT browser test');
  await page
    .getByRole('group', { name: 'Description', exact: true })
    .getByLabel('English', { exact: true })
    .fill('Software test only');
  await page
    .getByRole('group', { name: 'Description', exact: true })
    .getByLabel('Hiligaynon', { exact: true })
    .fill('Pagtilaw lamang');
  await page
    .getByRole('group', { name: 'Line label', exact: true })
    .getByLabel('Hiligaynon', { exact: true })
    .fill('Test nga linya');
  await page.getByLabel('Search aliases', { exact: true }).pressSequentially('security, guard');
  await expect(page.getByLabel('Search aliases', { exact: true })).toHaveValue('security, guard');
  await page.getByLabel('Display number', { exact: true }).fill('0912 345 6789');
  const dial = page.getByLabel('Phone number to dial', { exact: true });
  await dial.fill('0912 345 6789 ext123');
  await page.getByRole('button', { name: 'Publish contact', exact: true }).click();
  await expect(dial).toHaveAttribute('aria-invalid', 'true');
  await expect(dial).toBeFocused();
  const errorId = await dial.getAttribute('aria-describedby');
  expect(errorId).toBeTruthy();
  await expect(
    page.locator('.field-error').filter({ hasText: 'Enter one phone number' }),
  ).toBeVisible();
  expect(
    (await (await page.request.get(`${adminOrigin}/api/public/snapshot`)).json()).contacts,
  ).toEqual([]);
  await dial.fill('09123456789');
  await page.getByLabel('Last verified date (optional)', { exact: true }).fill('');
  await page
    .getByLabel('I checked this contact and both language versions', { exact: true })
    .check();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: '.impeccable/review/admin-item-contact.png', fullPage: true });
  await page.getByRole('button', { name: 'Publish contact', exact: true }).click();
  await expect(page.locator('.admin-status')).toContainText('Contact published');
  await expect(page.locator('.admin-feedback')).toBeFocused();
  await expect(page.locator('.admin-feedback')).not.toContainText('Open pages');
  await page.screenshot({ path: '.local/browser-checks/admin-published.png' });
  const original = await (await page.request.get(`${adminOrigin}/api/public/snapshot`)).json();
  expect(original.contacts).toHaveLength(1);
  expect(original.contacts[0]).toMatchObject({ source: '', verifiedAt: '', active: true });
  await page.reload();
  await expect(page.getByLabel('Last verified date (optional)', { exact: true })).toHaveValue('');
  await page.getByRole('link', { name: 'Home quick calls', exact: true }).click();
  await page.getByRole('button', { name: 'School emergency', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Call destination', exact: true })
    .selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Publish assignment', exact: true }).click();
  await expect(page.locator('.admin-status')).toContainText('Assignment published');
  await page.getByRole('link', { name: 'Contacts', exact: true }).click();
  await page.getByLabel('Category', { exact: true }).selectOption('police');
  await page.getByRole('button', { name: 'Publish contact', exact: true }).click();
  await expect(page.locator('.admin-status')).toContainText('Home quick call');
  expect(
    (await (await page.request.get(`${adminOrigin}/api/public/snapshot`)).json()).contacts,
  ).toHaveLength(1);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('link', { name: 'Home quick calls', exact: true }).first().click();
  await page.getByRole('button', { name: 'School emergency', exact: true }).click();
  await page.getByRole('combobox', { name: 'Call destination', exact: true }).selectOption('');
  await page.getByRole('button', { name: 'Publish assignment', exact: true }).click();
  await expect(page.locator('.admin-status')).toContainText('Assignment published');
  await page.getByRole('link', { name: 'Guidance', exact: true }).click();
  await page.getByRole('button', { name: 'Add guidance topic', exact: true }).click();
  await page.getByRole('button', { name: 'Publish guidance', exact: true }).click();
  await expect(page.getByLabel('Reviewer', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page
    .getByRole('group', { name: 'Topic title', exact: true })
    .getByLabel('English', { exact: true })
    .fill('Browser test topic');
  await page
    .getByRole('group', { name: 'Topic title', exact: true })
    .getByLabel('Hiligaynon', { exact: true })
    .fill('Test nga titulo');
  await page
    .getByRole('group', { name: 'Step 1', exact: true })
    .getByLabel('English', { exact: true })
    .fill('Test text, not emergency advice');
  await page
    .getByRole('group', { name: 'Step 1', exact: true })
    .getByLabel('Hiligaynon', { exact: true })
    .fill('Test nga teksto');
  await expect(
    page
      .getByRole('group', { name: 'Topic title', exact: true })
      .getByLabel('English', { exact: true }),
  ).toHaveValue('Browser test topic');
  await expect(
    page.getByRole('group', { name: 'Step 1', exact: true }).getByLabel('English', { exact: true }),
  ).toHaveValue('Test text, not emergency advice');
  await page.getByLabel('Source URL', { exact: true }).fill('https://example.test/guide');
  await page.getByLabel('Reviewer', { exact: true }).fill('Browser test reviewer');
  await page.getByLabel('Review date', { exact: true }).fill(philippineDate());
  await page
    .getByLabel('The reviewer approved this topic and both language versions', { exact: true })
    .check();
  await page.getByRole('button', { name: 'Publish guidance', exact: true }).click();
  await expect(page.locator('.admin-status')).toContainText('Guidance published');
  let published = await (await page.request.get(`${adminOrigin}/api/public/snapshot`)).json();
  expect(published.contacts).toEqual(original.contacts);
  expect(published.guidance).toHaveLength(1);
  await page.getByRole('link', { name: 'Campus map', exact: true }).click();
  await page
    .getByLabel('Choose map image', { exact: true })
    .setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('<svg/>') });
  await expect(page.locator('.field-error[role="alert"]')).toContainText(
    'file contents must be a PNG',
  );
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
  const transfer = await page.evaluateHandle((image) => {
    const dt = new DataTransfer();
    const bytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));
    dt.items.add(new File([bytes], 'test-map.png', { type: 'image/png' }));
    return dt;
  }, png);
  await page.locator('.map-dropzone').dispatchEvent('drop', { dataTransfer: transfer });
  await expect(page.getByAltText('Private uploaded campus map preview')).toBeVisible();
  expect(
    (await (await page.request.get(`${adminOrigin}/api/public/snapshot`)).json()).map,
  ).toBeNull();
  await page
    .getByRole('group', { name: 'Map description / alternative text', exact: true })
    .getByLabel('English', { exact: true })
    .fill('Browser test image');
  await page
    .getByRole('group', { name: 'Map description / alternative text', exact: true })
    .getByLabel('Hiligaynon', { exact: true })
    .fill('Test nga larawan');
  await page
    .getByRole('group', { name: 'Text instruction 1', exact: true })
    .getByLabel('English', { exact: true })
    .fill('Test instruction');
  await page
    .getByRole('group', { name: 'Text instruction 1', exact: true })
    .getByLabel('Hiligaynon', { exact: true })
    .fill('Test nga teksto');
  await page.getByLabel('Source URL', { exact: true }).fill('https://example.test/map');
  await page.getByLabel('Reviewer', { exact: true }).fill('Test reviewer');
  await page.getByLabel('Review date', { exact: true }).fill(philippineDate());
  await page
    .getByLabel('The reviewer approved this map and both text versions', { exact: true })
    .check();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: '.impeccable/review/admin-item-map-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Publish map', exact: true }).click();
  await expect(page.locator('.admin-status')).toContainText('Map published');
  published = await (await page.request.get(`${adminOrigin}/api/public/snapshot`)).json();
  expect(published.map.description.en).toBe('Browser test image');
  expect(published.contacts).toEqual(original.contacts);
  expect(published.guidance).toHaveLength(1);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Remove map', exact: true }).click();
  await expect(page.locator('.admin-status')).toContainText('Map removed');
  await page.getByRole('link', { name: 'Contacts', exact: true }).click();
  await page.getByLabel('Branch', { exact: true }).fill('Published correction');
  await page.getByRole('button', { name: 'Publish contact', exact: true }).click();
  await expect(page.locator('.admin-status')).toContainText('Contact published');
  expect(
    (await (await page.request.get(`${adminOrigin}/api/public/snapshot`)).json()).contacts,
  ).toMatchObject([{ branch: 'Published correction', active: true }]);
  await page.getByRole('link', { name: 'History', exact: true }).click();
  const row = page.locator('article').filter({ hasText: original.version });
  page.once('dialog', (d) => d.accept());
  await row.getByRole('button', { name: 'Restore as new publication' }).click();
  await expect(page.locator('.admin-status')).toContainText('Restored as a new publication');
  const restored = await (await page.request.get(`${adminOrigin}/api/public/snapshot`)).json();
  expect(restored.contacts).toEqual(original.contacts);
  expect(restored.guidance).toEqual([]);
  expect(restored.map).toBeNull();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Administrator sign in' })).toBeVisible();
});

test('administrator sidebar preserves navigation state and guards unpublished edits', async ({
  page,
}, info) => {
  test.skip(!process.env.QROTECT_E2E_ADMIN_EMAIL, 'Uses an isolated local administrator.');
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('console', (message) => {
    // WebKit reports cancelled background RSC prefetches during sign-out as
    // access-control failures. Keep actual application/render errors visible.
    if (
      message.type() === 'error' &&
      !/\?_rsc=.*due to access control checks\.$/.test(message.text())
    )
      consoleErrors.push(message.text());
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${adminOrigin}/admin`);
  await page.getByLabel('Email', { exact: true }).fill(process.env.QROTECT_E2E_ADMIN_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.QROTECT_E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Directory overview' })).toBeVisible();
  const rail = page.locator('.admin-sidebar-desktop');
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await expect(rail).toHaveAttribute('data-state', 'collapsed');
  expect((await rail.boundingBox())?.width).toBe(72);
  await expect(page.getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.getByRole('link', { name: 'Contacts', exact: true }).focus();
  await expect(page.getByRole('tooltip')).toContainText('Contacts');
  await page.keyboard.press('Escape');
  if (info.project.name === 'desktop-chromium')
    await page.screenshot({
      path: '.impeccable/review/admin-sidebar-desktop-collapsed.png',
      fullPage: true,
    });
  await page.getByRole('button', { name: 'Expand navigation', exact: true }).click();
  expect((await rail.boundingBox())?.width).toBe(256);
  await page.getByRole('link', { name: 'Password', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Password', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(rail).toHaveAttribute('data-state', 'expanded');
  await expect(page.getByRole('heading', { name: 'Update password' })).toBeVisible();
  if (info.project.name === 'desktop-chromium')
    await page.screenshot({
      path: '.impeccable/review/admin-sidebar-desktop-expanded.png',
      fullPage: true,
    });
  await page.reload();
  await expect(rail).toHaveAttribute('data-state', 'collapsed');
  expect((await page.context().cookies()).some((cookie) => cookie.name === 'sidebar_state')).toBe(
    false,
  );
  await page.getByRole('link', { name: 'Contacts', exact: true }).click();
  await page.getByRole('button', { name: 'Add contact', exact: true }).click();
  await page.getByLabel('Agency', { exact: true }).fill('Unpublished sidebar check');
  await page.getByRole('button', { name: 'Expand navigation', exact: true }).click();
  await expect(page.getByLabel('Agency', { exact: true })).toHaveValue('Unpublished sidebar check');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByLabel('Agency', { exact: true })).toHaveValue('Unpublished sidebar check');
  await page.setViewportSize({ width: 1023, height: 900 });
  await expect(menu).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await menu.click();
  const drawer = page.getByRole('dialog', { name: 'Administrator menu' });
  await expect(drawer).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close menu', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(menu).toBeFocused();
  await menu.click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await drawer.getByRole('link', { name: 'Guidance', exact: true }).click();
  await expect(drawer).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/contacts$/);
  page.once('dialog', (dialog) => dialog.dismiss());
  await drawer.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(drawer).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  expect((await drawer.boundingBox())!.width).toBeLessThanOrEqual(288);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (info.project.name === 'desktop-chromium')
    await page.screenshot({
      path: '.impeccable/review/admin-sidebar-mobile-320.png',
      fullPage: true,
    });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  expect(await drawer.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  if (info.project.name === 'desktop-chromium')
    await page.screenshot({
      path: '.impeccable/review/admin-sidebar-mobile-320-text-200.png',
      fullPage: true,
    });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  await page.mouse.click(319, 400);
  await expect(drawer).toHaveCount(0);
  await expect(menu).toBeFocused();
  await expect(page.getByLabel('Agency', { exact: true })).toHaveValue('Unpublished sidebar check');
  if (info.project.name === 'desktop-chromium')
    await page.screenshot({
      path: '.impeccable/review/admin-sidebar-mobile-closed.png',
      fullPage: true,
    });
  await menu.click();
  page.once('dialog', (dialog) => dialog.accept());
  await drawer.getByRole('link', { name: 'Guidance', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/guidance$/);
  await expect(drawer).toHaveCount(0);
  await menu.click();
  await drawer.getByRole('link', { name: 'Guidance', exact: true }).click();
  await expect(drawer).toBeVisible(); // Same-route activation does not discard or close.
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(rail).toHaveAttribute('data-state', 'expanded');
  await expect(menu).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(drawer).toHaveCount(0);
  await menu.click();
  if (info.project.name === 'desktop-chromium')
    await page.screenshot({
      path: '.impeccable/review/admin-sidebar-mobile-390.png',
      fullPage: true,
    });
  await drawer.getByRole('link', { name: 'Contacts', exact: true }).click();
  await page.getByRole('button', { name: 'Add contact', exact: true }).click();
  await page.getByLabel('Agency', { exact: true }).fill('Discard on sign out');
  await menu.click();
  page.once('dialog', (dialog) => dialog.accept());
  await drawer.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Administrator sign in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
