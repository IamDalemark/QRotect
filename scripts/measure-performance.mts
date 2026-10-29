import { chromium, devices } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const origin = process.env.QROTECT_PERF_ORIGIN || 'http://127.0.0.1:3130';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname))
  throw new Error('Performance checks must target a local production server.');
const label = process.argv[2] || 'measurement';
if (!/^[a-z0-9-]+$/i.test(label)) throw new Error('Use a simple report label.');
const routes = ['/', '/directory', '/guidance', '/campus-map', '/about'];
const measurements: Record<string, unknown>[] = [];
const browser = await chromium.launch();
try {
  for (const route of routes) {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({ ...devices['Pixel 7'] });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: 1_600_000 / 8,
        uploadThroughput: 750_000 / 8,
      });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.addInitScript(() => {
        const metrics = { lcpMs: 0, cls: 0 };
        Object.defineProperty(window, '__qrotectPerformance', { value: metrics });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) metrics.lcpMs = entry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
            if (!shift.hadRecentInput) metrics.cls += shift.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        document.addEventListener(
          'click',
          (event) => {
            if (event.target instanceof Element && event.target.closest('a[href^="tel:"]'))
              event.preventDefault();
          },
          true,
        );
      });
      await page.goto(new URL(route, origin).href, { waitUntil: 'load' });
      await page.getByRole('combobox', { name: 'Language', exact: true }).waitFor();
      await page.waitForFunction(() => !document.querySelector('select')?.disabled);
      const interactiveMs = await page.evaluate(() => performance.now());
      await page.waitForTimeout(1500);
      const timings = await page.evaluate(() => {
        const metrics = (
          window as unknown as { __qrotectPerformance: { lcpMs: number; cls: number } }
        ).__qrotectPerformance;
        const navigation = performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming;
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const scripts = resources.filter((entry) => new URL(entry.name).pathname.endsWith('.js'));
        return {
          ...metrics,
          ttfbMs: navigation.responseStart,
          documentBytes: navigation.transferSize,
          jsTransferBytes: scripts.reduce((sum, entry) => sum + entry.transferSize, 0),
          jsResources: scripts.length,
          resourceTransferBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
        };
      });
      let confirmationMs: number | null = null;
      if (route === '/') {
        const start = await page.evaluate(() => performance.now());
        await page
          .locator('.emergency-line')
          .getByRole('button', { name: 'Call', exact: true })
          .click();
        await page.getByRole('dialog').waitFor();
        confirmationMs = (await page.evaluate(() => performance.now())) - start;
      }
      measurements.push({ route, run, ...timings, interactiveMs, confirmationMs });
      console.log(
        `${route} run ${run}: ${timings.jsTransferBytes} JS bytes; LCP ${Math.round(timings.lcpMs)} ms`,
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
}
mkdirSync('.local/performance', { recursive: true });
const report = {
  label,
  measuredAt: new Date().toISOString(),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  origin,
  profile:
    'Pixel 7 / Chromium; cold browser cache; 4x CPU; 150ms latency; 1.6Mbps download; 3 runs per route',
  limitations:
    'Local sample production build, warm local server, no approved map, synthetic timings; not field Web Vitals or hosted database latency. Interactive timing uses the hydrated language selector. Confirmation timing includes browser automation.',
  measurements,
};
const output = `.local/performance/${label}.json`;
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(`Saved ${output}`);
