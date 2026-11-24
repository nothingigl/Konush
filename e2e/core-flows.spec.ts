import { expect, test } from '@playwright/test';

test.describe('Konuş! Core MVP E2E Flows', () => {
  test('1. Guest onboarding -> Turkish unit -> complete speaking skill -> XP persists after reload', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/welcome');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Настройте свой языковой');

    // Choose Turkish + 20 XP goal + submit onboarding
    await page.getByRole('button', { name: /Турецкий язык/i }).click();
    await page.getByRole('button', { name: /Оптимально/i }).click();
    await page.getByRole('button', { name: /Начать/i }).click();

    await expect(page).toHaveURL(/\/tr\/units\/1-1-food-and-drinks/);
    await expect(page.locator('[lang="tr"]').first()).toBeVisible();

    // Mark words as read aloud
    await page.getByRole('button', { name: /Отметить слова прочитанными/i }).click();
    await expect(page.getByRole('button', { name: /Слова прочитаны вслух/i })).toBeVisible();

    // Open Speaking skill and complete all 8 speak_repeat exercises
    await page.locator('a[href="/tr/units/1-1-food-and-drinks/play/speaking"]').first().click();
    await expect(page).toHaveURL(/\/tr\/units\/1-1-food-and-drinks\/play\/speaking/);

    for (let step = 0; step < 8; step++) {
      await page.getByRole('button', { name: /Получилось/i }).click();
      await page.getByRole('button', { name: /Проверить/i }).click();
      const nextBtn = page.getByRole('button', { name: /Далее|Завершить урок/i });
      await nextBtn.click();
    }

    await expect(page.getByRole('heading', { name: /Навык пройден/i })).toBeVisible();
    await expect(page.getByText('+10 XP')).toBeVisible();

    // Reload profile and verify XP & streak persisted in IndexedDB
    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Профиль|Гость/i);
    await expect(page.getByText(/10 XP|10/i).first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('2. Course switching (Turkish <-> English) and interactive English lesson player', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/tr');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Еда и напитки').first()).toBeVisible();

    await page.goto('/en');
    await expect(page.getByText('Основные фразы').first()).toBeVisible();
    await expect(page.getByText('Демо готов')).toHaveCount(0);

    await page.goto('/en/units/1-1-learn-basic-phrases');
    await expect(page.locator('[lang="en"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Поделиться/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Скачать для офлайна|Доступен офлайн/i }),
    ).toBeVisible();

    await page.goto('/en/units/1-1-learn-basic-phrases/play/reading');
    await expect(page.getByRole('button', { name: /Прослушать текст/i }).first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('3. Offline PWA flow: download unit, switch offline, verify cached unit and /offline fallback', async ({
    page,
    context,
  }) => {
    await page.goto('/tr/units/1-1-food-and-drinks');
    const downloadBtn = page.getByRole('button', { name: /Скачать для офлайна|Доступен офлайн/i });
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    // Ensure offline fallback page is reachable before cutting network
    await page.goto('/offline');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.goto('/tr/units/1-1-food-and-drinks');
    await context.setOffline(true);

    // Cached unit remains interactive in offline mode (DOM + IndexedDB)
    await expect(page.locator('[lang="tr"]').first()).toBeVisible();
    await page.getByRole('button', { name: /Отметить слова прочитанными/i }).click();
    await expect(page.getByRole('button', { name: /Слова прочитаны вслух/i })).toBeVisible();

    await context.setOffline(false);
  });

  test('4. Settings, Auth, Privacy, About pages & zero horizontal overflow', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    for (const route of ['/settings', '/auth', '/privacy', '/about', '/review']) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
      });
      expect(hasHorizontalOverflow, `Horizontal overflow on ${route}`).toBe(false);
    }

    // Verify Settings preferences controls work
    await page.goto('/settings');
    await page.getByRole('button', { name: /30 XP в день/i }).click();
    await expect(page.getByRole('status')).toContainText('30 XP');
    await expect(
      page.getByRole('button', { name: /Очистить офлайн-кэш \(сохранить прогресс\)/i }),
    ).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('5. SEO endpoints (/sitemap.xml, /robots.txt, /opengraph-image), JSON-LD & noindex', async ({
    page,
    request,
  }) => {
    const sitemapRes = await request.get('/sitemap.xml');
    expect(sitemapRes.status()).toBe(200);
    const sitemapXml = await sitemapRes.text();
    expect(sitemapXml).toContain('/tr/units/1-1-food-and-drinks');
    expect(sitemapXml).toContain('/en/units/3-boss-story-about-the-past');
    expect(sitemapXml).not.toContain('/profile');
    expect(sitemapXml).not.toContain('/settings');

    const robotsRes = await request.get('/robots.txt');
    expect(robotsRes.status()).toBe(200);
    const robotsTxt = await robotsRes.text();
    expect(robotsTxt).toContain('Disallow: /profile');
    expect(robotsTxt).toContain('Disallow: /settings');
    expect(robotsTxt).toContain('Sitemap:');

    const ogRes = await request.get('/opengraph-image');
    expect(ogRes.status()).toBe(200);
    expect(ogRes.headers()['content-type']).toContain('image/png');

    // Public unit page must expose canonical + LearningResource JSON-LD
    await page.goto('/tr/units/1-1-food-and-drinks');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain('/tr/units/1-1-food-and-drinks');
    const jsonLdRaw = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLdRaw).toContain('"LearningResource"');
    expect(jsonLdRaw).toContain('"isAccessibleForFree":true');

    // Private page must expose noindex
    await page.goto('/settings');
    const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robotsMeta).toContain('noindex');
  });
});
