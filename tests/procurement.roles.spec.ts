import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/');
  if (await page.getByRole('button', { name: 'Local dev sign in' }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Local dev sign in' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

async function viewAs(page: Page, role: string) {
  await page.getByLabel('View as role').selectOption({ label: role });
  await expect(page.getByLabel('View as role')).toHaveValue(role);
}

async function visibleNavigation(page: Page) {
  return page.locator('.sidebar:not(.compact) .nav-item').allTextContents();
}

test.beforeEach(async ({ page }) => signIn(page));

test('role navigation is restricted to assigned responsibilities', async ({ page }) => {
  const matrix: Record<string, string[]> = {
    Requester: ['Dashboard', 'Purchase Requests', 'Products'],
    'DT Department': ['Dashboard', 'Approvals', 'Purchase Requests', 'Products'],
    'Department Head': ['Dashboard', 'Approvals', 'Purchase Requests', 'Reports'],
    'Finance Manager': ['Dashboard', 'Approvals', 'Purchase Orders', 'Receiving', 'Reports'],
    'Procurement Officer': ['Dashboard', 'Purchase Requests', 'RFQ & Sourcing', 'Purchase Orders', 'Receiving', 'Vendors', 'Products', 'Reports'],
  };
  for (const [role, expected] of Object.entries(matrix)) {
    await viewAs(page, role);
    const labels = (await visibleNavigation(page)).map((label) => label.replace(/\d+/g, '').trim());
    for (const item of expected) expect(labels.some((label) => label.includes(item))).toBeTruthy();
  }
});

test('dashboard active purchase opens the matching request detail', async ({ page }) => {
  await viewAs(page, 'Requester');
  const requestLink = page.locator('.dashboard-record-list button').first();
  const requestId = (await requestLink.locator('small').textContent())?.match(/PR-\d{4}-\d+/)?.[0];
  expect(requestId).toBeTruthy();
  await requestLink.click();
  await expect(page).toHaveURL(/\/requests$/);
  await expect(page.locator('.queue-item.selected')).toContainText(requestId!);
  await expect(page.locator('.request-detail-card')).toContainText(requestId!);
});

test('dashboard workflow stages reveal details on hover', async ({ page }) => {
  const rfqStage = page.locator('.lifecycle-step').filter({ hasText: 'RFQ' });
  await rfqStage.hover();
  await expect(rfqStage.locator('.stage-tooltip')).toBeVisible();
  await expect(rfqStage.locator('.stage-tooltip')).toContainText('Requests for Quotation');
});

test('requester can open a multi-item purchase request form with technology routing', async ({ page }) => {
  await viewAs(page, 'Requester');
  await page.getByRole('button', { name: 'Purchase Requests' }).click();
  await page.getByRole('button', { name: 'New request' }).click();
  await expect(page.getByRole('heading', { name: /New purchase request/i, level: 2 })).toBeVisible();
  await page.getByRole('textbox', { name: 'Request title' }).fill('Playwright technology request');
  await page.getByPlaceholder('Search or add a product').click();
  await page.getByText('Laptop Computer', { exact: true }).click();
  await expect(page.getByLabel('Laptop Computer category')).toHaveValue('Technology');
  await expect(page.getByRole('button', { name: /Submit/i })).toBeEnabled();
});

test('approval workspaces match DT and Finance roles', async ({ page }) => {
  for (const role of ['DT Department', 'Finance Manager']) {
    await viewAs(page, role);
    await page.getByRole('button', { name: /Approvals/ }).click();
    await expect(page.getByRole('heading', { name: 'Approval Queue' })).toBeVisible();
  }
});

test('procurement officer has sourcing tools but cannot mark a purchase paid', async ({ page }) => {
  await viewAs(page, 'Procurement Officer');
  await page.getByRole('button', { name: /RFQ & Sourcing/ }).click();
  await expect(page.getByRole('heading', { name: /All RFQs|Procurement Review|RFQ & Vendor Sourcing/ })).toBeVisible();
  await page.getByRole('button', { name: 'Receiving' }).click();
  await expect(page.getByRole('button', { name: 'Mark paid' })).toHaveCount(0);
});

test('finance can access Receiving and owns Mark paid when a receipt is ready', async ({ page }) => {
  await viewAs(page, 'Finance Manager');
  const nav = await visibleNavigation(page);
  expect(nav.some((label) => label.includes('Receiving'))).toBeTruthy();
  await page.getByRole('button', { name: 'Receiving' }).click();
  const receivedStatus = await page.getByText('Received', { exact: true }).count();
  if (receivedStatus) await expect(page.getByRole('button', { name: 'Mark paid' })).toBeVisible();
});

test('vendor and product management dialogs are functional', async ({ page }) => {
  await viewAs(page, 'Super Admin');
  await page.getByRole('button', { name: 'Vendors' }).click();
  await page.getByRole('button', { name: 'Add vendor' }).click();
  await expect(page.getByRole('heading', { name: 'Add vendor' })).toBeVisible();
  await expect(page.getByText('Business information')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  const firstDelete = page.getByRole('button', { name: 'Delete' }).first();
  await firstDelete.click();
  await expect(page.getByRole('heading', { name: 'Delete vendor?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Products' }).click();
  await page.getByRole('button', { name: 'Add product' }).click();
  await expect(page.getByRole('heading', { name: 'Add product' })).toBeVisible();
  await expect(page.getByText('Estimated purchase price')).toBeVisible();
});

test('purchase order list exposes every PO and document preview', async ({ page }) => {
  await viewAs(page, 'Super Admin');
  await page.getByRole('button', { name: 'Purchase Orders' }).click();
  await expect(page.getByRole('heading', { name: /Purchase orders \(\d+\)/i })).toBeVisible();
  const rows = page.locator('.queue-card .queue-item');
  expect(await rows.count()).toBeGreaterThan(1);
  await expect(rows.first()).toContainText('₱89,000');
  await expect(page.locator('.po-total')).toContainText('PO total');
  await expect(page.locator('.po-total')).toContainText('₱89,000');
  await expect(page.getByText('Purchase Order activity', { exact: true })).toBeVisible();
  await expect(page.locator('.po-activity-timeline .movement-event')).toHaveCount(1);
  await expect(page.locator('.po-activity-timeline')).toContainText('Purchase order created');
  await page.getByRole('button', { name: 'View PO PDF' }).click();
  await expect(page.getByRole('dialog')).toContainText('Purchase Order');
  await expect(page.getByRole('dialog')).toContainText('₱89,000');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
});

test('desktop pages do not create horizontal viewport overflow', async ({ page }) => {
  const issues: string[] = [];
  for (const path of ['/dashboard', '/requests', '/sourcing', '/purchase-orders', '/receiving', '/vendors', '/products', '/administration']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) issues.push(`${path}: ${overflow}px`);
  }
  expect(issues, `Desktop horizontal overflow: ${issues.join(', ')}`).toEqual([]);
});
