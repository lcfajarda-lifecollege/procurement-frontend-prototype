# Procurement Module Role User Guide

## Purpose

This guide explains how each role uses the Life College Procurement Module prototype and how records move between roles throughout the Purchase Request (PR), Request for Quotation (RFQ), and Purchase Order (PO) lifecycles.

- Live prototype: <https://lcfajarda-lifecollege.github.io/procurement-frontend-prototype/>
- The prototype contains dummy data only.
- Sample records are intentionally placed at different lifecycle stages for workflow validation.
- Progress is stored in the current browser's local storage.

## Getting Started

1. Open the live prototype.
2. Use the **View As** menu at the top of the page to select a role.
3. Use the left navigation to open the modules available to that role.
4. Open **Notifications** or the notification bell to check records that require action.
5. Review the record's **Lifecycle stage** and **Activity history** before performing an action.

The **View As** menu is a prototype feature. It lets reviewers inspect what different users can see without signing in to separate accounts.

## Roles At A Glance

| Role | Primary responsibility | Main modules |
| --- | --- | --- |
| Requester | Create PRs, monitor progress, and select vendor quotations | Dashboard, Purchase Requests, Products |
| Procurement Officer | Validate PRs, source vendors, manage RFQs, create and issue POs, and close records | Dashboard, Requests, RFQ & Sourcing, Purchase Orders, Receiving, Vendors, Products, Reports |
| DT Department | Review the technical suitability of technology quotations | Dashboard, Approvals, Purchase Requests, Products |
| Department Head | Approve POs for the requesting department | Dashboard, Approvals, Purchase Requests, Reports |
| Finance Manager | Approve finance-routed POs, verify payment requirements, and record payment | Dashboard, Approvals, Purchase Orders, Receiving, Reports |
| COO | Approve POs routed to the COO by amount | Dashboard, Approvals, Purchase Orders, Reports |
| President | Approve high-value POs | Dashboard, Approvals, Purchase Orders, Reports |
| Procurement Admin | Monitor and administer organization-wide procurement records | Dashboard, Requests, Approvals, Sourcing, POs, Receiving, Vendors, Products, Reports |
| Super Admin | Access all modules, records, reports, and user assignments | All modules |
| Vendor | Complete vendor information and submit quotations through secure magic links | External vendor forms only |

## 1. Requester

### Responsibilities

- Create and submit a Purchase Request.
- Provide complete product names, descriptions or specifications, categories, UOMs, quantities, and estimated unit costs.
- Respond when Procurement returns a request for clarification.
- Monitor PR progress and activity history.
- Compare qualified quotations and select one vendor for each sourcing lot.

### Create A Purchase Request

1. Select **Requester** from **View As**.
2. Open **Purchase Requests**.
3. Select **New Purchase Request**.
4. Enter the request title, required date, and requested products.
5. For each product, complete:
   - Product name
   - Description / Specifications
   - Category
   - Unit of Measure (UOM)
   - Quantity
   - Estimated unit cost
6. Add more products when needed.
7. Submit the request.

The estimated cost supports planning at PR stage. It is not the final PO total.

### Select Vendor Quotations

1. Open a PR marked **For Requester Selection** or **Choose vendor**.
2. Select **Compare quotations**.
3. Review each vendor's itemized prices, specifications, commercial terms, delivery lead time, warranty, attachments, and notes.
4. Review Procurement validation notes and DT notes when the request contains Technology products.
5. Select one vendor quotation for each sourcing lot.
6. Select the chosen quotation again to unselect it when a correction is needed.
7. Select **Confirm vendor awards** after every lot has one selected vendor.

Result: the PR moves to **Ready for PO Creation** and returns to Procurement.

## 2. Procurement Officer

### Responsibilities

- Validate submitted PRs.
- Return incomplete requests to the requester with notes.
- Separate products into sourcing lots by category.
- Select qualified vendors for each lot.
- Send RFQ invitation emails with secure quotation-form links.
- Record and validate vendor quotations.
- Route Technology quotations to DT and non-Technology quotations to the requester.
- Create one PO for each awarded lot.
- Issue approved POs to vendors and record acknowledgements.
- Monitor receiving and close completed records.

### Review A Submitted PR

1. Select **Procurement Officer** from **View As**.
2. Open **RFQ & Sourcing**.
3. Open a record marked **For Procurement Review**.
4. Review the product descriptions, specifications, quantities, UOMs, categories, and required date.
5. Enter **Procurement review notes** when clarification or sourcing instructions are needed.
6. Select **Return for clarification** to send the note back to the requester, or select **Complete review and begin sourcing**.

Result: an accepted request moves to **RFQ Draft**.

### Build The Vendor Shortlist

1. Open the RFQ Draft.
2. Select a sourcing lot. Each product category is managed separately.
3. Use the vendor dropdown to add a qualified vendor, or add a new vendor record.
4. Add at least two qualified vendors to every lot.
5. Remove a vendor when the vendor should no longer receive the RFQ.
6. Preview the vendor form for each lot when needed.
7. Select **Send all category RFQs**.

The shortlist starts empty for a new RFQ. Vendors are not automatically included.

### Send And Validate Quotations

1. Preview the RFQ email before sending it.
2. Open the secure form link in a new tab to validate the vendor experience.
3. Track vendor responses for every sourcing lot.
4. Mark or verify each response as **Responded** when the quotation is complete.
5. Select **Close all RFQs** after every lot has enough responses.
6. Review the itemized price breakdown and commercial terms.
7. Enter **Procurement Validation Notes** for the requester and DT reviewers.
8. Select **Submit quotations for review**.

Routing after validation:

- Technology items move to **For DT Approval**.
- Non-Technology items skip DT and move directly to **For Requester Selection**.

### Create And Manage Purchase Orders

1. Open a request marked **Ready for PO Creation** in **RFQ & Sourcing**.
2. Confirm that every sourcing lot has a requester-selected vendor.
3. Select **Create PO** or **Create POs**.
4. Open **Purchase Orders** and review each PO.
5. Confirm that the PO total comes from the selected quotation, not the PR estimate.
6. Select **Submit for Department Approval**.
7. After all approvals, select **Email approved PO to vendor**.
8. Record the vendor acknowledgement and expected delivery information.
9. Monitor **Receiving** until the order is received and paid.
10. Select **File and close** after completion.

For multi-lot requests, the module creates one PO per awarded sourcing lot.

### Review PR-2026-1001 Stage Previews

1. Select **Procurement Officer** from **View As**.
2. Open **RFQ & Sourcing**.
3. Select **Back to all RFQs & Sourcing** when a record is already open.
4. Open rows marked **Stage preview - Read only**.

These records show `PR-2026-1001` at each sourcing stage without changing the live workflow. They are intentionally visible only in the Procurement Officer view.

## 3. DT Department

### Responsibilities

- Review Technology products only.
- Evaluate technical compatibility and suitability for every vendor offer.
- Record technical decisions and notes.
- Return quotations for clarification when required.
- Endorse technically suitable quotations for requester selection.

### Complete A Technical Review

1. Select **DT Department** from **View As**.
2. Open **Approvals**.
3. Open a request marked **For DT Approval**.
4. Select **Open quotation comparison**.
5. Review each vendor's quoted product, specifications, unit price, and commercial context.
6. Set a technical decision for every Technology offer:
   - Technically suitable
   - Needs clarification
   - Not technically suitable
7. Enter **DT review notes** with compatibility concerns or recommendations.
8. Select **Complete DT review** after all Technology items have at least one suitable offer.

DT evaluates technical suitability. The requester makes the final vendor selection.

Result: the PR moves to **For Requester Selection** and the DT notes appear on the requester's quotation-comparison page.

## 4. Department Head

### Responsibilities

- Review POs belonging to the department.
- Confirm the department need, specifications, quantities, priority, selected vendor, and final PO total.
- Confirm that DT review was completed when Technology products are included.
- Approve the PO before executive or Finance approval.

### Approve A Purchase Order

1. Select **Department Head** from **View As**.
2. Open **Notifications** or **Approvals**.
3. Open the PO marked **For Department Approval**.
4. Review the final quotation total and supporting details.
5. Complete the review checks.
6. Approve the PO.

Result: the PO is routed to Finance Manager, COO, or President according to the final selected quotation total.

## 5. Finance Manager

### Responsibilities

- Approve POs routed to Finance.
- Confirm budget allocation and approval authority.
- Review PO, receipt, and invoice information.
- Record payment after delivery and acceptance.

### Approve And Pay

1. Select **Finance Manager** from **View As**.
2. Open **Notifications** or **Approvals**.
3. Review POs marked **For Finance Approval** and approve them.
4. After an order is received, open **Receiving**.
5. Verify the PO, receiving record, and invoice.
6. Select **Mark paid**.

Result: an approved PO moves to **PO Approved**; a paid PO moves to **Paid** and returns to Procurement for filing.

## 6. COO

### Responsibilities

- Review POs routed to COO approval by the final selected quotation total.
- Confirm approval authority, department approval, and supporting documents.

### Approve A Purchase Order

1. Select **COO** from **View As**.
2. Open **Notifications** or **Approvals**.
3. Open a PO marked **For COO Approval**.
4. Review the selected vendor, final total, products, and approval history.
5. Approve the PO.

Result: the PO moves to **PO Approved** and Procurement can issue it to the vendor.

## 7. President

### Responsibilities

- Review high-value POs routed to President approval.
- Confirm executive authority, department approval, and supporting documents.

### Approve A Purchase Order

1. Select **President** from **View As**.
2. Open **Notifications** or **Approvals**.
3. Open a PO marked **For President Approval**.
4. Review the selected vendor, final total, products, and approval history.
5. Approve the PO.

Result: the PO moves to **PO Approved** and Procurement can issue it to the vendor.

## 8. Procurement Admin

### Responsibilities

- Monitor organization-wide procurement work.
- Review requests, approvals, sourcing records, POs, receiving, vendors, products, and reports.
- Support Procurement Officer workflows and maintain shared procurement data.
- Avoid requester-only submission actions.

### Common Review Process

1. Select **Procurement Admin** from **View As**.
2. Use **Dashboard** to review workload and items needing attention.
3. Use **Requests**, **Approvals**, **RFQ & Sourcing**, **Purchase Orders**, and **Receiving** to inspect workflow status.
4. Use **Vendors** and **Products** to review shared master data.
5. Use **Reports** to filter procurement activity by department, category, status, or period.

## 9. Super Admin

### Responsibilities

- Access all procurement modules and records.
- Review organization-wide activity, reports, directories, and assignments.
- Maintain users and role assignments in **User Administration**.
- Use **View As** to validate the interface and responsibilities of other roles.

### Validate Role Access

1. Select **Super Admin** from **View As**.
2. Open **User Administration** to inspect users and assignments.
3. Change **View As** to each operational role.
4. Confirm that each role sees only the appropriate modules, records, and actions.

The read-only RFQ lifecycle stage previews are hidden in Super Admin view. Select **Procurement Officer** to inspect them.

## 10. Vendor Magic-Link User

The vendor does not sign in to the internal procurement module. Procurement sends a secure link by email.

### Submit A Quotation

1. Open the RFQ email.
2. Select the secure quotation link. The form opens in a new browser tab.
3. Enter a unit price for every requested item.
4. Expand product specifications when needed.
5. Enter the quotation reference, validity date, delivery lead time, payment terms, and warranty.
6. Upload the signed quotation and add optional notes.
7. Review the quotation total and commercial terms.
8. Confirm that the quotation is complete and accurate.
9. Select **Submit quotation**.

### Complete Vendor Information

1. Open the vendor-information invitation email.
2. Select the secure form link in a new browser tab.
3. Complete company, contact, address, TIN, banking, and compliance information.
4. Review the entered information and submit the form.

## Approval Routing

The PO uses the final selected quotation total for approval routing:

| Final PO total | Approver after Department Head |
| --- | --- |
| Up to PHP 100,000 | Finance Manager |
| PHP 100,001 to PHP 999,999 | COO |
| PHP 1,000,000 and above | President |

The Department Head approval always occurs before the amount-based approver.

## Purchase Request Lifecycle

1. Draft
2. Submitted
3. Procurement Review
4. Vendor Sourcing
5. RFQ Sent
6. Quotations Received
7. DT Review, when Technology products are included
8. Requester Selection
9. PO Creation

For non-Technology requests, DT Review is recorded as skipped before Requester Selection.

## Purchase Order Lifecycle

1. PO Draft
2. Department Head Approval
3. Executive or Finance Approval
4. Approved and Issued
5. Vendor Acknowledgement
6. Delivery and Receiving
7. Invoice and Payment
8. Closed and Filed

Each completed transition should add an entry to the record's activity history.

## Prototype Validation Records

### PR-2026-1001 - Smart Classroom Equipment Renewal

- Technology request
- Starts at **For Procurement Review**
- Can be advanced through the complete PR and PO lifecycles
- Includes Procurement Officer-only read-only previews of every RFQ and sourcing stage

### PR-2026-1002 - Academic Office Furniture and Supplies

- Non-Technology request
- Contains two sourcing lots: Furniture and Operational supplies
- Starts at **For Requester Selection**
- Demonstrates selecting one vendor per lot and creating two POs
- DT review is skipped

## Important Prototype Notes

- All names, vendors, products, prices, dates, email addresses, documents, and workflow events are dummy data.
- Refreshing the page keeps workflow changes because the prototype uses browser local storage.
- Clear the site's local storage to restore the seeded records.
- The prototype simulates emails and magic links; it does not send production email.
- Approval thresholds and responsibilities should be confirmed against the official Life College procurement policy before production implementation.

Let me know if you have concerns.

## Related Guides

- [Procurement Prototype Validation Guide](./PROCUREMENT_WORKFLOW_GUIDE.md)
- [RFQ Stage Preview Guide](./RFQ_STAGE_PREVIEW_GUIDE.md)
