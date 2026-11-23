import { test, expect } from '@playwright/test';

test.describe('Alerts & Rules Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login');
    await page.fill('input[formControlName="username"]', 'admin');
    await page.fill('input[formControlName="password"]', 'dockpilot_admin_2026');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should display alerts page with rules and channel actions', async ({ page }) => {
    await page.goto('alerts');
    await expect(page.locator('.page-title')).toHaveText('Alerts & Rules');
    await expect(page.getByRole('button', { name: /Create Rule/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Notification Channels/i })).toBeVisible();
  });
});
