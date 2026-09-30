"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ReportCounts = {
  appointments: number | null;
  completedAppointments: number | null;
  cancelledAppointments: number | null;
  patients: number | null;
  newPatients: number | null;
  visits: number | null;
};

const emptyCounts: ReportCounts = {
  appointments: null,
  completedAppointments: null,
  cancelledAppointments: null,
  patients: null,
  newPatients: null,
  visits: null,
};

export default function ReportsPage() {
  const [counts, setCounts] = useState<ReportCounts>(emptyCounts);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    async function loadReports() {
      const [appointments, completed, cancelled, patients, newPatients, visits] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("patients").select("id", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
        supabase.from("visits").select("id", { count: "exact", head: true }),
      ]);

      if (!isMounted) {
        return;
      }

      const queryError = [appointments, completed, cancelled, patients, newPatients, visits]
        .find((result) => result.error)?.error;
      if (queryError) {
        console.error("Supabase clinic reports fetch failed:", queryError);
        setError(queryError.message);
      } else {
        setCounts({
          appointments: appointments.count ?? 0,
          completedAppointments: completed.count ?? 0,
          cancelledAppointments: cancelled.count ?? 0,
          patients: patients.count ?? 0,
          newPatients: newPatients.count ?? 0,
          visits: visits.count ?? 0,
        });
      }
      setIsLoading(false);
    }

    loadReports();
    return () => {
      isMounted = false;
    };
  }, []);

  const reportGroups = [
    {
      title: "Appointments report",
      items: [
        ["Total appointments", counts.appointments],
        ["Completed", counts.completedAppointments],
        ["Cancelled", counts.cancelledAppointments],
      ],
    },
    {
      title: "Patients report",
      items: [
        ["Total patients", counts.patients],
        ["New patients this month", counts.newPatients],
      ],
    },
    {
      title: "Visits report",
      items: [["Total visits", counts.visits]],
    },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Doctor workspace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Clinic Reports</h1>
      </header>

      {isLoading && <p className="py-8 text-sm text-slate-600">Loading reports...</p>}
      {!isLoading && error && <p className="py-6 text-sm text-red-600" role="alert">Could not load reports: {error}</p>}
      {!isLoading && !error && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {reportGroups.map((group) => (
            <section key={group.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">{group.title}</h2>
              <dl className="mt-4 divide-y divide-slate-100">
                {group.items.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                    <dt className="text-sm text-slate-600">{label}</dt>
                    <dd className="font-semibold text-slate-950">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}