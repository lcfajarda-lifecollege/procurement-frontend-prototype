import { expect, test } from '@playwright/test';

test('mobile shell and primary pages remain usable', async ({ page }) => {
  await page.goto('/');
  if (await page.getByRole('button', { name: 'Local dev sign in' }).isVisible().catch(() => false)) await page.getByRole('button', { name: 'Local dev sign in' }).click();
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
  const issues: string[] = [];
  for (const path of ['/dashboard', '/requests', '/purchase-orders', '/vendors']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) issues.push(`${path}: ${overflow}px`);
  }
  expect(issues, `Mobile horizontal overflow: ${issues.join(', ')}`).toEqual([]);
});
