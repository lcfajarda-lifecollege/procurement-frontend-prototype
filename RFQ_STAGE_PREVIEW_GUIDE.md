# RFQ And Sourcing Stage Preview Guide

## Purpose

The **All RFQs** page includes read-only examples showing how `PR-2026-1001` appears throughout the sourcing lifecycle. These examples let the Procurement Officer inspect later screens without changing the live Purchase Request.

Live prototype: <https://lcfajarda-lifecollege.github.io/procurement-frontend-prototype/>

## How To View The Previews

1. Open the procurement prototype.
2. In **View As**, select **Procurement Officer**.
3. Open **RFQ & Sourcing** from the sidebar.
4. If the Procurement Review screen is open, select **Back to all RFQs & Sourcing**.
5. Review the rows associated with source `PR-2026-1001`.
6. Select any row marked **Stage preview · Read only** to inspect that stage.

The previews are intentionally hidden when **View As** is set to **Super Admin** or another role. They appear only in the Procurement Officer view.

## Available Stages

- `For Procurement Review`
- `RFQ Draft`
- `RFQ Sent`
- `Quotations Received`
- `For DT Approval`
- `For Requester Selection`
- `Ready for PO Creation`

## Live Record Versus Preview

The unmarked `PR-2026-1001` row is the live record. Actions completed on that row advance the actual prototype workflow and update its activity history, notifications, and assigned role.

Rows marked **Stage preview · Read only** are demonstrations. They:

- Use `PR-2026-1001` as the source record.
- Show the information and layout expected at a specific stage.
- Do not change the live Purchase Request.
- Do not create approvals, notifications, vendor awards, or Purchase Orders.
- Do not save edits made inside a preview.

## Troubleshooting

If the preview rows are not visible:

1. Confirm that **View As** is set to **Procurement Officer**, not **Super Admin**.
2. Confirm that you are on the **All RFQs** list rather than inside Procurement Review.
3. Refresh the page once to load the latest GitHub Pages deployment.
4. Search for `PR-2026-1001` if a list filter or search term is active.
