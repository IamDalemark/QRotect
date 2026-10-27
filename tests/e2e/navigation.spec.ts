import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fixtureSnapshot } from '../../src/lib/directory/fixtures';
import { categoryIds } from '../../src/lib/directory/schema';

test('Home offers browsing and calling for all six categories without priority rows', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.home-category')).toHaveCount(6);
  await expect(page.getByRole('heading', { name: 'School & local contacts' })).toHaveCount(0);
  await expect(page.locator('.contact-row')).toHaveCount(0);
  for (const category of categoryIds) {
    const article = page
      .locator('.home-category')
      .filter({ has: page.locator(`#home-category-${category}`) });
    await expect(article.getByRole('button')).toHaveCount(1);
    await expect(article.getByRole('link', { name: /View contacts/ })).toHaveAttribute(
      'href',
      `/directory?category=${category}`,
    );
    await article.getByRole('link', { name: /View contacts/ }).click();
    await expect(page).toHaveURL(`/directory?category=${category}`);
    await expect(page.locator('.contact-row')).toHaveCount(1);
    await expect(page.locator('.public-nav a[aria-current="page"]')).toHaveAttribute(
      'href',
      '/directory',
    );
    await page.goBack();
    await expect(page.locator('.home-category')).toHaveCount(6);
  }
});

test('three page destinations retain direct links, active state and browser Back', async ({
  page,
}) => {
  await page.goto('/directory?category=fire&q=station');
  const nav = page.locator('.public-nav');
  await expect(nav.getByRole('link')).toHaveCount(3);
  await expect(nav.getByRole('link', { name: 'All contacts', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await nav.getByRole('link', { name: 'Guide', exact: true }).click();
  await expect(page).toHaveURL('/guidance');
  await expect(page.getByRole('heading', { name: 'How to call a contact' })).toBeVisible();
  await expect(page.locator('.public-nav a[aria-current="page"]')).toHaveText('Guide');
  await page.goBack();
  await expect(page).toHaveURL('/directory?category=fire&q=station');
  await expect(page.getByRole('heading', { name: 'Sample fire station' })).toBeVisible();
  await page.locator('.public-nav').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('.public-nav a[aria-current="page"]')).toHaveText('Home');
  await expect(
    page.locator('.site-footer').getByRole('link', { name: 'About QROTECT' }),
  ).toHaveAttribute('href', '/about');
  await expect(
    page.locator('.public-nav').getByRole('link', { name: 'About QROTECT' }),
  ).toHaveCount(0);
  await page.goto('/campus-map');
  await expect(page.locator('.public-nav a[aria-current="page"]')).toHaveAttribute(
    'href',
    '/guidance',
  );
});

test('all three destinations work from the saved shell offline in Hiligaynon', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.getByText('Available offline', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.locator('.language-label select').selectOption('hil');
  await context.setOffline(true);
  await page.locator('.public-nav').getByRole('link', { name: 'Giya', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Giya', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Paano magtawag sa kontak' })).toBeVisible();
  await expect(page.locator('.public-nav a[aria-current="page"]')).toHaveText('Giya');
  await page
    .locator('.public-nav')
    .getByRole('link', { name: 'Tanan nga kontak', exact: true })
    .click();
  await expect(page.locator('.contact-row')).toHaveCount(6);
  await expect(page.locator('.public-nav a[aria-current="page"]')).toHaveAttribute(
    'href',
    '/directory',
  );
  await page.locator('.public-nav').getByRole('link', { name: 'Panguna', exact: true }).click();
  await expect(page.locator('.home-category')).toHaveCount(6);
  await expect(page.locator('.public-nav a[aria-current="page"]')).toHaveAttribute('href', '/');
});

test('mobile navigation stays above safe-area space, clears the footer and hides during confirmation', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'desktop-chromium', 'Phone-profile geometry check.');
  await page.goto('/');
  const nav = page.locator('.public-nav');
  await expect(nav).toHaveCSS('position', 'fixed');
  await expect
    .poll(async () => {
      const box = await nav.boundingBox();
      return Math.abs(box!.y + box!.height - (await page.evaluate(() => innerHeight)));
    })
    .toBeLessThan(2);
  await page.getByRole('button', { name: /Call Police:/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(nav).toBeHidden();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(nav).toBeVisible();
  await expect(page.getByRole('button', { name: /Call Police:/ })).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const footer = await page.locator('.site-footer').boundingBox();
  const bar = await nav.boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(bar!.y + 1);
});

test('Guide shows approved safety content and map without changing the three navigation items', async ({
  page,
}) => {
  const snapshot = structuredClone(fixtureSnapshot);
  snapshot.publishedAt = new Date().toISOString();
  snapshot.guidance = [
    {
      id: '30000000-0000-4000-8000-000000000001',
      title: { en: 'Reviewed campus procedure', hil: 'Ginpamatud-an nga pamaagi' },
      category: 'school',
      steps: [
        { en: 'School-reviewed test content.', hil: 'Ginpamatud-an nga sulod para sa pagtilaw.' },
      ],
      source: 'https://example.test/source',
      reviewedAt: '2026-10-28',
      reviewer: 'Test reviewer',
      approved: true,
    },
  ];
  snapshot.guidance.push({
    ...snapshot.guidance[0],
    id: '30000000-0000-4000-8000-000000000002',
    title: { en: 'Unapproved test guidance', hil: '' },
    approved: false,
  });
  snapshot.map = {
    id: '40000000-0000-4000-8000-000000000001',
    assetPath: '40000000-0000-4000-8000-000000000001.png',
    description: { en: 'School-supplied map description.', hil: 'Mapa halin sa eskwelahan.' },
    instructions: [{ en: 'School-supplied text equivalent.', hil: 'Teksto halin sa eskwelahan.' }],
    source: 'https://example.test/map',
    reviewedAt: '2026-10-28',
    reviewer: 'Test reviewer',
    approved: true,
  };
  await page.route('**/api/public/snapshot', (route) => route.fulfill({ json: snapshot }));
  await page.goto('/guidance');
  await expect(page.getByRole('heading', { name: 'Reviewed campus procedure' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Unapproved test guidance' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'View campus map' })).toHaveAttribute(
    'href',
    '/campus-map',
  );
  await expect(page.locator('.public-nav').getByRole('link')).toHaveCount(3);
});

test('Guide and navigation reflow at narrow widths, enlarged text and in both languages', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Shared responsive/accessibility matrix.');
  await page.goto('/guidance');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const language of ['en', 'hil']) {
      await page.locator('.language-label select').selectOption(language);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      for (const link of await page.locator('.public-nav a').all()) {
        const box = await link.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(48);
        expect(box!.width).toBeGreaterThanOrEqual(48);
      }
      await page.screenshot({
        path: `.impeccable/review/navigation-guide-${width}-${language}.png`,
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
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect
    .poll(async () => {
      const box = await page.locator('.public-nav').boundingBox();
      return (
        parseFloat(
          await page
            .locator('.public-site')
            .evaluate((element) => getComputedStyle(element).paddingBottom),
        ) - box!.height
      );
    })
    .toBeGreaterThanOrEqual(-1);
  await page.screenshot({
    path: '.impeccable/review/navigation-guide-320-hil-enlarged.png',
    fullPage: true,
  });
});
