"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PrescriptionHistoryVisit = {
  id: string;
  patient_id: string;
  visit_date: string;
  diagnosis: string | null;
  patients: Array<{
    id: string;
    first_name: string;
    last_name: string | null;
    patient_code: string | null;
  }> | {
    id: string;
    first_name: string;
    last_name: string | null;
    patient_code: string | null;
  } | null;
  prescriptions: Array<{
    id: string;
    prescription_items: Array<{
      id: string;
      medicine_name: string;
      dosage: string | null;
      frequency: string | null;
      duration: string | null;
    }>;
  }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export default function PrescriptionsPage() {
  const [visits, setVisits] = useState<PrescriptionHistoryVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPrescriptions() {
      const { data, error: fetchError } = await supabase
        .from("visits")
        .select("id, patient_id, visit_date, diagnosis, patients(id, first_name, last_name, patient_code), prescriptions(id, prescription_items(id, medicine_name, dosage, frequency, duration))")
        .order("visit_date", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase prescriptions fetch failed:", fetchError);
        setError(fetchError.message);
      } else {
        setVisits(
          ((data ?? []) as PrescriptionHistoryVisit[]).filter((visit) =>
            visit.prescriptions.some((prescription) => prescription.prescription_items.length > 0),
          ),
        );
      }
      setIsLoading(false);
    }

    loadPrescriptions();
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
          Prescriptions
        </h1>
      </header>

      {isLoading && <p className="py-8 text-sm text-slate-600">Loading prescriptions...</p>}
      {!isLoading && error && (
        <p className="py-8 text-sm text-red-600" role="alert">Could not load prescriptions: {error}</p>
      )}
      {!isLoading && !error && visits.length === 0 && (
        <p className="py-8 text-sm text-slate-600">No prescriptions recorded yet.</p>
      )}
      {!isLoading && !error && visits.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {visits.map((visit) => {
            const patient = Array.isArray(visit.patients) ? visit.patients[0] : visit.patients;
            const patientName = [patient?.first_name, patient?.last_name]
              .filter(Boolean)
              .join(" ") || "Patient";
            const items = visit.prescriptions.flatMap((prescription) => prescription.prescription_items);
            const previewItems = items.slice(0, 3);

            return (
              <article key={visit.id} className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-950">
                      <Link href={`/doctor/patients/${visit.patient_id}`} className="hover:text-cyan-800">
                        {patientName}
                      </Link>
                    </h2>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {patient?.patient_code ?? "No patient code"} · {formatDate(visit.visit_date)}
                </p>
                <p className="mt-2 text-sm text-slate-600">{visit.diagnosis || "No diagnosis recorded"}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                  {previewItems.map((item) => (
                    <li key={item.id}>
                      <span className="font-medium">{item.medicine_name}</span>
                      {[item.dosage, item.frequency, item.duration].filter(Boolean).length > 0 && (
                        <span className="text-slate-500">
                          {" · "}{[item.dosage, item.frequency, item.duration].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </li>
                  ))}
                  {items.length > previewItems.length && (
                    <li className="text-xs text-slate-500">+{items.length - previewItems.length} more medicines</li>
                  )}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Link href={`/doctor/visits/${visit.id}/prescription`} className="inline-flex min-h-10 items-center rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800">
                    View Prescription
                  </Link>
                  <Link href={`/doctor/visits/${visit.id}/prescription?print=1`} className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Print Prescription
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
