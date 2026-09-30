"use client";

import type { Patient } from "@/types/patient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type PatientSortField = "code" | "name" | "phone" | "city" | "created";

type PatientTableProps = {
  patients: Patient[];
  sortField?: PatientSortField;
  sortDirection?: "asc" | "desc";
  onSort?: (field: PatientSortField) => void;
};

function formatCreatedDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export default function PatientTable({
  patients,
  sortField = "created",
  sortDirection = "desc",
  onSort,
}: PatientTableProps) {
  const router = useRouter();

  function renderSortIndicator(field: PatientSortField) {
    if (sortField !== field) return null;
    return <span className="ml-1 text-xs">{sortDirection === "asc" ? "▲" : "▼"}</span>;
  }

  return (
    <>
      <div className="divide-y divide-slate-200 xl:hidden">
        {patients.map((patient) => {
          const patientName = [patient.first_name, patient.last_name]
            .filter(Boolean)
            .join(" ") || "Unnamed patient";

          return (
            <article
              key={patient.id}
              onClick={() => router.push(`/doctor/patients/${patient.id}`)}
              className="group cursor-pointer space-y-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <Link
                    href={`/doctor/patients/${patient.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-slate-950 group-hover:text-cyan-800"
                  >
                    {patientName}
                  </Link>
                  <p className="mt-1 text-sm font-medium text-cyan-700">
                    {patient.patient_code ?? "No patient code"}
                  </p>
                </div>
                <span className="text-sm font-semibold text-cyan-700 group-hover:text-cyan-900">
                  View profile &rarr;
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Phone</dt>
                  <dd className="mt-0.5 break-words text-slate-700">{patient.phone ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">City</dt>
                  <dd className="mt-0.5 text-slate-700">{patient.city ?? "-"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Created</dt>
                  <dd className="mt-0.5 text-slate-700">{formatCreatedDate(patient.created_at)}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <div className="hidden max-h-[65vh] overflow-auto xl:block">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">
                <button
                  type="button"
                  onClick={() => onSort?.("code")}
                  className="inline-flex items-center font-semibold uppercase hover:text-cyan-800"
                >
                  Patient Code
                  {renderSortIndicator("code")}
                </button>
              </th>
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
              <th className="px-5 py-3 font-semibold">
                <button
                  type="button"
                  onClick={() => onSort?.("phone")}
                  className="inline-flex items-center font-semibold uppercase hover:text-cyan-800"
                >
                  Phone
                  {renderSortIndicator("phone")}
                </button>
              </th>
              <th className="px-5 py-3 font-semibold">
                <button
                  type="button"
                  onClick={() => onSort?.("city")}
                  className="inline-flex items-center font-semibold uppercase hover:text-cyan-800"
                >
                  City
                  {renderSortIndicator("city")}
                </button>
              </th>
              <th className="px-5 py-3 font-semibold">
                <button
                  type="button"
                  onClick={() => onSort?.("created")}
                  className="inline-flex items-center font-semibold uppercase hover:text-cyan-800"
                >
                  Created date
                  {renderSortIndicator("created")}
                </button>
              </th>
              <th className="px-5 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {patients.map((patient) => (
              <tr
                key={patient.id}
                onClick={() => router.push(`/doctor/patients/${patient.id}`)}
                className="cursor-pointer text-slate-700 transition-colors hover:bg-cyan-50/30"
              >
                <td className="whitespace-nowrap px-5 py-4 font-semibold text-cyan-700">
                  <Link
                    href={`/doctor/patients/${patient.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-cyan-900"
                  >
                    {patient.patient_code ?? "-"}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-950">
                  <Link
                    href={`/doctor/patients/${patient.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-cyan-800"
                  >
                    {[patient.first_name, patient.last_name]
                      .filter(Boolean)
                      .join(" ") || "-"}
                  </Link>
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
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-cyan-700 transition hover:text-cyan-900"
                  >
                    View Profile &rarr;
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
