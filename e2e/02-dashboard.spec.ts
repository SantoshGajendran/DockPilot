import { test, expect } from '@playwright/test';

test.describe('Dashboard & Host Telemetry', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login');
    await page.fill('input[formControlName="username"]', 'admin');
    await page.fill('input[formControlName="password"]', 'dockpilot_admin_2026');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should display overview metrics cards and host telemetry', async ({ page }) => {
    await expect(page.locator('.dashboard-container')).toBeVisible();
    await expect(page.getByText('Host CPU')).toBeVisible();
    await expect(page.getByText('Host Memory')).toBeVisible();
  });
});
