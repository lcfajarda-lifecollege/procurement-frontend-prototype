import { expect, test } from '@playwright/test';
import { demoRequests } from './fixtures/procurement';

for (const missingLotReply of [true, false]) {
  test(`demo quotation receipt ${missingLotReply ? 'requires two eligible vendors in every lot' : 'preserves existing replies and excludes withdrawn vendors'}`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate(({ sample, missingLotReply }) => {
      const quotes = sample.rfqQuotes!.map((quote, index) => ({ ...quote, status: index === 0 ? 'Responded' : index === 2 && missingLotReply ? 'Declined' : 'Sent' }));
      quotes[0].reference = 'EXISTING-QUOTE';
      const withdrawn = { ...quotes[0], vendorName: 'Withdrawn vendor', status: 'Withdrawn' };
      localStorage.setItem('procurement-requests', JSON.stringify([{ ...sample, status: 'RFQ Sent', rfqQuotes: [...quotes, withdrawn] }]));
    }, { sample: demoRequests[1], missingLotReply });
    await page.goto('/sourcing');
    await page.locator('.rfq-list-row').click();
    const action = page.getByRole('button', { name: 'Mark quotations received (Demo)' });
    if (missingLotReply) {
      await expect(action).toBeDisabled();
      return;
    }
    await action.click();
    await expect(page.getByLabel('Procurement Validation Notes')).toBeVisible();
    await page.reload();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('procurement-requests')!)[0]);
    expect(saved.status).toBe('Quotations Received');
    expect(saved.rfqQuotes.slice(0, 4).every((quote: { status: string }) => quote.status === 'Responded')).toBe(true);
    expect(saved.rfqQuotes[0].reference).toBe('EXISTING-QUOTE');
    expect(saved.rfqQuotes[0].items).toEqual(demoRequests[1].rfqQuotes![0].items);
    expect(saved.rfqQuotes[4].status).toBe('Withdrawn');
    expect(saved.history.at(-1).detail).toContain('Demo:');
    await page.locator('.rfq-list-row').click();
    await page.getByRole('button', { name: 'Submit quotations for review' }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('procurement-requests')!)[0].status)).toBe('For Requester Selection');
  });
}
