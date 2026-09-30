"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PrescriptionItem, Visit } from "@/types/clinical";
import type { Patient } from "@/types/patient";

type PrescriptionPatient = Pick<
  Patient,
  "id" | "patient_code" | "first_name" | "last_name"
>;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(date));
}

export default function PrintablePrescriptionPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const visitId = Array.isArray(params.id) ? params.id[0] : params.id;
  const autoPrintStarted = useRef(false);
  const isValidVisitId = /^[0-9a-f-]{36}$/i.test(visitId ?? "");
  const [visit, setVisit] = useState<Visit | null>(null);
  const [patient, setPatient] = useState<PrescriptionPatient | null>(null);
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [doctorName, setDoctorName] = useState("Current doctor");
  const [isLoading, setIsLoading] = useState(isValidVisitId);
  const [error, setError] = useState(isValidVisitId ? "" : "Invalid visit ID.");

  useEffect(() => {
    let isMounted = true;

    async function loadPrescription() {
      const { data: visitData, error: visitError } = await supabase
        .from("visits")
        .select("*")
        .eq("id", visitId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (visitError || !visitData) {
        setError(visitError?.message ?? "Visit not found.");
        setIsLoading(false);
        return;
      }

      const loadedVisit = visitData as Visit;
      const [patientResult, prescriptionResult, userResult] = await Promise.all([
        supabase
          .from("patients")
          .select("id, patient_code, first_name, last_name")
          .eq("id", loadedVisit.patient_id)
          .maybeSingle(),
        supabase
          .from("prescriptions")
          .select("id")
          .eq("visit_id", loadedVisit.id)
          .eq("patient_id", loadedVisit.patient_id)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);

      if (!isMounted) {
        return;
      }

      if (patientResult.error || !patientResult.data) {
        setError(patientResult.error?.message ?? "Patient not found for this visit.");
        setIsLoading(false);
        return;
      }
      if (prescriptionResult.error) {
        setError(prescriptionResult.error.message);
        setIsLoading(false);
        return;
      }

      let loadedItems: PrescriptionItem[] = [];
      if (prescriptionResult.data) {
        const { data: itemData, error: itemError } = await supabase
          .from("prescription_items")
          .select("id, prescription_id, medicine_id, medicine_name, dosage, frequency, duration, instructions, created_at")
          .eq("prescription_id", prescriptionResult.data.id)
          .order("created_at", { ascending: true });

        if (!isMounted) {
          return;
        }
        if (itemError) {
          setError(itemError.message);
          setIsLoading(false);
          return;
        }
        loadedItems = (itemData ?? []) as PrescriptionItem[];
      }

      const metadata = userResult.data.user?.user_metadata as Record<string, unknown> | undefined;
      const preferredDoctorName = [metadata?.full_name, metadata?.name, metadata?.doctor_name]
        .find((value): value is string => typeof value === "string" && value.trim().length > 0);
      setDoctorName(preferredDoctorName ?? userResult.data.user?.email ?? "Current doctor");
      setVisit(loadedVisit);
      setPatient(patientResult.data as PrescriptionPatient);
      setItems(loadedItems);
      setIsLoading(false);
    }

    if (isValidVisitId && visitId) {
      loadPrescription();
    }
    return () => {
      isMounted = false;
    };
  }, [isValidVisitId, visitId]);

  useEffect(() => {
    if (searchParams.get("print") === "1" && !isLoading && items.length > 0 && !autoPrintStarted.current) {
      autoPrintStarted.current = true;
      window.print();
    }
  }, [isLoading, items.length, searchParams]);

  const patientName = [patient?.first_name, patient?.last_name]
    .filter(Boolean)
    .join(" ") || "-";

  return (
    <section className="prescription-print-page mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={visit ? `/doctor/visits/${visit.id}` : "/doctor/visits"}
          className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
        >
          Back to visit
        </Link>
        <button
          type="button"
          disabled={isLoading || items.length === 0}
          onClick={() => window.print()}
          className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
        >
          Print prescription
        </button>
      </div>

      {isLoading && <p className="py-12 text-sm text-slate-600">Loading prescription...</p>}
      {!isLoading && error && (
        <p className="py-8 text-sm text-red-600 print:hidden" role="alert">Could not load prescription: {error}</p>
      )}
      {!isLoading && !error && items.length === 0 && (
        <p className="py-8 text-sm text-slate-600 print:hidden">No prescription items are attached to this visit.</p>
      )}
      {!isLoading && !error && visit && patient && items.length > 0 && (
        <article className="prescription-print-sheet border border-slate-300 bg-white p-8 shadow-sm sm:p-10">
          <header className="border-b-2 border-slate-900 pb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Clinic Name</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Prescription</h1>
          </header>

          <dl className="grid gap-x-8 gap-y-4 border-b border-slate-300 py-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Patient</dt>
              <dd className="mt-1 font-semibold text-slate-950">{patientName}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Patient code</dt>
              <dd className="mt-1 font-semibold text-slate-950">{patient.patient_code ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Doctor</dt>
              <dd className="mt-1 font-semibold text-slate-950">{doctorName}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Visit date</dt>
              <dd className="mt-1 font-semibold text-slate-950">{formatDate(visit.visit_date)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-slate-500">Diagnosis</dt>
              <dd className="mt-1 whitespace-pre-wrap font-semibold text-slate-950">{visit.diagnosis || "-"}</dd>
            </div>
          </dl>

          <section className="py-5">
            <h2 className="text-lg font-semibold text-slate-950">Medicines</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-400">
                    <th className="py-2 pr-4 font-semibold text-slate-700">Medicine</th>
                    <th className="py-2 pr-4 font-semibold text-slate-700">Dosage</th>
                    <th className="py-2 pr-4 font-semibold text-slate-700">Frequency</th>
                    <th className="py-2 font-semibold text-slate-700">Duration</th>
                    <th className="py-2 pl-4 font-semibold text-slate-700">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200 align-top">
                      <td className="py-3 pr-4 font-medium text-slate-950">{item.medicine_name}</td>
                      <td className="py-3 pr-4 text-slate-800">{item.dosage || "-"}</td>
                      <td className="py-3 pr-4 text-slate-800">{item.frequency || "-"}</td>
                      <td className="py-3 text-slate-800">{item.duration || "-"}</td>
                      <td className="py-3 pl-4 text-slate-800">{item.instructions || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border-t border-slate-300 pt-5">
            <h2 className="text-sm font-semibold text-slate-700">Notes</h2>
            <p className="mt-2 min-h-8 whitespace-pre-wrap text-sm text-slate-800">
              {visit.clinical_notes || "-"}
            </p>
          </section>
        </article>
      )}
    </section>
  );
}