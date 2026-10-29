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
  await page.goto(`${adminOrigin}/admin`);
  await page.getByLabel('Email', { exact: true }).fill(process.env.QROTECT_E2E_ADMIN_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.QROTECT_E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Directory overview' })).toBeVisible();
  await page.getByRole('link', { name: 'Contacts', exact: true }).click();
  await page.getByRole('button', { name: 'Add contact', exact: true }).click();
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
  await page
    .getByLabel('Official verification source URL', { exact: true })
    .fill('https://example.test/verified');
  await page.getByLabel('Last verified date', { exact: true }).fill('2026-01-01');
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
  const original = await (await page.request.get(`${adminOrigin}/api/public/snapshot`)).json();
  expect(original.contacts).toHaveLength(1);
  await page.getByRole('link', { name: 'Home quick calls', exact: true }).click();
  await page.getByRole('button', { name: 'School emergency', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Call destination', exact: true })
    .selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Publish assignment', exact: true }).click();
  await expect(page.locator('.admin-status')).toContainText('Assignment published');
  await page.getByRole('link', { name: 'Contacts', exact: true }).click();
  await page.getByLabel('Show this contact publicly', { exact: true }).uncheck();
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
  await page.getByLabel('Review date', { exact: true }).fill('2026-01-01');
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
  await page.getByLabel('Review date', { exact: true }).fill('2026-01-01');
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
  await page.getByLabel('Show this contact publicly', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Publish contact', exact: true }).click();
  await expect(page.locator('.admin-status')).toContainText('Contact published');
  expect(
    (await (await page.request.get(`${adminOrigin}/api/public/snapshot`)).json()).contacts,
  ).toEqual([]);
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
