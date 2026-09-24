export const vendors = [
  { name: 'Power Mac Center, Inc.', email: 'education@powermaccenter.com', terms: '30 days', lead: '710 days', rating: '4.8' },
  { name: 'Lem Fajarda Merchandise', email: 'sales@lemfajarda.example', terms: '15 days', lead: '35 days', rating: '4.6' },
  { name: 'Office Warehouse, Inc.', email: 'bids@officewarehouse.example', terms: '30 days', lead: '57 days', rating: '4.5' },
];

export const productCatalog = [
  { name: 'Bond Paper A4', category: 'Operational supplies', description: 'A4, 80 gsm, 500 sheets per ream', uom: 'REAM', price: 285 },
  { name: 'Desktop Computer', category: 'Technology', description: 'Business desktop, Core i5 class, 16 GB RAM, 512 GB SSD', uom: 'UNIT', price: 38000 },
  { name: 'Laptop Computer', category: 'Technology', description: '14-inch business laptop, Core Ultra 7 class, 16 GB RAM, 512 GB SSD', uom: 'UNIT', price: 45000 },
  { name: 'Office Chair', category: 'Furniture', description: 'Ergonomic mesh chair with adjustable height and lumbar support', uom: 'UNIT', price: 4200 },
  { name: 'Printer Ink', category: 'Operational supplies', description: 'Original high-yield ink cartridge compatible with office printers', uom: 'CARTRIDGE', price: 950 },
  { name: 'Projector', category: 'Technology', description: 'Full HD laser projector with HDMI and wireless presentation support', uom: 'UNIT', price: 32000 },
  { name: 'Tissue', category: 'Operational supplies', description: 'Two-ply facial tissue, 100 pulls per box', uom: 'BOX', price: 75 },
];

export const initialUsers = [
  { id: 'USR-001', name: 'Lem Fajarda', email: 'lem.fajarda@life.edu.ph', role: 'Requester', roles: ['Requester'], department: 'Administration', active: true },
  { id: 'USR-002', name: 'Angela Mendoza', email: 'angela.mendoza@life.edu.ph', role: 'Department Head', roles: ['Department Head'], department: 'Academic Affairs', active: true },
  { id: 'USR-003', name: 'Lea Santos', email: 'lea.santos@life.edu.ph', role: 'Finance Manager', roles: ['Finance Manager'], department: 'Finance', active: true },
  { id: 'USR-004', name: 'Joel Tan', email: 'joel.tan@life.edu.ph', role: 'DT Department', roles: ['DT Department'], department: 'DT Department', active: true },
];

export const demoRequests = [
  {
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
    history: [
      { action: 'create', actor: 'angela.mendoza@life.edu.ph', detail: 'Purchase Request submitted. Department Head and COO were notified based on the estimated request total, and the request was routed to Procurement Review.', createdAt: '2026-09-03T01:00:00Z' },
    ],
  },
  {
    id: 'PR-2026-1002',
    title: 'Academic Office Furniture and Supplies',
    department: 'Academic Affairs',
    amount: 107750,
    category: 'Multiple categories',
    requester: 'Angela Mendoza',
    status: 'For Requester Selection',
    due: 'In 10 days',
    items: [
      { name: 'Office Chair', category: 'Furniture', description: 'Ergonomic mesh chair with adjustable height and lumbar support', uom: 'UNIT', quantity: 20, unitPrice: 4200 },
      { name: 'Bond Paper A4', category: 'Operational supplies', description: 'A4, 80 gsm, 500 sheets per ream', uom: 'REAM', quantity: 50, unitPrice: 285 },
      { name: 'Printer Ink', category: 'Operational supplies', description: 'Original high-yield ink cartridge compatible with office printers', uom: 'CARTRIDGE', quantity: 10, unitPrice: 950 },
    ],
    rfqQuotes: [
      { vendorName: 'Lem Fajarda Merchandise', vendorEmail: 'sales@lemfajarda.example', status: 'Responded', reference: 'RFQ-2026-1002-A', deliveryDays: 8, terms: '15 days', warranty: 'One year standard warranty', validUntil: '2026-09-30', attachmentName: 'RFQ-2026-1002-A.pdf', lotCategories: ['Furniture'], items: [{ name: 'Office Chair', unitPrice: 4100 }] },
      { vendorName: 'Office Warehouse, Inc.', vendorEmail: 'bids@officewarehouse.example', status: 'Responded', reference: 'RFQ-2026-1002-B', deliveryDays: 10, terms: '30 days', warranty: 'One year standard warranty', validUntil: '2026-09-30', attachmentName: 'RFQ-2026-1002-B.pdf', lotCategories: ['Furniture'], items: [{ name: 'Office Chair', unitPrice: 4250 }] },
      { vendorName: 'Metro Office Solutions', vendorEmail: 'sales@metrooffice.example', status: 'Responded', reference: 'RFQ-2026-1002-C', deliveryDays: 6, terms: '30 days', warranty: 'Manufacturer warranty', validUntil: '2026-09-30', attachmentName: 'RFQ-2026-1002-C.pdf', lotCategories: ['Operational supplies'], items: [{ name: 'Bond Paper A4', unitPrice: 278 }, { name: 'Printer Ink', unitPrice: 930 }] },
      { vendorName: 'Campus Supply Trading', vendorEmail: 'bids@campussupply.example', status: 'Responded', reference: 'RFQ-2026-1002-D', deliveryDays: 7, terms: '15 days', warranty: 'Manufacturer warranty', validUntil: '2026-09-30', attachmentName: 'RFQ-2026-1002-D.pdf', lotCategories: ['Operational supplies'], items: [{ name: 'Bond Paper A4', unitPrice: 282 }, { name: 'Printer Ink', unitPrice: 920 }] },
    ],
    procurementValidationNotes: 'All four quotations are complete, commercially comparable within their respective lots, and supported by the required vendor documents.',
    procurementValidatedAt: '2026-09-03T05:00:00Z',
    procurementValidatedBy: 'Procurement Office',
    createdAt: '2026-09-02T01:00:00Z',
    updatedAt: '2026-09-03T07:05:00Z',
    history: [
      { action: 'create', actor: 'angela.mendoza@life.edu.ph', detail: 'Purchase Request submitted and routed to Procurement Review.', createdAt: '2026-09-02T01:00:00Z' },
      { action: 'complete_review', actor: 'procurement@life.edu.ph', detail: 'Procurement review completed and the request was separated into Furniture and Operational supplies sourcing lots.', createdAt: '2026-09-02T02:00:00Z' },
      { action: 'vendor_sourcing', actor: 'procurement@life.edu.ph', detail: 'Qualified vendor sourcing opened independently for both category lots.', createdAt: '2026-09-02T02:05:00Z' },
      { action: 'send_rfq', actor: 'procurement@life.edu.ph', detail: 'Separate RFQs were sent to two qualified vendors per sourcing lot.', createdAt: '2026-09-02T03:00:00Z' },
      { action: 'record_quotations', actor: 'procurement@life.edu.ph', detail: 'Four complete, itemized vendor quotations were received across two lots.', createdAt: '2026-09-03T04:30:00Z' },
      { action: 'validate_quotations', actor: 'procurement@life.edu.ph', detail: 'All quotations were validated as complete and commercially comparable within their respective lots.', createdAt: '2026-09-03T05:00:00Z' },
      { action: 'dt_review_skipped', actor: 'procurement@life.edu.ph', detail: 'DT review was not required because this request contains no technology products.', createdAt: '2026-09-03T05:05:00Z' },
      { action: 'requester_selection_opened', actor: 'procurement@life.edu.ph', detail: 'The validated quotations were released to Angela Mendoza for final vendor selection.', createdAt: '2026-09-03T05:10:00Z' },
    ],
  },
];
