import type { Patient } from "@/types/patient";
import Link from "next/link";

type PatientTableProps = {
  patients: Patient[];
};

function formatCreatedDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export default function PatientTable({ patients }: PatientTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3 font-semibold">Patient Code</th>
            <th className="px-5 py-3 font-semibold">Patient Name</th>
            <th className="px-5 py-3 font-semibold">Phone</th>
            <th className="px-5 py-3 font-semibold">City</th>
            <th className="px-5 py-3 font-semibold">Created date</th>
            <th className="px-5 py-3 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {patients.map((patient) => (
            <tr key={patient.id} className="text-slate-700">
              <td className="whitespace-nowrap px-5 py-4 font-semibold text-cyan-700">
                {patient.patient_code ?? "-"}
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-950">
                {[patient.first_name, patient.last_name]
                  .filter(Boolean)
                  .join(" ") || "-"}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                {patient.phone ?? "-"}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                {patient.city ?? "-"}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                {formatCreatedDate(patient.created_at)}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                <Link
                  href={`/doctor/patients/${patient.id}`}
                  className="font-semibold text-cyan-700 transition hover:text-cyan-900"
                >
                  View Profile
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
