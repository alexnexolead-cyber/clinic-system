"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PrescriptionEditor from "@/src/components/visits/PrescriptionEditor";
import type { Patient } from "@/types/patient";
import type { Visit, VisitStatus } from "@/types/clinical";

const visitSelect =
  "id, patient_id, appointment_id, visit_date, visit_type, chief_complaint, diagnosis, clinical_notes, status, created_at, updated_at";
const patientSelect =
  "id, patient_code, first_name, last_name, phone, city, created_at";

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function toLocalDateTimeValue(date: string) {
  const parsed = new Date(date);
  const localDate = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export default function VisitDetailPage() {
  const params = useParams<{ id: string }>();
  const visitId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isValidVisitId = /^[0-9a-f-]{36}$/i.test(visitId ?? "");
  const [visit, setVisit] = useState<Visit | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(isValidVisitId);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(isValidVisitId ? "" : "Invalid visit ID.");
  const [form, setForm] = useState({
    visit_date: "",
    visit_type: "",
    chief_complaint: "",
    diagnosis: "",
    clinical_notes: "",
  });

  useEffect(() => {
    let isMounted = true;

    if (!isValidVisitId || !visitId) {
      return () => {
        isMounted = false;
      };
    }

    async function loadVisit() {
      const { data: visitData, error: visitError } = await supabase
        .from("visits")
        .select(visitSelect)
        .eq("id", visitId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (visitError) {
        console.error("Supabase visit fetch failed:", visitError);
        setError(visitError.message);
        setIsLoading(false);
        return;
      }

      if (!visitData) {
        setError("Visit not found.");
        setIsLoading(false);
        return;
      }

      const loadedVisit = visitData as Visit;
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select(patientSelect)
        .eq("id", loadedVisit.patient_id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (patientError) {
        console.error("Supabase visit patient fetch failed:", patientError);
        setError(patientError.message);
      } else if (!patientData) {
        setError("Patient not found for this visit.");
      } else {
        setPatient(patientData as Patient);
      }

      setVisit(loadedVisit);
      setForm({
        visit_date: toLocalDateTimeValue(loadedVisit.visit_date),
        visit_type: loadedVisit.visit_type ?? "",
        chief_complaint: loadedVisit.chief_complaint ?? "",
        diagnosis: loadedVisit.diagnosis ?? "",
        clinical_notes: loadedVisit.clinical_notes ?? "",
      });
      setIsLoading(false);
    }

    loadVisit();
    return () => {
      isMounted = false;
    };
  }, [isValidVisitId, visitId]);

  async function updateVisit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!visit) {
      return;
    }

    setError("");
    setIsSaving(true);
    const { data, error: updateError } = await supabase
      .from("visits")
      .update({
        visit_date: new Date(form.visit_date).toISOString(),
        visit_type: form.visit_type.trim() || null,
        chief_complaint: form.chief_complaint.trim() || null,
        diagnosis: form.diagnosis.trim() || null,
        clinical_notes: form.clinical_notes.trim() || null,
      })
      .eq("id", visit.id)
      .eq("patient_id", visit.patient_id)
      .select(visitSelect)
      .single();

    if (updateError) {
      console.error("Supabase visit update failed:", updateError);
      setError(updateError.message);
    } else {
      setVisit(data as Visit);
      setIsEditing(false);
    }
    setIsSaving(false);
  }

  async function changeVisitStatus(status: VisitStatus) {
    if (!visit) {
      return;
    }

    setError("");
    setIsSaving(true);
    const { data, error: updateError } = await supabase
      .from("visits")
      .update({ status })
      .eq("id", visit.id)
      .eq("patient_id", visit.patient_id)
      .select(visitSelect)
      .single();

    if (updateError) {
      console.error("Supabase visit status update failed:", updateError);
      setError(updateError.message);
    } else {
      setVisit(data as Visit);
      setForm((current) => ({ ...current, visit_date: data.visit_date }));
      setIsEditing(false);
    }
    setIsSaving(false);
  }

  const patientName = [patient?.first_name, patient?.last_name]
    .filter(Boolean)
    .join(" ") || "-";

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <Link
        href={patient ? `/doctor/patients/${patient.id}` : "/doctor/patients"}
        className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
      >
        Back to patient profile
      </Link>

      {isLoading && <p className="py-12 text-sm text-slate-600">Loading visit...</p>}
      {!isLoading && error && !visit && (
        <p className="py-12 text-sm text-red-600" role="alert">{error}</p>
      )}
      {!isLoading && visit && patient && (
        <>
          <header className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-7">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Visit · {patient.patient_code ?? "-"}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {patientName}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {patient.phone ?? "-"} · {formatDateTime(visit.visit_date)} ·{" "}
                <span className="capitalize">{visit.status.replaceAll("_", " ")}</span>
              </p>
            </div>
            {visit.status === "in_progress" && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white"
              >
                Edit visit
              </button>
            )}
          </header>

          {error && <p className="mt-5 text-sm text-red-600" role="alert">{error}</p>}

          {isEditing && visit.status === "in_progress" ? (
            <form
              onSubmit={updateVisit}
              className="mt-7 space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Visit date
                  <input
                    type="datetime-local"
                    required
                    value={form.visit_date.slice(0, 16)}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, visit_date: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Visit type
                  <input
                    value={form.visit_type}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, visit_type: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  Chief complaint
                  <textarea
                    rows={2}
                    value={form.chief_complaint}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, chief_complaint: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  Diagnosis
                  <textarea
                    rows={2}
                    value={form.diagnosis}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, diagnosis: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  Clinical notes
                  <textarea
                    rows={5}
                    value={form.clinical_notes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, clinical_notes: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setForm({
                      visit_date: toLocalDateTimeValue(visit.visit_date),
                      visit_type: visit.visit_type ?? "",
                      chief_complaint: visit.chief_complaint ?? "",
                      diagnosis: visit.diagnosis ?? "",
                      clinical_notes: visit.clinical_notes ?? "",
                    });
                    setError("");
                    setIsEditing(false);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <section className="mt-7 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-slate-500">Visit date</dt>
                  <dd className="mt-1 font-semibold text-slate-950">{formatDateTime(visit.visit_date)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Visit type</dt>
                  <dd className="mt-1 font-semibold text-slate-950">{visit.visit_type || "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Status</dt>
                  <dd className="mt-1 font-semibold capitalize text-slate-950">{visit.status.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Patient code</dt>
                  <dd className="mt-1 font-semibold text-slate-950">{patient.patient_code ?? "-"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm text-slate-500">Chief complaint</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-slate-800">{visit.chief_complaint || "-"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm text-slate-500">Diagnosis</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-slate-800">{visit.diagnosis || "-"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm text-slate-500">Clinical notes</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-slate-800">{visit.clinical_notes || "-"}</dd>
                </div>
              </dl>
              {visit.status === "in_progress" && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => changeVisitStatus("completed")}
                  className="mt-6 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  {isSaving ? "Updating..." : "Complete visit"}
                </button>
              )}
            </section>
          )}

          <div className="mt-6">
            <PrescriptionEditor visitId={visit.id} patientId={visit.patient_id} />
          </div>
        </>
      )}
    </section>
  );
}
