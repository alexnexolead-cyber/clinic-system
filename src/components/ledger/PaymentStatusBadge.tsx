import type { PaymentStatus } from "@/types/operations";

const statusClasses: Record<string, string> = {
  Paid: "bg-emerald-50 text-emerald-800",
  "Partially Paid": "bg-amber-50 text-amber-800",
  "Payment Due / Outstanding": "bg-rose-50 text-rose-800",
  "Payment Pending": "bg-rose-50 text-rose-800",
};

export default function PaymentStatusBadge({
  status,
}: {
  status: PaymentStatus;
}) {
  const badgeClass = statusClasses[status] ?? "bg-slate-100 text-slate-800";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
      {status}
    </span>
  );
}