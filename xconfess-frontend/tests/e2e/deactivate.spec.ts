import { test, expect } from "@playwright/test";

test("user can deactivate account and logout", async ({ page }) => {
  // Login first
  await page.goto("/login");
  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");

  // Navigate to profile
  await page.goto("/dashboard/profile");

  // Click deactivate
  await page.click("text=Deactivate Account & Logout");

  // Wait for redirect
  await page.waitForURL("/login");

  // Check logout
  await expect(page.locator("text=Login")).toBeVisible();
});