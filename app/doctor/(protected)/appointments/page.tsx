"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppointmentFilters, { type AppointmentFilter, type AppointmentSort } from "@/src/components/appointments/AppointmentFilters";
import AppointmentTable from "@/src/components/appointments/AppointmentTable";
import PaginationControls, { type PageSize } from "@/src/components/operations/PaginationControls";
import { getOrCreateVisitForAppointment } from "@/lib/clinical-visits";
import { supabase } from "@/lib/supabase";
import type { Appointment, AppointmentStatus } from "@/types/appointment";

const appointmentSelect =
  "id, patient_id, patient:patients(patient_code, first_name, last_name, phone, city), first_name, last_name, phone, city, appointment_type, preferred_date, status";

function getPatientIdentity(appointment: Appointment) {
  return Array.isArray(appointment.patient)
    ? appointment.patient[0] ?? null
    : appointment.patient;
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AppointmentFilter>("all");
  const [sort, setSort] = useState<AppointmentSort>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  function handleColumnSort(field: AppointmentSort) {
    if (sort === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  }
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAppointments() {
      const { data, error: fetchError } = await supabase
        .from("appointments")
        .select(appointmentSelect)
        .order("preferred_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase appointments fetch failed:", fetchError);
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      setAppointments((data ?? []) as Appointment[]);
      setIsLoading(false);
    }

    loadAppointments();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredAppointments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const filtered = appointments.filter((appointment) => {
      const patient = getPatientIdentity(appointment);
      const matchesSearch =
        !normalizedSearch ||
        (patient?.first_name ?? appointment.first_name)
          .toLowerCase()
          .includes(normalizedSearch) ||
        (patient?.last_name ?? appointment.last_name)
          .toLowerCase()
          .includes(normalizedSearch) ||
        (patient?.patient_code ?? "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (appointment.patient_id ?? "").toLowerCase().includes(normalizedSearch) ||
        (patient?.phone ?? appointment.phone)
          .toLowerCase()
          .includes(normalizedSearch);
      const dateKey = appointment.preferred_date.slice(0, 10);
      const matchesFilter = (() => {
        switch (filter) {
          case "today":
            return dateKey === todayKey;
          case "upcoming":
            return dateKey > todayKey && !["completed", "cancelled"].includes(appointment.status);
          case "completed":
            return appointment.status === "completed";
          case "cancelled":
            return appointment.status === "cancelled";
          default:
            return true;
        }
      })();

      return matchesSearch && matchesFilter;
    });

    return [...filtered].sort((left, right) => {
      let comparison = 0;
      if (sort === "name") {
        const leftPatient = getPatientIdentity(left);
        const rightPatient = getPatientIdentity(right);
        const leftName = [leftPatient?.first_name ?? left.first_name, leftPatient?.last_name ?? left.last_name].join(" ");
        const rightName = [rightPatient?.first_name ?? right.first_name, rightPatient?.last_name ?? right.last_name].join(" ");
        comparison = leftName.localeCompare(rightName);
      } else if (sort === "status") {
        comparison = left.status.localeCompare(right.status);
      } else if (sort === "type") {
        comparison = left.appointment_type.localeCompare(right.appointment_type);
      } else {
        comparison = left.preferred_date.localeCompare(right.preferred_date);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [appointments, filter, search, sort, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / pageSize));
  const visibleAppointments = filteredAppointments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function updateAppointmentStatus(
    appointmentId: Appointment["id"],
    nextStatus: AppointmentStatus,
  ) {
    setError("");
    setBusyAppointmentId(String(appointmentId));
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status: nextStatus })
      .eq("id", appointmentId);

    if (updateError) {
      console.error("Supabase appointment status update failed:", updateError);
      setError(updateError.message);
    } else {
      setAppointments((current) => current.map((appointment) =>
        appointment.id === appointmentId
          ? { ...appointment, status: nextStatus }
          : appointment,
      ));
    }
    setBusyAppointmentId(null);
  }

  async function startVisit(appointment: Appointment) {
    if (!appointment.patient_id) {
      setError("This appointment has no linked patient.");
      return;
    }

    setError("");
    setBusyAppointmentId(String(appointment.id));
    const result = await getOrCreateVisitForAppointment(
      supabase,
      appointment.patient_id,
      appointment.id,
    );
    if (result.error || !result.visitId) {
      setError(result.error ?? "Visit could not be opened.");
      setBusyAppointmentId(null);
      return;
    }
    router.push(`/doctor/visits/${result.visitId}`);
  }

  async function viewVisit(appointment: Appointment) {
    setError("");
    setBusyAppointmentId(String(appointment.id));
    const { data, error: visitError } = await supabase
      .from("visits")
      .select("id")
      .eq("appointment_id", appointment.id)
      .maybeSingle();

    if (visitError || !data) {
      setError(visitError?.message ?? "No visit is linked to this appointment.");
      setBusyAppointmentId(null);
      return;
    }
    router.push(`/doctor/visits/${data.id}`);
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Doctor workspace
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Appointments
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Review patient bookings and manage appointment status.
        </p>
      </header>

      {error && <p className="mt-5 text-sm text-red-600" role="alert">{error}</p>}

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <AppointmentFilters
          search={search}
          filter={filter}
          sort={sort}
          onSearchChange={(value) => { setSearch(value); setCurrentPage(1); }}
          onFilterChange={(value) => { setFilter(value); setCurrentPage(1); }}
          onSortChange={(value) => { setSort(value); setCurrentPage(1); }}
        />

        {isLoading && (
          <div className="px-5 py-12 text-sm text-slate-600">
            Loading appointments...
          </div>
        )}

        {!isLoading && error && (
          <div className="px-5 py-12" role="alert">
            <p className="text-sm font-semibold text-red-700">
              Could not load appointments.
            </p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </div>
        )}

        {!isLoading && !error && filteredAppointments.length === 0 && (
          <div className="px-5 py-12 text-sm text-slate-600">
            {appointments.length === 0
              ? "No appointments found."
              : "No appointments match the selected filters."}
          </div>
        )}

        {!isLoading && !error && filteredAppointments.length > 0 && (
          <>
            <AppointmentTable
              appointments={visibleAppointments}
              busyAppointmentId={busyAppointmentId}
              sortField={sort}
              sortDirection={sortDirection}
              onSort={handleColumnSort}
              onStatusChange={updateAppointmentStatus}
              onStartVisit={startVisit}
              onViewVisit={viewVisit}
            />
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalCount={filteredAppointments.length}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onPageSizeChange={(nextSize) => { setPageSize(nextSize); setCurrentPage(1); }}
            />
          </>
        )}
      </section>
    </section>
  );
}
