"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Visit } from "@/types/clinical";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export default function PatientVisitsSection({
  patientId,
}: {
  patientId: string;
}) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadVisits() {
      const { data, error: fetchError } = await supabase
        .from("visits")
        .select(
          "id, patient_id, appointment_id, visit_date, visit_type, chief_complaint, diagnosis, clinical_notes, status, created_at, updated_at",
        )
        .eq("patient_id", patientId)
        .order("visit_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase patient visits fetch failed:", fetchError);
        setError(fetchError.message);
      } else {
        setVisits((data ?? []) as Visit[]);
      }
      setIsLoading(false);
    }

    loadVisits();
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">Visits</h2>
        <Link
          href={`/doctor/patients/${patientId}/visits/new`}
          className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800"
        >
          New Visit
        </Link>
      </div>

      {isLoading && <p className="mt-4 text-sm text-slate-500">Loading visits...</p>}
      {!isLoading && error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          Could not load visits: {error}
        </p>
      )}
      {!isLoading && !error && visits.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">No visits recorded yet.</p>
      )}
      {!isLoading && !error && visits.length > 0 && (
        <div className="mt-4 divide-y divide-slate-200">
          {visits.map((visit) => (
            <article
              key={visit.id}
              className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-950">
                  {visit.visit_type || "Visit"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatDate(visit.visit_date)} · {visit.diagnosis || "No diagnosis recorded"}
                </p>
                <p className="mt-1 text-xs capitalize text-slate-500">
                  {visit.status.replaceAll("_", " ")}
                </p>
              </div>
              <Link
                href={`/doctor/visits/${visit.id}`}
                className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
              >
                View Visit
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
