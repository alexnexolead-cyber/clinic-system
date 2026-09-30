"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Appointment = {
  id: string | number;
  patient_id: string | null;
  patient: { patient_code: string | null } | { patient_code: string | null }[] | null;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  appointment_type: string;
  preferred_date: string;
  status: string;
};

type DashboardMetrics = {
  patients: number | null;
  pendingRequests: number | null;
  completedVisits: number | null;
  prescriptionsToday: number | null;
  ledgerBalance: number | null;
};

const dashboardCards: Array<{
  key: keyof DashboardMetrics | "appointments";
  title: string;
  href: string;
}> = [
  {
    key: "appointments",
    title: "Today's Appointments",
    href: "/doctor/appointments",
  },
  {
    key: "patients",
    title: "Patients",
    href: "/doctor/patients",
  },
  {
    key: "pendingRequests",
    title: "Pending Online Requests",
    href: "/doctor/online-requests",
  },
  {
    key: "completedVisits",
    title: "Completed Visits",
    href: "/doctor/visits",
  },
  {
    key: "prescriptionsToday",
    title: "Prescriptions Today",
    href: "/doctor/prescriptions",
  },
  {
    key: "ledgerBalance",
    title: "Ledger Balance",
    href: "/doctor/ledger",
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
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [todayAppointmentCount, setTodayAppointmentCount] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    patients: null,
    pendingRequests: null,
    completedVisits: null,
    prescriptionsToday: null,
    ledgerBalance: null,
  });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [metricErrors, setMetricErrors] = useState<Partial<Record<keyof DashboardMetrics, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTodaysAppointments() {
      const { data, count, error: fetchError } = await supabase
        .schema("public")
        .from("appointments")
        .select(
          "id, patient_id, patient:patients(patient_code), first_name, last_name, phone, city, appointment_type, preferred_date, status",
          { count: "exact" },
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
      setTodayAppointmentCount(count ?? data?.length ?? 0);
      setIsLoading(false);
    }

    loadTodaysAppointments();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    async function loadDashboardMetrics() {
      const [patients, requests, visits, prescriptions, ledger] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("online_appointment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("visits").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("prescriptions").select("id", { count: "exact", head: true })
          .gte("created_at", startOfToday.toISOString())
          .lt("created_at", startOfTomorrow.toISOString()),
        supabase.from("ledger_entries").select("amount, entry_type"),
      ]);

      if (!isMounted) {
        return;
      }

      const errors: Partial<Record<keyof DashboardMetrics, string>> = {};
      if (patients.error) errors.patients = patients.error.message;
      if (requests.error) errors.pendingRequests = requests.error.message;
      if (visits.error) errors.completedVisits = visits.error.message;
      if (prescriptions.error) errors.prescriptionsToday = prescriptions.error.message;
      if (ledger.error) errors.ledgerBalance = ledger.error.message;
      const ledgerBalance = ledger.error
        ? null
        : (ledger.data ?? []).reduce((balance, entry) => {
            const val = Number(entry.amount);
            const safeAmount = Number.isFinite(val) ? val : 0;
            return balance + (entry.entry_type === "charge" ? safeAmount : -safeAmount);
          }, 0);

      setMetricErrors(errors);
      setMetrics({
        patients: patients.error ? null : patients.count ?? 0,
        pendingRequests: requests.error ? null : requests.count ?? 0,
        completedVisits: visits.error ? null : visits.count ?? 0,
        prescriptionsToday: prescriptions.error ? null : prescriptions.count ?? 0,
        ledgerBalance,
      });
      setIsLoadingMetrics(false);
    }

    loadDashboardMetrics();
    return () => {
      isMounted = false;
    };
  }, []);

  function metricValue(key: keyof DashboardMetrics | "appointments") {
    if (key === "appointments") {
      return isLoading ? "..." : error ? "Unavailable" : String(todayAppointmentCount ?? 0);
    }
    if (isLoadingMetrics) {
      return "...";
    }
    if (metricErrors[key]) {
      return "Unavailable";
    }
    if (key === "ledgerBalance") {
      return metrics.ledgerBalance === null
        ? "Unavailable"
        : formatAmount(metrics.ledgerBalance);
    }
    return String(metrics[key] ?? 0);
  }

  function formatAmount(amount: number) {
    const safe = Number.isFinite(amount) ? amount : 0;
    return safe.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

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

      <section aria-label="Clinic operations summary" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardCards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
          >
            <span className="text-sm font-medium text-slate-600">{card.title}</span>
            <span className="mt-3 block text-2xl font-semibold text-slate-950">
              {metricValue(card.key)}
            </span>
            {card.key !== "appointments" && metricErrors[card.key] && (
              <span className="mt-2 block text-xs text-amber-700">Operations schema may need setup.</span>
            )}
          </Link>
        ))}
      </section>

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
            {appointments.map((appointment) => {
              const patient = Array.isArray(appointment.patient)
                ? appointment.patient[0] ?? null
                : appointment.patient;
              const patientName = `${appointment.first_name} ${appointment.last_name}`.trim();
              return (
              <article
                key={appointment.id}
                onClick={() => router.push(`/doctor/appointments/${appointment.id}`)}
                className="group cursor-pointer grid grid-cols-2 gap-x-4 gap-y-4 px-4 py-4 transition-colors hover:bg-cyan-50/30 sm:grid-cols-3 sm:gap-5 sm:px-6 sm:py-5 xl:grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr_auto] xl:items-center"
              >
                <div>
                  {appointment.patient_id ? (
                    <Link
                      href={`/doctor/patients/${appointment.patient_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-semibold text-slate-950 hover:text-cyan-800"
                    >
                      {patientName || "Patient"}
                    </Link>
                  ) : <p className="text-sm font-semibold text-slate-950">{patientName || "Patient"}</p>}
                  <p className="mt-1 text-xs font-medium text-cyan-700">{patient?.patient_code ?? "No patient code"}</p>
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
                <div className="col-span-2 sm:col-span-3 xl:col-span-1 flex justify-end">
                  <span className="text-xs font-semibold text-cyan-700 group-hover:text-cyan-900">
                    Details &rarr;
                  </span>
                </div>
              </article>
              );
            })}
          </div>
        )}
      </section>

    </section>
  );
}