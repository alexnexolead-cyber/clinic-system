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
}: AppointmentCardProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Patient Information
        </p>
        {patient ? (
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Patient code</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {patient.patient_code}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">First name</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {patient.first_name}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Last name</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {patient.last_name}
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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

        <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={() => onStatusChange("confirmed")}
            disabled={isUpdating}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirm appointment
          </button>
          <button
            type="button"
            onClick={() => onStatusChange("cancelled")}
            disabled={isUpdating}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel appointment
          </button>
          <button
            type="button"
            onClick={() => onStatusChange("completed")}
            disabled={isUpdating}
            className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark completed
          </button>
        </div>
      </section>
    </div>
  );
}
