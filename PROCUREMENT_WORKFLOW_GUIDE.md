# Procurement Prototype Validation Guide

## Purpose

This prototype uses one dummy Purchase Request so the complete procurement lifecycle can be reviewed without a crowded list of sample records.

- Live prototype: <https://lcfajarda-lifecollege.github.io/procurement-frontend-prototype/>
- Sample record: `PR-2026-1001 - Smart Classroom Equipment Renewal`
- Starting stage: `For Procurement Review`
- Requester: `Angela Mendoza`
- Category: `Technology`

All people, vendors, products, prices, dates, notes, and documents in the prototype are dummy data for workflow validation only.

## How To Review

Use the **View As** menu to change roles. The same PR advances after every completed action, so switch to the role responsible for the next stage instead of looking for another sample record.

### 1. Procurement Review

1. Select **Procurement Officer** from **View As**.
2. Open **RFQ & Sourcing**.
3. Open `PR-2026-1001`.
4. Review the requested products and specifications.
5. Select **Complete review and begin sourcing**.

Expected status: `RFQ Draft`

### 2. Vendor Shortlist And RFQ

1. Add at least two qualified vendors to the Technology sourcing lot.
2. Select **Send all category RFQs**.
3. Set each vendor response status to **Responded**.
4. Select **Close all RFQs**.
5. Enter the Procurement Validation Notes.
6. Select **Submit quotations for review**.

Expected status: `For DT Approval`

### 3. Technology Review

1. Select **DT Department** from **View As**.
2. Open **Approvals**.
3. Select **Open quotation comparison**.
4. Review every quoted technology item for each vendor.
5. Mark each item as approved or not approved.
6. Enter the DT review notes.
7. Select **Complete DT review**.

Expected status: `For Requester Selection`

### 4. Requester Quotation Selection

1. Select **Requester** from **View As**.
2. Open **Purchase Requests**.
3. Open `PR-2026-1001` and select **Compare quotations**.
4. Review vendor totals, terms, delivery, warranty, item prices, Procurement notes, and DT notes.
5. Select one vendor quotation.
6. Select **Confirm selected vendor**.

Expected status: `Ready for PO Creation`

### 5. Purchase Order Creation

1. Select **Procurement Officer** from **View As**.
2. Open **RFQ & Sourcing** and open the PR.
3. Select **Create 1 PO**.
4. Open **Purchase Orders**.
5. Review the PO and its final selected quotation total.
6. Select **Submit for Department Approval**.

Expected status: `For Department Approval`

### 6. Purchase Order Approvals

1. Select **Department Head**, open **Approvals**, and approve the PO.
2. Select the executive role shown as the next approver and open **Approvals**.
3. Approve the PO.

For this sample value, the executive approver is **COO**.

Expected status: `PO Approved`

### 7. Vendor Acknowledgement And Receiving

1. Return to **Procurement Officer** and open **Purchase Orders**.
2. Select **Email approved PO to vendor**.
3. Select **Record acknowledgement**.
4. Open **Receiving** and select **Record receipt**.

Expected status: `Received`

### 8. Payment And Filing

1. Select **Finance Manager** and open **Receiving**.
2. Select **Mark paid**.
3. Select **Procurement Officer**, return to **Receiving**, and select **File and close**.

Expected final status: `Filed`, or Stage 8 of 8 in the Purchase Order lifecycle.

## What To Validate

- Each role sees only its relevant actions and approvals.
- Notifications appear for roles when their action is required.
- Product descriptions/specifications and UOM remain visible through PR, RFQ, quotation comparison, and PO views.
- Procurement and DT notes appear in the requester quotation-selection page.
- The requester selects the final vendor quotation before PO creation.
- PO totals come from the selected quotation, not the original PR estimate.
- Activity history adds an entry for every completed lifecycle stage.
- The PO cannot skip Department Head and required executive approval.

Let me know if you have concerns about the workflow, responsibilities, approvals, or information shown.

## Local Development

```powershell
npm install
npm run dev
```

Open <http://127.0.0.1:3001/>.

```powershell
npm run build
npm run test:e2e
```

The prototype stores progress in browser local storage. To restart from the seeded PR, clear the site's local storage and reload the page.
