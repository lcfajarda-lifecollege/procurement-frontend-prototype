import { expect, test } from '@playwright/test';
import { demoRequests, vendors, productCatalog, initialUsers } from './fixtures/procurement';

test('a new workspace is empty and a manually entered request survives reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Guided procurement process demo')).toHaveCount(0);
  for (const path of ['/requests', '/sourcing', '/purchase-orders', '/vendors', '/products', '/administration']) {
    await page.goto(path);
    await page.getByLabel('View as role').selectOption('Super Admin');
    await expect(page.locator('.guided-demo-panel, .stage-preview-row, .po-preview-switcher')).toHaveCount(0);
    await expect(page.locator('.queue-item, .rfq-list-row, .vendor-table tbody tr, .product-master-table tbody tr')).toHaveCount(0);
  }
  await page.goto('/requests/new');
  await page.getByLabel('View as role').selectOption('Requester');
  await page.getByPlaceholder('Example: Computer laboratory supplies').fill('New office purchase');
  await page.getByLabel('Purpose type').selectOption('Event');
  await page.getByLabel('Purpose of request').fill('Annual faculty workshop');
  await page.getByPlaceholder('Search or add a product').fill('Storage cabinet');
  await page.getByLabel('New product description or specifications').fill('Steel cabinet with two locking doors');
  await page.getByLabel('New product estimated unit cost').fill('5000');
  await page.getByRole('button', { name: 'Add product to request' }).click();
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.locator('.queue-item')).toContainText('New office purchase');
  await page.reload();
  await expect(page.locator('.queue-item')).toContainText('New office purchase');
  await expect(page.locator('.queue-item')).toHaveCount(1);
  await expect(page.locator('.request-purpose')).toContainText('Event');
  await expect(page.locator('.request-purpose')).toContainText('Annual faculty workshop');
});

test('migration removes saved samples but preserves custom records and runs only once', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((samples) => {
    localStorage.removeItem('procurement-samples-removed-v1');
    localStorage.setItem('procurement-requests', JSON.stringify([...samples.demoRequests, { ...samples.demoRequests[0], id: 'PR-CUSTOM', title: 'User-created request' }]));
    localStorage.setItem('procurement-vendors', JSON.stringify([...samples.vendors, { name: 'Custom supplier', email: 'custom@example.test', terms: '30 days', lead: '7 days', rating: 'New' }]));
    localStorage.setItem('procurement-products', JSON.stringify([...samples.productCatalog, { name: 'Custom product', category: 'Furniture', description: 'Required specs', uom: 'UNIT', price: 50 }]));
    localStorage.setItem('procurement-user-assignments', JSON.stringify([...samples.initialUsers, { ...samples.initialUsers[0], id: 'USR-CUSTOM', email: 'user@example.test' }]));
  }, { demoRequests, vendors, productCatalog, initialUsers });
  await page.reload();
  const counts = await page.evaluate(() => ['procurement-requests', 'procurement-vendors', 'procurement-products', 'procurement-user-assignments'].map((key) => JSON.parse(localStorage.getItem(key)!).length));
  expect(counts).toEqual([1, 1, 1, 1]);
  await page.evaluate(() => localStorage.setItem('procurement-products', JSON.stringify([{ name: 'Projector', category: 'Technology', description: 'Added after cleanup', uom: 'UNIT', price: 100 }])));
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('procurement-products')!)[0].description)).toBe('Added after cleanup');
});
