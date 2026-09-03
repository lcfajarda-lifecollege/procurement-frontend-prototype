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

async function seedProcurementReviewRequest(page: Page) {
  await page.evaluate(() => {
    window.localStorage.setItem('procurement-requests', JSON.stringify([{
      id: 'PR-2026-1001',
      title: 'Smart Classroom Equipment Renewal',
      department: 'Academic Affairs',
      amount: 282000,
      category: 'Technology',
      requester: 'Angela Mendoza',
      status: 'For Procurement Review',
      due: 'In 14 days',
      items: [
        { name: 'Projector', category: 'Technology', description: 'Full HD laser projector with HDMI and wireless presentation support', uom: 'UNIT', quantity: 6, unitPrice: 32000 },
        { name: 'Laptop Computer', category: 'Technology', description: '14-inch business laptop, Core Ultra 7 class, 16 GB RAM, 512 GB SSD', uom: 'UNIT', quantity: 2, unitPrice: 45000 },
      ],
      createdAt: '2026-09-03T01:00:00Z',
      updatedAt: '2026-09-03T01:00:00Z',
      history: [{ action: 'create', actor: 'angela.mendoza@life.edu.ph', detail: 'Purchase Request submitted and routed to Procurement Review.', createdAt: '2026-09-03T01:00:00Z' }],
    }]));
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
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

test('purchase request activity explains every reached lifecycle stage', async ({ page }) => {
  await viewAs(page, 'Super Admin');
  await page.getByRole('button', { name: 'Purchase Requests' }).click();
  await expect(page.locator('.queue-card .queue-item')).toHaveCount(2);
  await page.locator('.queue-card .queue-item').filter({ hasText: 'PR-2026-1001' }).click();
  await expect(page.getByText('Stage 3 of 9', { exact: false })).toBeVisible();
  await expect(page.locator('.request-activity-list .movement-event')).toHaveCount(3);
  await expect(page.locator('.request-activity-list')).toContainText('Purchase request drafted');
  await expect(page.locator('.request-activity-list')).toContainText('Procurement review started');
});

test('requester can open a multi-item purchase request form with technology routing', async ({ page }) => {
  await viewAs(page, 'Requester');
  await page.getByRole('button', { name: 'Purchase Requests' }).click();
  await page.getByRole('button', { name: 'New request' }).click();
  await expect(page.getByRole('heading', { name: /New purchase request/i, level: 2 })).toBeVisible();
  await page.getByRole('textbox', { name: 'Request title' }).fill('Playwright technology request');
  await page.getByPlaceholder('Search or add a product').fill('Custom laboratory cart');
  await page.getByLabel('New product description or specifications').fill('Stainless steel, lockable wheels, 120 kg capacity');
  await page.getByLabel('New product estimated unit cost').fill('12500');
  await page.getByRole('button', { name: /Add product to request/ }).click();
  await expect(page.getByLabel('Custom laboratory cart description or specifications')).toHaveValue('Stainless steel, lockable wheels, 120 kg capacity');
  const requestItemColumns = await page.locator('.pr-item-head, .pr-item-row').evaluateAll((rows) => rows.map((row) => Array.from(row.children).map((cell) => Math.round(cell.getBoundingClientRect().x))));
  expect(requestItemColumns[1].every((position, index) => Math.abs(position - requestItemColumns[0][index]) <= 1)).toBe(true);
  expect(await page.locator('.pr-item-table').evaluate((table) => table.getBoundingClientRect().right <= document.documentElement.clientWidth)).toBe(true);
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

test('procurement officer sees the sourcing record awaiting requester selection but cannot mark a purchase paid', async ({ page }) => {
  await viewAs(page, 'Procurement Officer');
  await page.getByRole('button', { name: /RFQ & Sourcing/ }).click();
  await expect(page.getByRole('heading', { name: /All RFQs|Procurement Review|RFQ & Vendor Sourcing/ })).toBeVisible();
  await expect(page.locator('.rfq-list-row')).toHaveCount(8);
  await expect(page.locator('.rfq-list-row').filter({ hasText: 'Source PR-2026-1001' })).toHaveCount(7);
  await expect(page.locator('.stage-preview-row')).toHaveCount(6);
  const sentStagePreview = page.locator('.stage-preview-row').filter({ hasText: 'RFQ Sent' });
  await sentStagePreview.click();
  await expect(page.getByText('Read-only lifecycle preview')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close all RFQs' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to sourcing' }).click();
  await page.locator('.rfq-list-row').filter({ hasText: 'PR-2026-1002' }).click();
  await expect(page.getByRole('heading', { name: 'Academic Office Furniture and Supplies' })).toBeVisible();
  await expect(page.getByText('For Requester Selection', { exact: true })).toBeVisible();
  await expect(page.locator('.vendor-quotation-entry')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Create 1 PO' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Receiving' }).click();
  await expect(page.getByRole('button', { name: 'Mark paid' })).toHaveCount(0);
});

test('requester can immediately open the seeded quotation selection PR', async ({ page }) => {
  await viewAs(page, 'Requester');
  await page.getByRole('button', { name: 'Purchase Requests' }).click();
  const selectionRequest = page.locator('.queue-card .queue-item').filter({ hasText: 'PR-2026-1002' });
  await expect(selectionRequest).toContainText('For Requester Selection');
  await expect(selectionRequest).toContainText('Choose vendor');
  await selectionRequest.click();
  await page.getByRole('button', { name: 'Compare quotations' }).click();
  const lots = page.getByTestId('requester-sourcing-lot');
  await expect(lots).toHaveCount(2);
  await expect(lots.nth(0)).toContainText('Furniture');
  await expect(lots.nth(1)).toContainText('Operational supplies');
  await expect(lots.nth(0).locator('.requester-quote-choice')).toHaveCount(2);
  await expect(lots.nth(1).locator('.requester-quote-choice')).toHaveCount(2);
  await expect(page.getByText('Procurement Validation')).toBeVisible();
  await expect(page.getByText('Digital Transformation Review')).toHaveCount(0);
  await lots.nth(0).locator('.requester-quote-choice').first().click();
  await lots.nth(1).locator('.requester-quote-choice').first().click();
  await page.getByRole('button', { name: 'Confirm vendor awards' }).click();
  await expect(page.locator('.queue-card .queue-item').filter({ hasText: 'PR-2026-1002' })).toContainText('Ready for PO Creation');
  await viewAs(page, 'Procurement Officer');
  await page.getByRole('button', { name: /RFQ & Sourcing/ }).click();
  await page.locator('.rfq-list-row').filter({ hasText: 'PR-2026-1002' }).click();
  await expect(page.getByRole('button', { name: 'Create 2 POs' })).toBeEnabled();
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

test('one guided PR advances through quotation selection and the complete PO lifecycle', async ({ page }) => {
  await seedProcurementReviewRequest(page);
  await viewAs(page, 'Procurement Officer');
  await page.getByRole('button', { name: /RFQ & Sourcing/ }).click();
  await page.locator('.rfq-list-row:not(.stage-preview-row)').filter({ hasText: 'PR-2026-1001' }).click();
  await page.getByRole('button', { name: 'Complete review and begin sourcing' }).click();

  const vendorSelect = page.getByLabel('Select an existing vendor');
  for (let index = 0; index < 2; index += 1) {
    await vendorSelect.selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Add to this lot' }).click();
  }
  await page.getByRole('button', { name: 'Send all category RFQs' }).click();
  const quotationStatuses = page.locator('.vendor-quotation-status select');
  await expect(quotationStatuses).toHaveCount(2);
  for (let index = 0; index < 2; index += 1) await quotationStatuses.nth(index).selectOption('Responded');
  await page.getByRole('button', { name: 'Close all RFQs' }).click();
  await page.getByLabel('Procurement Validation Notes').fill('Quotations are complete and ready for technical review.');
  await page.getByRole('button', { name: 'Submit quotations for review' }).click();

  await viewAs(page, 'DT Department');
  await page.getByRole('button', { name: /Approvals/ }).click();
  await page.getByRole('button', { name: 'Open quotation comparison' }).click();
  const technicalDecisions = page.locator('.dt-comparison-item:not(.out-of-scope) select');
  await expect(technicalDecisions).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) await technicalDecisions.nth(index).selectOption('approved');
  await page.getByLabel('DT review notes').fill('Both quotations are technically suitable.');
  await page.getByRole('button', { name: 'Complete DT review' }).click();

  await viewAs(page, 'Requester');
  await page.getByRole('button', { name: 'Purchase Requests' }).click();
  await page.getByRole('button', { name: 'Compare quotations' }).click();
  await page.locator('.requester-quote-choice').first().click();
  await page.getByRole('button', { name: 'Confirm selected vendor' }).click();

  await viewAs(page, 'Procurement Officer');
  await page.getByRole('button', { name: /RFQ & Sourcing/ }).click();
  await page.locator('.rfq-list-row:not(.stage-preview-row)').filter({ hasText: 'PR-2026-1001' }).click();
  await page.getByRole('button', { name: 'Create 1 PO' }).click();
  await page.getByRole('button', { name: 'Purchase Orders' }).click();
  await expect(page.locator('.queue-card .queue-item')).toHaveCount(1);
  await expect(page.locator('.po-total')).toContainText('₱282,000');
  await page.getByRole('button', { name: 'View PO PDF' }).click();
  await expect(page.getByRole('dialog')).toContainText('PO-2026-1001');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Submit for Department Approval' }).click();

  await viewAs(page, 'Department Head');
  await page.getByRole('button', { name: /Approvals/ }).click();
  await page.getByRole('button', { name: 'Approve to COO' }).click();
  await viewAs(page, 'COO');
  await page.getByRole('button', { name: /Approvals/ }).click();
  await page.getByRole('button', { name: 'Approve Purchase Order' }).click();

  await viewAs(page, 'Procurement Officer');
  await page.getByRole('button', { name: 'Purchase Orders' }).click();
  await page.getByRole('button', { name: 'Email approved PO to vendor' }).click();
  await page.getByRole('button', { name: 'Record acknowledgement' }).click();
  await page.getByRole('button', { name: 'Receiving' }).click();
  await page.getByRole('button', { name: 'Record receipt' }).click();

  await viewAs(page, 'Finance Manager');
  await page.getByRole('button', { name: 'Receiving' }).click();
  await page.getByRole('button', { name: 'Mark paid' }).click();
  await viewAs(page, 'Procurement Officer');
  await page.getByRole('button', { name: 'Receiving' }).click();
  await page.getByRole('button', { name: 'File and close' }).click();
  await page.getByRole('button', { name: 'Purchase Orders' }).click();
  await expect(page.getByText('Stage 8 of 8')).toBeVisible();
  await expect(page.locator('.po-activity-timeline')).toContainText('Procurement record filed');
});

test('multi-category request awards vendors by sourcing lot and creates separate POs', async ({ page }) => {
  await viewAs(page, 'Super Admin');
  await page.evaluate(() => {
    const items = [
      { name: 'Projector', category: 'Technology', description: 'Full HD laser projector', uom: 'UNIT', quantity: 2, unitPrice: 32000 },
      { name: 'Office Chair', category: 'Furniture', description: 'Ergonomic mesh chair', uom: 'UNIT', quantity: 4, unitPrice: 4200 },
    ];
    const quote = (vendorName: string, vendorEmail: string, reference: string, projectorPrice: number, chairPrice: number) => ({ vendorName, vendorEmail, status: 'Responded', reference, deliveryDays: 7, terms: '30 days', warranty: 'One year', validUntil: '2026-09-30', attachmentName: `${reference}.pdf`, lotCategories: ['Technology', 'Furniture'], items: [{ name: 'Projector', unitPrice: projectorPrice }, { name: 'Office Chair', unitPrice: chairPrice }] });
    window.localStorage.setItem('procurement-requests', JSON.stringify([{ id: 'PR-2026-1021', title: 'Smart Classroom Equipment Renewal', department: 'Academic Affairs', amount: 80800, category: 'Multiple categories', requester: 'Angela Mendoza', status: 'For Requester Selection', due: 'In 14 days', items, rfqQuotes: [quote('Power Mac Center, Inc.', 'education@powermaccenter.com', 'RFQ-2026-1021-A', 31500, 4150), quote('Office Warehouse, Inc.', 'bids@officewarehouse.example', 'RFQ-2026-1021-B', 32500, 4050)], createdAt: '2026-09-03T01:00:00Z', updatedAt: '2026-09-03T01:00:00Z', history: [] }]));
  });
  await page.goto('/requests/PR-2026-1021/vendor-selection');
  await expect(page.getByRole('heading', { name: 'Smart Classroom Equipment Renewal' })).toBeVisible();
  const lots = page.getByTestId('requester-sourcing-lot');
  await expect(lots).toHaveCount(2);
  await expect(lots.nth(0)).toContainText('Technology');
  await expect(lots.nth(1)).toContainText('Furniture');

  await lots.nth(0).locator('.requester-quote-choice').first().click();
  await lots.nth(1).locator('.requester-quote-choice').nth(1).click();
  await page.getByRole('button', { name: 'Confirm vendor awards' }).click();
  await expect(page).toHaveURL(/\/requests$/);
  await expect(page.locator('.queue-card .queue-item').filter({ hasText: 'PR-2026-1021' })).toContainText('Ready for PO Creation');

  await viewAs(page, 'Procurement Officer');
  await page.getByRole('button', { name: /RFQ & Sourcing/ }).click();
  await page.locator('.rfq-list-row').filter({ hasText: 'PR-2026-1021' }).click();
  await expect(page.getByRole('button', { name: 'Technology form' })).toBeVisible();
  await expect(page.locator('.sourcing-lot-tabs button')).toHaveCount(2);
  await page.getByRole('button', { name: 'Create 2 POs' }).click();

  await page.getByRole('button', { name: 'Purchase Orders' }).click();
  await expect(page.locator('.queue-card')).toContainText('PO-2026-1021-01');
  await expect(page.locator('.queue-card')).toContainText('PO-2026-1021-02');
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
