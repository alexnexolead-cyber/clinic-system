"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Visit, VisitStatus } from "@/types/clinical";

type VisitListPatient = {
  first_name: string;
  last_name: string | null;
  patient_code: string | null;
};

type VisitListRecord = Pick<Visit, "id" | "patient_id" | "visit_date" | "visit_type" | "chief_complaint" | "diagnosis" | "status"> & {
  patients: VisitListPatient[] | VisitListPatient | null;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default function VisitsPage() {
  const [visits, setVisits] = useState<VisitListRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadVisits() {
      const { data, error: fetchError } = await supabase
        .from("visits")
        .select("id, patient_id, visit_date, visit_type, chief_complaint, diagnosis, status, patients(first_name, last_name, patient_code)")
        .order("visit_date", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase visits fetch failed:", fetchError);
        setError(fetchError.message);
      } else {
        setVisits((data ?? []) as VisitListRecord[]);
      }
      setIsLoading(false);
    }

    loadVisits();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Doctor workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Visits
        </h1>
      </header>

      {isLoading && <p className="py-8 text-sm text-slate-600">Loading visits...</p>}
      {!isLoading && error && (
        <p className="py-8 text-sm text-red-600" role="alert">
          Could not load visits: {error}
        </p>
      )}
      {!isLoading && !error && visits.length === 0 && (
        <p className="py-8 text-sm text-slate-600">No visits recorded yet.</p>
      )}
      {!isLoading && !error && visits.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {visits.map((visit) => {
            const patient = Array.isArray(visit.patients)
              ? visit.patients[0]
              : visit.patients;
            const patientName = [patient?.first_name, patient?.last_name]
              .filter(Boolean)
              .join(" ") || "Patient";
            const status = visit.status as VisitStatus;

            return (
              <article
                key={visit.id}
                className="flex h-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-md sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{visit.diagnosis || visit.chief_complaint || visit.visit_type || "Visit"}</p>
                    <p className="mt-1 text-sm text-slate-600">
                    <Link href={`/doctor/patients/${visit.patient_id}`} className="font-medium hover:text-cyan-800">
                      {patientName}
                    </Link>
                    {" · "}{patient?.patient_code ?? "No patient code"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === "completed" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                    {status === "completed" ? "Completed" : "In Progress"}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{formatDate(visit.visit_date)}</p>
                {visit.diagnosis && visit.chief_complaint && (
                  <p className="text-sm text-slate-600">{visit.chief_complaint}</p>
                )}
                <Link href={`/doctor/visits/${visit.id}`} className="mt-auto inline-flex min-h-10 items-center self-start rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800">
                  View Visit
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
