import { test, expect } from '@playwright/test';

test.describe('Containers Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login');
    await page.fill('input[formControlName="username"]', 'admin');
    await page.fill('input[formControlName="password"]', 'dockpilot_admin_2026');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should navigate to containers list and display table or empty state', async ({ page }) => {
    await page.goto('containers');
    await expect(page.locator('.page-title')).toHaveText('Containers');
    await expect(page.locator('.filter-card')).toBeVisible();
    await expect(page.locator('input[placeholder="Name, ID or image"]')).toBeVisible();
  });
});
