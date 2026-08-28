import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  Inbox,
  ListFilter,
  Link2,
  Mail,
  PackageCheck,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Store,
  Trash2,
  Truck,
  UserCheck,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import './procurement.css';

type Role = 'Super Admin' | 'Procurement Admin' | 'Requester' | 'DT Department' | 'Department Head' | 'Finance Manager' | 'COO' | 'President' | 'Procurement Officer';
type RequestStatus = 'Draft' | 'Submitted' | 'Petty Cash' | 'For DT Approval' | 'For Requester Selection' | 'Ready for PO Creation' | 'Quotations Received' | 'For Department Approval' | 'For Finance Approval' | 'For COO Approval' | 'For President Approval' | 'For Procurement Review' | 'RFQ Draft' | 'RFQ Sent' | 'PO Draft' | 'PO Approved' | 'PO Awaiting Acknowledgement' | 'PO Acknowledged' | 'Partially Received' | 'Received' | 'Paid' | 'Filed';

type RfqVendorQuote = {
  vendorName: string;
  vendorEmail: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Responded' | 'Declined' | 'Overdue' | 'Withdrawn';
  reference: string;
  deliveryDays: number;
  terms: string;
  warranty: string;
  validUntil: string;
  attachmentName?: string;
  items: Array<{ name: string; unitPrice: number }>;
};

const roleAccess: Record<Role, { scope: string; modules: string; paths: string[] }> = {
  'Super Admin': { scope: 'Organization-wide access to every procurement record, workflow, directory, report, and user assignment.', modules: 'All modules', paths: ['/dashboard', '/requests', '/requests/new', '/approvals', '/sourcing', '/purchase-orders', '/receiving', '/vendors', '/products', '/reports', '/administration'] },
  'Procurement Admin': { scope: 'Organization-wide procurement monitoring and administration without requester-only submission actions.', modules: 'Dashboard / Requests / Approvals / Sourcing / POs / Receiving / Vendors / Products / Reports', paths: ['/dashboard', '/requests', '/approvals', '/sourcing', '/purchase-orders', '/receiving', '/vendors', '/products', '/reports'] },
  Requester: { scope: 'Own purchase requests, request status, and the product catalog.', modules: 'Dashboard / Purchase Requests / Products', paths: ['/dashboard', '/requests', '/requests/new', '/products'] },
  'DT Department': { scope: 'Technology-related requests and quotations that require technical review.', modules: 'Dashboard / Approvals / Purchase Requests / Products', paths: ['/dashboard', '/approvals', '/requests', '/products'] },
  'Department Head': { scope: 'Department requests, assigned review work, and department-level reports.', modules: 'Dashboard / Approvals / Purchase Requests / Reports', paths: ['/dashboard', '/approvals', '/requests', '/reports'] },
  'Finance Manager': { scope: 'Finance-routed approvals, approved purchase orders, receiving records, payment work, and reports.', modules: 'Dashboard / Approvals / Purchase Orders / Receiving / Reports', paths: ['/dashboard', '/approvals', '/purchase-orders', '/receiving', '/reports'] },
  COO: { scope: 'Purchase orders routed to the COO by amount and executive-level procurement reports.', modules: 'Dashboard / Approvals / Purchase Orders / Reports', paths: ['/dashboard', '/approvals', '/purchase-orders', '/reports'] },
  President: { scope: 'High-value purchase orders routed to the President and executive-level procurement reports.', modules: 'Dashboard / Approvals / Purchase Orders / Reports', paths: ['/dashboard', '/approvals', '/purchase-orders', '/reports'] },
  'Procurement Officer': { scope: 'Organization-wide requests after submission, vendor sourcing, purchase orders, receiving, directories, and reports.', modules: 'Dashboard / Requests / RFQ & Sourcing / Purchase Orders / Receiving / Vendors / Products / Reports', paths: ['/dashboard', '/requests', '/sourcing', '/purchase-orders', '/receiving', '/vendors', '/products', '/reports'] },
};

type PurchaseRequestItem = { name: string; category: string; description?: string; uom?: string; quantity: number; unitPrice: number };

interface PurchaseRequest {
  id: string;
  title: string;
  department: string;
  amount: number;
  category: string;
  requester: string;
  status: RequestStatus;
  due: string;
  items?: PurchaseRequestItem[];
  createdAt?: string;
  updatedAt?: string;
  history?: Array<{ action: string; actor: string; detail: string; createdAt: string }>;
  vendorName?: string;
  vendorEmail?: string;
  rfqQuotes?: RfqVendorQuote[];
  procurementValidationNotes?: string;
  procurementValidatedAt?: string;
  procurementValidatedBy?: string;
  dtReviewNotes?: string;
  dtReviewedAt?: string;
  dtReviewedBy?: string;
}

type VendorInformationStatus = 'Not requested' | 'Invitation pending' | 'Information complete';
type VendorRecord = { name: string; email: string; terms: string; lead: string; rating: string; vendorType?: 'Person' | 'Company'; contactPerson?: string; phone?: string; street?: string; street2?: string; city?: string; state?: string; zip?: string; country?: string; taxId?: string; branchCode?: string; website?: string; tags?: string; notes?: string; bankName?: string; bankAccountName?: string; bankAccountNumber?: string; businessRegistration?: string; complianceDocuments?: string[]; informationStatus?: VendorInformationStatus; informationRequestedAt?: string };

const vendors: VendorRecord[] = [
  { name: 'Power Mac Center, Inc.', email: 'education@powermaccenter.com', terms: '30 days', lead: '710 days', rating: '4.8' },
  { name: 'Lem Fajarda Merchandise', email: 'sales@lemfajarda.example', terms: '15 days', lead: '35 days', rating: '4.6' },
  { name: 'Office Warehouse, Inc.', email: 'bids@officewarehouse.example', terms: '30 days', lead: '57 days', rating: '4.5' },
];

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

function requestCategories(request: PurchaseRequest) {
  const itemCategories = request.items?.map((item) => item.category.trim()).filter(Boolean) ?? [];
  return [...new Set(itemCategories.length ? itemCategories : [request.category])];
}

function requestIncludesTechnology(request: PurchaseRequest) {
  return requestCategories(request).includes('Technology');
}

function requestTotalQuantity(request: PurchaseRequest) {
  return request.items?.reduce((total, item) => total + item.quantity, 0) ?? 0;
}

function rfqQuoteTotal(request: PurchaseRequest, quote?: RfqVendorQuote) {
  if (!quote) return 0;
  return (request.items ?? []).reduce((total, item) => total + item.quantity * (quote.items.find((quotedItem) => quotedItem.name === item.name)?.unitPrice ?? 0), 0);
}

function executiveNotificationRole(amount: number) {
  if (amount <= 100000) return 'Finance Manager';
  if (amount <= 999999) return 'COO';
  return 'President';
}

function submissionActivityDetail(amount: number) {
  return `Department Head and ${executiveNotificationRole(amount)} notified based on the ${money.format(amount)} request total. Routed to Procurement Review.`;
}

const purchaseRequestLifecycleLabels = [
  'Draft',
  'Submitted',
  'Procurement Review',
  'Vendor Sourcing',
  'RFQs Sent',
  'Quotations Received',
  'DT Review',
  'Requester Selection',
  'PO Creation',
];

const purchaseOrderWorkflowStages = [
  { name: 'PO Draft', detail: 'Procurement creates the Purchase Order from the requester-selected quotation and links it to the originating Purchase Request.' },
  { name: 'Department Head Approval', detail: 'The Department Head confirms the final order, quantities, department need, and selected vendor.' },
  { name: 'Executive Approval', detail: 'The PO is routed to the appropriate executive only when its total amount meets the configured approval threshold.' },
  { name: 'Approved & Issued', detail: 'Procurement finalizes the approved PO and emails the official document to the selected vendor.' },
  { name: 'Vendor Acknowledgement', detail: 'The vendor confirms receipt and acceptance of the PO, including the expected delivery date.' },
  { name: 'Delivery & Receiving', detail: 'Items are delivered, counted, and inspected. Partial deliveries remain in this stage until the order is complete.' },
  { name: 'Invoice & Payment', detail: 'Finance verifies the PO, receiving record, and vendor invoice before processing payment.' },
  { name: 'Closed & Filed', detail: 'The completed PO and supporting documents are retained for records, reporting, and audit.' },
];

type SessionUser = { name: string; email: string; initials: string; roles: string[]; appEntitlements: string[]; department?: string } | null;
type ProcurementWorkItemSummary = { id: string; status: string; title: string; department: string; amount: number; requester: string; createdAt?: string };

const procurementRoles = ['Super Admin', 'Procurement Admin', 'Requester', 'DT Department', 'Department Head', 'Finance Manager', 'COO', 'President', 'Procurement Officer'];
const departments = ['Administration', 'Academic Affairs', 'Finance', 'DT Department', 'Senior High School', 'Learning Resource Center'];

type ProcurementUserAssignment = { id: string; name: string; email: string; role: string; roles: string[]; department: string; active: boolean };

const initialUsers: ProcurementUserAssignment[] = [
  { id: 'USR-001', name: 'Lem Fajarda', email: 'lem.fajarda@life.edu.ph', role: 'Requester', roles: ['Requester'], department: 'Administration', active: true },
  { id: 'USR-002', name: 'Angela Mendoza', email: 'angela.mendoza@life.edu.ph', role: 'Department Head', roles: ['Department Head'], department: 'Academic Affairs', active: true },
  { id: 'USR-003', name: 'Lea Santos', email: 'lea.santos@life.edu.ph', role: 'Finance Manager', roles: ['Finance Manager'], department: 'Finance', active: true },
  { id: 'USR-004', name: 'Joel Tan', email: 'joel.tan@life.edu.ph', role: 'DT Department', roles: ['DT Department'], department: 'DT Department', active: true },
];

function loadVendorRecords(): VendorRecord[] {
  try {
    const saved = window.localStorage.getItem('procurement-vendors');
    return saved ? JSON.parse(saved) : vendors;
  } catch {
    return vendors;
  }
}

type ProductRecord = { name: string; category: string; description: string; uom: string; price: number };

const productCatalog: ProductRecord[] = [
  { name: 'Bond Paper A4', category: 'Operational supplies', description: 'A4, 80 gsm, 500 sheets per ream', uom: 'REAM', price: 285 },
  { name: 'Desktop Computer', category: 'Technology', description: 'Business desktop, Core i5 class, 16 GB RAM, 512 GB SSD', uom: 'UNIT', price: 38000 },
  { name: 'Laptop Computer', category: 'Technology', description: '14-inch business laptop, Core Ultra 7 class, 16 GB RAM, 512 GB SSD', uom: 'UNIT', price: 45000 },
  { name: 'Office Chair', category: 'Furniture', description: 'Ergonomic mesh chair with adjustable height and lumbar support', uom: 'UNIT', price: 4200 },
  { name: 'Printer Ink', category: 'Operational supplies', description: 'Original high-yield ink cartridge compatible with office printers', uom: 'CARTRIDGE', price: 950 },
  { name: 'Projector', category: 'Technology', description: 'Full HD laser projector with HDMI and wireless presentation support', uom: 'UNIT', price: 32000 },
  { name: 'Tissue', category: 'Operational supplies', description: 'Two-ply facial tissue, 100 pulls per box', uom: 'BOX', price: 75 },
];

function itemDescription(item: Pick<PurchaseRequestItem, 'name' | 'category' | 'description'>) {
  return item.description?.trim() || productCatalog.find((product) => product.name === item.name)?.description || `${item.name} specifications appropriate for ${item.category.toLowerCase()} use`;
}

function itemUom(item: Pick<PurchaseRequestItem, 'name' | 'uom'>) {
  return item.uom?.trim().toUpperCase() || productCatalog.find((product) => product.name === item.name)?.uom || 'UNIT';
}

function hydrateRequestItems(records: PurchaseRequest[]) {
  return records.map((request) => ({ ...request, items: request.items?.map((item) => ({ ...item, description: itemDescription(item), uom: itemUom(item) })) }));
}

function loadProductRecords(): ProductRecord[] {
  try {
    const saved = window.localStorage.getItem('procurement-products');
    const records = saved ? JSON.parse(saved) as Array<Partial<ProductRecord> & Pick<ProductRecord, 'name' | 'category' | 'price'>> : productCatalog;
    return records.map((product) => ({ ...product, description: product.description?.trim() || `${product.name} standard procurement specification`, uom: product.uom?.trim().toUpperCase() || 'UNIT' }));
  } catch {
    return productCatalog;
  }
}

type RfqProductLine = { id: string; name: string; category: string; description: string; uom: string; quantity: number; unitPrice: number; taxRate: number };

function lifecycleSeedQuote(vendorName: string, vendorEmail: string, status: RfqVendorQuote['status'], reference: string, items: RfqVendorQuote['items'], deliveryDays = 7): RfqVendorQuote {
  return { vendorName, vendorEmail, status, reference, deliveryDays, terms: '30 days', warranty: 'One year', validUntil: '2026-09-30', attachmentName: status === 'Responded' ? `${reference}.pdf` : undefined, items };
}

function lifecycleSeedPo(options: { id: string; title: string; department: string; amount: number; requester: string; status: RequestStatus; itemName: string; category?: string; quantity?: number; vendorName?: string; vendorEmail?: string; createdAt: string; updatedAt: string }): PurchaseRequest {
  const quantity = options.quantity ?? 1;
  const category = options.category ?? 'Operational supplies';
  const vendorName = options.vendorName ?? 'Office Warehouse, Inc.';
  const vendorEmail = options.vendorEmail ?? 'bids@officewarehouse.example';
  const poNumber = options.id.replace('PR-', 'PO-');
  return {
    id: options.id,
    title: options.title,
    department: options.department,
    amount: options.amount,
    category,
    requester: options.requester,
    status: options.status,
    due: 'Scheduled delivery',
    vendorName,
    vendorEmail,
    items: [{ name: options.itemName, category, quantity, unitPrice: options.amount / quantity }],
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
    history: [
      { action: 'create_po', actor: 'procurement@life.edu.ph', detail: `${poNumber} created from the requester-selected vendor quotation.`, createdAt: options.createdAt },
      { action: 'po_stage', actor: 'prototype@life.edu.ph', detail: `${poNumber} moved to ${options.status}.`, createdAt: options.updatedAt },
    ],
  };
}

const demoRequests: PurchaseRequest[] = [
  { id:'PR-2026-1001', title:'Office Pantry Restock', department:'Administration', amount:10950, category:'Operational supplies', requester:'Lem Fajarda', status:'Draft', due:'In 14 days', items:[{name:'Tissue',category:'Operational supplies',quantity:50,unitPrice:75},{name:'Bond Paper A4',category:'Operational supplies',quantity:25,unitPrice:288}], createdAt:'2026-08-27T00:30:00Z', updatedAt:'2026-08-27T00:30:00Z', history:[{action:'draft',actor:'lem.fajarda@life.edu.ph',detail:'Draft saved. This request has not been submitted or routed.',createdAt:'2026-08-27T00:30:00Z'}] },
  { id:'PR-2026-1002', title:'Student Records Storage Cabinets', department:'Registrar', amount:63000, category:'Furniture', requester:'Ana Cruz', status:'Submitted', due:'In 12 days', items:[{name:'Steel Filing Cabinet',category:'Furniture',quantity:7,unitPrice:9000}], createdAt:'2026-08-26T01:00:00Z', updatedAt:'2026-08-26T01:00:00Z', history:[{action:'create',actor:'ana.cruz@life.edu.ph',detail:'Department Head and Finance Manager notified based on the ₱63,000 request total. Awaiting automatic routing to Procurement Review.',createdAt:'2026-08-26T01:00:00Z'}] },
  { id:'PR-2026-1003', title:'Science Laboratory Consumables', department:'Academic Affairs', amount:128500, category:'Laboratory supplies', requester:'Maria Santos', status:'For Procurement Review', due:'In 10 days', items:[{name:'Laboratory Glassware Set',category:'Laboratory supplies',quantity:10,unitPrice:8500},{name:'Safety Consumables Kit',category:'Laboratory supplies',quantity:10,unitPrice:4350}], createdAt:'2026-08-25T02:00:00Z', updatedAt:'2026-08-25T03:00:00Z', history:[{action:'create',actor:'maria.santos@life.edu.ph',detail:'Department Head and COO notified based on the ₱128,500 request total. Routed to Procurement Review.',createdAt:'2026-08-25T02:00:00Z'}] },
  { id:'PR-2026-1004', title:'Library Reading Area Furniture', department:'Learning Resource Center', amount:84000, category:'Furniture', requester:'Carlo Reyes', status:'RFQ Draft', due:'In 9 days', items:[{name:'Office Chair',category:'Furniture',quantity:20,unitPrice:4200}], createdAt:'2026-08-24T01:30:00Z', updatedAt:'2026-08-24T05:00:00Z', rfqQuotes:[lifecycleSeedQuote('Lem Fajarda Merchandise','sales@lemfajarda.example','Draft','RFQ-2026-1004-A',[{name:'Office Chair',unitPrice:4100}]),lifecycleSeedQuote('Office Warehouse, Inc.','bids@officewarehouse.example','Draft','RFQ-2026-1004-B',[{name:'Office Chair',unitPrice:4250}])], history:[{action:'create',actor:'carlo.reyes@life.edu.ph',detail:'Department Head and Finance Manager notified based on the ₱84,000 request total. Routed to Procurement Review.',createdAt:'2026-08-24T01:30:00Z'},{action:'complete_review',actor:'procurement@life.edu.ph',detail:'Procurement review completed. Qualified vendors are being selected.',createdAt:'2026-08-24T05:00:00Z'}] },
  { id:'PR-2026-1005', title:'Administrative Printing Supplies', department:'Administration', amount:27500, category:'Operational supplies', requester:'Angela Mendoza', status:'RFQ Sent', due:'In 8 days', items:[{name:'Bond Paper A4',category:'Operational supplies',quantity:50,unitPrice:285},{name:'Printer Ink',category:'Operational supplies',quantity:14,unitPrice:946}], createdAt:'2026-08-23T02:15:00Z', updatedAt:'2026-08-24T02:15:00Z', rfqQuotes:[lifecycleSeedQuote('Office Warehouse, Inc.','bids@officewarehouse.example','Viewed','RFQ-2026-1005-A',[{name:'Bond Paper A4',unitPrice:280},{name:'Printer Ink',unitPrice:930}],5),lifecycleSeedQuote('Lem Fajarda Merchandise','sales@lemfajarda.example','Sent','RFQ-2026-1005-B',[{name:'Bond Paper A4',unitPrice:290},{name:'Printer Ink',unitPrice:920}],7),lifecycleSeedQuote('Metro Office Solutions','sales@metrooffice.example','Sent','RFQ-2026-1005-C',[{name:'Bond Paper A4',unitPrice:275},{name:'Printer Ink',unitPrice:960}],6)], history:[{action:'create',actor:'angela.mendoza@life.edu.ph',detail:'Department Head and Finance Manager notified based on the ₱27,500 request total. Routed to Procurement Review.',createdAt:'2026-08-23T02:15:00Z'},{action:'complete_review',actor:'procurement@life.edu.ph',detail:'Procurement review completed and three vendors selected.',createdAt:'2026-08-23T06:00:00Z'},{action:'send_rfq',actor:'procurement@life.edu.ph',detail:'RFQ sent to three qualified vendors.',createdAt:'2026-08-24T02:15:00Z'}] },
  { id:'PR-2026-1006', title:'Campus Events Furniture Package', department:'Student Affairs', amount:156000, category:'Furniture', requester:'Paolo Garcia', status:'Quotations Received', due:'In 7 days', items:[{name:'Stackable Event Chair',category:'Furniture',quantity:100,unitPrice:1200},{name:'Folding Event Table',category:'Furniture',quantity:12,unitPrice:3000}], createdAt:'2026-08-22T01:00:00Z', updatedAt:'2026-08-25T04:00:00Z', rfqQuotes:[lifecycleSeedQuote('Lem Fajarda Merchandise','sales@lemfajarda.example','Responded','RFQ-2026-1006-A',[{name:'Stackable Event Chair',unitPrice:1150},{name:'Folding Event Table',unitPrice:2950}],10),lifecycleSeedQuote('Office Warehouse, Inc.','bids@officewarehouse.example','Responded','RFQ-2026-1006-B',[{name:'Stackable Event Chair',unitPrice:1210},{name:'Folding Event Table',unitPrice:2800}],8),lifecycleSeedQuote('Metro Office Solutions','sales@metrooffice.example','Responded','RFQ-2026-1006-C',[{name:'Stackable Event Chair',unitPrice:1180},{name:'Folding Event Table',unitPrice:3100}],6)], history:[{action:'create',actor:'paolo.garcia@life.edu.ph',detail:'Department Head and COO notified based on the ₱156,000 request total. Routed to Procurement Review.',createdAt:'2026-08-22T01:00:00Z'},{action:'complete_review',actor:'procurement@life.edu.ph',detail:'Procurement review completed and vendor sourcing opened.',createdAt:'2026-08-22T05:00:00Z'},{action:'send_rfq',actor:'procurement@life.edu.ph',detail:'RFQ sent to three qualified furniture vendors.',createdAt:'2026-08-23T02:00:00Z'},{action:'record_quotations',actor:'procurement@life.edu.ph',detail:'Three vendor quotations received and recorded for comparison.',createdAt:'2026-08-25T04:00:00Z'}] },
  { id:'PR-2026-1007', title:'Campus Computer Laboratory Modernization', department:'Academic Affairs', amount:1641500, category:'Multiple categories', requester:'Joel Tan', status:'For DT Approval', due:'In 6 days', items:[{name:'Desktop Computer',category:'Technology',quantity:30,unitPrice:38000},{name:'Laptop Computer',category:'Technology',quantity:10,unitPrice:45000},{name:'Office Chair',category:'Furniture',quantity:10,unitPrice:4200},{name:'Printer Ink',category:'Operational supplies',quantity:10,unitPrice:950}], createdAt:'2026-08-21T01:30:00Z', updatedAt:'2026-08-25T07:00:00Z', procurementValidationNotes:'All three quotations are complete and commercially comparable. DT should verify desktop and laptop compatibility with the existing laboratory network and confirm onsite warranty coverage.', procurementValidatedAt:'2026-08-25T06:45:00Z', procurementValidatedBy:'Procurement Office', rfqQuotes:[lifecycleSeedQuote('Power Mac Center, Inc.','education@powermaccenter.com','Responded','RFQ-2026-1007-A',[{name:'Desktop Computer',unitPrice:37500},{name:'Laptop Computer',unitPrice:44500},{name:'Office Chair',unitPrice:4100},{name:'Printer Ink',unitPrice:930}],12),lifecycleSeedQuote('Enterprise Technology Solutions','bids@ets.example','Responded','RFQ-2026-1007-B',[{name:'Desktop Computer',unitPrice:36800},{name:'Laptop Computer',unitPrice:45800},{name:'Office Chair',unitPrice:4250},{name:'Printer Ink',unitPrice:920}],10),lifecycleSeedQuote('Digital Campus Supply','sales@digitalcampus.example','Responded','RFQ-2026-1007-C',[{name:'Desktop Computer',unitPrice:38200},{name:'Laptop Computer',unitPrice:43900},{name:'Office Chair',unitPrice:4050},{name:'Printer Ink',unitPrice:960}],14)], history:[{action:'create',actor:'joel.tan@life.edu.ph',detail:'Department Head and President notified based on the ₱1,641,500 request total. Routed to Procurement Review.',createdAt:'2026-08-21T01:30:00Z'},{action:'complete_review',actor:'procurement@life.edu.ph',detail:'Procurement review completed and technology vendors shortlisted.',createdAt:'2026-08-21T06:00:00Z'},{action:'send_rfq',actor:'procurement@life.edu.ph',detail:'RFQ sent to three qualified technology vendors.',createdAt:'2026-08-22T02:00:00Z'},{action:'record_quotations',actor:'procurement@life.edu.ph',detail:'Three complete vendor quotations received.',createdAt:'2026-08-24T03:00:00Z'},{action:'validate_quotations',actor:'procurement@life.edu.ph',detail:'All three quotations are complete and commercially comparable. DT should verify desktop and laptop compatibility with the existing laboratory network and confirm onsite warranty coverage.',createdAt:'2026-08-25T06:45:00Z'},{action:'submit_quotes',actor:'procurement@life.edu.ph',detail:'Technology quotation lines routed to the Digital Transformation Team for review. Non-technology lines remain visible but outside DT scope.',createdAt:'2026-08-25T07:00:00Z'}] },
  { id:'PR-2026-1008', title:'Learning Commons Seating Upgrade', department:'Academic Affairs', amount:252000, category:'Multiple categories', requester:'Angela Mendoza', status:'For Requester Selection', due:'In 5 days', items:[{name:'Office Chair',category:'Furniture',description:'Ergonomic mesh chair with adjustable height and lumbar support',uom:'UNIT',quantity:48,unitPrice:4200},{name:'Modular Study Table',category:'Fixtures',description:'Four-person modular study table with durable laminate top and powder-coated steel frame',uom:'UNIT',quantity:12,unitPrice:4200}], createdAt:'2026-08-20T02:00:00Z', updatedAt:'2026-08-25T08:00:00Z', rfqQuotes:[lifecycleSeedQuote('Lem Fajarda Merchandise','sales@lemfajarda.example','Responded','RFQ-2026-1008-A',[{name:'Office Chair',unitPrice:4000},{name:'Modular Study Table',unitPrice:4250}],8),lifecycleSeedQuote('Office Warehouse, Inc.','bids@officewarehouse.example','Responded','RFQ-2026-1008-B',[{name:'Office Chair',unitPrice:4100},{name:'Modular Study Table',unitPrice:4350}],6),lifecycleSeedQuote('Metro Office Solutions','sales@metrooffice.example','Responded','RFQ-2026-1008-C',[{name:'Office Chair',unitPrice:3950},{name:'Modular Study Table',unitPrice:4100}],12)], history:[{action:'create',actor:'angela.mendoza@life.edu.ph',detail:'Department Head and COO notified based on the ₱252,000 request total. Routed to Procurement Review.',createdAt:'2026-08-20T02:00:00Z'},{action:'complete_review',actor:'procurement@life.edu.ph',detail:'Procurement review completed and vendor sourcing opened.',createdAt:'2026-08-20T06:00:00Z'},{action:'send_rfq',actor:'procurement@life.edu.ph',detail:'RFQ sent to three qualified furniture and fixtures vendors.',createdAt:'2026-08-21T03:00:00Z'},{action:'record_quotations',actor:'procurement@life.edu.ph',detail:'Three itemized quotations received and organized for comparison.',createdAt:'2026-08-24T05:00:00Z'},{action:'submit_quotes',actor:'procurement@life.edu.ph',detail:'Non-technology quotations sent directly to Angela Mendoza for selection.',createdAt:'2026-08-25T08:00:00Z'}] },
  { id:'PR-2026-1021', title:'Smart Classroom Equipment Renewal', department:'Academic Affairs', amount:303000, category:'Multiple categories', requester:'Angela Mendoza', status:'For Requester Selection', due:'In 5 days', items:[{name:'Projector',category:'Technology',description:'Full HD laser projector with HDMI and wireless presentation support',uom:'UNIT',quantity:6,unitPrice:32000},{name:'Laptop Computer',category:'Technology',description:'14-inch business laptop, Core Ultra 7 class, 16 GB RAM, 512 GB SSD',uom:'UNIT',quantity:2,unitPrice:45000},{name:'Office Chair',category:'Furniture',description:'Ergonomic mesh chair with adjustable height and lumbar support',uom:'UNIT',quantity:5,unitPrice:4200}], createdAt:'2026-08-22T01:00:00Z', updatedAt:'2026-08-27T08:30:00Z', procurementValidationNotes:'All vendor submissions include complete item pricing and required attachments. Compare delivery lead time and warranty support before selecting the final vendor.', procurementValidatedAt:'2026-08-26T04:45:00Z', procurementValidatedBy:'Procurement Office', dtReviewNotes:'DT confirms that all three vendors offer technically suitable projector and laptop options. Prefer quotations with onsite warranty support, verified wireless presentation compatibility, and delivery within 14 days.', dtReviewedAt:'2026-08-27T08:30:00Z', dtReviewedBy:'Digital Transformation Team', rfqQuotes:[lifecycleSeedQuote('Power Mac Center, Inc.','education@powermaccenter.com','Responded','RFQ-2026-1021-A',[{name:'Projector',unitPrice:31500},{name:'Laptop Computer',unitPrice:44200},{name:'Office Chair',unitPrice:4150}],12),lifecycleSeedQuote('Enterprise Technology Solutions','bids@ets.example','Responded','RFQ-2026-1021-B',[{name:'Projector',unitPrice:30900},{name:'Laptop Computer',unitPrice:45300},{name:'Office Chair',unitPrice:4250}],10),lifecycleSeedQuote('Digital Campus Supply','sales@digitalcampus.example','Responded','RFQ-2026-1021-C',[{name:'Projector',unitPrice:32500},{name:'Laptop Computer',unitPrice:43900},{name:'Office Chair',unitPrice:4050}],14)], history:[{action:'create',actor:'angela.mendoza@life.edu.ph',detail:'Department Head and COO notified based on the ₱303,000 request total. Routed to Procurement Review.',createdAt:'2026-08-22T01:00:00Z'},{action:'complete_review',actor:'procurement@life.edu.ph',detail:'Procurement review completed and qualified vendors shortlisted.',createdAt:'2026-08-22T05:00:00Z'},{action:'send_rfq',actor:'procurement@life.edu.ph',detail:'RFQ sent to three qualified technology and office-equipment vendors.',createdAt:'2026-08-23T02:00:00Z'},{action:'record_quotations',actor:'procurement@life.edu.ph',detail:'Three complete itemized quotations received.',createdAt:'2026-08-26T04:00:00Z'},{action:'validate_quotations',actor:'procurement@life.edu.ph',detail:'All vendor submissions include complete item pricing and required attachments. Compare delivery lead time and warranty support before selecting the final vendor.',createdAt:'2026-08-26T04:45:00Z'},{action:'submit_quotes',actor:'procurement@life.edu.ph',detail:'Technology quotation lines routed to Digital Transformation for technical review.',createdAt:'2026-08-26T05:00:00Z'},{action:'complete_dt_review',actor:'dt.review@life.edu.ph',detail:'DT confirms that all three vendors offer technically suitable projector and laptop options. Prefer quotations with onsite warranty support, verified wireless presentation compatibility, and delivery within 14 days.',createdAt:'2026-08-27T08:30:00Z'}] },
  { id:'PR-2026-1009', title:'Faculty Laptop Replacement', department:'Academic Affairs', amount:90000, category:'Technology', requester:'Angela Mendoza', status:'PO Draft', due:'In 4 days', vendorName:'Power Mac Center, Inc.', vendorEmail:'education@powermaccenter.com', items:[{name:'Laptop Computer',category:'Technology',quantity:2,unitPrice:45000}], createdAt:'2026-08-19T01:00:00Z', updatedAt:'2026-08-26T07:00:00Z', rfqQuotes:[lifecycleSeedQuote('Power Mac Center, Inc.','education@powermaccenter.com','Responded','RFQ-2026-1009-A',[{name:'Laptop Computer',unitPrice:44500}],5),lifecycleSeedQuote('Enterprise Technology Solutions','bids@ets.example','Responded','RFQ-2026-1009-B',[{name:'Laptop Computer',unitPrice:45200}],7)], history:[{action:'create',actor:'angela.mendoza@life.edu.ph',detail:'Department Head and Finance Manager notified based on the ₱90,000 request total. Routed to Procurement Review.',createdAt:'2026-08-19T01:00:00Z'},{action:'complete_review',actor:'procurement@life.edu.ph',detail:'Procurement review completed and technology vendors shortlisted.',createdAt:'2026-08-19T05:00:00Z'},{action:'send_rfq',actor:'procurement@life.edu.ph',detail:'RFQ sent to two qualified technology vendors.',createdAt:'2026-08-20T02:00:00Z'},{action:'record_quotations',actor:'procurement@life.edu.ph',detail:'Two quotations received and routed for technical review.',createdAt:'2026-08-22T03:00:00Z'},{action:'submit_quotes',actor:'procurement@life.edu.ph',detail:'Digital Transformation Team approved the qualified technology quotations.',createdAt:'2026-08-24T04:00:00Z'},{action:'select_quote',actor:'angela.mendoza@life.edu.ph',detail:'Power Mac Center, Inc. selected. Request is ready for PO creation.',createdAt:'2026-08-26T06:00:00Z'},{action:'create_po',actor:'procurement@life.edu.ph',detail:'Purchase Order draft created from the requester-selected quotation.',createdAt:'2026-08-26T07:00:00Z'}] },
  lifecycleSeedPo({ id:'PR-2026-1010', title:'Academic Records Filing System', department:'Academic Affairs', amount:72000, requester:'Maria Santos', status:'For Department Approval', itemName:'Steel Filing Cabinet', category:'Furniture', quantity:8, createdAt:'2026-08-18T01:00:00Z', updatedAt:'2026-08-27T01:00:00Z' }),
  lifecycleSeedPo({ id:'PR-2026-1011', title:'Finance Document Scanner', department:'Finance', amount:68000, requester:'Lea Santos', status:'For Finance Approval', itemName:'High-speed Document Scanner', category:'Technology', vendorName:'Enterprise Technology Solutions', vendorEmail:'bids@ets.example', createdAt:'2026-08-17T01:00:00Z', updatedAt:'2026-08-27T01:30:00Z' }),
  lifecycleSeedPo({ id:'PR-2026-1012', title:'Campus Security Camera Expansion', department:'Administration', amount:360000, requester:'Lem Fajarda', status:'For COO Approval', itemName:'IP Security Camera Package', category:'Technology', quantity:12, vendorName:'Digital Campus Supply', vendorEmail:'sales@digitalcampus.example', createdAt:'2026-08-16T01:00:00Z', updatedAt:'2026-08-27T02:00:00Z' }),
  lifecycleSeedPo({ id:'PR-2026-1013', title:'Institution-wide Network Upgrade', department:'DT Department', amount:1850000, requester:'Joel Tan', status:'For President Approval', itemName:'Managed Network Infrastructure Package', category:'Technology', vendorName:'Enterprise Technology Solutions', vendorEmail:'bids@ets.example', createdAt:'2026-08-15T01:00:00Z', updatedAt:'2026-08-27T02:30:00Z' }),
  lifecycleSeedPo({ id:'PR-2026-1014', title:'Library Shelving Replacement', department:'Learning Resource Center', amount:145000, requester:'Carlo Reyes', status:'PO Approved', itemName:'Library Steel Shelving Bay', category:'Furniture', quantity:10, vendorName:'Lem Fajarda Merchandise', vendorEmail:'sales@lemfajarda.example', createdAt:'2026-08-14T01:00:00Z', updatedAt:'2026-08-27T03:00:00Z' }),
  lifecycleSeedPo({ id:'PR-2026-1015', title:'Guidance Office Furniture', department:'Student Affairs', amount:86000, requester:'Paolo Garcia', status:'PO Awaiting Acknowledgement', itemName:'Guidance Office Furniture Set', category:'Furniture', quantity:2, vendorName:'Lem Fajarda Merchandise', vendorEmail:'sales@lemfajarda.example', createdAt:'2026-08-13T01:00:00Z', updatedAt:'2026-08-27T03:30:00Z' }),
  lifecycleSeedPo({ id:'PR-2026-1016', title:'Smart Classroom Projectors', department:'Academic Affairs', amount:490000, requester:'Maria Santos', status:'PO Acknowledged', itemName:'Laser Projector', category:'Technology', quantity:10, vendorName:'Digital Campus Supply', vendorEmail:'sales@digitalcampus.example', createdAt:'2026-08-12T01:00:00Z', updatedAt:'2026-08-27T04:00:00Z' }),
  lifecycleSeedPo({ id:'PR-2026-1017', title:'Senior High Classroom Chairs', department:'Senior High School', amount:225000, requester:'Nina Flores', status:'Partially Received', itemName:'Student Classroom Chair', category:'Furniture', quantity:150, vendorName:'Office Warehouse, Inc.', vendorEmail:'bids@officewarehouse.example', createdAt:'2026-08-11T01:00:00Z', updatedAt:'2026-08-27T04:30:00Z' }),
  lifecycleSeedPo({ id:'PR-2026-1018', title:'Accounting Office Printers', department:'Finance', amount:118000, requester:'Lea Santos', status:'Received', itemName:'Network Laser Printer', category:'Technology', quantity:4, vendorName:'Enterprise Technology Solutions', vendorEmail:'bids@ets.example', createdAt:'2026-08-10T01:00:00Z', updatedAt:'2026-08-27T05:00:00Z' }),
  lifecycleSeedPo({ id:'PR-2026-1019', title:'Campus-wide First Aid Stations', department:'Administration', amount:96000, requester:'Lem Fajarda', status:'Paid', itemName:'First Aid Station Kit', category:'Operational supplies', quantity:12, createdAt:'2026-08-09T01:00:00Z', updatedAt:'2026-08-27T05:30:00Z' }),
  lifecycleSeedPo({ id:'PR-2026-1020', title:'Completed Faculty Workstations', department:'Academic Affairs', amount:174000, requester:'Angela Mendoza', status:'Filed', itemName:'Faculty Workstation Set', category:'Furniture', quantity:6, vendorName:'Lem Fajarda Merchandise', vendorEmail:'sales@lemfajarda.example', createdAt:'2026-08-08T01:00:00Z', updatedAt:'2026-08-27T06:00:00Z' }),
];

const procurementDataVersion = 'full-pr-po-lifecycle-seed-2026-08-28-v12';

function loadRequestRecords(): PurchaseRequest[] {
  try {
    if (window.localStorage.getItem('procurement-data-version') !== procurementDataVersion) {
      window.localStorage.setItem('procurement-requests', JSON.stringify(demoRequests));
      window.localStorage.setItem('procurement-data-version', procurementDataVersion);
      return hydrateRequestItems(demoRequests);
    }
    const saved = window.localStorage.getItem('procurement-requests');
    if (!saved) return [];
    const records = JSON.parse(saved) as PurchaseRequest[];
    return Array.isArray(records) ? hydrateRequestItems(records) : [];
  } catch {
    return hydrateRequestItems(demoRequests);
  }
}

export default function ProcurementModule({ activePath, sessionUser, onNavigate, previewRole, onWorkItemsChange }: { activePath: string; sessionUser: SessionUser; onNavigate: (path: string) => void; previewRole: string; onWorkItemsChange: (items: ProcurementWorkItemSummary[]) => void }) {
  const isSuperAdmin = Boolean(sessionUser?.roles.some((item) => ['tenant-admin', 'super-admin'].includes(item)));
  const assignedRole: Role = isSuperAdmin ? 'Super Admin' : procurementRoleFromSession(sessionUser?.roles ?? []);
  const role = isSuperAdmin ? previewRole as Role : assignedRole;
  const access = roleAccess[role];
  const [requests, setRequests] = useState<PurchaseRequest[]>(loadRequestRecords);
  const [toast, setToast] = useState('');
  const [poSent, setPoSent] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [received, setReceived] = useState(6);

  useEffect(() => {
    window.localStorage.setItem('procurement-requests', JSON.stringify(requests));
    onWorkItemsChange(requests.map(({ id, status, title, department, amount, requester, createdAt }) => ({ id, status, title, department, amount, requester, createdAt })));
  }, [onWorkItemsChange, requests]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  async function runAction(id: string, action: string) {
    let nextStatus: RequestStatus | null = null;
    setRequests((current) => current.map((item) => {
      if (item.id !== id) return item;
      if (action === 'approve') nextStatus = item.status === 'For DT Approval' ? 'For Requester Selection' : item.status === 'For Department Approval' ? item.amount <= 100000 ? 'For Finance Approval' : item.amount <= 999999 ? 'For COO Approval' : 'For President Approval' : ['For Finance Approval', 'For COO Approval', 'For President Approval'].includes(item.status) ? 'PO Approved' : 'For Procurement Review';
      else if (action === 'complete_review') nextStatus = 'RFQ Draft';
      else if (action === 'send_rfq') nextStatus = 'RFQ Sent';
      else if (action === 'record_quotations') nextStatus = 'Quotations Received';
      else if (action === 'submit_quotes') nextStatus = requestIncludesTechnology(item) ? 'For DT Approval' : 'For Requester Selection';
      else if (action === 'select_quote') nextStatus = 'Ready for PO Creation';
      else if (action === 'create_po') nextStatus = 'PO Draft';
      else if (action === 'submit_po_department') nextStatus = 'For Department Approval';
      else if (action === 'send_po') nextStatus = 'PO Awaiting Acknowledgement';
      else if (action === 'acknowledge') nextStatus = 'PO Acknowledged';
      else if (action === 'receive') nextStatus = 'Received';
      else if (action === 'mark_paid') nextStatus = 'Paid';
      else if (action === 'file') nextStatus = 'Filed';
      if (!nextStatus) return item;
      const createdAt = new Date().toISOString();
      return {
        ...item,
        status: nextStatus,
        updatedAt: createdAt,
        history: [...(item.history ?? []), { action, actor: 'prototype@life.edu.ph', detail: `Status changed to ${nextStatus}`, createdAt }],
      };
    }));
    notify(nextStatus ? `${id}: ${nextStatus}` : `${id}: no transition available`);
  }

  const currentView = useMemo(() => {
    const vendorInformationMatch = activePath.match(/^\/vendor-information\/([^/]+)$/);
    if (vendorInformationMatch) {
      const vendorEmail = decodeURIComponent(vendorInformationMatch[1]);
      const vendor = loadVendorRecords().find((item) => item.email === vendorEmail);
      if (!vendor) return <div className="vendor-link-error"><AlertTriangle size={24} /><h2>Vendor information link unavailable</h2><p>The vendor could not be found or this prototype link is no longer valid.</p></div>;
      return <VendorInformationFormPage vendor={vendor} onClose={() => window.close()} />;
    }
    const vendorQuotationMatch = activePath.match(/^\/vendor-quotation\/([^/]+)$/);
    if (vendorQuotationMatch) {
      const request = requests.find((item) => item.id === decodeURIComponent(vendorQuotationMatch[1]));
      if (!request) return <div className="vendor-link-error"><AlertTriangle size={24} /><h2>Quotation link unavailable</h2><p>The RFQ could not be found or this prototype link is no longer valid.</p></div>;
      const vendorEmail = new URLSearchParams(window.location.search).get('vendor');
      const quote = request.rfqQuotes?.find((item) => !vendorEmail || item.vendorEmail === vendorEmail) ?? request.rfqQuotes?.[0];
      return <VendorRfqMagicLinkPreview request={request} quote={quote} initialView="form" standalone onClose={() => window.close()} />;
    }
    const vendorSelectionMatch = activePath.match(/^\/requests\/([^/]+)\/vendor-selection$/);
    const dtQuotationReviewMatch = activePath.match(/^\/approvals\/([^/]+)\/quotation-review$/);
    const hasRouteAccess = access.paths.includes(activePath) || (vendorSelectionMatch && access.paths.includes('/requests')) || (dtQuotationReviewMatch && access.paths.includes('/approvals'));
    if (!hasRouteAccess) return <RoleRestrictedView role={role} modules={access.modules} onBack={() => onNavigate('/dashboard')} />;
    if (vendorSelectionMatch) {
      const request = requests.find((item) => item.id === decodeURIComponent(vendorSelectionMatch[1]));
      const canSelect = ['Requester', 'Super Admin'].includes(role) && (role === 'Super Admin' || request?.requester === (sessionUser?.name ?? ''));
      if (!request || !canSelect) return <RoleRestrictedView role={role} modules={access.modules} onBack={() => onNavigate('/requests')} />;
      return <RequesterQuotationSelectionPage request={request} onBack={() => { window.sessionStorage.setItem('procurement-selected-request', request.id); onNavigate('/requests'); }} onRequestSaved={(updated) => setRequests((current) => current.map((item) => item.id === updated.id ? updated : item))} onComplete={() => { void runAction(request.id, 'select_quote'); window.sessionStorage.setItem('procurement-selected-request', request.id); onNavigate('/requests'); }} />;
    }
    if (dtQuotationReviewMatch) {
      const request = requests.find((item) => item.id === decodeURIComponent(dtQuotationReviewMatch[1]));
      const canReview = ['DT Department','Super Admin'].includes(role) && request?.status === 'For DT Approval';
      if (!request || !canReview) return <RoleRestrictedView role={role} modules={access.modules} onBack={() => onNavigate('/approvals')} />;
      return <DtQuotationComparisonPage request={request} onBack={() => onNavigate('/approvals')} onComplete={(notes) => { const createdAt = new Date().toISOString(); const reviewNotes = notes.trim() || 'Digital Transformation confirmed that technically suitable vendor offers are available for every technology product.'; setRequests((current) => current.map((item) => item.id === request.id ? { ...item, dtReviewNotes: reviewNotes, dtReviewedAt: createdAt, dtReviewedBy: 'Digital Transformation Team', updatedAt: createdAt, history: [...(item.history ?? []), { action: 'complete_dt_review', actor: 'dt.review@life.edu.ph', detail: reviewNotes, createdAt }] } : item)); void runAction(request.id, 'approve'); onNavigate('/approvals'); }} onNotify={notify} />;
    }
    if (activePath === '/requests') return <RequestsView requests={requests} role={role} requesterName={sessionUser?.name ?? ''} onNavigate={onNavigate} onNew={() => onNavigate('/requests/new')} />;
    if (activePath === '/requests/new') return <NewRequestPage onBack={() => onNavigate('/requests')} onSubmit={async (draft) => { const createdAt = new Date().toISOString(); const request = { ...draft, requester: sessionUser?.name ?? 'Angela Mendoza', department: 'Academic Affairs', createdAt, updatedAt: createdAt, history: [{ action: 'create', actor: sessionUser?.email ?? 'prototype@life.edu.ph', detail: submissionActivityDetail(draft.amount), createdAt }] }; setRequests((current) => [request, ...current]); notify(`${request.id} submitted successfully`); onNavigate('/requests'); return true; }} />;
    if (activePath === '/approvals') return <ApprovalsQueueView requests={requests} role={role} onApprove={(id) => runAction(id, 'approve')} onNotify={notify} onNavigate={onNavigate} />;
    if (activePath === '/sourcing') return <MultiSourcingView requests={requests.filter((item) => ['For Procurement Review','RFQ Draft','RFQ Sent','Quotations Received','Ready for PO Creation'].includes(item.status))} onAction={runAction} onVendorSaved={(updated) => setRequests((current) => current.map((item) => item.id === updated.id ? updated : item))} onNotify={notify} />;
    if (activePath === '/purchase-orders') return <PurchaseOrdersView requests={requests.filter((item) => ['PO Draft','For Department Approval','For Finance Approval','For COO Approval','For President Approval','PO Approved','PO Awaiting Acknowledgement','PO Acknowledged','Partially Received','Received','Paid','Filed'].includes(item.status))} role={role} onAction={runAction} />;
    if (activePath === '/receiving') return <ReceivingQueueView requests={requests.filter((item) => ['PO Acknowledged','Partially Received','Received','Paid'].includes(item.status))} role={role} onAction={runAction} />;
    if (activePath === '/vendors') return <VendorsView requests={requests} role={role} onNotify={notify} />;
    if (activePath === '/products') return <ProductsView onNotify={notify} />;
    if (activePath === '/reports') return <ReportsView requests={requests} />;
    if (activePath === '/administration' && isSuperAdmin) return <UserAdministrationView />;
    return <Dashboard requests={requests} role={role} requesterName={sessionUser?.name ?? ''} requesterDepartment={sessionUser?.department ?? 'Academic Affairs'} onNavigate={onNavigate} />;
  }, [access, activePath, acknowledged, isSuperAdmin, poSent, received, requests, role, onNavigate]);

  return (
    <div className="procurement-app">
      {currentView}
      {toast ? <div className="proc-toast"><CheckCircle2 size={18} />{toast}</div> : null}
    </div>
  );
}

type DashboardMetric = { label: string; value: string; detail: string; tone: string };
type DashboardConfig = { title: string; detail: string; metrics: DashboardMetric[]; priorityTitle: string; priorityRecords: PurchaseRequest[]; priorityPath: string; priorityEmpty: string; recentTitle: string; recentRecords: PurchaseRequest[]; recentPath: string; recentEmpty: string; showWorkflows: boolean };

function Dashboard({ requests, role, requesterName, requesterDepartment, onNavigate }: { requests: PurchaseRequest[]; role: Role; requesterName: string; requesterDepartment: string; onNavigate: (path: string) => void }) {
  const approvalStatuses: RequestStatus[] = ['For DT Approval', 'For Department Approval', 'For Finance Approval', 'For COO Approval', 'For President Approval'];
  const sourcingStatuses: RequestStatus[] = ['For Procurement Review', 'RFQ Draft', 'RFQ Sent', 'Quotations Received'];
  const poStatuses: RequestStatus[] = ['PO Draft', 'For Department Approval', 'For Finance Approval', 'For COO Approval', 'For President Approval', 'PO Approved', 'PO Awaiting Acknowledgement', 'PO Acknowledged', 'Partially Received', 'Received', 'Paid', 'Filed'];
  const submitted = requests.filter((item) => item.status !== 'Draft');
  const own = requests.filter((item) => item.requester === requesterName);
  const department = requests.filter((item) => item.department === requesterDepartment);
  const technology = requests.filter(requestIncludesTechnology);
  const purchaseOrders = requests.filter((item) => poStatuses.includes(item.status));
  const total = (records: PurchaseRequest[]) => records.reduce((sum, item) => sum + item.amount, 0);
  const notificationsFor = (targetRole: 'Finance Manager' | 'COO' | 'President') => submitted.filter((item) => executiveNotificationRole(item.amount) === targetRole);

  const baseConfig: DashboardConfig = {
    title: 'Procurement Overview',
    detail: 'Monitor organization-wide requests, approvals, sourcing activity, Purchase Orders, and fulfillment.',
    metrics: [
      { label: 'Purchase requests', value: String(requests.length), detail: 'Across all lifecycle stages', tone: 'maroon' },
      { label: 'For approval', value: String(requests.filter((item) => approvalStatuses.includes(item.status)).length), detail: 'Awaiting assigned reviewers', tone: 'gold' },
      { label: 'Active sourcing', value: String(requests.filter((item) => sourcingStatuses.includes(item.status)).length), detail: 'Review, RFQ, and quotation work', tone: 'teal' },
      { label: 'Purchase orders', value: String(purchaseOrders.length), detail: `${money.format(total(purchaseOrders))} committed`, tone: 'green' },
    ],
    priorityTitle: 'Approval attention', priorityRecords: requests.filter((item) => approvalStatuses.includes(item.status)), priorityPath: '/approvals', priorityEmpty: 'No approvals are waiting for action.',
    recentTitle: 'Recent purchase requests', recentRecords: requests, recentPath: '/requests', recentEmpty: 'No procurement records are available.', showWorkflows: true,
  };

  let config = baseConfig;
  if (role === 'Requester') {
    const actions = own.filter((item) => ['Draft', 'For Requester Selection'].includes(item.status));
    config = {
      title: 'My Purchasing', detail: 'Create Purchase Requests, choose among qualified vendor quotations, and follow your purchases.',
      metrics: [
        { label: 'My requests', value: String(own.length), detail: 'Submitted by you', tone: 'maroon' },
        { label: 'Needs my action', value: String(actions.length), detail: 'Drafts and vendor selections', tone: 'gold' },
        { label: 'Vendor selection', value: String(own.filter((item) => item.status === 'For Requester Selection').length), detail: 'Qualified quotations ready', tone: 'teal' },
        { label: 'POs in progress', value: String(own.filter((item) => poStatuses.includes(item.status)).length), detail: 'Created from your requests', tone: 'green' },
      ],
      priorityTitle: 'My required actions', priorityRecords: actions, priorityPath: '/requests', priorityEmpty: 'You have no purchasing actions due.',
      recentTitle: 'My active requests', recentRecords: own, recentPath: '/requests', recentEmpty: 'You have not created a Purchase Request yet.', showWorkflows: false,
    };
  } else if (role === 'DT Department') {
    const reviews = requests.filter((item) => item.status === 'For DT Approval');
    const offers = reviews.reduce((sum, item) => sum + (item.rfqQuotes ?? []).filter((quote) => quote.status === 'Responded').length, 0);
    config = {
      title: 'Technology Review', detail: 'Review vendor quotations for technology products and record technical suitability.',
      metrics: [
        { label: 'DT reviews', value: String(reviews.length), detail: 'Waiting for technical decisions', tone: 'maroon' },
        { label: 'Vendor quotations', value: String(offers), detail: 'Responded offers under review', tone: 'teal' },
        { label: 'Technology products', value: String(reviews.reduce((sum, item) => sum + (item.items ?? []).filter((product) => product.category === 'Technology').length, 0)), detail: 'Reviewable product lines', tone: 'gold' },
        { label: 'Completed reviews', value: String(technology.filter((item) => item.history?.some((event) => event.detail.includes('Digital Transformation Team approved'))).length), detail: 'Technically cleared requests', tone: 'green' },
      ],
      priorityTitle: 'Technical reviews required', priorityRecords: reviews, priorityPath: '/approvals', priorityEmpty: 'No technology quotations require DT review.',
      recentTitle: 'Technology requests', recentRecords: technology, recentPath: '/requests', recentEmpty: 'No technology requests are visible.', showWorkflows: false,
    };
  } else if (role === 'Department Head') {
    config = {
      title: `${requesterDepartment} Procurement`, detail: 'Monitor department demand, Purchase Request notifications, and PO approvals.',
      metrics: [
        { label: 'New PR notices', value: String(department.filter((item) => item.status !== 'Draft').length), detail: 'Submitted department requests', tone: 'maroon' },
        { label: 'PO approvals', value: String(department.filter((item) => item.status === 'For Department Approval').length), detail: 'Waiting for department approval', tone: 'gold' },
        { label: 'Active requests', value: String(department.filter((item) => !['Paid', 'Filed'].includes(item.status)).length), detail: 'Moving through workflow', tone: 'teal' },
        { label: 'Department value', value: money.format(total(department)), detail: `${department.length} total requests`, tone: 'green' },
      ],
      priorityTitle: 'Department notifications', priorityRecords: department.filter((item) => item.status !== 'Draft'), priorityPath: '/notifications', priorityEmpty: 'No new department Purchase Requests.',
      recentTitle: 'Department requests', recentRecords: department, recentPath: '/requests', recentEmpty: 'No requests are recorded for this department.', showWorkflows: false,
    };
  } else if (role === 'Finance Manager') {
    const notices = notificationsFor('Finance Manager');
    const financeOrders = purchaseOrders.filter((item) => item.amount <= 100000);
    config = {
      title: 'Finance Procurement', detail: 'Monitor finance-routed notifications, PO approvals, receiving, and payment readiness.',
      metrics: [
        { label: 'PR notifications', value: String(notices.length), detail: 'Within Finance threshold', tone: 'maroon' },
        { label: 'PO approvals', value: String(requests.filter((item) => item.status === 'For Finance Approval').length), detail: 'Waiting for Finance decision', tone: 'gold' },
        { label: 'Awaiting payment', value: String(requests.filter((item) => item.status === 'Received').length), detail: 'Ready for invoice matching', tone: 'teal' },
        { label: 'Open PO value', value: money.format(total(financeOrders)), detail: `${financeOrders.length} visible Purchase Orders`, tone: 'green' },
      ],
      priorityTitle: 'Finance notifications', priorityRecords: notices, priorityPath: '/notifications', priorityEmpty: 'No PR notifications are in the Finance range.',
      recentTitle: 'Finance-visible Purchase Orders', recentRecords: financeOrders, recentPath: '/purchase-orders', recentEmpty: 'No Purchase Orders are visible to Finance.', showWorkflows: false,
    };
  } else if (role === 'COO' || role === 'President') {
    const notices = notificationsFor(role);
    const approvalStatus: RequestStatus = role === 'COO' ? 'For COO Approval' : 'For President Approval';
    const orders = purchaseOrders.filter((item) => role === 'COO' ? item.amount > 100000 && item.amount <= 999999 : item.amount > 999999);
    config = {
      title: role === 'COO' ? 'COO Procurement' : 'Executive Procurement',
      detail: role === 'COO' ? 'Review medium-value procurement visibility and POs routed to COO authority.' : 'Review high-value procurement visibility and POs requiring presidential authority.',
      metrics: [
        { label: 'PR notifications', value: String(notices.length), detail: `${role} amount range`, tone: 'maroon' },
        { label: 'PO approvals', value: String(requests.filter((item) => item.status === approvalStatus).length), detail: `Waiting for ${role} decision`, tone: 'gold' },
        { label: 'Visible POs', value: String(orders.length), detail: 'Within approval authority', tone: 'teal' },
        { label: 'Notified value', value: money.format(total(notices)), detail: `${notices.length} submitted requests`, tone: 'green' },
      ],
      priorityTitle: `${role} notifications`, priorityRecords: notices, priorityPath: '/notifications', priorityEmpty: `No PR notifications are in the ${role} range.`,
      recentTitle: `${role}-visible Purchase Orders`, recentRecords: orders, recentPath: '/purchase-orders', recentEmpty: `No Purchase Orders are routed to the ${role}.`, showWorkflows: false,
    };
  } else if (role === 'Procurement Officer' || role === 'Procurement Admin') {
    const sourcing = requests.filter((item) => sourcingStatuses.includes(item.status));
    const preparation = requests.filter((item) => ['For Requester Selection', 'Ready for PO Creation', 'PO Draft'].includes(item.status));
    config = {
      title: 'Procurement Operations', detail: 'Run procurement reviews, vendor sourcing, quotation collection, and PO preparation.',
      metrics: [
        { label: 'Procurement review', value: String(requests.filter((item) => item.status === 'For Procurement Review').length), detail: 'Submitted PRs to validate', tone: 'maroon' },
        { label: 'Active sourcing', value: String(sourcing.length), detail: 'Open sourcing records', tone: 'teal' },
        { label: 'Quotes received', value: String(requests.filter((item) => item.status === 'Quotations Received').length), detail: 'Ready for routing', tone: 'gold' },
        { label: 'PO preparation', value: String(preparation.length), detail: 'Selection through PO draft', tone: 'green' },
      ],
      priorityTitle: 'Procurement work queue', priorityRecords: sourcing, priorityPath: '/sourcing', priorityEmpty: 'No procurement or sourcing work is waiting.',
      recentTitle: 'Purchase Order preparation', recentRecords: preparation, recentPath: '/requests', recentEmpty: 'No requests are in PO preparation.', showWorkflows: true,
    };
  }

  const workflowStages = [
    { name: 'Draft', detail: 'The requester prepares the purchase need, items, quantities, specifications, required date, and estimated cost.' },
    { name: 'Submitted', detail: 'The requester submits the Purchase Request and the system notifies the Department Head and relevant executive.' },
    { name: 'Procurement Review', detail: 'Procurement validates completeness, specifications, quantities, sourcing requirements, and supporting information.' },
    { name: 'Vendor Sourcing', detail: 'Procurement identifies multiple qualified vendors for the requested products or services.' },
    { name: 'RFQs Sent', detail: 'Requests for Quotation are sent to the selected qualified vendors.' },
    { name: 'Quotations Received', detail: 'Procurement receives, records, and organizes vendor quotations for comparison.' },
    { name: 'DT Review', detail: 'Technology quotation lines are reviewed by the Digital Transformation team.' },
    { name: 'Requester Selection', detail: 'The requester reviews qualified quotations and selects the preferred vendor.' },
    { name: 'PO Creation', detail: 'Procurement creates a Purchase Order linked to the originating PR and selected quotation.' },
  ];
  const openRecord = (request: PurchaseRequest, path: string) => { window.sessionStorage.setItem('procurement-selected-request', request.id); onNavigate(path); };
  return <div className="proc-page role-dashboard">
    <section className="proc-hero role-dashboard-hero"><div><span>{role} workspace</span><h2>{config.title}</h2><p>{config.detail}</p></div><button className="proc-primary" type="button" onClick={() => onNavigate(config.priorityPath)}>Open {config.priorityTitle}<ArrowRight size={16} /></button></section>
    <section className="metric-grid">{config.metrics.map((metric) => <Metric key={metric.label} {...metric} />)}</section>
    <section className="dashboard-work-grid"><section className="proc-card dashboard-work-card"><CardHeader title={config.priorityTitle} icon={Inbox} action={<button className="proc-card-header-action" onClick={() => onNavigate(config.priorityPath)}>Open queue<ArrowRight size={15} /></button>} /><DashboardRecordList records={config.priorityRecords.slice(0, 5)} empty={config.priorityEmpty} onOpen={(request) => openRecord(request, config.priorityPath)} /></section><section className="proc-card dashboard-work-card"><CardHeader title={config.recentTitle} icon={Clock3} action={<button className="proc-card-header-action" onClick={() => onNavigate(config.recentPath)}>View records<ArrowRight size={15} /></button>} /><DashboardRecordList records={config.recentRecords.slice(0, 5)} empty={config.recentEmpty} onOpen={(request) => openRecord(request, config.recentPath)} /></section></section>
    {config.showWorkflows ? <><section className="proc-card workflow-overview"><div className="workflow-overview-heading"><div><span className="eyebrow">Purchase request lifecycle</span><h2>Purchase Request Workflow</h2></div><span>{workflowStages.length} stages</span></div><div className="lifecycle-flow">{workflowStages.map((stage, index) => <div className="lifecycle-step" key={stage.name} tabIndex={0} aria-label={`${stage.name}: ${stage.detail}`}><span>{index + 1}</span><small>{stage.name}</small><div className="stage-tooltip" role="tooltip"><b>{stage.name}</b><p>{stage.detail}</p></div></div>)}</div></section><PurchaseOrderWorkflow /></> : null}
  </div>;
}

function DashboardRecordList({ records, empty, onOpen }: { records: PurchaseRequest[]; empty: string; onOpen: (request: PurchaseRequest) => void }) {
  if (!records.length) return <div className="dashboard-record-empty"><CheckCircle2 size={22} /><b>Nothing waiting</b><p>{empty}</p></div>;
  return <div className="dashboard-record-list">{records.map((request) => <button type="button" key={request.id} onClick={() => onOpen(request)}><span className="dashboard-record-icon"><FileText size={16} /></span><span><b>{request.title}</b><small>{request.id} · {request.department} · {request.requester}</small></span><span><StatusBadge>{request.status}</StatusBadge><strong>{money.format(request.amount)}</strong></span><ArrowRight size={16} /></button>)}</div>;
}

function RequestsView({ requests, role, requesterName, onNavigate, onNew }: { requests: PurchaseRequest[]; role: Role; requesterName: string; onNavigate: (path: string) => void; onNew: () => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'department' | 'action'>(role === 'Requester' ? 'action' : 'all');
  const [selectedId, setSelectedId] = useState(() => window.sessionStorage.getItem('procurement-selected-request') ?? requests[0]?.id ?? '');
  useEffect(() => { if (selectedId) window.sessionStorage.setItem('procurement-selected-request', selectedId); }, [selectedId]);
  useEffect(() => { if (role === 'Requester') setFilter('action'); }, [role]);
  const visibleRequests = role === 'Requester' ? requests.filter((request) => request.requester === requesterName) : requests;
  const homeDepartment = visibleRequests[0]?.department;
  const actionStatuses: RequestStatus[] = role === 'Requester' ? ['Draft', 'For Requester Selection'] : role === 'DT Department' ? ['For DT Approval'] : role === 'Department Head' ? ['For Department Approval'] : role === 'Finance Manager' ? ['For Finance Approval'] : role === 'COO' ? ['For COO Approval'] : role === 'President' ? ['For President Approval'] : ['For DT Approval', 'For Requester Selection', 'For Department Approval', 'For Finance Approval', 'For Procurement Review', 'RFQ Draft', 'PO Awaiting Acknowledgement'];
  const needsActionCount = visibleRequests.filter((request) => actionStatuses.includes(request.status)).length;
  const filtered = visibleRequests.filter((request) => {
    const itemSearchText = request.items?.map((item) => `${item.name} ${item.category} ${itemDescription(item)} ${itemUom(item)}`).join(' ') ?? '';
    const searchText = `${request.id} ${request.title} ${request.department} ${request.requester} ${request.status} ${itemSearchText}`.toLowerCase();
    const matchesQuery = searchText.includes(query.trim().toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'department' ? request.department === homeDepartment : actionStatuses.includes(request.status));
    return matchesQuery && matchesFilter;
  });
  const selected = filtered.find((request) => request.id === selectedId) ?? filtered[0];
  const currentStage = selected ? workflowStageIndex(selected.status) : -1;
  return <div className="proc-page">
    <PageHeading eyebrow="Internal request" title="Purchase Requests" detail="Create, validate, route, and monitor every organizational purchasing need." action={<button className="proc-primary" onClick={onNew}><Plus size={17} />New request</button>} />
    <section className="proc-filterbar">
      <div className="proc-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search request number, product, category, or department" /></div>
      <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>{role === 'Requester' ? 'My requests' : 'All requests'}</button>
      {role !== 'Requester' ? <button className={`filter-chip ${filter === 'department' ? 'active' : ''}`} onClick={() => setFilter('department')}>My department</button> : null}
      <button className={`filter-chip ${filter === 'action' ? 'active' : ''}`} onClick={() => setFilter('action')}>Needs action{needsActionCount ? ` (${needsActionCount})` : ''}</button>
    </section>
    {selected ? <div className="approval-layout request-master-detail">
      <section className="proc-card queue-card">
        <CardHeader title="Purchase requests" icon={Inbox} />
        {filtered.map((request) => <button type="button" className={`queue-item ${selected.id === request.id ? 'selected' : ''}`} key={request.id} onClick={() => setSelectedId(request.id)}><span className="queue-badge">{request.requester.split(' ').map((part) => part[0]).join('').slice(0,2)}</span><span><b>{request.title}</b><small>{request.id} · {request.status}</small>{role === 'Requester' && request.status === 'For Requester Selection' ? <em className="queue-action-label">Choose vendor</em> : null}</span><strong>{money.format(request.amount)}</strong></button>)}
      </section>
      <section className="proc-card review-card request-detail-card">
        <div className="review-header"><div><StatusBadge>{selected.status}</StatusBadge><h3>{selected.title}</h3><p><strong className="inline-pr-number">{selected.id}</strong> · Requested by {selected.requester}</p></div><strong>{money.format(selected.amount)}</strong></div>
        <div className="detail-grid"><Detail label="Department" value={selected.department} /><Detail label="Required date" value={selected.due} /><Detail label="Product lines" value={String(selected.items?.length ?? 0)} /><Detail label="Total quantity" value={String(requestTotalQuantity(selected))} /></div>
        {selected.status === 'For Requester Selection' ? <section className="requester-selection-prompt"><span><ShoppingCart size={19} /></span><div><small>Vendor selection required</small><h4>Qualified quotations are ready</h4><p>{(selected.rfqQuotes ?? []).filter((quote) => quote.status === 'Responded').length} vendors submitted itemized quotations for this request.</p></div>{['Requester','Super Admin'].includes(role) ? <button className="proc-primary" type="button" onClick={() => { window.sessionStorage.setItem('procurement-selected-request', selected.id); onNavigate(`/requests/${encodeURIComponent(selected.id)}/vendor-selection`); }}>Compare quotations<ArrowRight size={16} /></button> : <strong>Awaiting requester</strong>}</section> : null}
        {requestIncludesTechnology(selected) ? <div className="category-route-note"><UserCheck size={17} /><span><b>{selected.dtReviewNotes ? 'DT review completed' : 'DT review required'}</b><small>{selected.dtReviewNotes ?? 'This request contains one or more Technology products.'}</small></span></div> : null}
        <div className="movement-history-title"><strong>Lifecycle stage</strong><span>Stage {currentStage + 1} of {purchaseRequestLifecycleLabels.length}</span></div>
        <div className="pr-journey request-lifecycle">{purchaseRequestLifecycleLabels.map((label, index) => <div className={`${index < currentStage ? 'complete' : ''} ${index === currentStage ? 'current' : ''}`} key={label}><span>{index < currentStage ? <Check size={12} /> : index + 1}</span><small>{label}</small></div>)}</div>
        <div className="movement-history-title"><strong>Requested products</strong><span>{selected.items?.length ?? 0} {(selected.items?.length ?? 0) === 1 ? 'product line' : 'product lines'}</span></div>
        <div className="request-detail-items">{selected.items?.length ? selected.items.map((item, index) => <div key={`${item.name}-${index}`}><span><b>{item.name}</b><small>{item.category} · {itemUom(item)}</small><em>{itemDescription(item)}</em></span><span>{item.quantity} {itemUom(item)} × {money.format(item.unitPrice)}</span><strong>{money.format(item.quantity * item.unitPrice)}</strong></div>) : <p>No product lines recorded.</p>}</div>
        <div className="movement-history-title request-activity-heading"><strong>Activity history</strong><span>Latest first</span></div>
        <div className="request-activity-list">{(selected.history?.length ? selected.history : [{ action: 'create', actor: selected.requester, detail: `Created with status ${selected.status}`, createdAt: selected.createdAt ?? '' }]).slice().reverse().map((event, index) => <div className="movement-event" key={`${event.createdAt}-${event.action}-${index}`}><span><Check size={13} /></span><div><b>{movementActionLabel(event.action)}</b><p>{event.detail}</p><small>{event.actor} · {formatMovementTime(event.createdAt)}</small></div></div>)}</div>
      </section>
    </div> : <section className="proc-card table-empty">No purchase requests match the current search or filter.</section>}
  </div>;
}

function RequesterQuotationSelectionPage({ request, onBack, onRequestSaved, onComplete }: { request: PurchaseRequest; onBack: () => void; onRequestSaved: (request: PurchaseRequest) => void; onComplete: () => void }) {
  if (request.status !== 'For Requester Selection') return <div className="proc-page"><section className="quotation-selection-toolbar"><button className="proc-secondary" type="button" onClick={onBack}><ArrowLeft size={16} />Back to Purchase Request</button><div><span className="proc-eyebrow">{request.id}</span><h2>Vendor selection is no longer required</h2><p>This request has already moved to {request.status}.</p></div></section></div>;
  return <div className="proc-page quotation-selection-page">
    <section className="quotation-selection-toolbar requester-selection-toolbar"><div className="requester-selection-toolbar-top"><button className="proc-secondary" type="button" onClick={onBack}><ArrowLeft size={16} />Back to Purchase Request</button><StatusBadge>{request.status}</StatusBadge></div><div className="requester-selection-toolbar-copy"><span className="proc-eyebrow">{request.id} · Requester decision</span><h2>{request.title}</h2><p>Review the complete quotations and select one vendor for all items in this Purchase Request.</p></div></section>
    <section className="quotation-request-summary"><Detail label="Department" value={request.department} /><Detail label="Requested products" value={String(request.items?.length ?? 0)} /><Detail label="Total quantity" value={String(requestTotalQuantity(request))} /><Detail label="Estimated request cost" value={money.format(request.amount)} /></section>
    <ProcurementValidationGuidance request={request} />
    {request.dtReviewNotes ? <section className="requester-dt-guidance"><span><UserCheck size={21} /></span><div><small>Digital Transformation Review</small><h3>Technical review completed</h3><p>{request.dtReviewNotes}</p><em>{request.dtReviewedBy ?? 'Digital Transformation Team'} · {formatMovementTime(request.dtReviewedAt)}</em></div><strong><CheckCircle2 size={16} />Reviewed</strong></section> : null}
    <RequesterQuotationSelection request={request} onRequestSaved={onRequestSaved} onComplete={onComplete} />
  </div>;
}

function RequesterQuotationSelection({ request, onRequestSaved, onComplete }: { request: PurchaseRequest; onRequestSaved: (request: PurchaseRequest) => void; onComplete: () => void }) {
  const eligibleQuotes = (request.rfqQuotes ?? []).filter((quote) => quote.status === 'Responded');
  const [selectedVendor, setSelectedVendor] = useState(request.vendorName ?? '');
  const selectQuotation = () => {
    const quote = eligibleQuotes.find((item) => item.vendorName === selectedVendor);
    if (!quote) return;
    const createdAt = new Date().toISOString();
    onRequestSaved({ ...request, vendorName: quote.vendorName, vendorEmail: quote.vendorEmail, updatedAt: createdAt, history: [...(request.history ?? []), { action: 'select_quote', actor: request.requester, detail: `${quote.vendorName} quotation selected by requester`, createdAt }] });
    onComplete();
  };
  return <section className="requester-quote-selection">
    <div className="requester-selection-heading"><span><ShoppingCart size={18} /></span><div><small>Vendor selection required</small><h4>Choose a vendor quotation</h4><p>Compare every quoted item, commercial term, and total before selecting one vendor for this request.</p></div><strong>{eligibleQuotes.length} qualified</strong></div>
    <div className="requester-quote-grid">{eligibleQuotes.map((quote, index) => {
      const selected = selectedVendor === quote.vendorName;
      return <article className={`requester-quote-card ${selected ? 'selected' : ''}`} key={quote.vendorName}>
        <button type="button" className="requester-quote-choice" onClick={() => setSelectedVendor(selected ? '' : quote.vendorName)} aria-pressed={selected}>
          <span><small className="requester-vendor-index">Vendor {index + 1}</small><b>{quote.vendorName}</b><small>{quote.reference || 'No vendor reference'} · {quote.attachmentName || 'No attachment'}</small></span>
          <strong>{money.format(rfqQuoteTotal(request, quote))}</strong>
          <em>{selected ? <CheckCircle2 size={16} /> : <Circle size={16} />}{selected ? 'Selected' : 'Choose vendor'}</em>
        </button>
        <div className="requester-quote-line-head"><span>Requested item</span><span>Description / Specifications</span><span>Quantity</span><span>Unit price</span><span>Line total</span></div>
        <div className="requester-quote-lines">{(request.items ?? []).map((item) => {
          const quotedItem = quote.items.find((line) => line.name === item.name);
          const unitPrice = quotedItem?.unitPrice ?? 0;
          return <div className="requester-quote-line" key={item.name}>
            <span><b>{item.name}</b><small>{item.category} · UOM {itemUom(item)}</small></span>
            <span className="requester-item-specs"><small>Description / Specifications</small>{itemDescription(item)}</span>
            <span><small>Quantity</small>{item.quantity}</span>
            <span><small>Unit price</small>{unitPrice ? money.format(unitPrice) : 'Not quoted'}</span>
            <strong><small>Line total</small>{unitPrice ? money.format(item.quantity * unitPrice) : '—'}</strong>
          </div>;
        })}</div>
        <footer className="requester-quote-terms"><span><small>Delivery</small><b>{quote.deliveryDays} days</b></span><span><small>Payment terms</small><b>{quote.terms}</b></span><span><small>Warranty</small><b>{quote.warranty}</b></span><span><small>Valid until</small><b>{quote.validUntil}</b></span></footer>
      </article>;
    })}</div>
    {eligibleQuotes.length ? <div className="action-row"><button className="proc-primary" type="button" disabled={!selectedVendor} onClick={selectQuotation}><Check size={16} />Confirm selected vendor</button></div> : <div className="table-empty">No qualified vendor quotations are available for selection.</div>}
  </section>;
}

function ApprovalsQueueView(props: { requests: PurchaseRequest[]; role: Role; onApprove: (id: string) => void; onNotify: (message: string) => void; onNavigate: (path: string) => void }) {
  const eligible = props.requests.filter((item) => props.role === 'DT Department' ? item.status === 'For DT Approval' : props.role === 'Department Head' ? item.status === 'For Department Approval' : props.role === 'Finance Manager' ? item.status === 'For Finance Approval' : props.role === 'COO' ? item.status === 'For COO Approval' : props.role === 'President' ? item.status === 'For President Approval' : ['For DT Approval', 'For Department Approval', 'For Finance Approval', 'For COO Approval', 'For President Approval'].includes(item.status));
  const [selectedId, setSelectedId] = useState(eligible[0]?.id ?? '');
  const selected = eligible.find((item) => item.id === selectedId) ?? eligible[0];
  if (!selected) return <EmptyWorkflow title="Approval Queue" detail="There are no Purchase Requests or Purchase Orders waiting for your approval." />;
  return <div className="proc-page"><PageHeading eyebrow={`${props.role} workspace`} title="Approval Queue" detail="Review assigned Purchase Request and Purchase Order decisions, routing, and supporting information." /><div className="approval-layout"><section className="proc-card queue-card"><CardHeader title={`Waiting for review (${eligible.length})`} icon={Inbox} />{eligible.map((item) => { const poApproval = isPurchaseOrderApprovalStatus(item.status); return <button type="button" className={`queue-item ${selected.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)}><span className="queue-badge">{poApproval ? 'PO' : item.requester.split(' ').map((part) => part[0]).join('').slice(0,2)}</span><span><b>{item.title}</b><small>{poApproval ? item.id.replace('PR-', 'PO-') : item.id} · {item.status}</small></span><strong>{money.format(item.amount)}</strong></button>; })}</section><RoutingApprovalDetail request={selected} onApprove={props.onApprove} onNotify={props.onNotify} onOpenDtReview={() => props.onNavigate(`/approvals/${encodeURIComponent(selected.id)}/quotation-review`)} /></div></div>;
}

function RoutingApprovalDetail({ request, onApprove, onNotify, onOpenDtReview }: { request: PurchaseRequest; onApprove: (id: string) => void; onNotify: (message: string) => void; onOpenDtReview: () => void }) {
  const isDt = request.status === 'For DT Approval';
  const isDepartment = request.status === 'For Department Approval';
  const isCoo = request.status === 'For COO Approval';
  const isPresident = request.status === 'For President Approval';
  const isPoApproval = isPurchaseOrderApprovalStatus(request.status);
  const documentId = isPoApproval ? request.id.replace('PR-', 'PO-') : request.id;
  const technologyItems = request.items?.filter((item) => item.category === 'Technology') ?? [];
  const vendorQuotes = (request.rfqQuotes ?? []).filter((quote) => quote.status === 'Responded');
  const team = isDt ? 'Digital Transformation Team' : isDepartment ? 'Department Head' : isCoo ? 'Chief Operating Officer' : isPresident ? 'President' : 'Finance';
  const next = isDt ? 'Requester quotation selection' : isDepartment ? request.amount <= 100000 ? 'Finance approval' : request.amount <= 999999 ? 'COO approval' : 'President approval' : 'Approved and ready for issue';
  const button = isDt ? 'Complete DT review' : isDepartment ? request.amount <= 100000 ? 'Approve to Finance' : request.amount <= 999999 ? 'Approve to COO' : 'Approve to President' : 'Approve Purchase Order';
  return <section className="proc-card review-card">
    <div className="review-header"><div><span className="status-pill warning">{request.status}</span><h3>{request.title}</h3><p>{documentId} · {isPoApproval ? `Source ${request.id}` : `Requested by ${request.requester}`}</p></div><div className="review-estimate-reference"><span>{isPoApproval ? 'Purchase Order total' : 'Request estimate'}</span><strong>{money.format(request.amount)}</strong></div></div>
    <div className="detail-grid"><Detail label="Department" value={request.department} /><Detail label="Review team" value={team} /><Detail label="Next step" value={next} /><Detail label={isDt ? 'Vendor quotations' : isPoApproval ? 'Selected vendor' : 'Product lines'} value={isDt ? String(vendorQuotes.length) : isPoApproval ? request.vendorName || 'Not recorded' : String(request.items?.length ?? 0)} /></div>
    {isDt ? <section className="dt-review-launch"><span><ClipboardCheck size={22} /></span><div><small>Technical quotation review</small><h4>Compare vendor offers on a dedicated page</h4><p>Review {vendorQuotes.length} vendor quotations across {technologyItems.length} technology products. Non-technology lines remain visible but cannot be evaluated by DT.</p><div><b>{vendorQuotes.length} vendors</b><b>{technologyItems.length} technology products</b><b>{vendorQuotes.reduce((sum, quote) => sum + quote.items.length, 0)} quoted lines</b></div></div><button type="button" className="proc-primary" onClick={onOpenDtReview}>Open quotation comparison<ArrowRight size={16} /></button></section> : null}
    {!isDt ? <div className="policy-checks">{isDepartment ? <><CheckRow label="Department need confirmed" /><CheckRow label="Specifications and quantities accepted" /><CheckRow done={!requestIncludesTechnology(request) || Boolean(request.history?.some((event) => event.detail.includes('For Department Approval')))} label="DT review completed when required" /><CheckRow label="Department priority confirmed" /></> : <><CheckRow label="Budget allocation confirmed" /><CheckRow label="Approval authority confirmed" /><CheckRow label={isCoo || isPresident ? 'Executive approval authority confirmed' : 'Finance approval authority confirmed'} /><CheckRow done label="Department approval completed" /></>}</div> : null}
    {!isDt ? <><label className="notes-field"><span>Review notes</span><textarea placeholder="Add a note for the requester or next reviewer" /></label><div className="action-row"><button className="proc-secondary" onClick={() => onNotify(`${request.id} returned for clarification`)}>Return</button><button className="proc-danger" onClick={() => onNotify(`${request.id} rejected`)}>Reject</button><button className="proc-primary" onClick={() => onApprove(request.id)}><UserCheck size={17} />{button}</button></div></> : null}
  </section>;
}

function DtQuotationComparisonPage({ request, onBack, onComplete: persistReview, onNotify }: { request: PurchaseRequest; onBack: () => void; onComplete: (notes: string) => void; onNotify: (message: string) => void }) {
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState(request.dtReviewNotes ?? '');
  const onComplete = () => persistReview(notes);
  const technologyItems = request.items?.filter((item) => item.category === 'Technology') ?? [];
  const vendorQuotes = (request.rfqQuotes ?? []).filter((quote) => quote.status === 'Responded');
  const decisionKey = (vendorName: string, itemName: string, index: number) => `${vendorName}:${index}:${itemName}`;
  const reviewableOffers = vendorQuotes.flatMap((quote) => (request.items ?? []).map((item, index) => ({ quote, item, index })).filter(({ item }) => item.category === 'Technology'));
  const allOffersDecided = reviewableOffers.length > 0 && reviewableOffers.every(({ quote, item, index }) => ['approved','rejected'].includes(decisions[decisionKey(quote.vendorName, item.name, index)]));
  const everyItemHasSuitableOffer = technologyItems.length > 0 && technologyItems.every((item) => vendorQuotes.some((quote) => decisions[decisionKey(quote.vendorName, item.name, request.items?.indexOf(item) ?? 0)] === 'approved'));
  const complete = allOffersDecided && everyItemHasSuitableOffer;
  const decidedCount = reviewableOffers.filter(({ quote, item, index }) => ['approved','rejected'].includes(decisions[decisionKey(quote.vendorName, item.name, index)])).length;
  return <div className="proc-page dt-comparison-page"><section className="quotation-selection-toolbar"><button className="proc-secondary" type="button" onClick={onBack}><ArrowLeft size={16} />Back to Approval Queue</button><div><span className="proc-eyebrow">{request.id} · Digital Transformation review</span><h2>Vendor Quotation Comparison</h2><p>{request.title}</p></div><StatusBadge>{request.status}</StatusBadge></section><section className="proc-card dt-comparison-summary"><div><small>Requesting department</small><b>{request.department}</b></div><div><small>Technology products</small><b>{technologyItems.length}</b></div><div><small>Vendor quotations</small><b>{vendorQuotes.length}</b></div><div><small>Technical decisions</small><b>{decidedCount} of {reviewableOffers.length}</b></div><div><small>Request estimate</small><strong>{money.format(request.amount)}</strong></div></section><ProcurementValidationGuidance request={request} /><section className="dt-scope-banner"><UserCheck size={20} /><div><b>DT evaluates technical suitability, not vendor selection.</b><p>Review every technology offer. Non-technology products are shown for context but remain disabled. After DT completes the review, the requester chooses among technically suitable quotations.</p></div></section>{vendorQuotes.length ? <div className="dt-comparison-vendor-list">{vendorQuotes.map((quote, vendorIndex) => <article className="proc-card dt-comparison-vendor" key={quote.vendorName}><header><div><span className="dt-vendor-number">Vendor {vendorIndex + 1}</span><h3>{quote.vendorName}</h3><p>{quote.reference || 'No reference'} · {quote.attachmentName || 'No attachment'}</p></div><strong>{money.format(rfqQuoteTotal(request, quote))}</strong></header><div className="dt-comparison-terms"><span><small>Delivery</small><b>{quote.deliveryDays} days</b></span><span><small>Payment terms</small><b>{quote.terms}</b></span><span><small>Warranty</small><b>{quote.warranty}</b></span><span><small>Valid until</small><b>{quote.validUntil}</b></span></div><div className="dt-comparison-item-head"><span>Product and specifications</span><span>Quoted price</span><span>Technical decision</span></div>{request.items?.map((item, index) => { const technology = item.category === 'Technology'; const key = decisionKey(quote.vendorName, item.name, index); const unitPrice = quote.items.find((quotedItem) => quotedItem.name === item.name)?.unitPrice ?? 0; return <div className={`dt-comparison-item ${technology ? '' : 'out-of-scope'}`} key={key}><span><b>{item.name}</b><small>{itemDescription(item)}</small><em>{item.category} · {item.quantity} {itemUom(item)}</em></span><span><small>Unit price</small><b>{money.format(unitPrice)}</b><small>Line total</small><strong>{money.format(item.quantity * unitPrice)}</strong><em>Estimate {money.format(item.unitPrice)} / {itemUom(item)}</em></span><label><span>{technology ? 'Technical suitability' : 'DT scope'}</span><select disabled={!technology} value={technology ? decisions[key] ?? 'pending' : 'not-applicable'} onChange={(event) => setDecisions((current) => ({ ...current, [key]: event.target.value }))}><option value="pending">Pending review</option><option value="approved">Technically suitable</option><option value="clarification">Needs clarification</option><option value="rejected">Not technically suitable</option>{!technology ? <option value="not-applicable">Not subject to DT review</option> : null}</select></label></div>; })}</article>)}</div> : <div className="table-empty">No responded vendor quotations are available for DT review.</div>}<section className={`dt-review-readiness dt-page-readiness ${complete ? 'complete' : ''}`}><span>{complete ? <CheckCircle2 size={19} /> : <Clock3 size={19} />}</span><div><b>{complete ? 'Technical review complete' : 'Technical decisions pending'}</b><small>{complete ? 'Every technology product has at least one technically suitable vendor offer.' : 'Decide every technology offer and retain at least one suitable offer for each technology product.'}</small></div><strong>{decidedCount}/{reviewableOffers.length}</strong></section><label className="notes-field dt-page-notes"><span>DT review notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Document compatibility concerns, required clarifications, or technical recommendations" /></label><footer className="dt-page-actions"><div><button className="proc-secondary" type="button" onClick={() => onNotify(`${request.id} returned to Procurement for quotation clarification`)}>Return for clarification</button><button className="proc-danger" type="button" onClick={() => onNotify(`${request.id} technical review rejected`)}>Reject technical offers</button></div><button className="proc-primary" type="button" disabled={!complete} onClick={onComplete}><UserCheck size={17} />Complete DT review</button></footer></div>;
}

function ApprovalDetail({ request, onApprove, onNotify }: { request: PurchaseRequest; onApprove: (id: string) => void; onNotify: (message: string) => void }) {
  const isDtReview = request.status === 'For DT Approval';
  return <section className="proc-card review-card"><div className="review-header"><div><span className="status-pill warning">{request.status}</span><h3>{request.title}</h3><p>{request.id} · Requested by {request.requester}</p></div><strong>{money.format(request.amount)}</strong></div><div className="detail-grid"><Detail label="Category" value={request.category} /><Detail label="Approval team" value={isDtReview ? 'Digital Transformation Team' : 'Finance'} /><Detail label="Next step" value={isDtReview ? 'Finance approval' : 'Procurement review'} /><Detail label="Requested products" value={String(request.items?.length ?? 1)} /></div><div className="policy-checks">{isDtReview ? <><CheckRow label="Technical specifications reviewed" /><CheckRow label="Compatibility and suitability confirmed" /><CheckRow label="Support and warranty requirements checked" /><CheckRow label="Recommended technical option documented" /></> : <><CheckRow label="Budget allocation confirmed" /><CheckRow label="Approval authority confirmed" /><CheckRow label="Quotation requirement reviewed" /><CheckRow done={request.category !== 'Technology'} label="DT suitability review completed" /></>}</div><label className="notes-field"><span>Review notes</span><textarea placeholder="Add a note for the requester or next approver" /></label><div className="action-row"><button className="proc-secondary" onClick={() => onNotify(`${request.id} returned for clarification`)}>Return</button><button className="proc-danger" onClick={() => onNotify(`${request.id} rejected`)}>Reject</button><button className="proc-primary" onClick={() => onApprove(request.id)}><UserCheck size={17} />{isDtReview ? 'Approve to Finance' : 'Approve to Procurement'}</button></div></section>;
}

function ApprovalsView({ requests, role, onApprove, onNotify }: { requests: PurchaseRequest[]; role: Role; onApprove: (id: string) => void; onNotify: (message: string) => void }) {
  const pending = requests.filter((item) => role === 'DT Department' ? item.status === 'For DT Approval' : role === 'Finance Manager' ? item.status === 'For Finance Approval' : ['For DT Approval', 'For Finance Approval'].includes(item.status));
  const [selectedId, setSelectedId] = useState(pending[0]?.id ?? '');
  const request = pending.find((item) => item.id === selectedId) ?? pending[0];
  if (!request) return <EmptyWorkflow title="Approval Queue" detail="There are no purchase requests waiting for approval." />;
  const isDtReview = request.status === 'For DT Approval';
  return <div className="proc-page"><PageHeading eyebrow={`${role} workspace`} title="Approval Queue" detail="Review policy checks, specifications, budget, and the calculated approval route." /><div className="approval-layout"><section className="proc-card queue-card"><CardHeader title="Waiting for review" icon={Inbox} />{pending.map((item, index) => <button className={`queue-item ${index === 0 ? 'selected' : ''}`} key={item.id}><span className="queue-badge">{item.requester.split(' ').map((part) => part[0]).join('').slice(0,2)}</span><span><b>{item.title}</b><small>{item.id} · {item.status}</small></span><strong>{money.format(item.amount)}</strong></button>)}</section><section className="proc-card review-card"><div className="review-header"><div><span className="status-pill warning">{request.status}</span><h3>{request.title}</h3><p>{request.id} · Requested by {request.requester}</p></div><strong>{money.format(request.amount)}</strong></div><div className="detail-grid"><Detail label="Category" value={request.category} /><Detail label="Approval team" value={isDtReview ? 'Digital Transformation Team' : 'Finance'} /><Detail label="Next step" value={isDtReview ? 'Finance approval' : 'Procurement review'} /><Detail label="Requested products" value={String(request.items?.length ?? 1)} /></div><div className="policy-checks">{isDtReview ? <><CheckRow label="Technical specifications reviewed" /><CheckRow label="Compatibility and suitability confirmed" /><CheckRow label="Support and warranty requirements checked" /><CheckRow label="Recommended technical option documented" /></> : <><CheckRow label="Budget allocation confirmed" /><CheckRow label="Approval authority confirmed" /><CheckRow label="Quotation requirement reviewed" /><CheckRow done={request.category !== 'Technology'} label="DT suitability review completed" /></>}</div><label className="notes-field"><span>Review notes</span><textarea placeholder="Add a note for the requester or next approver" /></label><div className="action-row"><button className="proc-secondary" onClick={() => onNotify(`${request.id} returned for clarification`)}>Return</button><button className="proc-danger" onClick={() => onNotify(`${request.id} rejected`)}>Reject</button><button className="proc-primary" onClick={() => onApprove(request.id)}><UserCheck size={17} />{isDtReview ? 'Approve to Finance' : 'Approve to Procurement'}</button></div></section></div></div>;
}

function MultiSourcingView({ requests, onAction, onVendorSaved, onNotify }: { requests: PurchaseRequest[]; onAction: (id: string, action: string) => void; onVendorSaved: (request: PurchaseRequest) => void; onNotify: (message: string) => void }) {
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'draft' | 'sent' | 'quotes' | 'selection'>('all');
  const filtered = requests.filter((item) => {
    const matchesQuery = `${item.id} ${item.title} ${item.vendorName ?? ''}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'all' || (status === 'draft' && ['For Procurement Review', 'RFQ Draft'].includes(item.status)) || (status === 'sent' && item.status === 'RFQ Sent') || (status === 'quotes' && item.status === 'Quotations Received') || (status === 'selection' && item.status === 'Ready for PO Creation');
    return matchesQuery && matchesStatus;
  });
  const selected = filtered.find((item) => item.id === selectedId);
  if (selected) return <SourcingWorkflowView request={selected} onBack={() => setSelectedId('')} onAction={onAction} onRequestSaved={onVendorSaved} onNotify={onNotify} />;
  if (!requests.length) return <EmptyWorkflow title="RFQ & Vendor Sourcing" detail="A submitted Purchase Request will appear after Procurement Review." />;
  return <div className="proc-page"><PageHeading eyebrow="Vendor sourcing" title="All RFQs" detail="Invite qualified vendors, record quotations, route technical items for review, and prepare the requester’s selection." /><section className="proc-filterbar"><div className="proc-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search RFQ number, request, or vendor" /></div><button className={`filter-chip ${status === 'all' ? 'active' : ''}`} onClick={() => setStatus('all')}>All</button><button className={`filter-chip ${status === 'draft' ? 'active' : ''}`} onClick={() => setStatus('draft')}>Sourcing</button><button className={`filter-chip ${status === 'sent' ? 'active' : ''}`} onClick={() => setStatus('sent')}>Awaiting replies</button><button className={`filter-chip ${status === 'quotes' ? 'active' : ''}`} onClick={() => setStatus('quotes')}>Quotes received</button><button className={`filter-chip ${status === 'selection' ? 'active' : ''}`} onClick={() => setStatus('selection')}>Ready for PO</button></section><section className="proc-card rfq-list-card"><CardHeader title={`Sourcing records (${filtered.length})`} icon={FileText} />{filtered.map((request) => <button type="button" className="rfq-list-row" key={request.id} onClick={() => setSelectedId(request.id)}><span className="rfq-list-icon"><FileText size={18} /></span><span><b>{request.status === 'For Procurement Review' ? request.id : request.id.replace('PR-', 'RFQ-')}</b><small>{request.title} · Source {request.id}</small></span><span><StatusBadge>{request.status}</StatusBadge><small>{request.rfqQuotes?.length ? `${request.rfqQuotes.length} vendors` : 'Vendor sourcing not started'}</small></span><strong>{money.format(request.amount)}</strong><ArrowRight className="rfq-row-chevron" size={18} /></button>)}{!filtered.length ? <div className="table-empty">No sourcing records match the current filters.</div> : null}</section></div>;
}

function SourcingWorkflowView({ request, onBack, onAction, onRequestSaved, onNotify }: { request: PurchaseRequest; onBack: () => void; onAction: (id: string, action: string) => void; onRequestSaved: (request: PurchaseRequest) => void; onNotify: (message: string) => void }) {
  const [vendorRecords, setVendorRecords] = useState<VendorRecord[]>(loadVendorRecords);
  const [vendorToAdd, setVendorToAdd] = useState('');
  const [addingVendor, setAddingVendor] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [validationNotes, setValidationNotes] = useState(request.procurementValidationNotes ?? '');
  const createQuote = (vendor: VendorRecord): RfqVendorQuote => ({ vendorName: vendor.name, vendorEmail: vendor.email, status: 'Draft', reference: '', deliveryDays: Number.parseInt(vendor.lead, 10) || 7, terms: vendor.terms, warranty: '1 year standard warranty', validUntil: '2026-09-30', items: (request.items ?? []).map((item) => ({ name: item.name, unitPrice: item.unitPrice })) });
  const initialQuotes = () => {
    if (request.status === 'RFQ Draft') {
      const shortlistWasEdited = request.history?.some((item) => ['add_qualified_vendor','remove_qualified_vendor','add_new_shortlist_vendor'].includes(item.action));
      return shortlistWasEdited ? request.rfqQuotes ?? [] : [];
    }
    return request.rfqQuotes?.length ? request.rfqQuotes : request.status === 'RFQ Sent' ? vendorRecords.slice(0, 3).map((vendor) => ({ ...createQuote(vendor), status: 'Sent' as const })) : [];
  };
  const [quotes, setQuotes] = useState<RfqVendorQuote[]>(initialQuotes);
  useEffect(() => setQuotes(initialQuotes()), [request.id, request.rfqQuotes, request.status]);
  useEffect(() => setValidationNotes(request.procurementValidationNotes ?? ''), [request.id, request.procurementValidationNotes]);
  const draft = request.status === 'RFQ Draft';
  const sent = request.status === 'RFQ Sent';
  const quotationsReceived = request.status === 'Quotations Received';
  const readyForPo = request.status === 'Ready for PO Creation';
  const respondedQuotes = quotes.filter((quote) => quote.status === 'Responded');
  const availableVendors = vendorRecords.filter((vendor) => !quotes.some((quote) => quote.vendorName === vendor.name));
  const updateQuote = (vendorName: string, changes: Partial<RfqVendorQuote>) => setQuotes((current) => current.map((quote) => quote.vendorName === vendorName ? { ...quote, ...changes } : quote));
  const updateQuotedItem = (vendorName: string, itemName: string, unitPrice: number) => setQuotes((current) => current.map((quote) => quote.vendorName === vendorName ? { ...quote, items: quote.items.map((item) => item.name === itemName ? { ...item, unitPrice } : item) } : quote));
  const saveQuotes = (nextQuotes: RfqVendorQuote[], action: string, detail: string) => {
    const createdAt = new Date().toISOString();
    onRequestSaved({ ...request, rfqQuotes: nextQuotes, updatedAt: createdAt, history: [...(request.history ?? []), { action, actor: 'procurement@life.edu.ph', detail, createdAt }] });
  };
  const toggleVendor = (vendor: VendorRecord) => {
    const included = quotes.some((quote) => quote.vendorName === vendor.name);
    const nextQuotes = included ? quotes.filter((quote) => quote.vendorName !== vendor.name) : [...quotes, createQuote(vendor)];
    setQuotes(nextQuotes);
    saveQuotes(nextQuotes, included ? 'remove_qualified_vendor' : 'add_qualified_vendor', `${vendor.name} ${included ? 'removed from' : 'added to'} the qualified vendor shortlist`);
    onNotify(`${vendor.name} ${included ? 'removed from' : 'added to'} the shortlist`);
  };
  const addSelectedVendor = () => {
    const vendor = availableVendors.find((item) => item.name === vendorToAdd);
    if (!vendor) return;
    toggleVendor(vendor);
    setVendorToAdd('');
  };
  const saveAndShortlistVendor = (vendor: VendorRecord) => {
    const nextRecords = [...vendorRecords, vendor];
    setVendorRecords(nextRecords);
    window.localStorage.setItem('procurement-vendors', JSON.stringify(nextRecords));
    const nextQuotes = [...quotes, createQuote(vendor)];
    setQuotes(nextQuotes);
    saveQuotes(nextQuotes, 'add_new_shortlist_vendor', `${vendor.name} added to the vendor directory and qualified shortlist`);
    setAddingVendor(false);
    onNotify(`${vendor.name} created and added to the shortlist`);
  };
  const addVendorAfterSend = () => {
    const vendor = availableVendors.find((item) => item.name === vendorToAdd);
    if (!vendor) return;
    const nextQuote = { ...createQuote(vendor), status: 'Sent' as const };
    const nextQuotes = [...quotes, nextQuote];
    setQuotes(nextQuotes);
    setVendorToAdd('');
    saveQuotes(nextQuotes, 'add_rfq_vendor', `${vendor.name} added after initial RFQ release and sent an invitation`);
    onNotify(`RFQ invitation sent to ${vendor.name}`);
  };
  const withdrawVendor = (vendorName: string) => {
    const nextQuotes = quotes.map((quote) => quote.vendorName === vendorName ? { ...quote, status: 'Withdrawn' as const } : quote);
    setQuotes(nextQuotes);
    saveQuotes(nextQuotes, 'withdraw_rfq_vendor', `${vendorName} RFQ invitation withdrawn; prior activity retained`);
    onNotify(`${vendorName} invitation withdrawn`);
  };
  const inviteVendors = () => {
    if (quotes.length < 2) return;
    const sentQuotes = quotes.map((quote) => ({ ...quote, status: 'Sent' as const }));
    setQuotes(sentQuotes);
    saveQuotes(sentQuotes, 'send_rfq', `RFQ sent to ${sentQuotes.length} qualified vendors`);
    onAction(request.id, 'send_rfq');
  };
  const closeQuotations = () => {
    saveQuotes(quotes, 'record_quotations', `${respondedQuotes.length} vendor quotations recorded and sourcing closed`);
    onAction(request.id, 'record_quotations');
  };
  const submitQuotations = () => {
    const createdAt = new Date().toISOString();
    const savedNotes = validationNotes.trim() || 'Procurement confirmed that the received quotations are complete, comparable, and submitted by qualified vendors.';
    onRequestSaved({ ...request, rfqQuotes: quotes, procurementValidationNotes: savedNotes, procurementValidatedAt: createdAt, procurementValidatedBy: 'Procurement Office', updatedAt: createdAt, history: [...(request.history ?? []), { action: 'validate_quotations', actor: 'procurement@life.edu.ph', detail: savedNotes, createdAt }] });
    onAction(request.id, 'submit_quotes');
  };
  if (request.status === 'For Procurement Review') return <ProcurementReview request={request} onBack={onBack} onComplete={() => onAction(request.id, 'complete_review')} onNotify={onNotify} />;
  return <div className="proc-page sourcing-workflow-page">
    <section className="rfq-commandbar"><div className="rfq-actions"><button className="proc-secondary" type="button" onClick={onBack}><ArrowLeft size={16} />Back to sourcing</button><button className="proc-secondary" type="button" onClick={() => setPreviewOpen(true)}><Eye size={16} />Preview vendor form</button>{draft ? <button className="proc-primary" type="button" disabled={quotes.length < 2} onClick={inviteVendors}><Send size={16} />Send RFQ to {quotes.length} vendors</button> : null}{sent ? <button className="proc-primary" type="button" disabled={respondedQuotes.length < 2} onClick={closeQuotations}><Check size={16} />Close RFQ and record quotations</button> : null}{quotationsReceived ? <button className="proc-primary" type="button" onClick={submitQuotations}><ArrowRight size={16} />Submit quotations for review</button> : null}{readyForPo ? <button className="proc-primary" type="button" disabled={!request.vendorName} onClick={() => onAction(request.id, 'create_po')}><ShoppingCart size={16} />Create PO from requester selection</button> : null}</div><div className="rfq-status-track"><span className={draft ? 'active' : 'done'}>Vendor sourcing</span><span className={sent ? 'active' : ['Quotations Received','For DT Approval','For Requester Selection','Ready for PO Creation'].includes(request.status) ? 'done' : ''}>RFQs sent</span><span className={quotationsReceived ? 'active' : ['For DT Approval','For Requester Selection','Ready for PO Creation'].includes(request.status) ? 'done' : ''}>Quotations received</span><span className={readyForPo ? 'active' : ''}>Requester selection</span></div></section>
    <section className="proc-card sourcing-record-header"><div><span className="proc-eyebrow">{request.id.replace('PR-', 'RFQ-')} · Source {request.id}</span><h2>{request.title}</h2><p>{request.department} · Requested by {request.requester}</p></div><div><StatusBadge>{request.status}</StatusBadge><strong>{money.format(request.amount)} estimated</strong></div></section>
    <section className="proc-card locked-pr-products"><div className="movement-history-title"><strong>Purchase Request products</strong><span>Locked source lines</span></div>{request.items?.map((item, index) => <div key={`${item.name}-${index}`}><span><b>{item.name}</b><small>{item.category} · {itemUom(item)}</small><em>{itemDescription(item)}</em></span><span>{item.quantity} {itemUom(item)}</span><span>{money.format(item.unitPrice)} estimated</span><strong>{money.format(item.quantity * item.unitPrice)}</strong></div>)}</section>
    {draft ? <section className="proc-card vendor-sourcing-selector"><div className="movement-history-title"><strong>Qualified vendor shortlist</strong><span>{quotes.length} selected · Minimum 2</span></div><div className="vendor-shortlist-controls"><label><span>Select an existing vendor</span><select value={vendorToAdd} onChange={(event) => setVendorToAdd(event.target.value)} disabled={!availableVendors.length}><option value="">{availableVendors.length ? 'Choose a vendor from the directory' : 'All directory vendors are selected'}</option>{availableVendors.map((vendor) => <option value={vendor.name} key={vendor.name}>{vendor.name} · {vendor.email}</option>)}</select></label><button type="button" className="proc-primary" disabled={!vendorToAdd} onClick={addSelectedVendor}><Plus size={15} />Add to shortlist</button><button type="button" className="proc-secondary" onClick={() => setAddingVendor(true)}><Store size={15} />Add new vendor</button></div>{quotes.length ? <div className="vendor-sourcing-grid">{quotes.map((quote) => { const vendor = vendorRecords.find((item) => item.name === quote.vendorName) ?? { name: quote.vendorName, email: quote.vendorEmail, terms: quote.terms, lead: `${quote.deliveryDays} days`, rating: 'New' }; return <article className="selected" key={vendor.name}><span className="vendor-shortlist-icon"><Store size={17} /></span><span><b>{vendor.name}</b><small>{vendor.email}</small><small>{vendor.terms} · Lead time {vendor.lead}</small></span><button type="button" className="remove" onClick={() => toggleVendor(vendor)}><Trash2 size={14} />Remove</button></article>; })}</div> : <div className="vendor-shortlist-empty"><Store size={24} /><div><b>No vendors selected</b><p>Choose an existing vendor above or add a new vendor to begin the shortlist.</p></div></div>}{quotes.length > 0 && quotes.length < 2 ? <p className="vendor-shortlist-requirement"><AlertTriangle size={15} />Add {2 - quotes.length} more vendor before sending this RFQ.</p> : null}</section> : null}
    {sent ? <section className="proc-card rfq-vendor-management"><div className="movement-history-title"><strong>Qualified vendor invitations</strong><span>{quotes.filter((quote) => quote.status !== 'Withdrawn').length} active · {quotes.filter((quote) => quote.status === 'Withdrawn').length} withdrawn</span></div><div className="rfq-add-vendor"><label><span>Add another qualified vendor</span><select value={vendorToAdd} onChange={(event) => setVendorToAdd(event.target.value)} disabled={!availableVendors.length}><option value="">{availableVendors.length ? 'Select a vendor' : 'All directory vendors are included'}</option>{availableVendors.map((vendor) => <option value={vendor.name} key={vendor.name}>{vendor.name} · {vendor.email}</option>)}</select></label><button type="button" className="proc-primary" disabled={!vendorToAdd} onClick={addVendorAfterSend}><Send size={15} />Add and send RFQ</button></div><p>Adding a vendor sends the current RFQ immediately. Withdrawing keeps the invitation and activity history in the record.</p></section> : null}
    {!draft ? <section className="vendor-quotation-workspace"><div className="movement-history-title"><strong>Vendor quotations</strong><span>{respondedQuotes.length} of {quotes.filter((quote) => quote.status !== 'Withdrawn').length} active vendors responded</span></div>{quotes.map((quote) => { const withdrawn = quote.status === 'Withdrawn'; const editable = sent && !withdrawn && quote.status !== 'Declined'; return <article className={`proc-card vendor-quotation-entry ${quote.status === 'Responded' ? 'responded' : ''} ${withdrawn ? 'withdrawn' : ''}`} key={quote.vendorName}><header><div><b>{quote.vendorName}</b><small>{quote.vendorEmail}</small></div><div className="vendor-quotation-status"><select disabled={!editable} value={quote.status} onChange={(event) => updateQuote(quote.vendorName, { status: event.target.value as RfqVendorQuote['status'] })}><option>Sent</option><option>Viewed</option><option>Responded</option><option>Declined</option><option>Overdue</option>{withdrawn ? <option>Withdrawn</option> : null}</select>{sent && !['Responded','Declined','Withdrawn'].includes(quote.status) ? <button type="button" onClick={() => withdrawVendor(quote.vendorName)}><X size={14} />Withdraw invitation</button> : null}</div></header><div className="vendor-quote-fields"><label><span>Quotation reference</span><input disabled={!editable} value={quote.reference} onChange={(event) => updateQuote(quote.vendorName, { reference: event.target.value })} /></label><label><span>Delivery days</span><input disabled={!editable} type="number" min="1" value={quote.deliveryDays} onChange={(event) => updateQuote(quote.vendorName, { deliveryDays: Number(event.target.value) })} /></label><label><span>Payment terms</span><input disabled={!editable} value={quote.terms} onChange={(event) => updateQuote(quote.vendorName, { terms: event.target.value })} /></label><label><span>Warranty</span><input disabled={!editable} value={quote.warranty} onChange={(event) => updateQuote(quote.vendorName, { warranty: event.target.value })} /></label><label><span>Valid until</span><input disabled={!editable} type="date" value={quote.validUntil} onChange={(event) => updateQuote(quote.vendorName, { validUntil: event.target.value })} /></label><label><span>Quotation attachment</span><input disabled={!editable} type="file" onChange={(event) => updateQuote(quote.vendorName, { attachmentName: event.target.files?.[0]?.name })} /><small>{quote.attachmentName || 'No file attached'}</small></label></div><div className="vendor-quoted-lines">{(request.items ?? []).map((item) => <label key={item.name}><span><b>{item.name}</b><small>{item.quantity} {itemUom(item)} · {item.category}</small><small>{itemDescription(item)}</small></span><input disabled={!editable || quote.status !== 'Responded'} type="number" min="0" value={quote.items.find((quotedItem) => quotedItem.name === item.name)?.unitPrice ?? 0} onChange={(event) => updateQuotedItem(quote.vendorName, item.name, Number(event.target.value))} /><strong>{money.format(item.quantity * (quote.items.find((quotedItem) => quotedItem.name === item.name)?.unitPrice ?? 0))}</strong></label>)}</div><footer><span>{withdrawn ? 'Invitation withdrawn' : 'Quoted total'}</span><strong>{withdrawn ? 'Excluded' : money.format(rfqQuoteTotal(request, quote))}</strong></footer></article>; })}</section> : null}
    {(quotationsReceived || readyForPo) && respondedQuotes.length ? <section className="proc-card quotation-comparison-summary"><div className="movement-history-title"><strong>Quotation comparison</strong><span>Procurement validation only</span></div><div className="quotation-summary-head"><span>Vendor</span><span>Total</span><span>Delivery</span><span>Terms</span><span>Eligibility</span></div>{respondedQuotes.map((quote) => <div className="quotation-summary-row" key={quote.vendorName}><span><b>{quote.vendorName}</b><small>{quote.reference || 'No reference'} · {quote.attachmentName || 'No attachment'}</small></span><strong>{money.format(rfqQuoteTotal(request, quote))}</strong><span>{quote.deliveryDays} days</span><span>{quote.terms}<small>{quote.warranty}</small></span><em>{quote.reference && quote.attachmentName ? 'Complete' : 'Qualified · details pending'}</em></div>)}</section> : null}
    {quotationsReceived ? <section className="proc-card quotation-validation-notes"><label className="notes-field"><span>Procurement Validation Notes</span><textarea value={validationNotes} onChange={(event) => setValidationNotes(event.target.value)} placeholder="Document missing requirements, quotation conditions, eligibility concerns, exclusions, or instructions for the next reviewer" /></label><div><ClipboardCheck size={18} /><span><b>Shared with the next reviewer</b><small>{requestIncludesTechnology(request) ? 'This note will be shown to Digital Transformation during technical review and later to the requester.' : 'This note will be shown directly to the requester before vendor selection.'}</small></span></div></section> : null}
    {quotationsReceived ? <section className="proc-card quotation-handoff-note"><CheckCircle2 size={20} /><div><b>Quotation capture complete</b><p>{requestIncludesTechnology(request) ? 'Technology products will be reviewed by Digital Transformation. Non-technology products remain visible but outside DT scope.' : 'No Technology products are present. The qualified quotations will go directly to the requester.'}</p></div></section> : null}
    {readyForPo ? <section className="proc-card selected-quotation-summary"><CheckCircle2 size={22} /><div><span className="proc-eyebrow">Requester selection completed</span><h3>{request.vendorName}</h3><p>The requester selected this qualified quotation. Procurement may now validate the record and create the Purchase Order.</p></div><strong>{money.format(rfqQuoteTotal(request, quotes.find((quote) => quote.vendorName === request.vendorName) ?? quotes[0]))}</strong></section> : null}
    {previewOpen ? <VendorRfqMagicLinkPreview request={request} quote={quotes.find((quote) => quote.status !== 'Withdrawn') ?? quotes[0]} onClose={() => setPreviewOpen(false)} /> : null}
    {addingVendor ? <VendorEditor initial={{ name: '', email: '', terms: '30 days', lead: '7 days', rating: 'New', vendorType: 'Company' }} onCancel={() => setAddingVendor(false)} onSave={saveAndShortlistVendor} /> : null}
  </div>;
}

function VendorRfqMagicLinkPreview({ request, quote, onClose, initialView = 'email', standalone = false }: { request: PurchaseRequest; quote?: RfqVendorQuote; onClose: () => void; initialView?: 'email' | 'form'; standalone?: boolean }) {
  const vendorName = quote?.vendorName ?? 'Invited vendor';
  const vendorEmail = quote?.vendorEmail ?? 'vendor@example.com';
  const [showForm, setShowForm] = useState(initialView === 'form');
  const rfqNumber = request.id.replace('PR-', 'RFQ-');
  const magicLinkUrl = `${window.location.origin}/vendor-quotation/${encodeURIComponent(request.id)}?vendor=${encodeURIComponent(vendorEmail)}&token=prototype-secure-link`;
  if (!showForm) return <div className="proc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="proc-modal rfq-email-preview" role="dialog" aria-modal="true" aria-labelledby="rfq-email-preview-title"><header className="vendor-preview-toolbar"><div><span className="preview-mode-badge"><Mail size={14} />Email preview</span><small>This invitation will be sent with a vendor-specific secure link.</small></div><button className="modal-close" type="button" onClick={onClose} aria-label="Close RFQ email preview"><X size={19} /></button></header><div className="email-envelope"><div className="email-envelope-row"><span>From</span><b>Life College Procurement</b><small>procurement@life.edu.ph</small></div><div className="email-envelope-row"><span>To</span><b>{vendorName}</b><small>{vendorEmail}</small></div><div className="email-envelope-row subject"><span>Subject</span><b id="rfq-email-preview-title">Invitation to Submit Quotation · {rfqNumber}</b></div></div><article className="rfq-email-body"><header><span className="email-school-name">LIFE COLLEGE, INC.</span><small>PROCUREMENT OFFICE</small></header><p>Dear {vendorName},</p><p>Life College, Inc. invites your company to submit a quotation for the purchase request below. Please review the required products and specifications, then provide your commercial offer through the secure link.</p><div className="email-rfq-summary"><div><small>RFQ reference</small><b>{rfqNumber}</b></div><div><small>Purchase requirement</small><b>{request.title}</b></div><div><small>Requesting department</small><b>{request.department}</b></div><div><small>Submit by</small><b>September 30, 2026</b></div></div><p>The form contains {request.items?.length ?? 0} product {(request.items?.length ?? 0) === 1 ? 'line' : 'lines'}, including descriptions, specifications, quantities, and units of measure.</p><div className="email-magic-link"><a className="proc-primary" href={magicLinkUrl} target="_blank" rel="noreferrer"><Link2 size={17} />Open secure quotation form</a><small>This unique link signs you in for this RFQ only. No account or password is required. It opens in a new tab.</small><code>{magicLinkUrl}</code></div><div className="email-security-note"><AlertTriangle size={17} /><span><b>Do not forward this email.</b><small>The magic link is assigned to {vendorEmail} and should not be shared.</small></span></div><p>For questions or clarifications, reply to this email or contact the Procurement Office.</p><p>Regards,<br /><b>Procurement Office</b><br />Life College, Inc.</p></article><footer className="rfq-email-footer"><span>This is a transactional procurement email generated by the Life OS prototype.</span><a className="proc-secondary" href={magicLinkUrl} target="_blank" rel="noreferrer"><Eye size={16} />Open linked form in new tab</a></footer></section></div>;
  return <VendorQuotationStepper request={request} quote={quote} vendorName={vendorName} vendorEmail={vendorEmail} standalone={standalone} onBackToEmail={() => setShowForm(false)} onClose={onClose} />;
}

function VendorQuotationStepper({ request, quote, vendorName, vendorEmail, standalone, onBackToEmail, onClose }: { request: PurchaseRequest; quote?: RfqVendorQuote; vendorName: string; vendorEmail: string; standalone: boolean; onBackToEmail: () => void; onClose: () => void }) {
  const items = request.items ?? [];
  const [step, setStep] = useState(1);
  const [expandedSpecs, setExpandedSpecs] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>(() => Object.fromEntries(items.map((item) => [item.name, quote?.items.find((quotedItem) => quotedItem.name === item.name)?.unitPrice ?? 0])));
  const [reference, setReference] = useState(quote?.reference ?? '');
  const [validUntil, setValidUntil] = useState(quote?.validUntil ?? '2026-09-30');
  const [deliveryDays, setDeliveryDays] = useState(quote?.deliveryDays ?? 7);
  const [paymentTerms, setPaymentTerms] = useState(quote?.terms ?? '30 days');
  const [warranty, setWarranty] = useState(quote?.warranty ?? '1 year standard warranty');
  const [attachmentName, setAttachmentName] = useState(quote?.attachmentName ?? '');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const total = items.reduce((sum, item) => sum + item.quantity * Math.max(0, prices[item.name] ?? 0), 0);
  const allItemsPriced = items.length > 0 && items.every((item) => (prices[item.name] ?? 0) > 0);
  const commercialComplete = reference.trim().length > 0 && validUntil.length > 0 && deliveryDays > 0 && paymentTerms.trim().length > 0;
  const toggleSpecs = (name: string) => setExpandedSpecs((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  const next = () => setStep((current) => Math.min(3, current + 1));
  const back = () => {
    if (step > 1) setStep((current) => current - 1);
    else if (!standalone) onBackToEmail();
  };
  if (submitted) return <div className="proc-modal-backdrop"><section className="proc-modal vendor-rfq-preview vendor-submit-success" role="dialog" aria-modal="true" aria-labelledby="vendor-submit-success-title"><CheckCircle2 size={42} /><span className="proc-eyebrow">Quotation received</span><h2 id="vendor-submit-success-title">Thank you, {vendorName}</h2><p>Your quotation for {request.id.replace('PR-', 'RFQ-')} has been recorded in this frontend prototype.</p><div><span>Quotation reference <b>{reference}</b></span><span>Submitted total <b>{money.format(total)}</b></span></div><button type="button" className="proc-primary" onClick={onClose}>Close</button></section></div>;
  return <div className="proc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="proc-modal vendor-rfq-preview vendor-stepper" role="dialog" aria-modal="true" aria-labelledby="vendor-rfq-preview-title"><header className="vendor-stepper-header"><div><span className="email-school-name">LIFE COLLEGE, INC.</span><small>SECURE VENDOR QUOTATION</small></div><button className="modal-close" type="button" onClick={onClose} aria-label="Close vendor quotation form"><X size={19} /></button></header><div className="vendor-stepper-intro"><div><span className="proc-eyebrow">{request.id.replace('PR-', 'RFQ-')}</span><h2 id="vendor-rfq-preview-title">{request.title}</h2><p>Due September 30, 2026 · {request.department}</p></div><span className="magic-link-recipient"><Link2 size={15} /><span><small>Secure form for</small><b>{vendorName}</b><small>{vendorEmail}</small></span></span></div><nav className="vendor-form-steps" aria-label="Quotation form progress">{['Quote items','Commercial terms','Review & submit'].map((label, index) => { const number = index + 1; return <button type="button" className={step === number ? 'active' : step > number ? 'done' : ''} key={label} onClick={() => { if (number < step || (number === 2 && allItemsPriced) || (number === 3 && allItemsPriced && commercialComplete)) setStep(number); }}><span>{step > number ? <Check size={14} /> : number}</span><b>{label}</b></button>; })}</nav><div className="vendor-step-content">{step === 1 ? <section className="vendor-step-panel"><header><div><h3>Enter your item prices</h3><p>Review each product and provide your unit price. Specifications stay collapsed until needed.</p></div><strong>{items.length} {items.length === 1 ? 'item' : 'items'}</strong></header><div className="vendor-price-table"><div className="vendor-price-head"><span>Product</span><span>Quantity</span><span>Your unit price</span><span>Line total</span></div>{items.map((item) => { const expanded = expandedSpecs.includes(item.name); const price = prices[item.name] ?? 0; return <div className="vendor-price-row" key={item.name}><span><b>{item.name}</b><em>{item.category} · {itemUom(item)}</em><button type="button" onClick={() => toggleSpecs(item.name)}>{expanded ? 'Hide specifications' : 'View specifications'}<ChevronDown className={expanded ? 'rotated' : ''} size={14} /></button>{expanded ? <small>{itemDescription(item)}</small> : null}</span><strong>{item.quantity} {itemUom(item)}</strong><label><span>₱</span><input aria-label={`${item.name} unit price`} type="number" min="0" value={price || ''} placeholder="0.00" onChange={(event) => setPrices((current) => ({ ...current, [item.name]: Number(event.target.value) }))} /></label><strong>{price > 0 ? money.format(item.quantity * price) : '—'}</strong></div>; })}</div><div className="vendor-running-total"><span><small>Quotation total</small><b>{allItemsPriced ? 'All items priced' : 'Complete all unit prices to continue'}</b></span><strong>{money.format(total)}</strong></div></section> : null}{step === 2 ? <section className="vendor-step-panel"><header><div><h3>Commercial terms</h3><p>Add the terms Procurement needs to evaluate your offer.</p></div><strong>Step 2 of 3</strong></header><div className="vendor-commercial-grid"><label><span>Quotation reference</span><input autoFocus value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Example: QTN-2026-0142" /></label><label><span>Quotation valid until</span><input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></label><label><span>Delivery lead time</span><div className="input-with-suffix"><input type="number" min="1" value={deliveryDays} onChange={(event) => setDeliveryDays(Number(event.target.value))} /><span>days</span></div></label><label><span>Payment terms</span><input value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} placeholder="Example: 30 days" /></label><label className="span-2"><span>Warranty / after-sales support</span><input value={warranty} onChange={(event) => setWarranty(event.target.value)} /></label><label className="span-2"><span>Signed quotation</span><div className="vendor-preview-upload"><FileText size={20} /><span><b>{attachmentName || 'Upload signed quotation'}</b><small>PDF, XLSX, or DOCX · Maximum 10 MB</small></span><label className="proc-secondary vendor-file-trigger">Choose file<input type="file" onChange={(event) => setAttachmentName(event.target.files?.[0]?.name ?? '')} /></label></div></label><label className="span-2"><span>Notes <em>Optional</em></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Exclusions, delivery conditions, or other information for Procurement" /></label></div></section> : null}{step === 3 ? <section className="vendor-step-panel"><header><div><h3>Review your quotation</h3><p>Confirm the item prices and commercial terms before submitting.</p></div><strong>{money.format(total)}</strong></header><div className="vendor-review-section"><div className="vendor-review-heading"><b>Quoted items</b><button type="button" onClick={() => setStep(1)}>Edit prices</button></div>{items.map((item) => <div className="vendor-review-item" key={item.name}><span><b>{item.name}</b><small>{item.quantity} {itemUom(item)} × {money.format(prices[item.name] ?? 0)}</small></span><strong>{money.format(item.quantity * (prices[item.name] ?? 0))}</strong></div>)}<div className="vendor-review-total"><span>Total quotation</span><strong>{money.format(total)}</strong></div></div><div className="vendor-review-section"><div className="vendor-review-heading"><b>Commercial terms</b><button type="button" onClick={() => setStep(2)}>Edit terms</button></div><div className="vendor-review-terms"><span><small>Reference</small><b>{reference}</b></span><span><small>Valid until</small><b>{validUntil}</b></span><span><small>Delivery</small><b>{deliveryDays} days</b></span><span><small>Payment</small><b>{paymentTerms}</b></span><span><small>Warranty</small><b>{warranty || 'Not specified'}</b></span><span><small>Attachment</small><b>{attachmentName || 'Not attached'}</b></span></div>{notes ? <p className="vendor-review-notes"><b>Vendor notes</b>{notes}</p> : null}</div><label className="vendor-confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span><b>I confirm this quotation is complete and accurate.</b><small>Submitting records the commercial offer for Procurement review.</small></span></label></section> : null}</div><footer className="vendor-step-footer"><span>Step {step} of 3</span><div>{step > 1 || !standalone ? <button type="button" className="proc-secondary" onClick={back}><ArrowLeft size={16} />{step === 1 ? 'Back to email' : 'Back'}</button> : null}{step < 3 ? <button type="button" className="proc-primary" disabled={step === 1 ? !allItemsPriced : !commercialComplete} onClick={next}>Continue<ArrowRight size={16} /></button> : <button type="button" className="proc-primary" disabled={!confirmed} onClick={() => setSubmitted(true)}><Send size={16} />Submit quotation</button>}</div></footer></section></div>;
}

function SourcingView({ request, onAction, onVendorSaved, onNotify }: { request?: PurchaseRequest; onAction: (id: string, action: string) => void; onVendorSaved: (request: PurchaseRequest) => void; onNotify: (message: string) => void }) {
  const [showEditor, setShowEditor] = useState(false);
  const [vendorRecords] = useState<VendorRecord[]>(loadVendorRecords);
  const [vendorName, setVendorName] = useState(() => loadVendorRecords()[0]?.name ?? '');
  const selectedVendor = vendorRecords.find((vendor) => vendor.name === vendorName) ?? vendorRecords[0];
  const quotationComparisons = vendorRecords.slice(0, 3).map((vendor, index) => {
    const variance = index === 0 ? 0 : index === 1 ? -0.035 : 0.045;
    const leadDays = Number.parseInt(vendor.lead, 10) || 7;
    return {
      vendor,
      unitPrice: Math.max(0, Math.round((request?.items?.[0]?.unitPrice ?? request?.amount ?? 0) * (1 + variance))),
      delivery: `${Math.max(1, leadDays - index)} days`,
      terms: vendor.terms,
      recommended: vendor.name === vendorName,
    };
  });
  const [vendorReference, setVendorReference] = useState('');
  const [orderDeadline, setOrderDeadline] = useState('2026-08-15');
  const [expectedArrival, setExpectedArrival] = useState('2026-08-22');
  const [askConfirmation, setAskConfirmation] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [lines, setLines] = useState<RfqProductLine[]>([]);
  const [terms, setTerms] = useState('Please confirm pricing, availability, and expected delivery date.');
  const [activity, setActivity] = useState<string[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [catalogProducts] = useState<ProductRecord[]>(loadProductRecords);
  useEffect(() => {
    if (!request) return;
    try {
      const saved = request.vendorName || window.localStorage.getItem(`procurement-rfq-vendor:${request.id}`);
      const savedVendorExists = saved && vendorRecords.some((vendor) => vendor.name === saved);
      setVendorName(savedVendorExists ? saved : vendorRecords[0]?.name ?? '');
    } catch {
      setVendorName(vendorRecords[0]?.name ?? '');
    }
  }, [request?.id, vendorRecords]);
  const chooseVendor = async (nextVendorName: string) => {
    setVendorName(nextVendorName);
    window.localStorage.setItem(`procurement-rfq-vendor:${request?.id}`, nextVendorName);
    if (!request) return;
    const vendor = vendorRecords.find((item) => item.name === nextVendorName);
    if (!vendor) return;
    const createdAt = new Date().toISOString();
    onVendorSaved({ ...request, vendorName: vendor.name, vendorEmail: vendor.email, updatedAt: createdAt, history: [...(request.history ?? []), { action: 'select_vendor', actor: 'prototype@life.edu.ph', detail: `RFQ vendor set to ${vendor.name}`, createdAt }] });
    onNotify(`${vendor.name} selected for ${request.id}`);
  };
  useEffect(() => {
    if (!request) return;
    setLines(request.items?.length ? request.items.map((item, index) => ({ id: `${request.id}-${index + 1}`, ...item, description: itemDescription(item), uom: itemUom(item), taxRate: 0 })) : [{ id: `${request.id}-1`, name: request.title, category: request.category, description: `${request.title} specifications`, uom: 'UNIT', quantity: 1, unitPrice: request.amount, taxRate: 0 }]);
  }, [request?.id, request?.title, request?.category, request?.amount, request?.items]);
  useEffect(() => {
    if (!catalogOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const picker = document.querySelector('.rfq-product-picker');
      if (!picker?.contains(event.target as Node)) setCatalogOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCatalogOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [catalogOpen]);
  if (!request) return <EmptyWorkflow title="RFQ & Vendor Sourcing" detail="Approve a purchase request before starting vendor sourcing." />;
  if (!showEditor) return <RfqListView request={request} onOpen={() => setShowEditor(true)} />;
  if (request.status === 'For Procurement Review') return <ProcurementReview request={request} onBack={() => setShowEditor(false)} onComplete={() => onAction(request.id, 'complete_review')} onNotify={onNotify} />;
  const rfqSent = request.status === 'RFQ Sent';
  const subtotal = lines.reduce((sum, line) => sum + Math.max(0, line.quantity) * Math.max(0, line.unitPrice), 0);
  const tax = lines.reduce((sum, line) => sum + Math.max(0, line.quantity) * Math.max(0, line.unitPrice) * Math.max(0, line.taxRate) / 100, 0);
  const total = subtotal + tax;
  const activityPageSize = 5;
  const activityPageCount = Math.max(1, Math.ceil(activity.length / activityPageSize));
  const visibleActivity = activity.slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize);
  const filteredProducts = catalogProducts.filter((product) => product.name.toLowerCase().includes(productSearch.trim().toLowerCase()));
  const addProduct = (product: ProductRecord) => { setLines((current) => [...current, { id: `LINE-${Date.now()}`, name: product.name, category: product.category, description: product.description, uom: product.uom, quantity: 1, unitPrice: product.price, taxRate: 0 }]); setProductSearch(''); setCatalogOpen(false); };
  const updateLine = (id: string, changes: Partial<RfqProductLine>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...changes } : line));
  const recordActivity = (message: string) => { setActivity((current) => [`${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${message}`, ...current]); setActivityPage(1); };
  const sendRfq = () => { if (rfqSent) { onNotify(`RFQ already sent for ${request.id}`); return; } recordActivity(`RFQ invitation emailed to ${quotationComparisons.length} vendors`); onAction(request.id, 'send_rfq'); };
  return <div className="proc-page rfq-workspace">
    <section className="rfq-commandbar"><div className="rfq-actions"><button className="proc-secondary" onClick={() => setShowEditor(false)}><ArrowLeft size={16} />Back to RFQ list</button><button className="proc-primary" onClick={sendRfq} disabled={rfqSent}><Send size={16} />Invite vendors</button><button className="proc-secondary" onClick={() => rfqSent ? onAction(request.id, 'create_po') : onNotify('Invite vendors and record quotations before creating a PO')} disabled={!rfqSent}><Check size={16} />Create PO from selected quote</button><button className="proc-secondary" onClick={() => window.print()}><FileText size={16} />Print</button><button className="proc-secondary" onClick={() => onNotify('RFQ changes cancelled')}>Cancel</button></div><div className="rfq-status-track"><span className="active">Invite vendors</span><span className={rfqSent ? 'done' : ''}>Receive quotes</span><span>Compare quotations</span><span>PO Created</span></div></section>
    <div className="rfq-layout"><section className="proc-card rfq-document"><div className="rfq-title"><div><p className="proc-eyebrow">Request for quotation</p><h2>{request.id.replace('PR-', 'RFQ-')}</h2><p>Created from {request.id}</p></div><StatusBadge>{request.status}</StatusBadge></div>
      <div className="rfq-header-grid"><label><span>Selected quotation</span><select value={vendorName} onChange={(event) => void chooseVendor(event.target.value)}>{vendorRecords.map((vendor) => <option key={vendor.name}>{vendor.name}</option>)}</select><small>{selectedVendor?.email ?? 'No vendor email recorded'}</small></label><label><span>Vendor reference</span><input value={vendorReference} onChange={(event) => setVendorReference(event.target.value)} placeholder="Vendor quotation or reference number" /></label><label><span>Quote deadline</span><input type="date" value={orderDeadline} onChange={(event) => setOrderDeadline(event.target.value)} /></label><label><span>Expected arrival</span><input type="date" value={expectedArrival} onChange={(event) => setExpectedArrival(event.target.value)} /></label></div>
      <div className="quotation-comparison"><div className="movement-history-title"><strong>Quotation comparison</strong><span>Choose the best value before creating the PO</span></div><div className="quotation-comparison-table"><div className="quotation-comparison-head"><span>Vendor</span><span>Unit price</span><span>Delivery</span><span>Terms</span><span>Decision</span></div>{quotationComparisons.map((quote) => <button type="button" className={`quotation-row ${quote.recommended ? 'selected' : ''}`} key={quote.vendor.name} onClick={() => void chooseVendor(quote.vendor.name)}><span><b>{quote.vendor.name}</b><small>{quote.vendor.email}</small></span><strong>{money.format(quote.unitPrice)}</strong><span>{quote.delivery}</span><span>{quote.terms}</span><em>{quote.recommended ? 'Selected' : 'Select quote'}</em></button>)}</div></div>
      <label className="rfq-confirm"><input type="checkbox" checked={askConfirmation} onChange={(event) => setAskConfirmation(event.target.checked)} /><span><b>Request vendor confirmation</b><small>Ask the vendor to confirm availability and delivery date.</small></span></label>
      <div className="rfq-tabs"><button className="active">Products</button><button>Other information</button></div>
      <div className="rfq-lines"><div className="rfq-line-head"><span>Product / Description</span><span>Quantity</span><span>Unit price</span><span>Tax</span><span>Amount</span><span /></div>{lines.map((line) => <div className="rfq-line" key={line.id}><div><b>{line.name}</b><small>{line.category} · UOM {line.uom} · {line.id.startsWith(request.id) ? `Source ${request.id}` : 'Catalog product'}</small><small>{line.description}</small></div><input aria-label={`${line.name} quantity`} type="number" min="1" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} /><input aria-label={`${line.name} unit price`} type="number" min="0" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: Number(event.target.value) })} /><select aria-label={`${line.name} tax`} value={line.taxRate} onChange={(event) => updateLine(line.id, { taxRate: Number(event.target.value) })}><option value={0}>No tax</option><option value={12}>12% VAT</option></select><strong>{money.format(Math.max(0, line.quantity) * Math.max(0, line.unitPrice))}</strong><button className="rfq-remove-line" aria-label={`Remove ${line.name}`} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}><Trash2 size={15} /></button></div>)}<div className="rfq-product-picker"><Search size={16} /><input value={productSearch} onFocus={() => setCatalogOpen(true)} onChange={(event) => { setProductSearch(event.target.value); setCatalogOpen(true); }} placeholder="Search a product or type a new product name" /><button className="rfq-catalog-button" onClick={() => setCatalogOpen((open) => !open)}>Catalog</button>{catalogOpen ? <div className="rfq-product-results">{filteredProducts.map((product) => <button key={product.name} onClick={() => addProduct(product)}><span><b>{product.name}</b><small>{product.category} · {product.uom}</small><small>{product.description}</small></span><strong>{money.format(product.price)}</strong></button>)}{productSearch.trim() && !catalogProducts.some((product) => product.name.toLowerCase() === productSearch.trim().toLowerCase()) ? <button className="create-product" onClick={() => addProduct({ name: productSearch.trim(), category: 'Uncategorized', description: `${productSearch.trim()} standard specification`, uom: 'UNIT', price: 0 })}><Plus size={16} /><span><b>Create “{productSearch.trim()}”</b><small>Add as a new product for this RFQ</small></span></button> : null}{filteredProducts.length === 0 && !productSearch.trim() ? <div className="table-empty">Start typing to search the product catalog.</div> : null}</div> : null}</div></div>
      <div className="rfq-bottom"><label><span>Terms and conditions</span><textarea value={terms} onChange={(event) => setTerms(event.target.value)} /></label><div className="rfq-totals"><span>Untaxed amount <b>{money.format(subtotal)}</b></span><span>Tax <b>{money.format(tax)}</b></span><strong>Total <b>{money.format(total)}</b></strong></div></div>
    </section><aside className="proc-card rfq-activity"><div className="rfq-activity-actions"><button onClick={() => { recordActivity(`Message prepared for ${selectedVendor.name}`); onNotify('Message added to RFQ history'); }}><Mail size={15} />Send message</button><button onClick={() => { recordActivity('Internal note logged'); onNotify('Internal note logged'); }}><FileText size={15} />Log note</button><button onClick={() => { recordActivity('Follow-up activity scheduled'); onNotify('Follow-up activity scheduled'); }}><Clock3 size={15} />Activity</button></div><div className="rfq-activity-heading"><h3>Activity history</h3>{activity.length ? <span>Latest first</span> : null}</div><div className="rfq-activity-list">{activity.length ? visibleActivity.map((item, index) => <p key={`${item}-${(activityPage - 1) * activityPageSize + index}`}>{item}</p>) : <div className="table-empty">RFQ activity, emails, and notes will appear here.</div>}</div>{activity.length > activityPageSize ? <div className="rfq-activity-pagination"><button disabled={activityPage === 1} onClick={() => setActivityPage((page) => Math.max(1, page - 1))}>Previous</button><span>Page {activityPage} of {activityPageCount}</span><button disabled={activityPage === activityPageCount} onClick={() => setActivityPage((page) => Math.min(activityPageCount, page + 1))}>Next</button></div> : null}</aside></div>
  </div>;
}

function RfqListView({ request, onOpen }: { request: PurchaseRequest; onOpen: () => void }) {
  const documentNumber = request.status === 'For Procurement Review' ? request.id : request.id.replace('PR-', 'RFQ-');
  return <div className="proc-page"><PageHeading eyebrow="Vendor sourcing" title="All RFQs" detail="Invite vendors, receive quotations, compare offers, select the best vendor, and create the PO." /><section className="proc-filterbar"><div className="proc-search"><Search size={17} /><input placeholder="Search RFQ number, request, or vendor" /></div><button className="filter-chip active">All RFQs</button><button className="filter-chip">Draft</button><button className="filter-chip">Sent</button><button className="filter-chip">Needs reply</button></section><section className="proc-card rfq-list-card"><CardHeader title="Requests for quotation" icon={FileText} /><button type="button" className="rfq-list-row" onClick={onOpen}><span className="rfq-list-icon"><FileText size={18} /></span><span><b>{documentNumber}</b><small>{request.title} · Created from {request.id}</small></span><span><StatusBadge>{request.status}</StatusBadge><small>Multiple vendors</small></span><strong>{money.format(request.amount)}</strong><ArrowRight className="rfq-row-chevron" size={18} /></button></section></div>;
}

function ProcurementReview({ request, onBack, onComplete, onNotify }: { request: PurchaseRequest; onBack: () => void; onComplete: () => void; onNotify: (message: string) => void }) {
  const [selectedChecks, setSelectedChecks] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const checks = ['Request details are complete', 'Product specifications are clear', 'Quantities and estimated prices are reasonable', 'Required date is achievable', 'Vendor sourcing is required', 'Supporting documents are available'];
  const toggleCheck = (label: string) => setSelectedChecks((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  const ready = selectedChecks.length === checks.length;
  return <div className="proc-page"><PageHeading eyebrow="Procurement Officer workspace" title="Procurement Review" detail="Validate the submitted Purchase Request before beginning vendor sourcing." action={<button className="proc-secondary" type="button" onClick={onBack}><ArrowLeft size={16} />Back to all RFQs &amp; Sourcing</button>} /><div className="approval-layout procurement-review-layout"><section className="proc-card queue-card"><CardHeader title="For procurement review" icon={Inbox} /><button type="button" className="queue-item selected"><span className="queue-badge">{request.requester.split(' ').map((part) => part[0]).join('').slice(0,2)}</span><span><b>{request.title}</b><small>{request.id} · Stakeholders notified</small></span><strong>{money.format(request.amount)}</strong></button></section><section className="proc-card review-card"><div className="review-header"><div><StatusBadge>{request.status}</StatusBadge><h3>{request.title}</h3><p>{request.id} · Requested by {request.requester}</p></div><strong>{money.format(request.amount)}</strong></div><div className="detail-grid"><Detail label="Department" value={request.department} /><Detail label="Required date" value={request.due} /><Detail label="Product lines" value={String(request.items?.length ?? 0)} /><Detail label="Total quantity" value={String(requestTotalQuantity(request))} /></div><div className="movement-history-title"><strong>Requested products</strong><span>Review specifications and estimates</span></div><div className="request-detail-items">{request.items?.map((item, index) => <div key={`${item.name}-${index}`}><span><b>{item.name}</b><small>{item.category}</small></span><span>{item.quantity} × {money.format(item.unitPrice)} estimated</span><strong>{money.format(item.quantity * item.unitPrice)}</strong></div>)}</div><div className="movement-history-title procurement-check-heading"><strong>Procurement validation</strong><span>{selectedChecks.length} of {checks.length} complete</span></div><div className="procurement-review-checks">{checks.map((label) => <label className={selectedChecks.includes(label) ? 'checked' : ''} key={label}><input type="checkbox" checked={selectedChecks.includes(label)} onChange={() => toggleCheck(label)} /><span>{selectedChecks.includes(label) ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}</span><b>{label}</b></label>)}</div><label className="notes-field"><span>Procurement review notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Record clarifications, sourcing instructions, or vendor requirements" /></label><div className="action-row"><button className="proc-secondary" onClick={() => onNotify(`${request.id} returned to requester for clarification`)}>Return for clarification</button><button className="proc-primary" disabled={!ready} onClick={onComplete}><Check size={17} />Complete review and begin sourcing</button></div></section></div></div>;
}

function PurchaseOrdersView({ requests, role, onAction }: { requests: PurchaseRequest[]; role: Role; onAction: (id: string, action: string) => void }) {
  const [selectedId, setSelectedId] = useState(requests[0]?.id ?? '');
  const [documentRequest, setDocumentRequest] = useState<PurchaseRequest | null>(null);
  const request = requests.find((item) => item.id === selectedId) ?? requests[0];
  if (!request) return <EmptyWorkflow title="Purchase Orders" detail="A selected vendor quotation will create a purchase order here." />;
  const canManagePo = ['Super Admin', 'Procurement Admin', 'Procurement Officer'].includes(role);
  const draft = request.status === 'PO Draft';
  const approved = request.status === 'PO Approved';
  const awaitingAcknowledgement = request.status === 'PO Awaiting Acknowledgement';
  const approvalPending = ['For Department Approval', 'For Finance Approval', 'For COO Approval', 'For President Approval'].includes(request.status);
  const currentPoStage = purchaseOrderStageIndex(request.status);
  const nextStep = draft ? { title: 'Department Head Approval', detail: 'Submit the PO draft to the requesting department’s head for approval.' } : request.status === 'For Department Approval' ? { title: `${executiveNotificationRole(request.amount)} Approval`, detail: 'The Department Head must approve before the PO is routed by total amount.' } : ['For Finance Approval', 'For COO Approval', 'For President Approval'].includes(request.status) ? { title: 'Approved and Issued', detail: `${assignedTeamForStatus(request.status)} approval is required before Procurement can issue the PO.` } : approved ? { title: 'Email PO to Vendor', detail: 'All internal approvals are complete. Procurement may now issue the official PO.' } : awaitingAcknowledgement ? { title: 'Vendor Acknowledgement', detail: 'Record the vendor’s acceptance and expected delivery date.' } : ['PO Acknowledged', 'Partially Received'].includes(request.status) ? { title: 'Delivery and Receiving', detail: 'Monitor delivery, inspection, and department acceptance.' } : request.status === 'Received' ? { title: 'Invoice and Payment', detail: 'Finance verifies the PO, receipt, and invoice before payment.' } : { title: 'Closed and Filed', detail: 'The completed purchasing record is retained for audit.' };
  return <div className="proc-page"><PageHeading eyebrow="External commitment" title="Purchase Orders" detail="Route draft orders for approval, issue approved POs, and monitor vendor acknowledgement." /><div className="approval-layout po-master-detail"><section className="proc-card queue-card"><CardHeader title={`Purchase orders (${requests.length})`} icon={ShoppingCart} />{requests.map((item) => <button type="button" className={`queue-item ${request.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)}><span className="queue-badge">PO</span><span><b>{item.id.replace('PR-', 'PO-')}</b><small>{item.title} · {item.status}</small></span><strong>{money.format(item.amount)}</strong></button>)}</section><section className="proc-card po-card"><div className="po-top"><div><StatusBadge>{request.status}</StatusBadge><h3>{request.id.replace('PR-', 'PO-')}</h3><p>{request.title}</p><small>{request.vendorName || 'No vendor selected'}</small></div><strong>{money.format(request.amount)}</strong></div><div className="movement-history-title po-lifecycle-title"><strong>Purchase Order lifecycle</strong><span>Stage {currentPoStage + 1} of {purchaseOrderWorkflowStages.length}</span></div><div className="pr-journey po-record-lifecycle">{purchaseOrderWorkflowStages.map((stage, index) => <div className={`${index < currentPoStage ? 'complete' : ''} ${index === currentPoStage ? 'current' : ''}`} key={stage.name} title={stage.detail}><span>{index < currentPoStage ? <Check size={12} /> : index + 1}</span><small>{stage.name}</small></div>)}</div><div className={`po-next-step ${approvalPending ? 'approval' : ''}`}><span>{approvalPending ? <UserCheck size={18} /> : <ArrowRight size={18} />}</span><div><small>Next step</small><b>{nextStep.title}</b><p>{nextStep.detail}</p></div></div><div className="action-row"><button className="proc-secondary" onClick={() => setDocumentRequest(request)}><FileText size={16} />View PO PDF</button>{draft && canManagePo ? <button className="proc-primary" onClick={() => onAction(request.id, 'submit_po_department')}><UserCheck size={16} />Submit for Department Approval</button> : approved && canManagePo ? <button className="proc-primary" onClick={() => onAction(request.id, 'send_po')}><Mail size={16} />Email approved PO to vendor</button> : awaitingAcknowledgement && canManagePo ? <button className="proc-primary" onClick={() => onAction(request.id, 'acknowledge')}><Check size={16} />Record acknowledgement</button> : null}</div></section></div>{documentRequest ? <PurchaseOrderDocument request={documentRequest} onClose={() => setDocumentRequest(null)} /> : null}</div>;
}

function PurchaseOrderWorkflow() {
  return <section className="proc-card workflow-overview po-workflow-overview"><div className="workflow-overview-heading"><div><span className="eyebrow">Order lifecycle</span><h2>Purchase Order Workflow</h2></div><span>{purchaseOrderWorkflowStages.length} stages</span></div><div className="lifecycle-flow po-lifecycle-flow">{purchaseOrderWorkflowStages.map((stage, index) => <div className="lifecycle-step" key={stage.name} tabIndex={0}><span>{index + 1}</span><small>{stage.name}</small><div className="stage-tooltip"><b>{stage.name}</b><p>{stage.detail}</p></div></div>)}</div></section>;
}

function PurchaseOrderDocument({ request, onClose }: { request: PurchaseRequest; onClose: () => void }) {
  const poNumber = request.id.replace('PR-', 'PO-');
  const vendor = loadVendorRecords().find((item) => item.name === request.vendorName);
  const selectedQuote = request.rfqQuotes?.find((quote) => quote.vendorName === request.vendorName);
  const issuedAt = new Date(request.updatedAt ?? request.createdAt ?? Date.now());
  const issuedDate = Number.isNaN(issuedAt.getTime()) ? 'Date pending' : new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).format(issuedAt);
  const poStage = purchaseOrderStageIndex(request.status);
  const departmentApproved = poStage >= 2;
  const executiveApproved = poStage >= 3;
  const vendorAddress = [vendor?.street, vendor?.street2, vendor?.city, vendor?.state, vendor?.zip, vendor?.country].filter(Boolean).join(', ') || 'Registered vendor address on file';
  const priority = request.due.toLowerCase().includes('urgent') || request.due.toLowerCase().includes('in 4') ? 'Urgent' : 'Standard';
  return <div className="proc-modal-backdrop po-document-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="proc-modal po-document" role="dialog" aria-modal="true" aria-labelledby="po-document-title"><header className="modal-header no-print"><div><span className="eyebrow">Purchase order document</span><h2 id="po-document-title">{poNumber}</h2></div><button className="modal-close" type="button" onClick={onClose} aria-label="Close PO document"><X size={19} /></button></header><div className="po-document-sheet">
    <header className="lci-po-header"><img src={`${import.meta.env.BASE_URL}life-college-international-logo.png`} alt="Life College International" /><div className="lci-po-header-right"><em>Learn and Live Fully.</em><div className="lci-po-number-box"><small>P.O. Number</small><strong>{poNumber}</strong><span><small>Date issued</small><b>{issuedDate}</b></span></div></div></header>
    <div className="lci-po-legal">All Sales/Service Invoices must be issued under: <strong>THE LEADERSHIP, INNOVATION, FAITH AND EXCELLENCE ACADEMY INTERNATIONAL INC.</strong><span>TIN: 265-999-997-00000</span><small>CCF Center, Ortigas East, Ortigas Ave. cor C-5 Road, Ugong, Pasig City</small></div>
    <div className="lci-po-titlebar"><h3>Purchase Order</h3><em>Official procurement document - retain for records</em></div>
    <div className="lci-po-reference-strip"><span><small>Source Purchase Request</small><b>{request.id}</b></span><span><small>Current Status</small><b>{request.status}</b></span><span><small>Requesting Department</small><b>{request.department}</b></span></div>
    <div className="lci-po-content">
      <PoDocumentSection title="Supplier Information"><div className="lci-po-fields two"><PoDocumentField label="Supplier / Vendor Name" value={request.vendorName || 'Vendor not selected'} /><PoDocumentField label="Contact Person" value={vendor?.notes || 'Vendor account representative'} /><PoDocumentField className="wide" label="Address" value={vendorAddress} /><PoDocumentField label="Tel. / Mobile No." value={vendor?.phone || 'Contact number on vendor profile'} /><PoDocumentField label="Email Address" value={request.vendorEmail || vendor?.email || 'No vendor email recorded'} /></div></PoDocumentSection>
      <PoDocumentSection title="Order Details"><div className="lci-po-fields four"><PoDocumentField label="Terms of Payment" value={selectedQuote?.terms || vendor?.terms || '30 days'} /><PoDocumentField label="Turnaround Time" value={selectedQuote ? `${selectedQuote.deliveryDays} days` : vendor?.lead || 'To be confirmed'} /><PoDocumentField label="Budget Under (Dept.)" value={request.department} /><PoDocumentField label="Priority" value={priority} /></div></PoDocumentSection>
      <PoDocumentSection title="Items / Services Ordered"><div className="lci-po-items"><div className="lci-po-item-head"><b>#</b><b>Qty</b><b>UOM</b><b>Product Name</b><b>Description / Specs</b><b>Unit Price</b><b>Discount</b><b>Amount</b></div>{request.items?.map((item, index) => <div className="lci-po-item-row" key={`${item.name}-${index}`}><span>{index + 1}</span><span>{item.quantity}</span><span>{itemUom(item)}</span><strong>{item.name}</strong><span>{itemDescription(item)}</span><span>{money.format(item.unitPrice)}</span><span>{money.format(0)}</span><b>{money.format(item.quantity * item.unitPrice)}</b></div>)}</div><div className="lci-po-totals"><span>Subtotal</span><strong>{money.format(request.amount)}</strong><b>Total</b><em>{money.format(request.amount)}</em></div></PoDocumentSection>
      <PoDocumentSection title="Delivery Information"><div className="lci-po-delivery"><div><PoDocumentField label="Delivery Schedule" value="Monday to Friday, 8am-11am and 1pm-3pm only" /><div className="lci-po-fields two compact"><PoDocumentField label="Look For" value={request.requester} /><PoDocumentField label="Contact No." value="Department contact on file" /></div></div><PoDocumentField label="Deliver To" value={`Life College International\nCCF Center, Ortigas East, Ortigas Ave. cor C-5 Road,\nBrgy. Ugong 1604 Pasig City, Philippines\nDelivery instruction: Proceed to the assigned department`} /></div></PoDocumentSection>
      <PoDocumentSection title="Approvals & Signatures"><div className="lci-po-signatures"><PoSignature role="Processed By" name="Procurement Officer" detail="Admin / Procurement Office" complete /><PoSignature role="Budget Under" name={request.department} detail="Department allocation" complete /><PoSignature role="Requested By" name={request.requester} detail="Requestor" complete /><PoSignature role="Reviewed By" name={departmentApproved ? 'Department Head' : 'Pending approval'} detail="Department Head approval" complete={departmentApproved} /><PoSignature role="Approved By" name={executiveApproved ? executiveNotificationRole(request.amount) : 'Pending approval'} detail="Amount-based executive approval" complete={executiveApproved} /></div></PoDocumentSection>
    </div>
    <footer className="lci-po-footer">Learn and Live Fully. <span>|</span> life.edu.ph <span>|</span> CCF Center, Ortigas East, Ortigas Ave. cor C-5 Road, Ugong, Pasig City</footer>
  </div><footer className="modal-actions no-print"><button type="button" className="proc-secondary" onClick={onClose}>Close</button><button type="button" className="proc-primary" onClick={() => window.print()}><FileText size={16} />Print / Save as PDF</button></footer></section></div>;
}

function PoDocumentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="lci-po-section"><h4>{title}</h4>{children}</section>;
}

function PoDocumentField({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return <div className={`lci-po-field ${className}`}><small>{label}</small><span>{value.split('\n').map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</span></div>;
}

function PoSignature({ role, name, detail, complete }: { role: string; name: string; detail: string; complete: boolean }) {
  return <div className={complete ? 'complete' : 'pending'}><strong>{role}</strong><em>{complete ? 'Approved' : 'Pending'}</em><span>{name}</span><small>{complete ? detail : `Awaiting ${detail}`}</small></div>;
}

function ReceivingQueueView({ requests, role, onAction }: { requests: PurchaseRequest[]; role: Role; onAction: (id: string, action: string) => void }) {
  const [selectedId, setSelectedId] = useState(requests[0]?.id ?? '');
  const request = requests.find((item) => item.id === selectedId) ?? requests[0];
  if (!request) return <EmptyWorkflow title="Receiving" detail="Acknowledged purchase orders will appear here for inspection and receipt." />;
  return <div className="proc-page"><PageHeading eyebrow="Delivery and acceptance" title="Receiving" detail="Select a delivery to inspect, receive, pay, or file according to your role." /><div className="approval-layout receiving-master-detail"><section className="proc-card queue-card"><CardHeader title={`Deliveries (${requests.length})`} icon={Truck} />{requests.map((item) => <button type="button" className={`queue-item ${request.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)}><span className="queue-badge"><PackageCheck size={16} /></span><span><b>{item.title}</b><small>{item.id} · {item.status}</small></span><strong>{money.format(item.amount)}</strong></button>)}</section><ReceivingView request={request} role={role} onAction={onAction} /></div></div>;
}

function ReceivingView({ request, role, onAction }: { request?: PurchaseRequest; role: Role; onAction: (id: string, action: string) => void }) {
  if (!request) return <EmptyWorkflow title="Receiving" detail="Acknowledged purchase orders will appear here for inspection and receipt." />;
  const received = ['Received','Paid','Filed'].includes(request.status);
  const canReceive = ['Procurement Officer','Procurement Admin','Super Admin'].includes(role);
  const canMarkPaid = ['Finance Manager','Super Admin'].includes(role);
  const canFile = ['Procurement Officer','Procurement Admin','Super Admin'].includes(role);
  return <div className="proc-page"><PageHeading eyebrow="Delivery and acceptance" title="Receiving" detail="Inspect deliveries, accept goods, hand documents to Finance, and file the record." /><section className="proc-card receive-card"><div className="receive-top"><span className="receive-icon"><PackageCheck size={24} /></span><div><StatusBadge>{request.status}</StatusBadge><h3>{request.id} / {request.title}</h3><p>{request.department} / {request.category}</p></div></div><div className="policy-checks"><CheckRow done={received} label="Quantity, specifications, condition, and accessories inspected" /><CheckRow done={received} label="Requesting department acceptance completed" /><CheckRow done={['Paid','Filed'].includes(request.status)} label="Documents verified and payment processed" /><CheckRow done={request.status === 'Filed'} label="Procurement record filed for audit" /></div>{request.status === 'Received' && !canMarkPaid ? <div className="exception-note"><CircleDollarSign size={18} /><div><b>Waiting for Finance</b><small>Only the Finance Manager can confirm vendor payment.</small></div></div> : null}{request.status === 'Paid' && !canFile ? <div className="exception-note"><FileText size={18} /><div><b>Waiting for Procurement</b><small>The Procurement Officer will file and close this paid record.</small></div></div> : null}<div className="action-row">{!received && canReceive ? <button className="proc-primary" onClick={() => onAction(request.id, 'receive')}><CheckCircle2 size={17} />Record receipt</button> : request.status === 'Received' && canMarkPaid ? <button className="proc-primary" onClick={() => onAction(request.id, 'mark_paid')}><CircleDollarSign size={17} />Mark paid</button> : request.status === 'Paid' && canFile ? <button className="proc-primary" onClick={() => onAction(request.id, 'file')}><FileText size={17} />File and close</button> : null}</div></section></div>;
}

function VendorsView({ requests, role, onNotify }: { requests: PurchaseRequest[]; role: Role; onNotify: (message: string) => void }) {
  const [records, setRecords] = useState<VendorRecord[]>(loadVendorRecords);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ originalName?: string; vendor: VendorRecord } | null>(null);
  const [deleting, setDeleting] = useState<VendorRecord | null>(null);
  const [viewing, setViewing] = useState<VendorRecord | null>(null);
  const [inviting, setInviting] = useState<VendorRecord | null>(null);
  const canRequestInformation = ['Super Admin', 'Procurement Admin', 'Procurement Officer'].includes(role);
  const filtered = records.filter((vendor) => `${vendor.name} ${vendor.email}`.toLowerCase().includes(query.trim().toLowerCase()));
  const persistRecords = (next: VendorRecord[]) => {
    setRecords(next);
    window.localStorage.setItem('procurement-vendors', JSON.stringify(next));
  };
  const saveVendor = (vendor: VendorRecord, originalName?: string) => {
    const next = originalName ? records.map((item) => item.name === originalName ? vendor : item) : [...records, vendor];
    persistRecords(next);
    setEditing(null);
    onNotify(`${vendor.name} saved`);
  };
  const deleteVendor = () => {
    if (!deleting) return;
    const next = records.filter((vendor) => vendor.name !== deleting.name);
    persistRecords(next);
    onNotify(`${deleting.name} deleted`);
    setDeleting(null);
  };
  const sendInformationRequest = (vendor: VendorRecord) => {
    const updated = { ...vendor, informationStatus: 'Invitation pending' as const, informationRequestedAt: new Date().toISOString() };
    persistRecords(records.map((item) => item.name === vendor.name ? updated : item));
    if (viewing?.name === vendor.name) setViewing(updated);
    setInviting(null);
    onNotify(`Vendor information request recorded for ${vendor.email}`);
  };
  if (viewing) return <VendorDetailPage vendor={viewing} requests={requests.filter((request) => request.vendorName === viewing.name)} onBack={() => setViewing(null)} onEdit={() => setEditing({ originalName: viewing.name, vendor: { ...viewing } })} onRequestInformation={canRequestInformation ? () => setInviting(viewing) : undefined} editor={<>{editing ? <VendorEditor initial={editing.vendor} onCancel={() => setEditing(null)} onSave={(vendor) => { saveVendor(vendor, editing.originalName); setViewing(vendor); }} /> : null}{inviting ? <VendorInformationRequestModal vendor={inviting} onClose={() => setInviting(null)} onSend={() => sendInformationRequest(inviting)} /> : null}</>} />;
  return <div className="proc-page">
    <PageHeading eyebrow="Supplier master data" title="Vendors" detail="Maintain supplier contacts, payment terms, lead times, and performance records." action={<button className="proc-primary" onClick={() => setEditing({ vendor: { name: '', email: '', terms: '30 days', lead: '7 days', rating: 'New' } })}><Plus size={17} />Add vendor</button>} />
    <section className="proc-filterbar"><div className="proc-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vendor name or email" /></div></section>
    <section className="proc-card vendor-table-card"><CardHeader title="Vendor directory" icon={Store} /><div className="vendor-table-scroll"><table className="vendor-table"><thead><tr><th><input type="checkbox" aria-label="Select all vendors" /></th><th>Vendor</th><th>Purchases</th><th>Payment terms</th><th>Lead time</th><th>Information</th><th>Actions</th></tr></thead><tbody>{filtered.map((vendor) => { const purchases = requests.filter((request) => request.vendorName === vendor.name); const informationStatus = vendor.informationStatus ?? 'Not requested'; return <tr key={vendor.name}><td><input type="checkbox" aria-label={`Select ${vendor.name}`} /></td><td><button className="vendor-name-link" onClick={() => setViewing(vendor)}>{vendor.name}</button><small>{vendor.email}</small></td><td><button className="vendor-purchase-count" onClick={() => setViewing(vendor)}>{purchases.length} {purchases.length === 1 ? 'purchase' : 'purchases'}</button></td><td>{vendor.terms}</td><td>{vendor.lead}</td><td><VendorInformationBadge status={informationStatus} /></td><td><div className="vendor-table-actions">{canRequestInformation ? <button className="vendor-info-request-button" onClick={() => setInviting(vendor)} title="Email a secure vendor information form"><Mail size={15} />{informationStatus === 'Invitation pending' ? 'Resend request' : 'Request info'}</button> : null}<button className="proc-secondary" onClick={() => setEditing({ originalName: vendor.name, vendor: { ...vendor } })}>Edit</button><button className="proc-danger" onClick={() => setDeleting(vendor)}><Trash2 size={15} />Delete</button></div></td></tr>; })}</tbody></table>{filtered.length === 0 ? <div className="table-empty">No vendors match your search.</div> : null}</div></section>
    {editing ? <VendorEditor initial={editing.vendor} onCancel={() => setEditing(null)} onSave={(vendor) => saveVendor(vendor, editing.originalName)} /> : null}
    {inviting ? <VendorInformationRequestModal vendor={inviting} onClose={() => setInviting(null)} onSend={() => sendInformationRequest(inviting)} /> : null}
    {deleting ? <div className="proc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleting(null); }}><section className="proc-modal vendor-delete-confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-vendor-title"><header className="modal-header"><div><span className="delete-warning-icon"><AlertTriangle size={20} /></span><h2 id="delete-vendor-title">Delete vendor?</h2></div><button className="modal-close" type="button" onClick={() => setDeleting(null)} aria-label="Close delete confirmation"><X size={19} /></button></header><div className="delete-confirm-copy"><p>You are about to delete <strong>{deleting.name}</strong> from the vendor directory.</p><small>Historical RFQs and purchase orders will keep the vendor information already recorded on them. This action cannot be undone.</small></div><footer className="modal-actions"><button type="button" className="proc-secondary" onClick={() => setDeleting(null)}>Cancel</button><button type="button" className="proc-danger" onClick={deleteVendor}><Trash2 size={16} />Delete vendor</button></footer></section></div> : null}
  </div>;
}

function VendorInformationBadge({ status }: { status: VendorInformationStatus }) {
  return <span className={`vendor-information-badge ${status.toLowerCase().replaceAll(' ', '-')}`}>{status === 'Information complete' ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}{status}</span>;
}

function VendorInformationRequestModal({ vendor, onClose, onSend }: { vendor: VendorRecord; onClose: () => void; onSend: () => void }) {
  const [validFor, setValidFor] = useState('14 days');
  const magicLinkUrl = window.location.origin + '/vendor-information/' + encodeURIComponent(vendor.email) + '?token=prototype-secure-link&expires=' + encodeURIComponent(validFor);
  return <div className="proc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="proc-modal rfq-email-preview vendor-information-email-preview" role="dialog" aria-modal="true" aria-labelledby="vendor-information-title">
    <header className="vendor-preview-toolbar"><div><span className="preview-mode-badge"><Mail size={14} />Email preview</span><small>Vendor-specific secure onboarding invitation</small></div><button className="modal-close" type="button" onClick={onClose} aria-label="Close email preview"><X size={19} /></button></header>
    <div className="email-envelope"><div className="email-envelope-row"><span>From</span><b>Life College Procurement</b><small>procurement@life.edu.ph</small></div><div className="email-envelope-row"><span>To</span><b>{vendor.name}</b><small>{vendor.email}</small></div><div className="email-envelope-row subject"><span>Subject</span><b id="vendor-information-title">Complete Your Vendor Information · Life College, Inc.</b></div></div>
    <article className="rfq-email-body"><header><span className="email-school-name">LIFE COLLEGE, INC.</span><small>PROCUREMENT OFFICE</small></header><p>Dear {vendor.name},</p><p>Life College, Inc. is updating its vendor directory. Please complete the secure form so Procurement can maintain your official supplier record.</p>
      <div className="email-rfq-summary"><div><small>Vendor</small><b>{vendor.name}</b></div><div><small>Recipient</small><b>{vendor.email}</b></div><div><small>Requested by</small><b>Procurement Office</b></div><label className="vendor-onboarding-expiry-control"><small>Secure link expires</small><select value={validFor} onChange={(event) => setValidFor(event.target.value)}><option>7 days</option><option>14 days</option><option>30 days</option></select></label></div>
      <div className="vendor-request-sections email-request-sections"><strong>Information requested</strong><div><span><Check size={14} />Company and contact details</span><span><Check size={14} />Registered address and Tax ID / TIN</span><span><Check size={14} />Payment and banking information</span><span><Check size={14} />Compliance documents and certifications</span></div></div>
      <div className="email-magic-link"><a className="proc-primary" href={magicLinkUrl} target="_blank" rel="noreferrer"><Link2 size={17} />Open secure vendor form</a><small>This unique link opens the onboarding form in a new tab. No account or password is required.</small><code>{magicLinkUrl}</code></div>
      <div className="email-security-note"><AlertTriangle size={17} /><span><b>Do not forward this email.</b><small>The link is assigned to {vendor.email} and should only be used by an authorized representative.</small></span></div><p>Regards,<br /><b>Procurement Office</b><br />Life College, Inc.</p>
    </article><footer className="rfq-email-footer"><span>Transactional vendor onboarding email · Life OS prototype</span><div><a className="proc-secondary" href={magicLinkUrl} target="_blank" rel="noreferrer"><Eye size={16} />Open form in new tab</a><button className="proc-primary" type="button" onClick={onSend}><Send size={16} />Send information request</button></div></footer>
  </section></div>;
}

function VendorInformationFormPage({ vendor, onClose }: { vendor: VendorRecord; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [documents, setDocuments] = useState<string[]>([]);
  const [form, setForm] = useState<VendorRecord>({ ...vendor, vendorType: vendor.vendorType ?? 'Company', contactPerson: vendor.contactPerson ?? '', phone: vendor.phone ?? '', website: vendor.website ?? '', street: vendor.street ?? '', city: vendor.city ?? '', state: vendor.state ?? '', zip: vendor.zip ?? '', country: vendor.country ?? 'Philippines', taxId: vendor.taxId ?? '', businessRegistration: vendor.businessRegistration ?? '', bankName: vendor.bankName ?? '', bankAccountName: vendor.bankAccountName ?? '', bankAccountNumber: vendor.bankAccountNumber ?? '' });
  const update = (field: keyof VendorRecord, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const firstReady = Boolean(form.name.trim() && form.contactPerson?.trim() && form.email.trim() && form.phone?.trim());
  const secondReady = Boolean(form.street?.trim() && form.city?.trim() && form.country?.trim() && form.taxId?.trim());
  const save = () => { const records=loadVendorRecords(); const updated={...form,complianceDocuments:documents,informationStatus:'Information complete' as const}; window.localStorage.setItem('procurement-vendors',JSON.stringify(records.map((item)=>item.email===vendor.email?updated:item))); setSubmitted(true); };
  if (submitted) return <div className="proc-modal-backdrop"><section className="proc-modal vendor-submit-success" role="status"><CheckCircle2 size={42}/><span className="proc-eyebrow">Information submitted</span><h2>Thank you, {form.name}</h2><p>Your vendor information has been sent to Procurement for verification.</p><button className="proc-primary" onClick={onClose}>Close this tab</button></section></div>;
  return <div className="proc-modal-backdrop"><section className="proc-modal vendor-stepper vendor-onboarding-stepper" role="dialog" aria-modal="true" aria-labelledby="vendor-onboarding-form-title">
    <header className="vendor-stepper-header"><div><span className="email-school-name">LIFE COLLEGE, INC.</span><small>SECURE VENDOR ONBOARDING</small></div><button className="modal-close" onClick={onClose} aria-label="Close form"><X size={19}/></button></header>
    <div className="vendor-stepper-intro"><div><span className="proc-eyebrow">Vendor information request</span><h2 id="vendor-onboarding-form-title">Complete your supplier profile</h2><p>Provide the official information used for purchasing and payment records.</p></div><span className="magic-link-recipient"><Link2 size={15}/><span><small>Secure form for</small><b>{vendor.name}</b><small>{vendor.email}</small></span></span></div>
    <nav className="vendor-form-steps">{['Company details','Registration & address','Payment & compliance'].map((label,index)=>{const number=index+1;return <button type="button" className={step===number?'active':step>number?'done':''} key={label} onClick={()=>{if(number<step||(number===2&&firstReady)||(number===3&&firstReady&&secondReady))setStep(number)}}><span>{step>number?<Check size={14}/>:number}</span><b>{label}</b></button>})}</nav>
    <div className="vendor-step-content">
      {step===1?<section className="vendor-step-panel"><header><div><h3>Company and contact details</h3><p>Enter the legal supplier name and primary contact.</p></div><strong>Step 1 of 3</strong></header><div className="vendor-commercial-grid"><label><span>Vendor type</span><select value={form.vendorType} onChange={e=>update('vendorType',e.target.value)}><option>Company</option><option>Person</option></select></label><label><span>Registered vendor name</span><input value={form.name} onChange={e=>update('name',e.target.value)}/></label><label><span>Authorized contact person</span><input value={form.contactPerson} onChange={e=>update('contactPerson',e.target.value)}/></label><label><span>Email address</span><input type="email" value={form.email} onChange={e=>update('email',e.target.value)}/></label><label><span>Phone number</span><input value={form.phone} onChange={e=>update('phone',e.target.value)}/></label><label><span>Website <em>Optional</em></span><input value={form.website} onChange={e=>update('website',e.target.value)}/></label></div></section>:null}
      {step===2?<section className="vendor-step-panel"><header><div><h3>Registration and address</h3><p>Provide the registered address and identifiers.</p></div><strong>Step 2 of 3</strong></header><div className="vendor-commercial-grid"><label className="span-2"><span>Registered street address</span><input value={form.street} onChange={e=>update('street',e.target.value)}/></label><label><span>City</span><input value={form.city} onChange={e=>update('city',e.target.value)}/></label><label><span>Province / State</span><input value={form.state} onChange={e=>update('state',e.target.value)}/></label><label><span>ZIP code</span><input value={form.zip} onChange={e=>update('zip',e.target.value)}/></label><label><span>Country</span><input value={form.country} onChange={e=>update('country',e.target.value)}/></label><label><span>Tax ID / TIN</span><input value={form.taxId} onChange={e=>update('taxId',e.target.value)}/></label><label><span>Business registration no.</span><input value={form.businessRegistration} onChange={e=>update('businessRegistration',e.target.value)}/></label></div></section>:null}
      {step===3?<section className="vendor-step-panel"><header><div><h3>Payment and compliance</h3><p>Add settlement details and supporting documents.</p></div><strong>Step 3 of 3</strong></header><div className="vendor-commercial-grid"><label><span>Payment terms</span><select value={form.terms} onChange={e=>update('terms',e.target.value)}><option>Immediate</option><option>15 days</option><option>30 days</option><option>45 days</option></select></label><label><span>Bank name</span><input value={form.bankName} onChange={e=>update('bankName',e.target.value)}/></label><label><span>Account name</span><input value={form.bankAccountName} onChange={e=>update('bankAccountName',e.target.value)}/></label><label><span>Account number</span><input value={form.bankAccountNumber} onChange={e=>update('bankAccountNumber',e.target.value)}/></label><label className="span-2"><span>Compliance documents</span><div className="vendor-preview-upload"><FileText size={20}/><span><b>{documents.length?documents.join(', '):'Upload registration and compliance files'}</b><small>Registration, tax certificate, permits, or certifications</small></span><label className="proc-secondary vendor-file-trigger">Choose files<input type="file" multiple onChange={e=>setDocuments(Array.from(e.target.files??[]).map(file=>file.name))}/></label></div></label></div><label className="vendor-confirmation"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span><b>I confirm this information is complete and authorized.</b><small>Procurement will verify the submission before updating the vendor record.</small></span></label></section>:null}
    </div><footer className="vendor-step-footer"><span>Step {step} of 3</span><div>{step>1?<button className="proc-secondary" onClick={()=>setStep(step-1)}><ArrowLeft size={16}/>Back</button>:null}{step<3?<button className="proc-primary" disabled={step===1?!firstReady:!secondReady} onClick={()=>setStep(step+1)}>Continue<ArrowRight size={16}/></button>:<button className="proc-primary" disabled={!confirmed} onClick={save}><Send size={16}/>Submit vendor information</button>}</div></footer>
  </section></div>;
}

function VendorDetailPage({ vendor, requests, onBack, onEdit, onRequestInformation, editor }: { vendor: VendorRecord; requests: PurchaseRequest[]; onBack: () => void; onEdit: () => void; onRequestInformation?: () => void; editor: React.ReactNode }) {
  const total = requests.reduce((sum, request) => sum + request.amount, 0);
  const address = [vendor.street, vendor.street2, vendor.city, vendor.state, vendor.zip, vendor.country].filter(Boolean).join(', ') || 'No address recorded';
  const informationStatus = vendor.informationStatus ?? 'Not requested';
  return <div className="proc-page vendor-profile-page"><PageHeading eyebrow="Vendor profile" title={vendor.name} detail={`${vendor.vendorType || 'Company'} · ${vendor.email}`} action={<div className="vendor-profile-actions"><button className="proc-secondary" onClick={onBack}><ArrowLeft size={16} />Back to vendors</button>{onRequestInformation ? <button className="vendor-info-request-button" onClick={onRequestInformation}><Mail size={16} />{informationStatus === 'Invitation pending' ? 'Resend information request' : 'Request information'}</button> : null}<button className="proc-primary" onClick={onEdit}>Edit vendor</button></div>} /><section className="proc-card vendor-profile-card"><div className="vendor-profile-hero"><span className="vendor-profile-avatar">{vendor.name.charAt(0).toUpperCase()}</span><div><div className="vendor-profile-badges"><StatusBadge>{vendor.vendorType || 'Company'}</StatusBadge><VendorInformationBadge status={informationStatus} /></div><h2>{vendor.name}</h2><p>{vendor.email}{vendor.phone ? ` · ${vendor.phone}` : ''}</p></div></div><div className="vendor-profile-section"><h3>Contact and address</h3><div className="vendor-profile-grid"><Detail label="Email" value={vendor.email} /><Detail label="Phone" value={vendor.phone || 'Not recorded'} /><Detail label="Address" value={address} /><Detail label="Website" value={vendor.website || 'Not recorded'} /></div></div><div className="vendor-profile-section"><h3>Business information</h3><div className="vendor-profile-grid"><Detail label="Tax ID / TIN" value={vendor.taxId || 'Not recorded'} /><Detail label="Branch code" value={vendor.branchCode || '000'} /><Detail label="Tags" value={vendor.tags || 'None'} /><Detail label="Vendor rating" value={vendor.rating} /></div></div><div className="vendor-profile-section"><h3>Information request</h3><div className="vendor-profile-grid"><Detail label="Status" value={informationStatus} /><Detail label="Last requested" value={vendor.informationRequestedAt ? formatMovementTime(vendor.informationRequestedAt) : 'Not yet requested'} /><Detail label="Recipient" value={vendor.email} /><Detail label="Managed by" value="Procurement Office" /></div></div><div className="vendor-profile-section"><h3>Purchasing settings</h3><div className="vendor-profile-grid"><Detail label="Payment terms" value={vendor.terms} /><Detail label="Lead time" value={vendor.lead} /><Detail label="Total purchases" value={String(requests.length)} /><Detail label="Total purchase value" value={money.format(total)} /></div></div><div className="vendor-profile-section"><h3>Notes</h3><p className="vendor-profile-notes">{vendor.notes || 'No internal notes recorded.'}</p></div><div className="vendor-profile-section"><div className="movement-history-title"><strong>Purchase history</strong><span>{requests.length} records</span></div><div className="vendor-purchase-list"><div className="vendor-purchase-head"><span>Purchase order</span><span>Purchase</span><span>Status</span><span>Amount</span></div>{requests.map((request) => <div className="vendor-purchase-row" key={request.id}><span><b>{request.id.replace('PR-', 'PO-')}</b><small>From {request.id}</small></span><span><b>{request.title}</b><small>{request.department}</small></span><StatusBadge>{request.status}</StatusBadge><strong>{money.format(request.amount)}</strong></div>)}{requests.length === 0 ? <div className="table-empty">No purchases have been assigned to this vendor yet.</div> : null}</div></div></section>{editor}</div>;
}

function VendorPurchaseHistory({ vendor, requests, onClose }: { vendor: VendorRecord; requests: PurchaseRequest[]; onClose: () => void }) {
  const total = requests.reduce((sum, request) => sum + request.amount, 0);
  return <div className="proc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="proc-modal vendor-purchase-modal" role="dialog" aria-modal="true" aria-labelledby="vendor-purchases-title"><header className="modal-header"><div><span className="eyebrow">Vendor purchase history</span><h2 id="vendor-purchases-title">{vendor.name}</h2><p>{vendor.email}</p></div><button className="modal-close" type="button" onClick={onClose} aria-label="Close purchase history"><X size={19} /></button></header><div className="vendor-purchase-summary"><div><small>Total purchases</small><strong>{requests.length}</strong></div><div><small>Total value</small><strong>{money.format(total)}</strong></div><div><small>Payment terms</small><strong>{vendor.terms}</strong></div></div><div className="vendor-purchase-list"><div className="vendor-purchase-head"><span>Purchase order</span><span>Purchase</span><span>Status</span><span>Amount</span></div>{requests.map((request) => <div className="vendor-purchase-row" key={request.id}><span><b>{request.id.replace('PR-', 'PO-')}</b><small>From {request.id}</small></span><span><b>{request.title}</b><small>{request.department}</small></span><StatusBadge>{request.status}</StatusBadge><strong>{money.format(request.amount)}</strong></div>)}{requests.length === 0 ? <div className="table-empty">No purchases have been assigned to this vendor yet.</div> : null}</div><footer className="modal-actions"><button type="button" className="proc-primary" onClick={onClose}>Done</button></footer></section></div>;
}

function VendorEditor({ initial, onCancel, onSave }: { initial: VendorRecord; onCancel: () => void; onSave: (vendor: VendorRecord) => void }) {
  const [form, setForm] = useState<VendorRecord>({ vendorType: 'Company', phone: '', street: '', street2: '', city: '', state: '', zip: '', country: 'Philippines', taxId: '', branchCode: '000', website: '', tags: '', notes: '', ...initial });
  const update = (field: keyof VendorRecord, value: string) => setForm((current) => ({ ...current, [field]: value } as VendorRecord));
  const valid = form.name.trim() && form.email.trim();
  return <div className="proc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="proc-modal vendor-editor vendor-master-editor" role="dialog" aria-modal="true" aria-labelledby="vendor-editor-title"><header className="modal-header"><div><span className="eyebrow">Supplier master record</span><h2 id="vendor-editor-title">{initial.name ? 'Edit vendor' : 'Add vendor'}</h2></div><button className="modal-close" type="button" onClick={onCancel} aria-label="Close vendor editor"><X size={19} /></button></header><div className="vendor-master-body"><div className="vendor-type-choice"><span>Vendor type</span><label><input type="radio" name="vendorType" checked={form.vendorType === 'Person'} onChange={() => update('vendorType', 'Person')} />Person</label><label><input type="radio" name="vendorType" checked={form.vendorType === 'Company'} onChange={() => update('vendorType', 'Company')} />Company</label></div><div className="form-grid"><label className="span-2"><span>{form.vendorType === 'Person' ? 'Vendor name' : 'Company name'}</span><input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Registered supplier name" /></label><label><span>Email address</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="purchasing@vendor.com" /></label><label><span>Phone</span><input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="Contact number" /></label></div><div className="vendor-form-section"><h3>Address</h3><div className="form-grid"><label className="span-2"><span>Street</span><input value={form.street} onChange={(event) => update('street', event.target.value)} placeholder="Street address" /></label><label className="span-2"><span>Street 2</span><input value={form.street2} onChange={(event) => update('street2', event.target.value)} placeholder="Building, floor, or unit" /></label><label><span>City</span><input value={form.city} onChange={(event) => update('city', event.target.value)} /></label><label><span>State / Province</span><input value={form.state} onChange={(event) => update('state', event.target.value)} /></label><label><span>ZIP</span><input value={form.zip} onChange={(event) => update('zip', event.target.value)} /></label><label><span>Country</span><input value={form.country} onChange={(event) => update('country', event.target.value)} /></label></div></div><div className="vendor-form-section"><h3>Business information</h3><div className="form-grid"><label><span>Tax ID / TIN</span><input value={form.taxId} onChange={(event) => update('taxId', event.target.value)} /></label><label><span>Branch code</span><input value={form.branchCode} onChange={(event) => update('branchCode', event.target.value)} /></label><label><span>Website</span><input type="url" value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="https://" /></label><label><span>Tags</span><input value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="B2B, Preferred, Technology" /></label></div></div><div className="vendor-form-section"><h3>Purchasing</h3><div className="form-grid"><label><span>Payment terms</span><select value={form.terms} onChange={(event) => update('terms', event.target.value)}><option>Immediate</option><option>15 days</option><option>30 days</option><option>45 days</option><option>60 days</option></select></label><label><span>Lead time</span><input value={form.lead} onChange={(event) => update('lead', event.target.value)} placeholder="e.g. 7 days" /></label><label><span>Vendor rating</span><input value={form.rating} onChange={(event) => update('rating', event.target.value)} placeholder="e.g. 4.8" /></label><label className="span-2"><span>Notes</span><textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Internal vendor notes" /></label></div></div></div><footer className="modal-actions"><button type="button" className="proc-secondary" onClick={onCancel}>Cancel</button><button type="button" className="proc-primary" disabled={!valid} onClick={() => onSave({ ...form, name: form.name.trim(), email: form.email.trim() })}><Check size={16} />Save vendor</button></footer></section></div>;
}

function ProductsView({ onNotify }: { onNotify: (message: string) => void }) {
  const [records, setRecords] = useState<ProductRecord[]>(loadProductRecords);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ originalName?: string; product: ProductRecord } | null>(null);
  const filtered = records.filter((product) => `${product.name} ${product.category} ${product.description} ${product.uom}`.toLowerCase().includes(query.trim().toLowerCase()));
  const saveProduct = (product: ProductRecord, originalName?: string) => {
    const duplicate = records.some((item) => item.name.toLowerCase() === product.name.toLowerCase() && item.name !== originalName);
    if (duplicate) { onNotify('A product with this name already exists'); return; }
    const next = originalName ? records.map((item) => item.name === originalName ? product : item) : [...records, product];
    setRecords(next);
    window.localStorage.setItem('procurement-products', JSON.stringify(next));
    setEditing(null);
    onNotify(`${product.name} saved`);
  };
  return <div className="proc-page"><PageHeading eyebrow="Purchasing catalog" title="Products" detail="Maintain reusable products, specifications, units of measure, categories, and estimated purchasing prices." action={<button className="proc-primary" onClick={() => setEditing({ product: { name: '', category: 'Operational supplies', description: '', uom: 'UNIT', price: 0 } })}><Plus size={17} />Add product</button>} /><section className="proc-filterbar"><div className="proc-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, specifications, UOM, or categories" /></div></section><section className="proc-card flush product-list-card"><div className="system-table-title"><ShoppingCart size={17} />Products List</div><table className="product-master-table"><thead><tr><th>Product</th><th>Description / Specs</th><th>Category</th><th>UOM</th><th>Estimated price</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((product) => <tr key={product.name}><td><b>{product.name}</b></td><td>{product.description}</td><td>{product.category}</td><td><b>{product.uom}</b></td><td><b>{money.format(product.price)}</b></td><td><span className="table-status"><i />Active</span></td><td><button className="proc-secondary" onClick={() => setEditing({ originalName: product.name, product: { ...product } })}>Edit product</button></td></tr>)}</tbody></table>{filtered.length === 0 ? <div className="table-empty">No products match your search.</div> : null}</section>{editing ? <ProductEditor initial={editing.product} onCancel={() => setEditing(null)} onSave={(product) => saveProduct(product, editing.originalName)} /> : null}</div>;
}

function ProductEditor({ initial, onCancel, onSave }: { initial: ProductRecord; onCancel: () => void; onSave: (product: ProductRecord) => void }) {
  const [form, setForm] = useState(initial);
  const valid = form.name.trim().length > 0 && form.description.trim().length > 0 && form.uom.trim().length > 0 && form.price >= 0;
  return <div className="proc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="proc-modal product-editor" role="dialog" aria-modal="true" aria-labelledby="product-editor-title"><header className="modal-header"><div><span className="eyebrow">Product catalog record</span><h2 id="product-editor-title">{initial.name ? 'Edit product' : 'Add product'}</h2></div><button className="modal-close" type="button" onClick={onCancel} aria-label="Close product editor"><X size={19} /></button></header><div className="form-grid"><label className="span-2"><span>Product name</span><input autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Enter the product name" /></label><label className="span-2"><span>Description / Specifications</span><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Enter technical, material, size, compatibility, or performance requirements" /></label><label><span>Category</span><select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}><option>Operational supplies</option><option>Technology</option><option>Furniture</option><option>Capital equipment</option><option>Appliance</option><option>Customized item</option><option>Bulk purchase</option><option>Warrantied item</option><option>Service</option></select></label><label><span>Unit of Measure</span><select value={form.uom} onChange={(event) => setForm((current) => ({ ...current, uom: event.target.value }))}><option>UNIT</option><option>BOX</option><option>SET</option><option>LOT</option><option>REAM</option><option>PACK</option><option>CARTRIDGE</option><option>SERVICE</option></select></label><label><span>Estimated purchase price</span><input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))} /></label></div><footer className="modal-actions"><button type="button" className="proc-secondary" onClick={onCancel}>Cancel</button><button type="button" className="proc-primary" disabled={!valid} onClick={() => onSave({ ...form, name: form.name.trim(), description: form.description.trim(), uom: form.uom.trim().toUpperCase() })}><Check size={16} />Save product</button></footer></section></div>;
}

function ReportsView({ requests }: { requests: PurchaseRequest[] }) {
  const [department, setDepartment] = useState('All departments');
  const [category, setCategory] = useState('All categories');
  const [status, setStatus] = useState('All statuses');
  const [period, setPeriod] = useState('All time');
  const departmentsInData = [...new Set(requests.map((item) => item.department))].sort();
  const categoriesInData = [...new Set(requests.map((item) => item.category))].sort();
  const statusesInData = [...new Set(requests.map((item) => item.status))].sort();
  const periodDays = period === 'Last 30 days' ? 30 : period === 'Last 90 days' ? 90 : 0;
  const filtered = requests.filter((item) => {
    const recordedAt = item.updatedAt || item.createdAt;
    const inPeriod = !periodDays || !recordedAt || Date.now() - new Date(recordedAt).getTime() <= periodDays * 86_400_000;
    return inPeriod && (department === 'All departments' || item.department === department) && (category === 'All categories' || item.category === category) && (status === 'All statuses' || item.status === status);
  });
  const approvalStatuses: RequestStatus[] = ['For DT Approval', 'For Department Approval', 'For Finance Approval', 'For COO Approval', 'For President Approval'];
  const openPoStatuses: RequestStatus[] = ['PO Draft', 'For Department Approval', 'For Finance Approval', 'For COO Approval', 'For President Approval', 'PO Approved', 'PO Awaiting Acknowledgement', 'PO Acknowledged', 'Partially Received', 'Received'];
  const completedStatuses: RequestStatus[] = ['Paid', 'Filed'];
  const totalSpend = filtered.reduce((sum, item) => sum + item.amount, 0);
  const approvalCount = filtered.filter((item) => approvalStatuses.includes(item.status)).length;
  const openPoValue = filtered.filter((item) => openPoStatuses.includes(item.status)).reduce((sum, item) => sum + item.amount, 0);
  const completedCount = filtered.filter((item) => completedStatuses.includes(item.status)).length;
  const completionRate = filtered.length ? Math.round((completedCount / filtered.length) * 100) : 0;
  const statusGroups = [
    { label: 'Approvals', count: approvalCount, color: 'maroon' },
    { label: 'Procurement review', count: filtered.filter((item) => item.status === 'For Procurement Review').length, color: 'gold' },
    { label: 'RFQ & sourcing', count: filtered.filter((item) => ['RFQ Draft', 'RFQ Sent'].includes(item.status)).length, color: 'teal' },
    { label: 'Purchase orders', count: filtered.filter((item) => openPoStatuses.includes(item.status)).length, color: 'blue' },
    { label: 'Completed', count: completedCount, color: 'green' },
  ];
  const departmentSpend = [...new Set(filtered.map((item) => item.department))].map((name) => ({ name, amount: filtered.filter((item) => item.department === name).reduce((sum, item) => sum + item.amount, 0) })).sort((a, b) => b.amount - a.amount);
  const categorySpend = [...new Set(filtered.map((item) => item.category))].map((name) => ({ name, amount: filtered.filter((item) => item.category === name).reduce((sum, item) => sum + item.amount, 0) })).sort((a, b) => b.amount - a.amount);
  const vendorSpend = [...new Set(filtered.filter((item) => item.vendorName).map((item) => item.vendorName as string))].map((name) => ({ name, amount: filtered.filter((item) => item.vendorName === name).reduce((sum, item) => sum + item.amount, 0), orders: filtered.filter((item) => item.vendorName === name && openPoStatuses.includes(item.status)).length })).sort((a, b) => b.amount - a.amount);
  const maximumDepartmentSpend = Math.max(...departmentSpend.map((item) => item.amount), 1);
  const maximumCategorySpend = Math.max(...categorySpend.map((item) => item.amount), 1);
  const attentionItems = filtered.filter((item) => ['For DT Approval', 'For Department Approval', 'For Finance Approval', 'For COO Approval', 'For President Approval', 'RFQ Sent', 'PO Awaiting Acknowledgement', 'Partially Received'].includes(item.status));
  const exportCsv = () => {
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [['Request', 'Title', 'Department', 'Category', 'Status', 'Amount', 'Vendor', 'Due'], ...filtered.map((item) => [item.id, item.title, item.department, item.category, item.status, item.amount, item.vendorName || '', item.due])];
    const blob = new Blob([rows.map((row) => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `procurement-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const resetFilters = () => { setDepartment('All departments'); setCategory('All categories'); setStatus('All statuses'); setPeriod('All time'); };
  return <div className="proc-page reports-page">
    <PageHeading eyebrow="Decision support" title="Procurement Reports" detail="Monitor spending, workflow performance, pending work, vendor activity, and completed procurement records." action={<div className="report-actions"><button className="proc-secondary" type="button" onClick={() => window.print()}><FileText size={16} />Print / PDF</button><button className="proc-primary" type="button" onClick={exportCsv}><ArrowRight size={16} />Export CSV</button></div>} />
    <section className="proc-card report-filter-card"><div className="report-filter-heading"><div><ListFilter size={18} /><span><b>Report filters</b><small>{filtered.length} of {requests.length} records included</small></span></div><button type="button" onClick={resetFilters}>Reset filters</button></div><div className="report-filter-grid"><label><span>Period</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option>All time</option><option>Last 30 days</option><option>Last 90 days</option></select></label><label><span>Department</span><select value={department} onChange={(event) => setDepartment(event.target.value)}><option>All departments</option>{departmentsInData.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categoriesInData.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option>{statusesInData.map((item) => <option key={item}>{item}</option>)}</select></label></div></section>
    <section className="metric-grid report-metrics"><Metric label="Total procurement value" value={money.format(totalSpend)} detail={`${filtered.length} purchase requests`} tone="maroon" /><Metric label="Pending approvals" value={String(approvalCount)} detail="Requires an approver decision" tone="gold" /><Metric label="Open PO value" value={money.format(openPoValue)} detail="Ordered but not yet filed" tone="teal" /><Metric label="Completion rate" value={`${completionRate}%`} detail={`${completedCount} paid or filed records`} tone="green" /></section>
    <section className="report-grid"><article className="proc-card report-panel"><header><div><h2>Workflow distribution</h2><p>Current records grouped by lifecycle phase.</p></div><span>{filtered.length} records</span></header><div className="status-report-list">{statusGroups.map((item) => <div key={item.label}><span><i className={`report-dot ${item.color}`} />{item.label}</span><b>{item.count}</b><div><i className={item.color} style={{ width: `${filtered.length ? Math.max(6, item.count / filtered.length * 100) : 0}%` }} /></div></div>)}</div></article><article className="proc-card report-panel"><header><div><h2>Spend by department</h2><p>Departments ranked by requested value.</p></div></header><div className="spend-bars">{departmentSpend.slice(0, 6).map((item) => <div key={item.name}><span><b>{item.name}</b><strong>{money.format(item.amount)}</strong></span><div><i style={{ width: `${item.amount / maximumDepartmentSpend * 100}%` }} /></div></div>)}{departmentSpend.length === 0 ? <p className="report-empty">No department spending for these filters.</p> : null}</div></article><article className="proc-card report-panel"><header><div><h2>Spend by category</h2><p>Where procurement demand is concentrated.</p></div></header><div className="spend-bars category-bars">{categorySpend.slice(0, 6).map((item) => <div key={item.name}><span><b>{item.name}</b><strong>{money.format(item.amount)}</strong></span><div><i style={{ width: `${item.amount / maximumCategorySpend * 100}%` }} /></div></div>)}{categorySpend.length === 0 ? <p className="report-empty">No category spending for these filters.</p> : null}</div></article><article className="proc-card report-panel"><header><div><h2>Vendor activity</h2><p>Purchase value and active orders by supplier.</p></div></header><div className="vendor-report-list">{vendorSpend.slice(0, 6).map((item) => <div key={item.name}><span><Store size={16} /><span><b>{item.name}</b><small>{item.orders} active {item.orders === 1 ? 'order' : 'orders'}</small></span></span><strong>{money.format(item.amount)}</strong></div>)}{vendorSpend.length === 0 ? <p className="report-empty">No vendor has been assigned to the selected records.</p> : null}</div></article></section>
    <section className="proc-card flush report-attention"><div className="system-table-title"><AlertTriangle size={17} />Requires attention <span>{attentionItems.length}</span></div><div className="report-table-scroll"><table><thead><tr><th>Request</th><th>Department</th><th>Current stage</th><th>Amount</th><th>Due</th></tr></thead><tbody>{attentionItems.map((item) => <tr key={item.id}><td><b>{item.id}</b><small>{item.title}</small></td><td>{item.department}</td><td><span className="table-status"><i />{item.status}</span></td><td><b>{money.format(item.amount)}</b></td><td>{item.due}</td></tr>)}</tbody></table>{attentionItems.length === 0 ? <div className="table-empty">No records require attention for the selected filters.</div> : null}</div></section>
    <section className="proc-card flush report-records"><RequestTable requests={filtered} title="Detailed Procurement Records" /></section>
  </div>;
}

function RoleRestrictedView({ role, modules, onBack }: { role: Role; modules: string; onBack: () => void }) {
  return <div className="proc-page"><section className="proc-card role-restricted"><UserCheck size={24} /><span className="eyebrow">Role-based access</span><h2>Not visible to {role}</h2><p>This screen is outside the responsibilities assigned to the selected role.</p><small>Visible modules: {modules}</small><button className="proc-primary" type="button" onClick={onBack}>Return to dashboard</button></section></div>;
}

function NewRequestPage({ onBack, onSubmit }: { onBack: () => void; onSubmit: (request: PurchaseRequest) => boolean | Promise<boolean> }) {
  const [title, setTitle] = useState('');
  const [requestItems, setRequestItems] = useState<Array<PurchaseRequestItem & { id: string }>>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Operational supplies');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnitPrice, setNewItemUnitPrice] = useState(0);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [catalogProducts] = useState<ProductRecord[]>(loadProductRecords);
  useEffect(() => {
    if (!itemPickerOpen) return;

    const closeItemPicker = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('.pr-item-picker label, .pr-item-results')) return;
      setItemPickerOpen(false);
    };

    document.addEventListener('pointerdown', closeItemPicker);
    return () => document.removeEventListener('pointerdown', closeItemPicker);
  }, [itemPickerOpen]);
  const amount = requestItems.reduce((sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitPrice), 0);
  const matchingItems = catalogProducts.filter((product) => product.name.toLowerCase().includes(itemSearch.trim().toLowerCase()));
  const addRequestItem = (product: ProductRecord) => { setRequestItems((current) => [...current, { id: `PRI-${Date.now()}`, name: product.name, category: product.category, description: product.description, uom: product.uom, quantity: 1, unitPrice: product.price }]); setItemSearch(''); setItemPickerOpen(false); };
  const addManualRequestItem = () => { if (!itemSearch.trim()) return; setRequestItems((current) => [...current, { id: `PRI-${Date.now()}`, name: itemSearch.trim(), category: newItemCategory, description: `${itemSearch.trim()} standard specification`, uom: 'UNIT', quantity: Math.max(1, newItemQuantity), unitPrice: Math.max(0, newItemUnitPrice) }]); setItemSearch(''); setNewItemQuantity(1); setNewItemUnitPrice(0); setItemPickerOpen(false); };
  const updateRequestItem = (id: string, changes: Partial<PurchaseRequestItem>) => setRequestItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  const routeCategory = requestItems.find((item) => item.category === 'Technology')?.category ?? requestItems.find((item) => ['Furniture', 'Capital equipment', 'Appliance', 'Customized item', 'Bulk purchase', 'Warrantied item'].includes(item.category))?.category ?? requestItems[0]?.category ?? 'Operational supplies';
  const initialStatus: RequestStatus = 'For Procurement Review';

  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || amount <= 0) return;
    setSubmitting(true);
    await onSubmit({
      id: `PR-2026-${String(Date.now()).slice(-4)}`,
      title: title.trim(),
      department: 'Requesting Department',
      amount,
      category: routeCategory,
      requester: 'Local User',
      status: initialStatus,
      due: 'In 3 days',
      items: requestItems.map(({ name, category: itemCategory, description, uom, quantity, unitPrice }) => ({ name, category: itemCategory, description, uom, quantity, unitPrice })),
    });
    setSubmitting(false);
  };

  return <div className="proc-page request-editor-page">
    <section className="request-editor-toolbar"><div><p className="proc-eyebrow">Purchase requests</p><h2>New Purchase Request</h2></div><button className="proc-secondary" type="button" onClick={onBack}><ArrowLeft size={16} />Back</button></section>
    <form className="request-editor" onSubmit={submit}>
      <section className="request-editor-section"><div className="request-section-heading"><span>1</span><div><h3>Request details</h3><p>Describe the purchase need. Routing is computed from the product categories below.</p></div></div><div className="request-form-grid"><label className="span-2"><span>Request title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Computer laboratory supplies" autoFocus /></label></div></section>
      <section className="request-editor-section">
        <div className="request-section-heading"><span>2</span><div><h3>Requested products</h3><p>Add one or more products with the required description, specifications, and unit of measure.</p></div></div>
        <div className="pr-item-table">
          <div className="pr-item-head"><span>Product</span><span>Description / Specs</span><span>Category</span><span>UOM</span><span>Quantity</span><span>Estimated unit cost</span><span>Amount</span><span /></div>
          {requestItems.map((item) => <div className="pr-item-row" key={item.id}><div><b>{item.name}</b></div><input aria-label={`${item.name} description or specifications`} value={item.description ?? ''} onChange={(event) => updateRequestItem(item.id, { description: event.target.value })} /><select aria-label={`${item.name} category`} value={item.category} onChange={(event) => updateRequestItem(item.id, { category: event.target.value })}><option>Operational supplies</option><option>Technology</option><option>Furniture</option><option>Capital equipment</option><option>Appliance</option><option>Customized item</option><option>Bulk purchase</option><option>Warrantied item</option><option>Services</option></select><select aria-label={`${item.name} unit of measure`} value={itemUom(item)} onChange={(event) => updateRequestItem(item.id, { uom: event.target.value })}><option>UNIT</option><option>BOX</option><option>SET</option><option>LOT</option><option>REAM</option><option>PACK</option><option>CARTRIDGE</option><option>SERVICE</option></select><input aria-label={`${item.name} quantity`} type="number" min="1" value={item.quantity} onChange={(event) => updateRequestItem(item.id, { quantity: Number(event.target.value) })} /><input aria-label={`${item.name} estimated unit cost`} type="number" min="0" value={item.unitPrice} onChange={(event) => updateRequestItem(item.id, { unitPrice: Number(event.target.value) })} /><strong>{money.format(item.quantity * item.unitPrice)}</strong><button type="button" aria-label={`Remove ${item.name}`} onClick={() => setRequestItems((current) => current.filter((line) => line.id !== item.id))}><Trash2 size={16} /></button></div>)}
          <div className="pr-item-picker"><label><Search size={16} /><input value={itemSearch} onFocus={() => setItemPickerOpen(true)} onChange={(event) => { setItemSearch(event.target.value); setItemPickerOpen(true); }} placeholder="Search or add a product" /></label><span className="pr-picker-hint">Specifications populate from the catalog</span><select aria-label="New product category" value={newItemCategory} onChange={(event) => setNewItemCategory(event.target.value)}><option>Operational supplies</option><option>Technology</option><option>Furniture</option><option>Capital equipment</option><option>Appliance</option><option>Customized item</option><option>Bulk purchase</option><option>Warrantied item</option><option>Services</option></select><span className="pr-picker-uom">UNIT</span><input aria-label="New product quantity" type="number" min="1" value={newItemQuantity} onChange={(event) => setNewItemQuantity(Number(event.target.value))} /><input aria-label="New product estimated unit cost" type="number" min="0" value={newItemUnitPrice} onChange={(event) => setNewItemUnitPrice(Number(event.target.value))} /><strong>{money.format(Math.max(1, newItemQuantity) * Math.max(0, newItemUnitPrice))}</strong>{itemPickerOpen ? <div className="pr-item-results">{matchingItems.map((product) => <button type="button" key={product.name} onClick={() => addRequestItem(product)}><span><b>{product.name}</b><small>{product.category} · {product.uom}</small><small>{product.description}</small></span><strong>{money.format(product.price)}</strong></button>)}{matchingItems.length === 0 ? <div className="table-empty">No catalog match. Complete the row and click Add.</div> : null}</div> : null}</div>
          <div className="pr-item-add-row"><button type="button" onClick={addManualRequestItem} disabled={!itemSearch.trim()}><Plus size={16} />Add product to request</button></div>
        </div>
        <div className="pr-items-total"><span>{requestItems.length} {requestItems.length === 1 ? 'product' : 'products'}</span><strong>Total {money.format(amount)}</strong></div>
      </section>
      <footer className="request-editor-actions"><button className="proc-secondary" type="button" onClick={onBack}>Cancel</button><button className="proc-primary" type="submit" disabled={submitting || !title.trim() || amount <= 0}><Send size={16} />{submitting ? 'Submitting...' : 'Submit request'}</button></footer>
    </form>
  </div>;
}

function procurementRoleFromSession(roles: string[]): Role {
  const normalized = roles.map((item) => item.toLowerCase().replaceAll('_', '-'));
  if (normalized.includes('procurement-admin')) return 'Procurement Admin';
  if (normalized.includes('department-head')) return 'Department Head';
  if (normalized.includes('finance-manager')) return 'Finance Manager';
  if (normalized.includes('coo')) return 'COO';
  if (normalized.includes('president')) return 'President';
  if (normalized.includes('procurement-officer')) return 'Procurement Officer';
  if (normalized.includes('receiving-officer')) return 'Procurement Officer';
  if (normalized.includes('dt-department')) return 'DT Department';
  if (normalized.includes('asset-custodian')) return 'Procurement Officer';
  return 'Requester';
}

function UserAdministrationView() {
  const [users, setUsers] = useState(() => {
    try {
      const saved = window.localStorage.getItem('procurement-user-assignments');
      return saved ? JSON.parse(saved) as ProcurementUserAssignment[] : initialUsers;
    } catch {
      return initialUsers;
    }
  });
  const [selectedId, setSelectedId] = useState(initialUsers[0].id);
  const selected = users.find((user) => user.id === selectedId) ?? users[0];
  const updateSelected = (changes: Partial<typeof selected>) => setUsers((current) => current.map((user) => user.id === selected.id ? { ...user, ...changes } : user));
  useEffect(() => { window.localStorage.setItem('procurement-user-assignments', JSON.stringify(users)); }, [users]);

  return <div className="proc-page">
    <PageHeading eyebrow="Super Admin" title="Users, Roles & Departments" detail="Assign predefined procurement roles and a primary department to each user." />
    <div className="approval-layout">
      <section className="proc-card queue-card"><CardHeader title="Procurement users" icon={UserCheck} />{users.map((user) => <button className={`queue-item ${selected.id === user.id ? 'selected' : ''}`} key={user.id} onClick={() => setSelectedId(user.id)}><span className="queue-badge">{user.name.split(' ').map((part) => part[0]).join('').slice(0,2)}</span><span><b>{user.name}</b><small>{user.role} / {user.department}</small></span><StatusBadge>{user.active ? 'Active' : 'Inactive'}</StatusBadge></button>)}</section>
      <section className="proc-card review-card user-assignment-card"><div className="user-assignment-header"><div className="user-assignment-avatar">{selected.name.split(' ').map((part) => part[0]).join('').slice(0,2)}</div><div><span className="status-pill success">{selected.active ? 'Active access' : 'Access disabled'}</span><h3>{selected.name}</h3><p>{selected.email}</p></div></div><div className="user-assignment-form"><label><span>Procurement role</span><select value={selected.role} onChange={(event) => updateSelected({ role: event.target.value })}>{procurementRoles.map((item) => <option key={item}>{item}</option>)}</select><small>Controls the menus and actions available to this user.</small></label><label><span>Primary department</span><select value={selected.department} onChange={(event) => updateSelected({ department: event.target.value })}>{departments.map((item) => <option key={item}>{item}</option>)}</select><small>Determines the user's default procurement record scope.</small></label><label className={`user-access-toggle ${selected.active ? 'active' : ''}`}><span><b>Procurement access</b><small>Allow this user to open and use the Procurement Module.</small></span><input type="checkbox" checked={selected.active} onChange={(event) => updateSelected({ active: event.target.checked })} /></label></div><div className="user-access-summary"><div className="movement-history-title"><strong>Effective access</strong><span>Based on current assignment</span></div><div className="policy-checks"><CheckRow done={selected.active} label={`${selected.role} dashboard and menus`} /><CheckRow done={selected.active} label={`Record scope: ${['Super Admin','Procurement Admin','Finance Manager','COO','President','Procurement Officer'].includes(selected.role) ? 'Organization-wide' : selected.department}`} /><CheckRow done={selected.active} label="Role-based permissions applied" /></div></div><footer className="user-assignment-footer"><span>Changes apply the next time the user opens Procurement.</span><button className="proc-primary" onClick={() => undefined}><Check size={17} />Save assignment</button></footer></section>
    </div>
  </div>;
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: React.ReactNode }) {
  void eyebrow;
  const cardTitles: Record<string, string> = {
    'Purchase Requests': 'Request Workspace',
    'Purchase Orders': 'Order Management',
    Receiving: 'Delivery & Acceptance',
    Vendors: 'Vendor Directory',
    Products: 'Product Catalog',
    'Procurement Reports': 'Procurement Insights',
    'Users, Roles & Departments': 'Access Management',
  };
  return <header className="page-heading page-heading-card"><div><h1>{cardTitles[title] ?? title}</h1><p>{detail}</p></div>{action}</header>;
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <article className={`metric-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function CardHeader({ title, icon: Icon, action }: { title: string; icon: React.ComponentType<{ size?: number }>; action?: React.ReactNode }) {
  return <header className="proc-card-header"><div><Icon size={18} /><h2>{title}</h2></div>{action}</header>;
}

function RequestTable({ requests, title, onOpen }: { requests: PurchaseRequest[]; title?: string; onOpen?: (request: PurchaseRequest) => void }) {
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  useEffect(() => {
    if (selectedRequest && onOpen) {
      onOpen(selectedRequest);
      setSelectedRequest(null);
    }
  }, [selectedRequest, onOpen]);
  return <><div className="table-wrap">{title ? <div className="system-table-title"><ClipboardCheck size={17} />{title}</div> : null}<table><thead><tr><th className="select-column"><input type="checkbox" aria-label="Select all requests" /></th><th>Request</th><th>Department</th><th>Estimated amount</th><th>Status</th><th>Due</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td className="select-column"><input type="checkbox" aria-label={`Select ${request.id}`} /></td><td><button type="button" className="table-link" onClick={() => setSelectedRequest(request)}>{request.id}</button><span>{request.title}</span></td><td>{request.department}</td><td><b>PHP {request.amount.toLocaleString()}</b></td><td><span className="table-status"><i />{request.status}</span></td><td>{request.due}</td></tr>)}</tbody></table>{requests.length === 0 ? <div className="table-empty">No purchase requests yet. Create the first PR to begin.</div> : null}</div>{selectedRequest ? <PurchaseRequestModal request={selectedRequest} onClose={() => setSelectedRequest(null)} /> : null}</>;
}

function PurchaseRequestModal({ request, onClose }: { request: PurchaseRequest; onClose: () => void }) {
  const currentIndex = workflowStageIndex(request.status);
  return <div className="proc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="proc-modal pr-detail-modal" role="dialog" aria-modal="true" aria-labelledby="pr-modal-title">
      <header className="modal-header"><div><span className="eyebrow">Purchase request details</span><h2 id="pr-modal-title">{request.id}</h2><p>{request.title}</p></div><button type="button" className="modal-close" onClick={onClose} aria-label="Close purchase request details"><X size={19} /></button></header>
      <div className="pr-modal-summary"><StatusBadge>{request.status}</StatusBadge><strong>{money.format(request.amount)}</strong></div>
      <div className="pr-modal-details"><Detail label="Requester" value={request.requester} /><Detail label="Department" value={request.department} /><Detail label="Required date" value={request.due} /><Detail label="Product lines" value={String(request.items?.length ?? 0)} /><Detail label="Total quantity" value={String(requestTotalQuantity(request))} /><Detail label="Created" value={formatMovementTime(request.createdAt)} /><Detail label="Last movement" value={formatMovementTime(request.updatedAt ?? request.createdAt)} /></div>
      {requestIncludesTechnology(request) ? <div className="category-route-note"><UserCheck size={17} /><span><b>DT review required</b><small>This request contains one or more Technology products.</small></span></div> : null}
      <div className="movement-history-title"><strong>Lifecycle stage</strong><span>Stage {currentIndex + 1} of {purchaseRequestLifecycleLabels.length}</span></div>
      <div className="pr-journey modal-journey">{purchaseRequestLifecycleLabels.map((label, index) => <div className={`${index < currentIndex ? 'complete' : ''} ${index === currentIndex ? 'current' : ''}`} key={label}><span>{index < currentIndex ? <Check size={12} /> : index + 1}</span><small>{label}</small></div>)}</div>
      {request.items?.length ? <><div className="movement-history-title"><strong>Requested products</strong><span>{request.items.length} {request.items.length === 1 ? 'product line' : 'product lines'}</span></div><div className="pr-modal-items">{request.items.map((item, index) => <div key={`${item.name}-${index}`}><span><b>{item.name}</b><small>{item.category} · {itemUom(item)}</small><em>{itemDescription(item)}</em></span><span>{item.quantity} {itemUom(item)} × {money.format(item.unitPrice)}</span><strong>{money.format(item.quantity * item.unitPrice)}</strong></div>)}</div></> : null}
      <div className="movement-history-title"><strong>Activity history</strong><span>Latest first</span></div>
      <div className="movement-timeline">{(request.history ?? []).slice().reverse().map((event, index) => <div className="movement-event" key={`${event.createdAt}-${index}`}><span><Check size={13} /></span><div><b>{movementActionLabel(event.action)}</b><p>{event.detail}</p><small>{event.actor} · {formatMovementTime(event.createdAt)}</small></div></div>)}</div>
    </section>
  </div>;
}

function EmptyWorkflow({ title, detail }: { title: string; detail: string }) { return <div className="proc-page"><PageHeading eyebrow="" title={title} detail={detail} /></div>; }

function StatusBadge({ children }: { children: React.ReactNode }) { return <span className="status-badge">{children}</span>; }
function Attention({ title, detail, icon: Icon = AlertTriangle }: { title: string; detail: string; icon?: React.ComponentType<{ size?: number }> }) { return <article className="attention-item"><Icon size={17} /><div><b>{title}</b><small>{detail}</small></div><ArrowRight size={16} /></article>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="detail"><span>{label}</span><b>{value}</b></div>; }
function ProcurementValidationGuidance({ request }: { request: PurchaseRequest }) {
  if (!request.procurementValidationNotes) return null;
  return <section className="procurement-validation-guidance"><span><ClipboardCheck size={21} /></span><div><small>Procurement Validation</small><h3>Quotations received and validated</h3><p>{request.procurementValidationNotes}</p><em>{request.procurementValidatedBy ?? 'Procurement Office'} · {formatMovementTime(request.procurementValidatedAt)}</em></div><strong><CheckCircle2 size={16} />Validated</strong></section>;
}
function CheckRow({ label, done = false }: { label: string; done?: boolean }) { return <div className={`check-row ${done ? 'done' : 'pending'}`}><span className="check-row-icon">{done ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}</span><span className="check-row-copy"><b>{label}</b><small>{done ? 'Completed' : 'Pending review'}</small></span></div>; }
function TimelineStep({ label, detail, done = false, active = false }: { label: string; detail: string; done?: boolean; active?: boolean }) { return <div className={`timeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}><span>{done ? <Check size={14} /> : null}</span><div><b>{label}</b><small>{detail}</small></div></div>; }

function movementActionLabel(action: string) {
  const labels: Record<string, string> = { create: 'Purchase request submitted', approve: 'Approval completed', complete_review: 'Procurement review completed', complete_dt_review: 'DT technical review completed', send_rfq: 'RFQ sent to vendors', record_quotations: 'Vendor quotations recorded', validate_quotations: 'Quotations received and validated', submit_quotes: 'Quotations submitted for review', select_quote: 'Requester quotation selected', create_po: 'Purchase order created', submit_po_department: 'Purchase Order submitted for Department Head approval', send_po: 'Purchase order emailed', acknowledge: 'Vendor acknowledgement recorded', receive: 'Delivery received', mark_paid: 'Vendor payment recorded', file: 'Procurement record filed' };
  return labels[action] ?? action.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function assignedTeamForStatus(status: RequestStatus) {
  if (status === 'Draft') return 'Requester';
  if (status === 'Submitted') return 'System Routing';
  if (status === 'For DT Approval') return 'Digital Transformation Team';
  if (status === 'For Requester Selection') return 'Requester';
  if (status === 'Ready for PO Creation') return 'Procurement Office';
  if (status === 'For Department Approval') return 'Department Head';
  if (status === 'For Finance Approval' || status === 'Received') return 'Finance';
  if (status === 'For COO Approval') return 'Chief Operating Officer';
  if (status === 'For President Approval') return 'President';
  if (['For Procurement Review', 'RFQ Draft', 'RFQ Sent', 'Quotations Received', 'PO Draft', 'PO Approved', 'PO Awaiting Acknowledgement'].includes(status)) return 'Procurement Office';
  if (['PO Acknowledged', 'Partially Received'].includes(status)) return 'Receiving / Inspection';
  return status === 'Filed' ? 'Records Custodian' : 'Requester / Assigned Custodian';
}

function isPurchaseOrderApprovalStatus(status: RequestStatus) {
  return ['For Department Approval', 'For Finance Approval', 'For COO Approval', 'For President Approval'].includes(status);
}

function purchaseOrderStageIndex(status: RequestStatus) {
  if (status === 'PO Draft') return 0;
  if (status === 'For Department Approval') return 1;
  if (['For Finance Approval', 'For COO Approval', 'For President Approval'].includes(status)) return 2;
  if (status === 'PO Approved') return 3;
  if (status === 'PO Awaiting Acknowledgement') return 4;
  if (['PO Acknowledged', 'Partially Received'].includes(status)) return 5;
  if (status === 'Received') return 6;
  if (['Paid', 'Filed'].includes(status)) return 7;
  return 3;
}

function workflowStageIndex(status: RequestStatus) {
  const stages: Record<RequestStatus, number> = {
    'Draft': 0, 'Submitted': 1, 'Petty Cash': 8, 'For DT Approval': 6, 'For Requester Selection': 7, 'Ready for PO Creation': 8, 'Quotations Received': 5, 'For Department Approval': 8, 'For Finance Approval': 8, 'For COO Approval': 8, 'For President Approval': 8, 'For Procurement Review': 2,
    'RFQ Draft': 3, 'RFQ Sent': 4, 'PO Draft': 8, 'PO Approved': 8, 'PO Awaiting Acknowledgement': 8, 'PO Acknowledged': 8,
    'Partially Received': 8, 'Received': 8, 'Paid': 8, 'Filed': 8,
  };
  return stages[status];
}

function formatMovementTime(value?: string) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(date);
}
