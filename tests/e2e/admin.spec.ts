import { test, expect } from '@playwright/test';
test('invited admin saves private drafts and unreviewed content cannot publish', async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== 'desktop-chromium' || !process.env.QROTECT_E2E_ADMIN_EMAIL,
    'Uses one isolated local test account.',
  );
  await page.goto('http://127.0.0.1:3102/admin');
  await page.getByLabel('Email', { exact: true }).fill(process.env.QROTECT_E2E_ADMIN_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.QROTECT_E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Directory overview' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Administrator navigation' })
    .getByRole('link', { name: 'Contacts', exact: true })
    .click();
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
  await page.getByLabel('Display number', { exact: true }).fill('09XX XXX XXXX');
  await page
    .getByLabel('Dial value (one number, digits and optional +)', { exact: true })
    .fill('000');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved.');
  await page
    .getByRole('navigation', { name: 'Administrator navigation' })
    .getByRole('link', { name: 'Preview & publish', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Publish updates', exact: true })).toBeDisabled();
  await expect(
    page.getByText('QROTECT browser test: approval, verification date, and source are required.'),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Administrator navigation' })
    .getByRole('link', { name: 'Campus map', exact: true })
    .click();
  await page.getByLabel('PNG, JPEG or WebP · maximum 5 MB').setInputFiles({
    name: 'invalid.png',
    mimeType: 'image/png',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  });
  await expect(page.getByRole('status')).toContainText('file contents must be a PNG');
  await page.screenshot({ path: '.impeccable/review/admin-map.png', fullPage: true });
  await page.goto('http://127.0.0.1:3102/admin/contacts');
  await page
    .getByLabel('Official verification source URL', { exact: true })
    .fill('https://example.test/verified');
  await page
    .getByLabel('Last verified date', { exact: true })
    .fill(new Date().toISOString().slice(0, 10));
  await page
    .getByLabel('Reviewed contact and both languages are approved', { exact: true })
    .check();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved.');
  await page.goto('http://127.0.0.1:3102/admin/publish');
  await page.getByRole('button', { name: 'Publish updates', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Published.');
  const published = await (
    await page.request.get('http://127.0.0.1:3102/api/public/snapshot')
  ).json();
  expect(published.contacts).toHaveLength(1);
  expect(published.contacts[0].agency).toBe('QROTECT browser test');
  await page.goto('http://127.0.0.1:3102/admin/contacts');
  await page.getByLabel('Active contact', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved.');
  await page.goto('http://127.0.0.1:3102/admin/publish');
  await page.getByRole('button', { name: 'Publish updates', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Published.');
  const withdrawn = await (
    await page.request.get('http://127.0.0.1:3102/api/public/snapshot')
  ).json();
  expect(withdrawn.contacts).toEqual([]);
  expect(withdrawn.version).not.toBe(published.version);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Administrator sign in' })).toBeVisible();
});
