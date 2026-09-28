"use client";

import { appointmentStatuses, type AppointmentStatus } from "@/types/appointment";

type AppointmentFiltersProps = {
  search: string;
  status: AppointmentStatus | "all";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AppointmentStatus | "all") => void;
};

export default function AppointmentFilters({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: AppointmentFiltersProps) {
  return (
    <div className="grid gap-4 border-b border-slate-200 p-5 sm:grid-cols-[1fr_12rem]">
      <label className="text-sm font-medium text-slate-700">
        Search patients
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search name, patient ID, or phone"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
      </label>

      <label className="text-sm font-medium text-slate-700">
        Filter by status
        <select
          value={status}
          onChange={(event) =>
            onStatusChange(event.target.value as AppointmentStatus | "all")
          }
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal capitalize text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="all">All statuses</option>
          {appointmentStatuses.map((appointmentStatus) => (
            <option key={appointmentStatus} value={appointmentStatus}>
              {appointmentStatus}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
