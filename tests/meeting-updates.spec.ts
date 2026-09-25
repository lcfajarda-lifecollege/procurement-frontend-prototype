import { expect, test } from '@playwright/test';
import { demoRequests } from './fixtures/procurement';
import { applyVerifiedApsSettlement, type VerifiedApsSettlement } from '../src/apsPayment';

const documentFile = { name: 'business-registration.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nTest business document\n%%EOF') };

test('vendor contacts and categorized business documents persist and download', async ({ page }) => {
  await page.goto('/vendors');
  await page.getByRole('button', { name: 'Add vendor', exact: true }).click();
  await page.getByLabel('Company name').fill('Meeting Supplier');
  await page.getByLabel('Email address', { exact: true }).fill('meeting@example.test');
  await page.getByLabel('Contact person', { exact: true }).fill('Maria Cruz');
  await page.getByLabel('Contact number', { exact: true }).fill('09171234567');
  await page.getByRole('button', { name: 'Save vendor' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Meeting Supplier', exact: true }).click();
  await expect(page.locator('.vendor-profile-grid')).toContainText(['Maria Cruz']);
  await page.getByRole('button', { name: 'Request information', exact: true }).click();
  const enrollmentLink = page.getByRole('link', { name: 'Open secure vendor form' });
  await expect(enrollmentLink).toHaveAttribute('target', '_blank');
  const enrollmentUrl = (await enrollmentLink.getAttribute('href'))!;
  expect(new URL(enrollmentUrl).pathname).toBe(new URL(page.url()).pathname.replace(/\/vendors$/, '/vendor-information/meeting%40example.test'));
  await page.goto(enrollmentUrl);
  await expect(page.getByLabel('Authorized contact person')).toHaveValue('Maria Cruz');
  await expect(page.getByLabel('Phone number')).toHaveValue('09171234567');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Registered street address').fill('123 Test Street');
  await page.getByLabel('City', { exact: true }).fill('Pasig');
  await page.getByLabel('Tax ID / TIN').fill('123-456-789');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Business registration (SEC / DTI)', { exact: true }).setInputFiles(documentFile);
  await expect(page.getByRole('button', { name: 'Download business-registration.pdf' })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('vendor-documents.png'), fullPage: true });
  await page.getByLabel('Business permit', { exact: true }).setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
  await expect(page.getByRole('alert')).toContainText('Use PDF, PNG, or JPEG');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Submit vendor information' }).click();
  await expect(page.getByRole('status')).toContainText('Thank you');
  await page.reload();
  await page.getByRole('button', { name: 'Payment & compliance' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download business-registration.pdf' }).click();
  expect((await download).suggestedFilename()).toBe(documentFile.name);
  await page.getByRole('button', { name: 'Remove business-registration.pdf' }).click();
  await expect(page.getByRole('button', { name: 'Download business-registration.pdf' })).toHaveCount(0);
});

test('invoices survive reload and delivery leads to APS-admin-controlled closure', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((source) => {
    const quote = source.rfqQuotes![0];
    const request = { ...source, id: 'PR-MEETING', status: 'Received', items: source.items!.filter((item) => item.category === 'Furniture'), category: 'Furniture', vendorName: quote.vendorName, vendorEmail: quote.vendorEmail, rfqQuotes: [quote] };
    localStorage.setItem('procurement-requests', JSON.stringify([request]));
  }, demoRequests[1]);
  await page.goto('/receiving');
  await page.getByLabel('Vendor invoice').setInputFiles({ ...documentFile, name: 'invoice.pdf' });
  await expect(page.getByRole('button', { name: 'Download invoice.pdf' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Download invoice.pdf' })).toBeVisible();
  await expect(page.getByText('Awaiting APS admin closure')).toBeVisible();
  await expect(page.getByRole('button', { name: /Mark paid|File and close/ })).toHaveCount(0);
  await page.goto('/purchase-orders');
  await expect(page.locator('.po-record-lifecycle > div')).toHaveCount(7);
  await expect(page.locator('.po-record-lifecycle')).not.toContainText('Invoice & Payment');
  await expect(page.locator('.po-next-step')).toContainText('Closed');
  await expect(page.locator('.po-next-step')).toContainText('Automated Payment System admin');
  await expect(page.getByText('Stage 6 of 7')).toBeVisible();
  await page.getByRole('button', { name: 'View PO PDF' }).click();
  await expect(page.locator('.lci-po-signatures')).not.toContainText('DT Technical Approval');
});

test('APS requires verified admin closure and exact settlement; retries are idempotent', () => {
  const order = { status: 'Received', history: [] };
  const event: VerifiedApsSettlement = { eventId: 'APS-001', paymentReference: 'PAY-001', poNumber: 'PO-001', amount: 100, currency: 'PHP', paidAt: '2026-09-24T01:00:00Z', status: 'paid', closedBy: 'APS administrator', closedAt: '2026-09-24T02:00:00Z' };
  const closed = applyVerifiedApsSettlement(order, 'PO-001', 100, event);
  expect(closed.status).toBe('Filed');
  expect(closed.history).toHaveLength(2);
  expect(closed.history?.[1].actor).toBe('APS administrator');
  expect(applyVerifiedApsSettlement(closed, 'PO-001', 100, event)).toBe(closed);
  for (const changes of [{ closedBy: '' }, { closedAt: '' }, { amount: 99 }, { poNumber: 'OTHER' }, { status: 'pending' }, { currency: 'USD' }]) {
    expect(() => applyVerifiedApsSettlement(order, 'PO-001', 100, { ...event, ...changes } as VerifiedApsSettlement)).toThrow();
  }
  expect(() => applyVerifiedApsSettlement({ status: 'PO Draft' }, 'PO-001', 100, event)).toThrow();
});

test('RFQ email omits requesting department and uses document reference labels', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((request) => localStorage.setItem('procurement-requests', JSON.stringify([request])), demoRequests[1]);
  await page.goto('/sourcing');
  await page.locator('.rfq-list-row').click();
  await page.getByRole('button', { name: 'Preview Furniture form' }).click();
  await expect(page.locator('.rfq-email-body')).not.toContainText('Requesting department');
  await expect(page.locator('.rfq-email-body')).not.toContainText(demoRequests[1].department);
  const link = page.getByRole('link', { name: 'Open secure quotation form' });
  await expect(link).toHaveAttribute('target', '_blank');
  await page.goto((await link.getAttribute('href'))!);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Document Reference Number')).toBeVisible();
});

test('department item details and DT signatures fit desktop and mobile layouts', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((source) => {
    const request = { ...source, status: 'For Department Approval', purposeType: 'Activity', purpose: 'Classroom teaching refresh', dtReviewedBy: 'DT Reviewer', dtReviewedAt: '2026-09-24T01:00:00Z', dtReviewNotes: 'Technical requirements confirmed.', vendorName: 'Test Technology Vendor', rfqQuotes: [{ vendorName: 'Test Technology Vendor', vendorEmail: 'tech@example.test', status: 'Responded', reference: 'DOC-001', terms: '30 days', deliveryDays: 7, warranty: 'One year', validUntil: '2026-12-31', items: source.items!.map((item) => ({ name: item.name, unitPrice: item.unitPrice })) }] };
    localStorage.setItem('procurement-requests', JSON.stringify([request]));
  }, demoRequests[0]);
  await page.goto('/approvals');
  await page.getByLabel('View as role').selectOption('Department Head');
  await expect(page.locator('.approval-products')).toContainText('Classroom teaching refresh');
  await expect(page.locator('.approval-products table')).toContainText('Description / Specifications');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.approval-products')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: test.info().outputPath(`department-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByLabel('View as role').selectOption('Procurement Officer');
  await page.goto('/purchase-orders');
  await page.getByRole('button', { name: 'View PO PDF' }).click();
  await page.locator('.lci-po-signatures').scrollIntoViewIfNeeded();
  await page.locator('.lci-po-signatures').screenshot({ path: test.info().outputPath('dt-signature.png') });
});
