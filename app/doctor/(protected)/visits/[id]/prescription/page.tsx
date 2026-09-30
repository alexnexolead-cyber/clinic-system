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
    <section className="prescription-print-page mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div>
          <Link
            href={visit ? `/doctor/visits/${visit.id}` : "/doctor/visits"}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
          >
            <span>&larr; Back to visit</span>
          </Link>
          <p className="mt-0.5 text-xs text-slate-500">
            Preview formatted for standard A4 paper and PDF export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {visit && (
            <Link
              href={`/doctor/patients/${visit.patient_id}`}
              className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Patient Profile
            </Link>
          )}
          <button
            type="button"
            disabled={isLoading || items.length === 0}
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Prescription
          </button>
        </div>
      </div>

      {isLoading && <p className="py-12 text-sm text-slate-600">Loading prescription...</p>}
      {!isLoading && error && (
        <p className="py-8 text-sm text-red-600 print:hidden" role="alert">Could not load prescription: {error}</p>
      )}
      {!isLoading && !error && items.length === 0 && (
        <p className="py-8 text-sm text-slate-600 print:hidden">No prescription items are attached to this visit.</p>
      )}
      {!isLoading && !error && visit && patient && items.length > 0 && (
        <article className="prescription-print-sheet rounded-xl border border-slate-300 bg-white p-6 shadow-sm sm:p-10">
          {/* Clinic Header */}
          <header className="border-b-2 border-slate-900 pb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-800">Clinic Appointment & Healthcare Center</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Medical Prescription</h1>
              <p className="mt-0.5 text-xs text-slate-500">Outpatient Consultation & Patient Care</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm font-semibold text-slate-900">Dr. {doctorName}</p>
              <p className="text-xs text-slate-500">Consultant Physician</p>
              <p className="mt-1 text-xs text-slate-500">Date: {formatDate(visit.visit_date)}</p>
            </div>
          </header>

          {/* Patient Details Grid */}
          <div className="my-5 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Patient</dt>
                <dd className="mt-1 font-bold text-slate-950">{patientName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Patient Code</dt>
                <dd className="mt-1 font-semibold text-cyan-800">{patient.patient_code ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Visit Date</dt>
                <dd className="mt-1 font-medium text-slate-800">{formatDate(visit.visit_date)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Visit Type</dt>
                <dd className="mt-1 font-medium text-slate-800">{visit.visit_type || "Consultation"}</dd>
              </div>
              {visit.diagnosis && (
                <div className="sm:col-span-2 md:col-span-4 border-t border-slate-200 pt-2.5 mt-1">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Diagnosis</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900 whitespace-pre-wrap">{visit.diagnosis}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Medicines Section */}
          <section className="py-4">
            <div className="flex items-center gap-2 border-b border-slate-300 pb-2">
              <span className="text-2xl font-serif font-black text-cyan-800">℞</span>
              <h2 className="text-base font-bold text-slate-950 uppercase tracking-wide">Rx / Prescribed Medication</h2>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-300 text-xs uppercase font-semibold text-slate-600">
                    <th className="py-2.5 pr-4">#</th>
                    <th className="py-2.5 pr-4">Medicine</th>
                    <th className="py-2.5 pr-4">Dosage</th>
                    <th className="py-2.5 pr-4">Frequency</th>
                    <th className="py-2.5 pr-4">Duration</th>
                    <th className="py-2.5 pl-2">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, index) => (
                    <tr key={item.id} className="align-top">
                      <td className="py-3 pr-4 text-xs font-medium text-slate-400">{index + 1}</td>
                      <td className="py-3 pr-4 font-bold text-slate-950">{item.medicine_name}</td>
                      <td className="py-3 pr-4 font-medium text-slate-800">{item.dosage || "-"}</td>
                      <td className="py-3 pr-4 font-medium text-slate-800">{item.frequency || "-"}</td>
                      <td className="py-3 pr-4 font-medium text-slate-800">{item.duration || "-"}</td>
                      <td className="py-3 pl-2 text-slate-700 text-xs italic">{item.instructions || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Clinical Advice / Notes */}
          {visit.clinical_notes && (
            <section className="mt-4 border-t border-slate-200 pt-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">Special Instructions / Advice</h2>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">
                {visit.clinical_notes}
              </p>
            </section>
          )}

          {/* Footer Signature */}
          <footer className="mt-12 border-t-2 border-slate-900 pt-6 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs text-slate-500">Need follow-up? WhatsApp clinic at 03001234567.</p>
              <p className="text-xs text-slate-400 mt-0.5">Please take medicines as prescribed. Keep out of reach of children.</p>
            </div>
            <div className="text-right min-w-[200px]">
              <div className="h-10 border-b border-dashed border-slate-400"></div>
              <p className="mt-2 text-sm font-semibold text-slate-950">Dr. {doctorName}</p>
              <p className="text-xs text-slate-500">Authorized Signature & Stamp</p>
            </div>
          </footer>
        </article>
      )}
    </section>
  );
}