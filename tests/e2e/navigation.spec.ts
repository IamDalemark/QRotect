import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { categories } from '../../src/lib/directory/labels';
import { fixtureSnapshot } from '../../src/lib/directory/fixtures';
import { categoryIds } from '../../src/lib/directory/schema';

test('Home offers contacts, calling, and Guide links for all six categories', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-category')).toHaveCount(6);
  await expect(page.getByRole('heading', { name: 'School & local contacts' })).toHaveCount(0);
  await expect(page.locator('.contact-row')).toHaveCount(0);
  for (const category of categoryIds) {
    const article = page
      .locator('.home-category')
      .filter({ has: page.locator(`#home-category-${category}`) });
    await expect(article.getByRole('button')).toHaveCount(2);
    await expect(article.getByRole('button', { name: /^Copy:/ })).toHaveText('Copy');
    await expect(article.getByRole('link', { name: /View other contacts/ })).toHaveAttribute(
      'href',
      `/directory?category=${category}`,
    );
    await article.getByRole('link', { name: /View other contacts/ }).click();
    await expect(page).toHaveURL(`/directory?category=${category}`);
    await expect(page.locator('.contact-row')).toHaveCount(1);
    await expect(page.locator('.public-nav a[aria-current="page"]')).toHaveAttribute(
      'href',
      '/directory',
    );
    await page.goBack();
    await expect(page.locator('.home-category')).toHaveCount(6);

    const tips = article.getByRole('link', { name: /^What to do/ });
    const guideUrl = `/guidance?category=${category}`;
    await expect(tips).toHaveAttribute('href', guideUrl);
    await tips.focus();
    await expect(tips).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(guideUrl);
    const title = category === 'school' ? 'Campus emergency' : categories[category].en;
    const selected = page.getByRole('region', { name: title, exact: true });
    await expect(selected).toBeVisible();
    await expect(
      selected.getByText('Approved emergency guidance is not available yet.'),
    ).toBeVisible();
    await expect(selected.getByRole('link', { name: /^View other contacts/ })).toHaveAttribute(
      'href',
      `/directory?category=${category}`,
    );
    await expect(page.getByRole('link', { name: 'All topics', exact: true })).toHaveAttribute(
      'href',
      '/guidance',
    );
    await page.goBack();
    await expect(article).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Guide', exact: true })).toBeVisible();
  await expect(page.locator('.public-nav a[aria-current="page"]')).toHaveText('Guide');
  await page.goBack();
  await expect(page).toHaveURL('/directory?category=fire&q=station');
  await expect(page.getByRole('heading', { name: 'Sample fire station' })).toBeVisible();
  await page.locator('.public-nav').getByRole('link', { name: 'Get help', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('.public-nav a[aria-current="page"]')).toHaveText('Get help');
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

test('all three destinations work online in Hiligaynon', async ({ page }) => {
  await page.goto('/');
  await page.locator('.language-label select').selectOption('hil');
  const fire = page.locator('.home-category').filter({ has: page.locator('#home-category-fire') });
  await fire.getByRole('link', { name: 'Ano ang himuon: Sunog' }).click();
  await expect(page).toHaveURL('/guidance?category=fire');
  await expect(page.getByRole('heading', { name: 'Sunog', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sunog', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Tanan nga topiko', exact: true }).click();
  await expect(page).toHaveURL('/guidance');
  await expect(page.getByRole('heading', { name: 'Giya', exact: true })).toBeVisible();
  await expect(page.getByText('Wala pa sang gin-aprobahan nga giya sa emerhensya.')).toBeVisible();
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
  await page
    .locator('.public-nav')
    .getByRole('link', { name: 'Pangayo bulig', exact: true })
    .click();
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
}, info) => {
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
  snapshot.guidance.push(
    {
      ...snapshot.guidance[0],
      id: '30000000-0000-4000-8000-000000000003',
      title: { en: 'Reviewed fire evacuation', hil: 'Ginpamatud-an nga pagbakwit sa sunog' },
      category: 'fire',
      steps: [
        { en: 'First reviewed step.', hil: 'Una nga paagi.' },
        { en: 'Second reviewed step.', hil: 'Ikaduha nga paagi.' },
      ],
    },
    {
      ...snapshot.guidance[0],
      id: '30000000-0000-4000-8000-000000000004',
      title: { en: 'Reviewed extinguisher procedure', hil: 'Ginpamatud-an nga paggamit' },
      category: 'fire',
    },
  );
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

  await page.goto('/guidance?category=fire');
  const fire = page.getByRole('region', { name: 'Fire', exact: true });
  await expect(fire.getByRole('heading', { level: 3 })).toHaveText([
    'Reviewed fire evacuation',
    'Reviewed extinguisher procedure',
  ]);
  const firstTopic = fire.locator('.guide').first();
  await expect(firstTopic.getByRole('listitem')).toHaveText([
    'First reviewed step.',
    'Second reviewed step.',
  ]);
  await expect(firstTopic.getByRole('link', { name: 'View source' })).toHaveAttribute(
    'href',
    'https://example.test/source',
  );
  await expect(firstTopic.locator('time')).toHaveAttribute('datetime', '2026-10-28');
  await expect(firstTopic).toContainText('Test reviewer');
  await expect(page.getByRole('heading', { name: 'Reviewed campus procedure' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'View campus map' })).toHaveCount(0);
  if (info.project.name === 'desktop-chromium') {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: '.impeccable/review/guidance-fire-desktop.png', fullPage: true });
  }
  await page.locator('.language-label select').selectOption('hil');
  const translatedTopic = page.getByRole('region', { name: 'Sunog' }).locator('.guide').first();
  await expect(translatedTopic.getByRole('heading', { level: 3 })).toHaveText(
    'Ginpamatud-an nga pagbakwit sa sunog',
  );
  await expect(translatedTopic.getByRole('listitem')).toHaveText([
    'Una nga paagi.',
    'Ikaduha nga paagi.',
  ]);
  await expect(translatedTopic.getByRole('list')).toHaveCSS('list-style-type', 'decimal');
  if (info.project.name === 'desktop-chromium') {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: '.impeccable/review/guidance-fire-mobile.png', fullPage: true });
  }
  await page.locator('.language-label select').selectOption('en');

  await page.goto('/guidance?category=school');
  await expect(page.getByRole('heading', { name: 'Reviewed campus procedure' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View campus map' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reviewed fire evacuation' })).toHaveCount(0);

  await page.goto('/guidance?category=unknown');
  await expect(page.getByRole('heading', { name: 'Reviewed campus procedure' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reviewed fire evacuation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'All topics', exact: true })).toHaveCount(0);
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
      if (width === 1440) {
        const links = page.locator('.public-nav a');
        const first = await links.first().boundingBox();
        const last = await links.last().boundingBox();
        const bar = await page.locator('.public-nav').boundingBox();
        expect(
          Math.abs((first!.x + last!.x + last!.width) / 2 - (bar!.x + bar!.width / 2)),
        ).toBeLessThan(1);
      }
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

test('Home keeps the two category links reachable at phone and desktop sizes', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Shared responsive matrix.');
  await page.goto('/');
  const fire = page.locator('.home-category').filter({ has: page.locator('#home-category-fire') });
  const links = fire.locator('.home-category-links a');

  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const language of ['en', 'hil']) {
      await page.locator('.language-label select').selectOption(language);
      const contacts = (await links.nth(0).boundingBox())!;
      const tips = (await links.nth(1).boundingBox())!;
      expect(contacts.y).toBe(tips.y);
      expect(tips.x).toBeGreaterThanOrEqual(contacts.x + contacts.width);
      for (const box of [contacts, tips]) {
        expect(box.width).toBeGreaterThanOrEqual(48);
        expect(box.height).toBeGreaterThanOrEqual(48);
      }
    }
  }

  await page.setViewportSize({ width: 320, height: 900 });
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await links.nth(1).click();
  await expect(page).toHaveURL('/guidance?category=fire');
});
