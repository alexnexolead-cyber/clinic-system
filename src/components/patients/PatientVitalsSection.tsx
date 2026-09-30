"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PatientVitals } from "@/types/clinical";

type VitalsForm = {
  blood_pressure: string;
  pulse: string;
  temperature: string;
  weight: string;
  height: string;
  oxygen_saturation: string;
  notes: string;
};

const emptyVitals: VitalsForm = {
  blood_pressure: "",
  pulse: "",
  temperature: "",
  weight: "",
  height: "",
  oxygen_saturation: "",
  notes: "",
};

const numericFields = [
  { name: "pulse", label: "Pulse", unit: "bpm", step: "1" },
  { name: "temperature", label: "Temperature", unit: "°C", step: "0.1" },
  { name: "weight", label: "Weight", unit: "kg", step: "0.1" },
  { name: "height", label: "Height", unit: "cm", step: "0.1" },
  {
    name: "oxygen_saturation",
    label: "Oxygen saturation",
    unit: "%",
    step: "0.1",
  },
] as const;

function toForm(vitals: PatientVitals | null): VitalsForm {
  if (!vitals) {
    return { ...emptyVitals };
  }

  return {
    blood_pressure: vitals.blood_pressure ?? "",
    pulse: vitals.pulse?.toString() ?? "",
    temperature: vitals.temperature?.toString() ?? "",
    weight: vitals.weight?.toString() ?? "",
    height: vitals.height?.toString() ?? "",
    oxygen_saturation: vitals.oxygen_saturation?.toString() ?? "",
    notes: vitals.notes ?? "",
  };
}

function display(value: string | number | null, unit = "") {
  return value === null || value === "" ? "-" : `${value}${unit ? ` ${unit}` : ""}`;
}

function numericValue(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function PatientVitalsSection({
  patientId,
}: {
  patientId: string;
}) {
  const [vitals, setVitals] = useState<PatientVitals | null>(null);
  const [form, setForm] = useState<VitalsForm>({ ...emptyVitals });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadVitals() {
      const { data, error: fetchError } = await supabase
        .from("patient_vitals")
        .select(
          "id, patient_id, blood_pressure, pulse, temperature, weight, height, oxygen_saturation, notes, created_at, updated_at",
        )
        .eq("patient_id", patientId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase patient vitals fetch failed:", fetchError);
        setError(fetchError.message);
      } else {
        const loadedVitals = (data as PatientVitals | null) ?? null;
        setVitals(loadedVitals);
        setForm(toForm(loadedVitals));
      }
      setIsLoading(false);
    }

    loadVitals();
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  async function saveVitals(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const numericValues = numericFields.map(({ name }) => [
      name,
      form[name],
      numericValue(form[name]),
    ] as const);
    if (numericValues.some(([, value, parsed]) => value.trim() && parsed === null)) {
      setError("Enter a valid number for each numeric vital.");
      return;
    }

    setIsSaving(true);
    const payload = {
      patient_id: patientId,
      blood_pressure: form.blood_pressure.trim() || null,
      pulse: numericValue(form.pulse),
      temperature: numericValue(form.temperature),
      weight: numericValue(form.weight),
      height: numericValue(form.height),
      oxygen_saturation: numericValue(form.oxygen_saturation),
      notes: form.notes.trim() || null,
    };

    const { data, error: saveError } = await supabase
      .from("patient_vitals")
      .upsert(payload, { onConflict: "patient_id" })
      .select(
        "id, patient_id, blood_pressure, pulse, temperature, weight, height, oxygen_saturation, notes, created_at, updated_at",
      )
      .single();

    if (saveError) {
      console.error("Supabase patient vitals save failed:", saveError);
      setError(saveError.message);
    } else {
      const savedVitals = data as PatientVitals;
      setVitals(savedVitals);
      setForm(toForm(savedVitals));
      setIsEditing(false);
    }
    setIsSaving(false);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-cyan-200 hover:shadow-md sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">
          Current Medical Details / Vitals
        </h2>
        {!isEditing && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setForm(toForm(vitals));
              setError("");
              setIsEditing(true);
            }}
            className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
          >
            {vitals ? "Edit vitals" : "Add vitals"}
          </button>
        )}
      </div>

      {isLoading && <p className="mt-4 text-sm text-slate-500">Loading vitals...</p>}
      {!isLoading && !isEditing && !error && !vitals && (
        <p className="mt-4 text-sm text-slate-500">Vitals have not been recorded yet.</p>
      )}
      {!isLoading && !isEditing && vitals && (
        <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Blood pressure</dt>
            <dd className="mt-1 font-semibold text-slate-950">
              {display(vitals.blood_pressure, "mmHg")}
            </dd>
          </div>
          {numericFields.map(({ name, label, unit }) => (
            <div key={name}>
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {display(vitals[name], unit)}
              </dd>
            </div>
          ))}
          <div className="sm:col-span-2">
            <dt className="text-sm text-slate-500">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
              {vitals.notes || "-"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-slate-500">Last updated</dt>
            <dd className="mt-1 text-sm text-slate-800">
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(vitals.updated_at))}
            </dd>
          </div>
        </dl>
      )}
      {isEditing && (
        <form onSubmit={saveVitals} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Blood pressure (mmHg)
              <input
                value={form.blood_pressure}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    blood_pressure: event.target.value,
                  }))
                }
                placeholder="120/80"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            {numericFields.map(({ name, label, unit, step }) => (
              <label key={name} className="space-y-2 text-sm font-medium text-slate-700">
                {label} ({unit})
                <input
                  type="number"
                  step={step}
                  value={form[name]}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [name]: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
            ))}
            <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Notes
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save vitals"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setForm(toForm(vitals));
                setError("");
                setIsEditing(false);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {!isEditing && error && (
        <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>
      )}
    </section>
  );
}
