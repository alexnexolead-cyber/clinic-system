"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { VisitPrescriptionSummary } from "@/types/clinical";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export default function PatientPrescriptionsSection({
  patientId,
}: {
  patientId: string;
}) {
  const [visits, setVisits] = useState<VisitPrescriptionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPrescriptions() {
      const { data, error: fetchError } = await supabase
        .from("visits")
        .select(
          "id, visit_date, diagnosis, prescriptions(id, medicine_name)",
        )
        .eq("patient_id", patientId)
        .order("visit_date", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase patient prescriptions fetch failed:", fetchError);
        setError(fetchError.message);
      } else {
        const visitsWithPrescriptions = (data ?? []) as VisitPrescriptionSummary[];
        setVisits(
          visitsWithPrescriptions.filter((visit) => visit.prescriptions.length > 0),
        );
      }
      setIsLoading(false);
    }

    loadPrescriptions();
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-slate-950">Prescriptions</h2>
      {isLoading && (
        <p className="mt-4 text-sm text-slate-500">Loading prescriptions...</p>
      )}
      {!isLoading && error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          Could not load prescriptions: {error}
        </p>
      )}
      {!isLoading && !error && visits.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          No prescriptions recorded yet.
        </p>
      )}
      {!isLoading && !error && visits.length > 0 && (
        <div className="mt-4 divide-y divide-slate-200">
          {visits.map((visit) => (
            <article key={visit.id} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-slate-950">
                  {visit.diagnosis || "Prescription"}
                </p>
                <time className="text-sm text-slate-500" dateTime={visit.visit_date}>
                  {formatDate(visit.visit_date)}
                </time>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                {visit.prescriptions.map((prescription) => (
                  <li key={prescription.id}>{prescription.medicine_name}</li>
                ))}
              </ul>
              <Link
                href={`/doctor/visits/${visit.id}`}
                className="mt-3 inline-block text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
              >
                View Visit / Prescription
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
