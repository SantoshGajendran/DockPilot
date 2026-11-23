import { test, expect } from '@playwright/test';

test.describe('Logs Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login');
    await page.fill('input[formControlName="username"]', 'admin');
    await page.fill('input[formControlName="password"]', 'dockpilot_admin_2026');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should open logs explorer and display log control panel', async ({ page }) => {
    await page.goto('logs');
    await expect(page.locator('.logs-container, .page-title, h1')).toBeVisible();
  });
});
