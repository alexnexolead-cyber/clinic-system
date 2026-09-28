"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PrescriptionDraft, PrescriptionItem } from "@/types/clinical";

type PrescriptionRow = {
  id?: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

const blankPrescription: PrescriptionRow = {
  medicine_name: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

const prescriptionSelect =
  "id, visit_id, patient_id, medicine_name, dosage, frequency, duration, instructions, created_at, updated_at";

function toRow(item: PrescriptionItem): PrescriptionRow {
  return {
    id: item.id,
    medicine_name: item.medicine_name,
    dosage: item.dosage ?? "",
    frequency: item.frequency ?? "",
    duration: item.duration ?? "",
    instructions: item.instructions ?? "",
  };
}

export default function PrescriptionEditor({
  visitId,
  patientId,
}: {
  visitId: string;
  patientId: string;
}) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [rows, setRows] = useState<PrescriptionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPrescriptions() {
      const { data, error: fetchError } = await supabase
        .from("prescriptions")
        .select(prescriptionSelect)
        .eq("visit_id", visitId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase visit prescriptions fetch failed:", fetchError);
        setError(fetchError.message);
      } else {
        const loaded = (data ?? []) as PrescriptionItem[];
        setPrescriptions(loaded);
        setRows(loaded.map(toRow));
      }
      setIsLoading(false);
    }

    loadPrescriptions();
    return () => {
      isMounted = false;
    };
  }, [patientId, visitId]);

  function updateRow(index: number, field: keyof PrescriptionDraft, value: string) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  async function savePrescriptions() {
    setError("");
    const completedRows = rows.filter((row) => row.medicine_name.trim());
    const invalidRows = rows.some(
      (row) =>
        !row.medicine_name.trim() &&
        [row.dosage, row.frequency, row.duration, row.instructions].some(
          (value) => value.trim(),
        ),
    );

    if (invalidRows) {
      setError("Add a medicine name or remove the empty medicine row.");
      return;
    }

    setIsSaving(true);
    const retainedIds = new Set(
      completedRows.map((row) => row.id).filter((id): id is string => Boolean(id)),
    );
    const removedIds = prescriptions
      .filter((item) => !retainedIds.has(item.id))
      .map((item) => item.id);

    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("prescriptions")
        .delete()
        .in("id", removedIds)
        .eq("visit_id", visitId)
        .eq("patient_id", patientId);

      if (deleteError) {
        console.error("Supabase prescription deletion failed:", deleteError);
        setError(deleteError.message);
        setIsSaving(false);
        return;
      }
    }

    for (const row of completedRows.filter((item) => item.id)) {
      const { error: updateError } = await supabase
        .from("prescriptions")
        .update({
          medicine_name: row.medicine_name.trim(),
          dosage: row.dosage.trim() || null,
          frequency: row.frequency.trim() || null,
          duration: row.duration.trim() || null,
          instructions: row.instructions.trim() || null,
        })
        .eq("id", row.id)
        .eq("visit_id", visitId)
        .eq("patient_id", patientId);

      if (updateError) {
        console.error("Supabase prescription update failed:", updateError);
        setError(updateError.message);
        setIsSaving(false);
        return;
      }
    }

    const newItems = completedRows
      .filter((item) => !item.id)
      .map((row) => ({
        visit_id: visitId,
        patient_id: patientId,
        medicine_name: row.medicine_name.trim(),
        dosage: row.dosage.trim() || null,
        frequency: row.frequency.trim() || null,
        duration: row.duration.trim() || null,
        instructions: row.instructions.trim() || null,
      }));

    if (newItems.length > 0) {
      const { error: insertError } = await supabase
        .from("prescriptions")
        .insert(newItems);

      if (insertError) {
        console.error("Supabase prescription creation failed:", insertError);
        setError(insertError.message);
        setIsSaving(false);
        return;
      }
    }

    const { data, error: reloadError } = await supabase
      .from("prescriptions")
      .select(prescriptionSelect)
      .eq("visit_id", visitId)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: true });

    if (reloadError) {
      console.error("Supabase saved prescriptions reload failed:", reloadError);
      setError(reloadError.message);
    } else {
      const savedItems = (data ?? []) as PrescriptionItem[];
      setPrescriptions(savedItems);
      setRows(savedItems.map(toRow));
      setIsEditing(false);
    }
    setIsSaving(false);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">Prescriptions</h2>
        {!isEditing && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setRows(prescriptions.map(toRow));
              setRows((current) => [...current, { ...blankPrescription }]);
              setError("");
              setIsEditing(true);
            }}
            className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
          >
            {prescriptions.length > 0 ? "Edit prescription" : "Add prescription"}
          </button>
        )}
      </div>

      {isLoading && <p className="mt-4 text-sm text-slate-500">Loading prescriptions...</p>}
      {!isLoading && !isEditing && !error && prescriptions.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">No prescriptions recorded yet.</p>
      )}
      {!isLoading && !isEditing && prescriptions.length > 0 && (
        <div className="mt-4 space-y-4">
          {prescriptions.map((item) => (
            <article key={item.id} className="border-t border-slate-200 pt-4 first:border-0 first:pt-0">
              <p className="font-semibold text-slate-950">{item.medicine_name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {[item.dosage, item.frequency, item.duration]
                  .filter(Boolean)
                  .join(" · ") || "No dosage details"}
              </p>
              {item.instructions && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                  {item.instructions}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {isEditing && (
        <div className="mt-5 space-y-5">
          {rows.map((row, index) => (
            <fieldset
              key={row.id ?? `new-${index}`}
              className="grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2"
            >
              <legend className="px-1 text-sm font-semibold text-slate-700">
                Medicine {index + 1}
              </legend>
              <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Medicine name
                <input
                  required
                  value={row.medicine_name}
                  onChange={(event) => updateRow(index, "medicine_name", event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
              {([
                ["dosage", "Dosage"],
                ["frequency", "Frequency"],
                ["duration", "Duration"],
              ] as const).map(([field, label]) => (
                <label key={field} className="space-y-2 text-sm font-medium text-slate-700">
                  {label}
                  <input
                    value={row[field]}
                    onChange={(event) => updateRow(index, field, event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
              ))}
              <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Instructions
                <textarea
                  rows={2}
                  value={row.instructions}
                  onChange={(event) => updateRow(index, "instructions", event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                className="text-left text-sm font-semibold text-red-700 transition hover:text-red-900 sm:col-span-2"
              >
                Remove medicine
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() => setRows((current) => [...current, { ...blankPrescription }])}
            className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
          >
            Add medicine
          </button>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={savePrescriptions}
              className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save prescription"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setRows(prescriptions.map(toRow));
                setError("");
                setIsEditing(false);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {!isEditing && error && (
        <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>
      )}
    </section>
  );
}
