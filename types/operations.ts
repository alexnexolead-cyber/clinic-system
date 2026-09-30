export const ledgerEntryTypes = ["charge", "payment"] as const;
export type LedgerEntryType = (typeof ledgerEntryTypes)[number];

export const paymentStatuses = ["Paid", "Partially Paid", "Payment Pending"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export function getPaymentStatus(totalCharges: number, totalPaid: number): PaymentStatus {
  if (totalPaid === 0) {
    return "Payment Pending";
  }
  if (totalPaid >= totalCharges) {
    return "Paid";
  }
  return "Partially Paid";
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