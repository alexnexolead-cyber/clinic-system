"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Appointment = {
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  appointment_type: string;
  preferred_date: string;
  status: string;
};

const workspaceSections = [
  {
    title: "Appointments",
    description: "Review bookings and manage appointment status.",
    href: "/doctor/appointments",
  },
  {
    title: "Patients",
    description: "Browse patient records and open clinical profiles.",
    href: "/doctor/patients",
  },
  {
    title: "Online Requests",
    description: "Review online consultation requests from patients.",
    href: "/doctor/online-requests",
  },
  {
    title: "Visits",
    description: "Open clinical visits and patient encounter notes.",
    href: "/doctor/visits",
  },
  {
    title: "Prescriptions",
    description: "Review prescriptions organized by clinical visit.",
    href: "/doctor/prescriptions",
  },
  {
    title: "Ledger",
    description: "Review clinic ledger records.",
    href: "/doctor/ledger",
  },
  {
    title: "Settings",
    description: "Manage clinic portal preferences.",
    href: "/doctor/settings",
  },
];

function getTodayKey() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${today.getFullYear()}-${month}-${day}`;
}

function formatAppointmentDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(`${date}T00:00:00`));
}

export default function DoctorDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTodaysAppointments() {
      const { data, error: fetchError } = await supabase
        .schema("public")
        .from("appointments")
        .select(
          "first_name, last_name, phone, city, appointment_type, preferred_date, status",
        )
        .eq("preferred_date", getTodayKey())
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

      setAppointments(data ?? []);
      setIsLoading(false);
    }

    loadTodaysAppointments();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Doctor workspace
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Dashboard
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          A central workspace for appointments, patient records, and clinic operations.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Today
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              Today&apos;s Appointments
            </h3>
          </div>
          <p className="text-sm text-slate-500">{getTodayKey()}</p>
        </div>

        {isLoading && (
          <div className="px-6 py-10 text-sm text-slate-600">
            Loading today&apos;s appointments...
          </div>
        )}

        {!isLoading && error && (
          <div className="px-6 py-10" role="alert">
            <p className="text-sm font-semibold text-red-700">
              Could not load today&apos;s appointments.
            </p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </div>
        )}

        {!isLoading && !error && appointments.length === 0 && (
          <div className="px-6 py-10 text-sm text-slate-600">
            No appointments are scheduled for today.
          </div>
        )}

        {!isLoading && !error && appointments.length > 0 && (
          <div className="divide-y divide-slate-200">
            {appointments.map((appointment, index) => (
              <article
                key={`${appointment.phone}-${appointment.preferred_date}-${index}`}
                className="grid gap-5 px-6 py-5 md:grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr] md:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {appointment.first_name} {appointment.last_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {appointment.phone}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    City
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {appointment.city}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Type
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {appointment.appointment_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Preferred date
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {formatAppointmentDate(appointment.preferred_date)}
                  </p>
                </div>
                <div>
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                    {appointment.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="pt-8">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Portal areas
        </h3>
      </div>

      <div className="grid auto-rows-fr gap-5 pt-8 sm:grid-cols-2 xl:grid-cols-3">
        {workspaceSections.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="group flex h-full min-h-44 flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
          >
            <h3 className="text-lg font-semibold text-slate-950 group-hover:text-cyan-800">
              {section.title}
            </h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
              {section.description}
            </p>
            <span className="mt-5 text-sm font-semibold text-cyan-700">
              Open section
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}