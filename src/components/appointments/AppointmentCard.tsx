import Link from "next/link";
import PaymentStatusBadge from "@/src/components/ledger/PaymentStatusBadge";
import type { PaymentStatus } from "@/types/operations";
import type {
  AppointmentDetailRecord,
  AppointmentStatus,
} from "@/types/appointment";
import type { Patient } from "@/types/patient";

type AppointmentCardProps = {
  appointment: AppointmentDetailRecord;
  patient: Patient | null;
  isUpdating: boolean;
  onStatusChange: (status: AppointmentStatus) => void;
  isStartingVisit: boolean;
  onStartVisit: () => void;
  isViewingVisit: boolean;
  onViewVisit: () => void;
  paymentSummary: {
    totalCharges: number;
    totalPaid: number;
    remainingBalance: number;
    status: PaymentStatus;
  } | null;
  isLoadingPayment: boolean;
  paymentError: string;
};

function statusClasses(status: AppointmentDetailRecord["status"]) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    case "completed":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(`${date}T00:00:00`));
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default function AppointmentCard({
  appointment,
  patient,
  isUpdating,
  onStatusChange,
  isStartingVisit,
  onStartVisit,
  isViewingVisit,
  onViewVisit,
  paymentSummary,
  isLoadingPayment,
  paymentError,
}: AppointmentCardProps) {
  return (
    <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 lg:gap-8">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Patient Information
        </p>
        {patient ? (
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Patient code</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                <Link href={`/doctor/patients/${patient.id}`} className="hover:text-cyan-800">
                  {patient.patient_code}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">First name</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                <Link href={`/doctor/patients/${patient.id}`} className="hover:text-cyan-800">
                  {patient.first_name} {patient.last_name}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {patient.phone}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">City</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {patient.city}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800" role="alert">
            Patient information is unavailable because this appointment has no patient relation.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Appointment Information
        </p>
        <dl className="mt-5 space-y-4 text-sm">
          <div>
            <dt className="text-slate-500">Appointment ID</dt>
            <dd className="mt-1 break-all font-semibold text-slate-950">
              {appointment.id}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Type</dt>
            <dd className="mt-1 font-semibold text-slate-950">{appointment.appointment_type}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Preferred date</dt>
            <dd className="mt-1 font-semibold text-slate-950">{formatDate(appointment.preferred_date)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="mt-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses(appointment.status)}`}>
                {appointment.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Created date</dt>
            <dd className="mt-1 font-semibold text-slate-950">
              {formatDateTime(appointment.created_at)}
            </dd>
          </div>
        </dl>

        {(appointment.status === "pending" || appointment.status === "confirmed") && (
          <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
            {appointment.status === "pending" && (
              <button
                type="button"
                onClick={() => onStatusChange("confirmed")}
                disabled={isUpdating}
                className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirm appointment
              </button>
            )}
            {appointment.status === "confirmed" && (
              <>
                <button
                  type="button"
                  onClick={onStartVisit}
                  disabled={isStartingVisit || !appointment.patient_id}
                  className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isStartingVisit ? "Opening visit..." : "Start Visit"}
                </button>
                <button
                  type="button"
                  onClick={() => onStatusChange("completed")}
                  disabled={isUpdating}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Mark completed
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onStatusChange("cancelled")}
              disabled={isUpdating}
              className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel appointment
            </button>
          </div>
        )}
        {appointment.status === "completed" && (
          <div className="mt-8 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onViewVisit}
              disabled={isViewingVisit}
              className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isViewingVisit ? "Opening visit..." : "View Visit"}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
            Payment Summary
          </h2>
          {paymentSummary && <PaymentStatusBadge status={paymentSummary.status} />}
        </div>
        {isLoadingPayment && <p className="mt-4 text-sm text-slate-500">Loading payment summary...</p>}
        {!isLoadingPayment && paymentError && (
          <p className="mt-4 text-sm text-amber-800" role="status">Payment summary is unavailable: {paymentError}</p>
        )}
        {!isLoadingPayment && !paymentError && paymentSummary && (
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">Total Charges</dt>
              <dd className="mt-1 font-semibold text-slate-950">{paymentSummary.totalCharges.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Total Paid</dt>
              <dd className="mt-1 font-semibold text-slate-950">{paymentSummary.totalPaid.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Remaining Balance</dt>
              <dd className="mt-1 font-semibold text-slate-950">{paymentSummary.remainingBalance.toFixed(2)}</dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}
