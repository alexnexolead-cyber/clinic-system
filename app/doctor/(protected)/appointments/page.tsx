"use client";

import { useEffect, useMemo, useState } from "react";
import AppointmentFilters from "@/src/components/appointments/AppointmentFilters";
import AppointmentTable from "@/src/components/appointments/AppointmentTable";
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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AppointmentStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
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

    return appointments.filter((appointment) => {
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
      const matchesStatus = status === "all" || appointment.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [appointments, search, status]);

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

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <AppointmentFilters
          search={search}
          status={status}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
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
          <AppointmentTable appointments={filteredAppointments} />
        )}
      </section>
    </section>
  );
}
