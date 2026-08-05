import { test, expect, type Page } from '@playwright/test';

async function registerAndSignIn(page: Page, email: string, displayName: string): Promise<void> {
  const password = 'correct-horse-battery-staple';

  await page.goto('/auth');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button.ghost-btn[type="button"]');
  await page.fill('input[type="text"]', displayName);
  await page.click('button.primary-btn[type="submit"]');
  await expect(page.locator('.alert-success')).toBeVisible();

  await page.click('button.ghost-btn[type="button"]');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button.primary-btn[type="submit"]');
  await expect(page.locator('text=Welcome,')).toBeVisible();
}

test('unauthenticated visitors cannot reach the race, garage, or leaderboard', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/auth$/);

  await page.goto('/garage');
  await expect(page).toHaveURL(/\/auth$/);

  await page.goto('/leaderboard');
  await expect(page).toHaveURL(/\/auth$/);
});

test('signed-in user builds a personal garage and races to a personal leaderboard', async ({ page }) => {
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `racer-${uniqueSuffix}@example.com`;

  await registerAndSignIn(page, email, 'AutoTest Driver');

  // Authenticated users land on the garage and build their own roster
  await page.goto('/garage');
  await page.fill('input[placeholder="e.g. Aurora"]', 'AutoTest');
  await page.selectOption('select[name="carModel"]', { index: 0 });
  await page.fill('input[type="color"]', '#ff0000');
  await page.click('text=Add racer');
  await expect(page.locator('.car-card', { hasText: 'AutoTest' })).toBeVisible();

  // Start the race and wait for it to finish
  await page.goto('/');
  const startBtn = page.locator('button.primary-btn');
  await expect(startBtn).toBeVisible();
  await expect(startBtn).toBeEnabled({ timeout: 90000 });
  await startBtn.click();

  await page.waitForSelector('.result-card', { timeout: 90000 });

  // The leaderboard reflects this user's own race, not shared/seeded data
  await page.click('text=Leaderboard');
  await expect(page.locator('.leaderboard-list li').first()).toBeVisible();

  const items = await page.$$eval('.leaderboard-list li', (els) => els.map((el) => el.textContent?.trim()));
  expect(items.length).toBeGreaterThan(0);
  expect(items.some((text) => text?.includes('AutoTest'))).toBe(true);
});
