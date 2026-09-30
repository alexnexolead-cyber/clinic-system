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
          "id, visit_date, diagnosis, prescriptions(id, prescription_items(id, medicine_name, dosage, frequency, duration))",
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
          visitsWithPrescriptions.filter((visit) =>
            visit.prescriptions.some(
              (prescription) => prescription.prescription_items.length > 0,
            ),
          ),
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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-cyan-200 hover:shadow-md sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">Prescriptions</h2>
        <Link href="/doctor/prescriptions" className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">
          All prescriptions
        </Link>
      </div>
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
                {visit.prescriptions.flatMap((prescription) =>
                  prescription.prescription_items.map((item) => (
                    <li key={item.id}>
                      <span className="font-medium">{item.medicine_name}</span>
                      {[item.dosage, item.frequency, item.duration]
                        .filter(Boolean)
                        .length > 0 && (
                        <span className="text-slate-500">
                          {" · "}
                          {[item.dosage, item.frequency, item.duration]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </li>
                  )),
                )}
              </ul>
              <Link
                href={`/doctor/visits/${visit.id}/prescription`}
                className="mt-3 inline-block text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
              >
                View prescription
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
