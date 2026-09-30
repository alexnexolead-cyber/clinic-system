"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Appointment } from "@/types/appointment";
import type { AppointmentStatus } from "@/types/appointment";
import type { AppointmentSort } from "./AppointmentFilters";

type AppointmentTableProps = {
  appointments: Appointment[];
  busyAppointmentId: string | null;
  sortField?: AppointmentSort;
  sortDirection?: "asc" | "desc";
  onSort?: (field: AppointmentSort) => void;
  onStatusChange: (appointmentId: Appointment["id"], status: AppointmentStatus) => void;
  onStartVisit: (appointment: Appointment) => void;
  onViewVisit: (appointment: Appointment) => void;
};

type AppointmentActionsProps = Omit<AppointmentTableProps, "appointments"> & {
  appointment: Appointment;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(`${date}T00:00:00`));
}

function statusClasses(status: Appointment["status"]) {
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

function AppointmentActions({
  appointment,
  busyAppointmentId,
  onStatusChange,
  onStartVisit,
  onViewVisit,
}: AppointmentActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {appointment.status === "pending" && (
        <>
          <button
            type="button"
            disabled={busyAppointmentId === String(appointment.id)}
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(appointment.id, "confirmed");
            }}
            className="rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            Confirm
          </button>
          <button
            type="button"
            disabled={busyAppointmentId === String(appointment.id)}
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(appointment.id, "cancelled");
            }}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
          >
            Cancel
          </button>
        </>
      )}
      {appointment.status === "confirmed" && (
        <>
          <button
            type="button"
            disabled={busyAppointmentId === String(appointment.id) || !appointment.patient_id}
            onClick={(e) => {
              e.stopPropagation();
              onStartVisit(appointment);
            }}
            className="rounded-md bg-cyan-700 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            Start Visit
          </button>
          <button
            type="button"
            disabled={busyAppointmentId === String(appointment.id)}
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(appointment.id, "cancelled");
            }}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
          >
            Cancel
          </button>
        </>
      )}
      {appointment.status === "completed" && (
        <button
          type="button"
          disabled={busyAppointmentId === String(appointment.id)}
          onClick={(e) => {
            e.stopPropagation();
            onViewVisit(appointment);
          }}
          className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 disabled:opacity-60"
        >
          View Visit
        </button>
      )}
      <Link
        href={`/doctor/appointments/${appointment.id}`}
        onClick={(e) => e.stopPropagation()}
        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        Details &rarr;
      </Link>
    </div>
  );
}

export default function AppointmentTable({
  appointments,
  busyAppointmentId,
  sortField,
  sortDirection,
  onSort,
  onStatusChange,
  onStartVisit,
  onViewVisit,
}: AppointmentTableProps) {
  const router = useRouter();

  function renderSortIndicator(field: AppointmentSort) {
    if (sortField !== field) return null;
    return <span className="ml-1 text-xs">{sortDirection === "asc" ? "▲" : "▼"}</span>;
  }
  return (
    <>
      <div className="divide-y divide-slate-200 xl:hidden">
        {appointments.map((appointment) => {
          const patient = Array.isArray(appointment.patient)
            ? appointment.patient[0] ?? null
            : appointment.patient;
          const patientName = [
            patient?.first_name ?? appointment.first_name,
            patient?.last_name ?? appointment.last_name,
          ].filter(Boolean).join(" ") || "Patient";

          return (
            <article
              key={appointment.id}
              onClick={() => router.push(`/doctor/appointments/${appointment.id}`)}
              className="group cursor-pointer space-y-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {appointment.patient_id ? (
                    <Link
                      href={`/doctor/patients/${appointment.patient_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-slate-950 group-hover:text-cyan-800"
                    >
                      {patientName}
                    </Link>
                  ) : <p className="font-semibold text-slate-950">{patientName}</p>}
                  <p className="mt-1 text-sm text-cyan-700">{patient?.patient_code ?? "No patient code"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Phone</dt>
                  <dd className="mt-0.5 break-words text-slate-700">{patient?.phone ?? appointment.phone}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Date</dt>
                  <dd className="mt-0.5 text-slate-700">{formatDate(appointment.preferred_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Type</dt>
                  <dd className="mt-0.5 text-slate-700">{appointment.appointment_type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">City</dt>
                  <dd className="mt-0.5 text-slate-700">{patient?.city ?? appointment.city}</dd>
                </div>
              </dl>
              <AppointmentActions
                appointment={appointment}
                busyAppointmentId={busyAppointmentId}
                onStatusChange={onStatusChange}
                onStartVisit={onStartVisit}
                onViewVisit={onViewVisit}
              />
            </article>
          );
        })}
      </div>

    <div className="hidden max-h-[65vh] overflow-auto xl:block">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3 font-semibold">Patient Code</th>
            <th className="px-5 py-3 font-semibold">
              <button
                type="button"
                onClick={() => onSort?.("name")}
                className="inline-flex items-center font-semibold uppercase hover:text-cyan-800"
              >
                Patient Name
                {renderSortIndicator("name")}
              </button>
            </th>
            <th className="px-5 py-3 font-semibold">Phone</th>
            <th className="px-5 py-3 font-semibold">City</th>
            <th className="px-5 py-3 font-semibold">
              <button
                type="button"
                onClick={() => onSort?.("type")}
                className="inline-flex items-center font-semibold uppercase hover:text-cyan-800"
              >
                Appointment Type
                {renderSortIndicator("type")}
              </button>
            </th>
            <th className="px-5 py-3 font-semibold">
              <button
                type="button"
                onClick={() => onSort?.("date")}
                className="inline-flex items-center font-semibold uppercase hover:text-cyan-800"
              >
                Date
                {renderSortIndicator("date")}
              </button>
            </th>
            <th className="px-5 py-3 font-semibold">
              <button
                type="button"
                onClick={() => onSort?.("status")}
                className="inline-flex items-center font-semibold uppercase hover:text-cyan-800"
              >
                Status
                {renderSortIndicator("status")}
              </button>
            </th>
            <th className="px-5 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {appointments.map((appointment) => {
            const patient = Array.isArray(appointment.patient)
              ? appointment.patient[0] ?? null
              : appointment.patient;

            return (
              <tr
                key={appointment.id}
                onClick={() => router.push(`/doctor/appointments/${appointment.id}`)}
                className="cursor-pointer text-slate-700 transition-colors hover:bg-cyan-50/30"
              >
              <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-600">
                {appointment.patient_id ? (
                  <Link
                    href={`/doctor/patients/${appointment.patient_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-cyan-900"
                  >
                    {patient?.patient_code ?? "-"}
                  </Link>
                ) : patient?.patient_code ?? "-"}
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-950">
                {appointment.patient_id ? (
                  <Link
                    href={`/doctor/patients/${appointment.patient_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-cyan-800"
                  >
                    {patient?.first_name ?? appointment.first_name} {patient?.last_name ?? appointment.last_name}
                  </Link>
                ) : <>{patient?.first_name ?? appointment.first_name} {patient?.last_name ?? appointment.last_name}</>}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                {patient?.phone ?? appointment.phone}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                {patient?.city ?? appointment.city}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                {appointment.appointment_type}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                {formatDate(appointment.preferred_date)}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses(appointment.status)}`}
                >
                  {appointment.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                <AppointmentActions
                  appointment={appointment}
                  busyAppointmentId={busyAppointmentId}
                  onStatusChange={onStatusChange}
                  onStartVisit={onStartVisit}
                  onViewVisit={onViewVisit}
                />
              </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
