import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page and authenticate successfully as admin', async ({ page }) => {
    await page.goto('login');
    await expect(page.locator('.brand-title')).toHaveText('DockPilot');

    await page.fill('input[formControlName="username"]', 'admin');
    await page.fill('input[formControlName="password"]', 'dockpilot_admin_2026');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('.page-title, .dashboard-container')).toBeVisible();
  });

  test('should display error message on invalid credentials', async ({ page }) => {
    await page.goto('login');
    await page.fill('input[formControlName="username"]', 'admin');
    await page.fill('input[formControlName="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-banner')).toBeVisible();
  });
});
