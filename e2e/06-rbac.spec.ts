import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control Enforcement', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('admin user has access to administration settings', async ({ page }) => {
    await page.goto('login');
    await page.fill('input[formControlName="username"]', 'admin');
    await page.fill('input[formControlName="password"]', 'dockpilot_admin_2026');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);

    await page.goto('settings');
    await expect(page.locator('.settings-container, h1')).toBeVisible();
  });
});
