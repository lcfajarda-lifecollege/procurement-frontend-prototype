import { expect, test } from '@playwright/test';
import { addPrototypeSamples, createPrototypeSamples, sampleDataMarker } from '../src/prototypeSamples';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

test('compact sample set has valid quotations, two lots, and no fabricated attachments or payments', () => {
  const samples = createPrototypeSamples(new Date('2026-09-25T01:00:00Z'));
  expect(samples.requests).toHaveLength(4);
  expect(samples.vendors).toHaveLength(4);
  expect(samples.products).toHaveLength(4);
  expect(new Set(samples.requests[1].items?.map((item) => item.category)).size).toBe(2);
  expect(samples.requests[2].dtReviewedBy).toBe('Sample DT Reviewer');
  for (const request of samples.requests) {
    expect(request.title).toMatch(/^\[Sample\]/);
    expect(request.purpose).toBeTruthy();
    expect(request.amount).toBe(request.items!.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
    for (const quote of request.rfqQuotes!) {
      expect(samples.vendors.some((vendor) => vendor.email === quote.vendorEmail)).toBe(true);
      expect(quote.items).toHaveLength(request.items!.length);
      expect(quote.attachmentName).toBeUndefined();
    }
    expect(request.invoices).toBeUndefined();
    expect(request.history?.some((event) => ['mark_paid', 'file'].includes(event.action))).toBe(false);
  }
});

test('sample initialization preserves existing records and does not reset progress', () => {
  const storage = memoryStorage();
  const custom = { id: 'PR-CUSTOM', title: 'My real request' };
  const conflict = { id: 'PR-DEMO-1001', title: 'Existing record with matching ID', status: 'Received' };
  storage.setItem('procurement-requests', JSON.stringify([custom, conflict]));
  addPrototypeSamples(storage);
  let records = JSON.parse(storage.getItem('procurement-requests')!);
  expect(records).toHaveLength(5);
  expect(records[0]).toEqual(custom);
  expect(records[1]).toEqual(conflict);
  records[2].status = 'Ready for PO Creation';
  storage.setItem('procurement-requests', JSON.stringify(records));
  addPrototypeSamples(storage);
  records = JSON.parse(storage.getItem('procurement-requests')!);
  expect(records).toHaveLength(5);
  expect(records[2].status).toBe('Ready for PO Creation');
  expect(storage.getItem(sampleDataMarker)).toBe('true');
});

test('malformed storage is left intact without partial sample initialization', () => {
  const storage = memoryStorage();
  storage.setItem('procurement-vendors', 'not json');
  addPrototypeSamples(storage);
  expect(storage.getItem('procurement-vendors')).toBe('not json');
  expect(storage.getItem('procurement-requests')).toBeNull();
  expect(storage.getItem(sampleDataMarker)).toBeNull();
});

test('sample records open sourcing, requester selection, department approval, and receiving', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/src/prototypeSamples.ts';
    const module = await import(path);
    module.addPrototypeSamples();
  });
  await page.goto('/sourcing');
  await expect(page.locator('.rfq-list-row')).toHaveCount(2);
  await page.locator('.rfq-list-row').filter({ hasText: 'PR-DEMO-1001' }).click();
  await expect(page.getByRole('button', { name: 'Mark quotations received (Demo)' })).toBeEnabled();
  await page.getByLabel('View as role').selectOption('Requester');
  await page.getByRole('button', { name: 'Purchase Requests', exact: true }).click();
  await page.locator('.queue-item').filter({ hasText: 'PR-DEMO-1002' }).click();
  await page.getByRole('button', { name: 'Compare quotations' }).click();
  await expect(page.getByTestId('requester-sourcing-lot')).toHaveCount(2);
  await expect(page.locator('.requester-quote-choice')).toHaveCount(4);
  await page.getByLabel('View as role').selectOption('Department Head');
  await page.getByRole('button', { name: /Approvals/ }).click();
  await expect(page.locator('.approval-products')).toContainText('Sample Staff Laptop');
  await expect(page.locator('.approval-products')).toContainText('Sample DT Reviewer');
  await page.getByLabel('View as role').selectOption('Procurement Officer');
  await page.goto('/purchase-orders');
  await expect(page.locator('.queue-item')).toHaveCount(2);
  await page.goto('/receiving');
  await expect(page.getByLabel('Vendor invoice')).toBeVisible();
  await expect(page.getByText('Awaiting APS admin closure')).toBeVisible();
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('procurement-requests')!).length)).toBe(4);
});
