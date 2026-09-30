import type { PaymentStatus } from "@/types/operations";

const statusClasses: Record<PaymentStatus, string> = {
  Paid: "bg-emerald-50 text-emerald-800",
  "Partially Paid": "bg-orange-50 text-orange-800",
  "Payment Pending": "bg-red-50 text-red-800",
};

export default function PaymentStatusBadge({
  status,
}: {
  status: PaymentStatus;
}) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}>
      {status}
    </span>
  );
}