import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser } from '@playwright/test';

const PORT = 3123;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = path.join(process.cwd(), 'design', 'screenshots');

const ROUTES_TO_CAPTURE = [
  { name: '01-home', path: '/' },
  { name: '02-welcome', path: '/welcome' },
  { name: '03-course-tr', path: '/tr' },
  { name: '04-unit-tr-1-1', path: '/tr/units/1-1-food-and-drinks' },
  { name: '05-player-tr-1-1-writing', path: '/tr/units/1-1-food-and-drinks/play/writing' },
  { name: '06-review', path: '/review' },
  { name: '07-profile', path: '/profile' },
  { name: '08-settings', path: '/settings' },
  { name: '09-auth', path: '/auth' },
  { name: '10-about', path: '/about' },
  { name: '11-privacy', path: '/privacy' },
];

async function waitForServer(url: string, timeoutMs = 20_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Wait and retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

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

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  const serverProc = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], {
    stdio: 'ignore',
  });

  try {
    await waitForServer(BASE_URL);
    const browser = await launchAvailableBrowser();

    for (const viewport of [
      { label: '360px', width: 360, height: 800 },
      { label: '1280px', width: 1280, height: 800 },
    ] as const) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();

      for (const item of ROUTES_TO_CAPTURE) {
        await page.goto(`${BASE_URL}${item.path}`, { waitUntil: 'networkidle' });
        const filePath = path.join(OUT_DIR, `${item.name}-${viewport.label}-light.png`);
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`[screenshots] Captured ${path.basename(filePath)}`);
      }

      // Capture Dark theme on Home and Unit pages at 360px and 1280px
      for (const item of [ROUTES_TO_CAPTURE[0]!, ROUTES_TO_CAPTURE[3]!]) {
        await page.goto(`${BASE_URL}${item.path}`, { waitUntil: 'networkidle' });
        await page.evaluate(() => {
          document.documentElement.classList.add('dark');
        });
        const filePath = path.join(OUT_DIR, `${item.name}-${viewport.label}-dark.png`);
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`[screenshots] Captured ${path.basename(filePath)}`);
      }

      await context.close();
    }

    await browser.close();
  } finally {
    serverProc.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
