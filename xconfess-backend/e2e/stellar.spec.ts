import { test, expect } from '@playwright/test';

test('User can connect Stellar wallet', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).stellarWallet = {
      connect: async () => ({
        publicKey: 'GTESTPUBLICKEY123',
      }),
    };
  });

  await page.goto('/wallet');

  await page.click('[data-testid="connect-wallet"]');

  await expect(
    page.locator('text=GTESTPUBLICKEY123'),
  ).toBeVisible();
});
