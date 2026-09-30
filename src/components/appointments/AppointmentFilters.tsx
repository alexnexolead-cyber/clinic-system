"use client";

export type AppointmentFilter = "all" | "today" | "upcoming" | "completed" | "cancelled";
export type AppointmentSort = "name" | "date" | "status" | "type";

type AppointmentFiltersProps = {
  search: string;
  filter: AppointmentFilter;
  sort: AppointmentSort;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: AppointmentFilter) => void;
  onSortChange: (value: AppointmentSort) => void;
};

export default function AppointmentFilters({
  search,
  filter,
  sort,
  onSearchChange,
  onFilterChange,
  onSortChange,
}: AppointmentFiltersProps) {
  return (
    <div className="grid gap-4 border-b border-slate-200 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-[1fr_12rem_12rem]">
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
        Sort by
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as AppointmentSort)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="name">Patient Name</option>
          <option value="date">Appointment Date</option>
          <option value="status">Status</option>
          <option value="type">Appointment Type</option>
        </select>
      </label>

      <label className="text-sm font-medium text-slate-700">
        Filter appointments
        <select
          value={filter}
          onChange={(event) =>
            onFilterChange(event.target.value as AppointmentFilter)
          }
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="all">All appointments</option>
          <option value="today">Today</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>
    </div>
  );
}
