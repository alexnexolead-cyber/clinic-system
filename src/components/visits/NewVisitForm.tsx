"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/types/patient";

const patientSelect =
  "id, patient_code, first_name, last_name, phone, city, created_at";

function localDateTimeValue() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export default function NewVisitForm({
  patientId,
}: {
  patientId: string;
}) {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visitDate, setVisitDate] = useState(localDateTimeValue);
  const [visitType, setVisitType] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPatient() {
      const { data, error: fetchError } = await supabase
        .from("patients")
        .select(patientSelect)
        .eq("id", patientId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase new visit patient fetch failed:", fetchError);
        setError(fetchError.message);
      } else if (!data) {
        setError("Patient not found.");
      } else {
        setPatient(data as Patient);
      }
      setIsLoading(false);
    }

    loadPatient();
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  async function createVisit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patient) {
      return;
    }

    setError("");
    setIsSaving(true);
    const { data, error: insertError } = await supabase
      .from("visits")
      .insert({
        patient_id: patient.id,
        visit_date: new Date(visitDate).toISOString(),
        visit_type: visitType.trim(),
        chief_complaint: chiefComplaint.trim(),
        diagnosis: diagnosis.trim(),
        clinical_notes: clinicalNotes.trim(),
        status: "in_progress",
      })
      .select("id")
      .single();

    if (insertError || !data?.id) {
      console.error("Supabase visit creation failed:", insertError);
      setError(insertError?.message ?? "Visit could not be created.");
      setIsSaving(false);
      return;
    }

    router.push(`/doctor/visits/${data.id}`);
  }

  const patientName = [patient?.first_name, patient?.last_name]
    .filter(Boolean)
    .join(" ") || "Patient";

  return (
    <section className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <Link
        href={`/doctor/patients/${patientId}`}
        className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
      >
        Back to patient profile
      </Link>
      <header className="mt-6 border-b border-slate-200 pb-7">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Patient Visit
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          New Visit
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {patient ? `${patientName} · ${patient.patient_code ?? "-"}` : "Loading patient..."}
        </p>
      </header>

      {isLoading && <p className="py-8 text-sm text-slate-600">Loading patient...</p>}
      {!isLoading && error && !patient && (
        <p className="py-8 text-sm text-red-600" role="alert">{error}</p>
      )}
      {!isLoading && patient && (
        <form
          onSubmit={createVisit}
          className="mt-7 space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Visit date
              <input
                type="datetime-local"
                required
                value={visitDate}
                onChange={(event) => setVisitDate(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Visit type
              <input
                value={visitType}
                required
                onChange={(event) => setVisitType(event.target.value)}
                placeholder="Consultation"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Chief complaint
              <textarea
                rows={2}
                required
                value={chiefComplaint}
                onChange={(event) => setChiefComplaint(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Diagnosis
              <textarea
                rows={2}
                required
                value={diagnosis}
                onChange={(event) => setDiagnosis(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Clinical notes
              <textarea
                rows={5}
                required
                value={clinicalNotes}
                onChange={(event) => setClinicalNotes(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
          >
            {isSaving ? "Creating visit..." : "Create visit"}
          </button>
        </form>
      )}
    </section>
  );
}
