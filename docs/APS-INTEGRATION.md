# APS Payment Integration: Pending Connection

Manual payment tagging and manual closure have been removed from Delivery & Acceptance.
The PO lifecycle goes directly from Delivery & Receiving to Closed.
Received orders stay open until the APS admin closes them in APS. Payment alone is not
closure authorization. Existing historical paid/filed records are unchanged.

`src/apsPayment.ts` contains a tested, transport-independent settlement transition.
It records payment and automatic closure together, rejects mismatched orders or amounts,
and ignores identical event retries. It is **not connected to APS** and is not exposed as
a browser event, editable payment form, or unauthenticated callback.

## Required Before Activation

- APS API or webhook specification and test environment.
- Server-side authentication, signature verification, and replay protection.
- Mapping between procurement PO numbers and APS transactions.
- Definition of full settlement, partial payments, withholding, currency, cancellations, and reversals.
- A backend database with atomic payment/history persistence and a unique APS event constraint.

After a trusted backend validates full payment and the APS admin's closure, map them to the internal
`VerifiedApsSettlement` contract and call `applyVerifiedApsSettlement`. Persist the result
atomically, then refresh the procurement client. The PO becomes `Filed` (the stored status for Closed),
and its activity history contains both payment confirmation and the APS admin's closure.
The payload must include the verified closing administrator and closure timestamp.
No endpoint or APS payload schema has been invented for the live system.

## Current Local Storage Limitations

Business documents and invoices are stored as file blobs in this browser's IndexedDB.
Their metadata is stored with the vendor or purchase record. Downloads work after reload
in the same browser/origin. These files are not sent to a server or shared with another device.
Production requires authenticated document storage, upload validation/scanning, and access controls.
DT approval in the PO is a recorded reviewer name and date, not a cryptographic or handwritten signature.
