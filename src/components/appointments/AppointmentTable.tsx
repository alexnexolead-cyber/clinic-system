import Link from "next/link";
import type { Appointment } from "@/types/appointment";

type AppointmentTableProps = {
  appointments: Appointment[];
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

export default function AppointmentTable({ appointments }: AppointmentTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3 font-semibold">Patient Code</th>
            <th className="px-5 py-3 font-semibold">Patient Name</th>
            <th className="px-5 py-3 font-semibold">Phone</th>
            <th className="px-5 py-3 font-semibold">City</th>
            <th className="px-5 py-3 font-semibold">Appointment Type</th>
            <th className="px-5 py-3 font-semibold">Preferred Date</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {appointments.map((appointment) => {
            const patient = Array.isArray(appointment.patient)
              ? appointment.patient[0] ?? null
              : appointment.patient;

            return (
              <tr key={appointment.id} className="text-slate-700">
              <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-600">
                {patient?.patient_code ?? "-"}
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-950">
                {patient?.first_name ?? appointment.first_name}{" "}
                {patient?.last_name ?? appointment.last_name}
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
                <Link
                  href={`/doctor/appointments/${appointment.id}`}
                  className="font-semibold text-cyan-700 transition hover:text-cyan-900"
                >
                  View details
                </Link>
              </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
