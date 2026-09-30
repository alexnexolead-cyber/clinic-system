export const ledgerEntryTypes = ["charge", "payment"] as const;
export type LedgerEntryType = (typeof ledgerEntryTypes)[number];

export const paymentStatuses = ["Paid", "Partially Paid", "Payment Due / Outstanding"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export function getPaymentStatus(totalCharges: number, totalPaid: number): PaymentStatus {
  const charges = Number.isFinite(totalCharges) ? totalCharges : 0;
  const paid = Number.isFinite(totalPaid) ? totalPaid : 0;

  if (charges <= 0 && paid >= 0) {
    return "Paid";
  }
  if (paid >= charges) {
    return "Paid";
  }
  if (paid > 0) {
    return "Partially Paid";
  }
  return "Payment Due / Outstanding";
}

export type LedgerEntry = {
  id: string;
  patient_id: string;
  visit_id: string | null;
  appointment_id: string | number | null;
  entry_type: LedgerEntryType;
  amount: number;
  description: string;
  created_at: string;
  updated_at: string;
};