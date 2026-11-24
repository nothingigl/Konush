import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium, type Browser } from '@playwright/test';

async function launchAvailableBrowser(): Promise<Browser> {
  for (const channel of ['chrome', 'msedge'] as const) {
    try {
      return await chromium.launch({ headless: true, channel });
    } catch {
      // Fallback to next channel
    }
  }
  return chromium.launch({ headless: true });
}

const PORT = 3105;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ROUTES_TO_AUDIT = [
  '/',
  '/tr',
  '/tr/units/1-1-food-and-drinks',
  '/en/units/1-1-learn-basic-phrases',
];
const MAX_INITIAL_JS_GZIP_KB = 150;

async function waitForServer(url: string, timeoutMs = 45_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Wait for server startup
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main(): Promise<void> {
  console.log('=== Konuş! Mobile, Weak-Android & JS Bundle Audit ===');

  // Start production Next.js server
  const server = spawn('npx.cmd', ['next', 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT: 'true',
      NEXT_PUBLIC_SITE_URL: BASE_URL,
    },
    stdio: 'ignore',
    shell: true,
  });

  try {
    await waitForServer(`${BASE_URL}/`);

    const browser = await launchAvailableBrowser();
    try {
      let hasFailure = false;

      for (const route of ROUTES_TO_AUDIT) {
        const context = await browser.newContext({
          viewport: { width: 360, height: 800 },
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
          reducedMotion: 'reduce',
          locale: 'ru-RU',
        });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);

        // Emulate weak Android device: 4x CPU slowdown + Slow 4G network
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 150,
          downloadThroughput: (1.6 * 1024 * 1024) / 8,
          uploadThroughput: (750 * 1024) / 8,
        });

        const jsChunksGzip = new Map<string, number>();
        const pageErrors: string[] = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        page.on('response', async (res) => {
          try {
            const url = res.url();
            if (url.includes('/_next/static/') && url.endsWith('.js') && res.status() === 200) {
              const body = await res.body();
              const gz = zlib.gzipSync(body).length;
              jsChunksGzip.set(new URL(url).pathname, gz);
            }
          } catch {
            // Ignore aborted streams
          }
        });

        const navStart = Date.now();
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
        const loadMs = Date.now() - navStart;

        const metrics = await page.evaluate(() => {
          const paints = performance.getEntriesByType('paint');
          const fcp = paints.find((p) => p.name === 'first-contentful-paint')?.startTime ?? 0;
          const overflow =
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
          const hasH1 = Boolean(document.querySelector('h1'));
          const hasLang = document.documentElement.lang === 'ru';
          const hasManifest = Boolean(document.querySelector('link[rel="manifest"]'));
          const imgsWithoutAlt = [...document.querySelectorAll('img')].filter(
            (img) => !img.hasAttribute('alt'),
          ).length;
          return {
            fcpMs: Math.round(fcp),
            overflow,
            hasH1,
            hasLang,
            hasManifest,
            imgsWithoutAlt,
          };
        });

        const totalJsGzipBytes = [...jsChunksGzip.values()].reduce((a, b) => a + b, 0);
        const totalJsGzipKb = totalJsGzipBytes / 1024;
        const jsStatus = totalJsGzipKb <= MAX_INITIAL_JS_GZIP_KB ? 'OK' : 'WARN';

        console.log(
          `[${route}] load=${loadMs}ms | FCP=${metrics.fcpMs}ms | JS(gzip)=${formatKb(totalJsGzipBytes)} (${jsStatus}, ${jsChunksGzip.size} chunks) | overflow=${metrics.overflow} | errors=${pageErrors.length} | a11y(h1=${metrics.hasH1},lang=${metrics.hasLang},noAlt=${metrics.imgsWithoutAlt}) | pwa(manifest=${metrics.hasManifest})`,
        );

        if (
          metrics.overflow ||
          pageErrors.length > 0 ||
          !metrics.hasH1 ||
          !metrics.hasLang ||
          !metrics.hasManifest ||
          metrics.imgsWithoutAlt > 0
        ) {
          hasFailure = true;
        }

        await context.close();
      }

      // Summary of largest static JS chunks on disk
      const chunksDir = path.join(process.cwd(), '.next', 'static', 'chunks');
      if (fs.existsSync(chunksDir)) {
        const files = fs
          .readdirSync(chunksDir)
          .filter((f) => f.endsWith('.js'))
          .map((f) => {
            const raw = fs.readFileSync(path.join(chunksDir, f));
            return { name: f, rawBytes: raw.length, gzBytes: zlib.gzipSync(raw).length };
          })
          .sort((a, b) => b.gzBytes - a.gzBytes)
          .slice(0, 5);

        console.log('\nTop 5 JS chunks by gzip size:');
        for (const f of files) {
          console.log(`  - ${f.name}: ${formatKb(f.gzBytes)} gzip (${formatKb(f.rawBytes)} raw)`);
        }
      }

      if (hasFailure) {
        console.error('\n[audit:mobile] FAILED — one or more mobile/a11y checks did not pass.');
        process.exit(1);
      }
      console.log('\n[audit:mobile] OK — all weak-Android, PWA & a11y checks passed!');
    } finally {
      await browser.close();
    }
  } finally {
    server.kill();
  }
}

main().catch((err) => {
  console.error('[audit:mobile] Fatal error:', err);
  process.exit(1);
});
