// Internal contract, not an APS wire format. Only a trusted backend adapter may
// call this after authenticating an APS admin's closure and full settlement.
export type VerifiedApsSettlement = {
  eventId: string;
  paymentReference: string;
  poNumber: string;
  amount: number;
  currency: 'PHP';
  paidAt: string;
  status: 'paid';
  closedBy: string;
  closedAt: string;
};

type PayableOrder = {
  status: string;
  apsPayment?: VerifiedApsSettlement;
  history?: Array<{ action: string; actor: string; detail: string; createdAt: string }>;
};

export function applyVerifiedApsSettlement<T extends PayableOrder>(order: T, poNumber: string, total: number, settlement: VerifiedApsSettlement) {
  if (order.apsPayment?.eventId === settlement.eventId) {
    if (JSON.stringify(order.apsPayment) !== JSON.stringify(settlement)) throw new Error('Conflicting APS event');
    return order;
  }
  if (!['Received', 'Paid'].includes(order.status) || order.apsPayment) throw new Error('Order is not awaiting APS closure');
  if (!settlement.closedBy?.trim() || !Number.isFinite(Date.parse(settlement.closedAt))) throw new Error('APS admin closure is required');
  if (!settlement.eventId?.trim() || !settlement.paymentReference?.trim() || settlement.poNumber !== poNumber || settlement.status !== 'paid' || settlement.currency !== 'PHP' || !Number.isFinite(settlement.amount) || !Number.isFinite(total) || total <= 0 || Math.round(settlement.amount * 100) !== Math.round(total * 100) || !Number.isFinite(Date.parse(settlement.paidAt))) throw new Error('APS settlement does not match this order');
  const createdAt = new Date().toISOString();
  return {
    ...order,
    status: 'Filed' as const,
    apsPayment: settlement,
    updatedAt: createdAt,
    history: [...(order.history ?? []),
      { action: 'mark_paid', actor: 'APS', detail: `Payment confirmed by APS: ${settlement.paymentReference}. Paid at ${settlement.paidAt}.`, createdAt },
      { action: 'file', actor: settlement.closedBy, detail: `Closed by the APS admin at ${settlement.closedAt}. Procurement closure synchronized from APS.`, createdAt },
    ],
  };
}
