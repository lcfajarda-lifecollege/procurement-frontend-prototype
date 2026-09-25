import type { PurchaseRequest, PurchaseRequestItem, VendorRecord, ProductRecord, RfqVendorQuote } from './ProcurementModule';

export const sampleDataMarker = 'procurement-meeting-samples-v1';

export function createPrototypeSamples(now = new Date()) {
  const date = (offset: number) => new Date(now.getTime() + offset * 3_600_000).toISOString();
  const validUntil = date(24 * 30).slice(0, 10);
  const vendors: VendorRecord[] = [
    { name: 'Sample BrightTech Supply', email: 'brighttech@example.test', contactPerson: 'Alex Santos (Sample)', phone: '000-000-0001', terms: '30 days', lead: '7 days', rating: 'Sample' },
    { name: 'Sample Campus IT Trading', email: 'campus-it@example.test', contactPerson: 'Jamie Cruz (Sample)', phone: '000-000-0002', terms: '30 days', lead: '10 days', rating: 'Sample' },
    { name: 'Sample Office Essentials', email: 'office-essentials@example.test', contactPerson: 'Sam Reyes (Sample)', phone: '000-000-0003', terms: '15 days', lead: '5 days', rating: 'Sample' },
    { name: 'Sample Workplace Supply', email: 'workplace@example.test', contactPerson: 'Chris Garcia (Sample)', phone: '000-000-0004', terms: '30 days', lead: '7 days', rating: 'Sample' },
  ].map((vendor) => ({ ...vendor, vendorType: 'Company', street: 'Sample address only', city: 'Sample City', country: 'Philippines', notes: 'Fictional vendor for prototype validation. Do not use for actual purchasing.', informationStatus: 'Not requested' }));
  const products: ProductRecord[] = [
    { name: 'Sample Classroom Projector', category: 'Technology', description: 'Full HD projector, HDMI input, wireless presentation support', uom: 'UNIT', price: 32000 },
    { name: 'Sample Staff Laptop', category: 'Technology', description: '14-inch laptop, 16 GB RAM, 512 GB SSD, onsite warranty', uom: 'UNIT', price: 45000 },
    { name: 'Sample Ergonomic Chair', category: 'Furniture', description: 'Mesh back, adjustable height, lumbar support and armrests', uom: 'UNIT', price: 4200 },
    { name: 'Sample A4 Paper', category: 'Operational supplies', description: 'A4, 80 gsm, 500 sheets per ream', uom: 'REAM', price: 285 },
  ];
  const line = (index: number, quantity: number): PurchaseRequestItem => {
    const { price, ...product } = products[index];
    return { ...product, quantity, unitPrice: price };
  };
  const quote = (vendorIndex: number, items: PurchaseRequestItem[], prices: number[], reference: string, status: RfqVendorQuote['status'] = 'Responded'): RfqVendorQuote => ({
    vendorName: vendors[vendorIndex].name, vendorEmail: vendors[vendorIndex].email, status, reference,
    deliveryDays: vendorIndex % 2 ? 10 : 7, terms: vendors[vendorIndex].terms, warranty: 'Sample: one-year manufacturer warranty', validUntil,
    lotCategories: [...new Set(items.map((item) => item.category))], items: items.map((item, index) => ({ name: item.name, unitPrice: prices[index] })),
  });
  const history = (events: Array<[string, string]>): NonNullable<PurchaseRequest['history']> => events.map(([action, detail], index) => ({ action, detail: `Sample: ${detail}`, actor: 'sample.workflow@example.test', createdAt: date(-48 + index) }));
  const sourcingEvents: Array<[string, string]> = [
    ['draft', 'Request drafted with product specifications and purpose.'],
    ['create', 'Request submitted to Procurement Review.'],
    ['start_procurement_review', 'Procurement reviewed the request.'],
    ['complete_review', 'Procurement review completed.'],
    ['vendor_sourcing', 'Two qualified vendors shortlisted per category lot.'],
    ['send_rfq', 'Category RFQs sent to the shortlisted vendors.'],
  ];
  const selectionEvents: Array<[string, string]> = [...sourcingEvents,
    ['record_quotations', 'Itemized quotations received from both vendors.'],
    ['validate_quotations', 'Procurement checked quotation prices and terms.'],
  ];
  const base = (id: string, title: string, items: PurchaseRequestItem[], status: PurchaseRequest['status']): PurchaseRequest => ({
    id, title: `[Sample] ${title}`, items, status, requester: 'Angela Mendoza', department: 'Academic Affairs', due: 'In 14 days',
    category: new Set(items.map((item) => item.category)).size > 1 ? 'Multiple categories' : items[0].category,
    amount: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), createdAt: date(-48), updatedAt: date(-1),
  });

  const techItems = [line(0, 2), line(1, 1)];
  const tech: PurchaseRequest = {
    ...base('PR-DEMO-1001', 'Classroom technology refresh', techItems, 'RFQ Sent'),
    purposeType: 'Activity', purpose: 'Sample: refresh the equipment used for classroom teaching.',
    rfqQuotes: [quote(0, techItems, [31500, 44500], 'DEMO-TECH-A', 'Sent'), quote(1, techItems, [32000, 45000], 'DEMO-TECH-B', 'Sent')],
    history: history(sourcingEvents),
  };
  const officeItems = [line(2, 6), line(3, 20)];
  const office: PurchaseRequest = {
    ...base('PR-DEMO-1002', 'Faculty workshop furniture and supplies', officeItems, 'For Requester Selection'),
    purposeType: 'Event', purpose: 'Sample: seating and workshop materials for the faculty development event.',
    rfqQuotes: [quote(2, officeItems, [4100, 278], 'DEMO-OFFICE-A'), quote(3, officeItems, [4250, 282], 'DEMO-OFFICE-B')],
    procurementValidationNotes: 'Sample: both vendors quoted every item. Furniture and Operational supplies are separate lots; select a vendor for each lot.',
    procurementValidatedAt: date(-12), procurementValidatedBy: 'Sample Procurement Officer',
    history: history([...selectionEvents, ['dt_review_skipped', 'No technology items; DT review is not required.'], ['requester_selection_opened', 'Quotations released for requester selection by lot.']]),
  };
  const laptopItems = [line(1, 2)];
  const laptopQuote = quote(0, laptopItems, [44500], 'DEMO-LAPTOP-A');
  const laptop: PurchaseRequest = {
    ...base('PR-DEMO-1003', 'Staff laptop replacement', laptopItems, 'For Department Approval'),
    purposeType: 'Activity', purpose: 'Sample: replace two laptops used for lesson preparation.',
    sourceRequestId: 'PR-DEMO-1003', poNumber: 'PO-DEMO-1003', sourcingLotCategory: 'Technology',
    vendorName: laptopQuote.vendorName, vendorEmail: laptopQuote.vendorEmail, rfqQuotes: [laptopQuote],
    sourcingAwards: [{ category: 'Technology', vendorName: laptopQuote.vendorName, vendorEmail: laptopQuote.vendorEmail, quoteReference: laptopQuote.reference }],
    dtReviewedBy: 'Sample DT Reviewer', dtReviewedAt: date(-12), dtReviewNotes: 'Sample: specifications and compatibility reviewed; the selected laptop meets the teaching requirements.',
    history: history([...selectionEvents, ['complete_dt_review', 'DT endorsed the laptop specifications.'], ['requester_selection_opened', 'Technically endorsed quotations released to the requester.'], ['select_quote', 'Requester selected BrightTech at PHP 44,500 per laptop.'], ['create_po', 'PO-DEMO-1003 created for a final quotation total of PHP 89,000.'], ['submit_po_department', 'PO submitted for Department Head approval.']]),
  };
  const chairItems = [line(2, 4)];
  const chairQuote = quote(2, chairItems, [4100], 'DEMO-DELIVERY-A');
  const delivery: PurchaseRequest = {
    ...base('PR-DEMO-1004', 'Faculty room chair delivery', chairItems, 'Received'),
    purposeType: 'Activity', purpose: 'Sample: replace worn seating in the faculty room.',
    sourceRequestId: 'PR-DEMO-1004', poNumber: 'PO-DEMO-1004', sourcingLotCategory: 'Furniture',
    vendorName: chairQuote.vendorName, vendorEmail: chairQuote.vendorEmail, rfqQuotes: [chairQuote],
    sourcingAwards: [{ category: 'Furniture', vendorName: chairQuote.vendorName, vendorEmail: chairQuote.vendorEmail, quoteReference: chairQuote.reference }],
    history: history([...selectionEvents, ['dt_review_skipped', 'No technology review required.'], ['select_quote', 'Requester selected the furniture quotation.'], ['create_po', 'PO-DEMO-1004 created for PHP 16,400.'], ['submit_po_department', 'PO sent to the Department Head.'], ['approve_po_department', 'Department Head approved the PO.'], ['approve_po_executive', 'Finance Manager approved the PO.'], ['send_po', 'PO issued to the vendor.'], ['acknowledge', 'Vendor acknowledged the PO.'], ['receive', 'Four chairs received and accepted. Invoice upload and APS admin closure are pending.']]),
  };
  return { requests: [tech, office, laptop, delivery], vendors, products };
}

// Add this small demonstration set once, without replacing existing records or
// resetting a sample after the user progresses it through the workflow.
export function addPrototypeSamples(storage: Storage = window.localStorage) {
  if (storage.getItem(sampleDataMarker)) return;
  const samples = createPrototypeSamples();
  const collections = [
    { key: 'procurement-requests', records: samples.requests, identities: ['id'] },
    { key: 'procurement-vendors', records: samples.vendors, identities: ['email', 'name'] },
    { key: 'procurement-products', records: samples.products, identities: ['name'] },
  ];
  try {
    const updates = collections.map(({ key, records, identities }) => {
      const current: unknown = JSON.parse(storage.getItem(key) ?? '[]');
      if (!Array.isArray(current) || current.some((record) => !record || typeof record !== 'object')) throw new Error('Invalid stored records');
      const additions = records.filter((sample) => !current.some((record) => identities.some((identity) => record[identity] === (sample as unknown as Record<string, unknown>)[identity])));
      return { key, value: JSON.stringify([...current, ...additions]) };
    });
    for (const { key, value } of updates) storage.setItem(key, value);
    storage.setItem(sampleDataMarker, 'true');
  } catch {
    // Do not overwrite data that cannot be read, or mark an incomplete seed done.
  }
}
