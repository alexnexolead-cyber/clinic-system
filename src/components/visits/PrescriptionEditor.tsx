"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  Prescription,
  PrescriptionItem,
} from "@/types/clinical";

type PrescriptionRow = {
  id?: string;
  medicine_id: string | number | null;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

type MedicineOption = {
  id: string | number;
  medicine_name: string;
  generic_name: string | null;
  strength: string | null;
};

const blankPrescription: PrescriptionRow = {
  medicine_id: null,
  medicine_name: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

const frequencyOptions = [
  "Once daily",
  "Twice daily",
  "Thrice daily",
  "Every 8 hours",
  "Before meal",
  "After meal",
  "At bedtime",
];
const prescriptionSelect = "id, visit_id, patient_id, created_at, updated_at";
const itemSelect =
  "id, prescription_id, medicine_id, medicine_name, dosage, frequency, duration, instructions, created_at";

function toRow(item: PrescriptionItem): PrescriptionRow {
  return {
    id: item.id,
    medicine_id: item.medicine_id,
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
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [rows, setRows] = useState<PrescriptionRow[]>([]);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [medicineSuggestions, setMedicineSuggestions] = useState<MedicineOption[]>([]);
  const [isSearchingMedicines, setIsSearchingMedicines] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPrescriptions() {
      const { data: prescriptionData, error: fetchError } = await supabase
        .from("prescriptions")
        .select(prescriptionSelect)
        .eq("visit_id", visitId)
        .eq("patient_id", patientId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase visit prescriptions fetch failed:", fetchError);
        setError(fetchError.message);
      } else if (!prescriptionData) {
        setPrescription(null);
        setItems([]);
      } else {
        const loadedPrescription = prescriptionData as Prescription;
        const { data, error: itemsError } = await supabase
          .from("prescription_items")
          .select(itemSelect)
          .eq("prescription_id", loadedPrescription.id)
          .order("created_at", { ascending: true });

        if (itemsError) {
          console.error("Supabase prescription items fetch failed:", itemsError);
          setError(itemsError.message);
        } else {
          const loadedItems = (data ?? []) as PrescriptionItem[];
          setPrescription(loadedPrescription);
          setItems(loadedItems);
          setRows(loadedItems.map(toRow));
        }
      }
      setIsLoading(false);
    }

    loadPrescriptions();
    return () => {
      isMounted = false;
    };
  }, [patientId, visitId]);

  useEffect(() => {
    const query = medicineSearch.trim();

    if (query.length < 2) {
      return;
    }

    let isCurrent = true;
    const timeoutId = window.setTimeout(async () => {
      setIsSearchingMedicines(true);
      const { data, error: searchError } = await supabase
        .from("medicines")
        .select("id, medicine_name, generic_name, strength")
        .ilike("medicine_name", `%${query}%`)
        .order("medicine_name", { ascending: true })
        .limit(8);

      if (!isCurrent) {
        return;
      }

      if (searchError) {
        console.error("Supabase medicine search failed:", searchError);
        setError(searchError.message);
        setMedicineSuggestions([]);
      } else {
        setMedicineSuggestions((data ?? []) as MedicineOption[]);
      }
      setIsSearchingMedicines(false);
    }, 300);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [medicineSearch]);

  function updateRow(
    index: number,
    field: "dosage" | "frequency" | "duration" | "instructions",
    value: string,
  ) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  function selectMedicine(medicine: MedicineOption) {
    setRows((current) => {
      if (current.some((row) => String(row.medicine_id) === String(medicine.id))) {
        return current;
      }

      return [
        ...current,
        {
          ...blankPrescription,
          medicine_id: medicine.id,
          medicine_name: medicine.medicine_name,
        },
      ];
    });
    setMedicineSearch("");
    setMedicineSuggestions([]);
    setIsSearchingMedicines(false);
    setError("");
  }

  async function savePrescriptions() {
    setError("");
    const completedRows = rows.filter((row) => row.medicine_name.trim());

    const unselectedMedicines = completedRows.some(
      (row) =>
        row.medicine_id === null &&
        !items.some(
          (item) => item.id === row.id && item.medicine_name === row.medicine_name,
        ),
    );
    if (unselectedMedicines) {
      setError("Select each medicine from the suggestions before saving.");
      return;
    }

    if (completedRows.length === 0 && !prescription) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    let activePrescription = prescription;

    if (!activePrescription && completedRows.length > 0) {
      const { data: createdPrescription, error: createError } = await supabase
        .from("prescriptions")
        .insert({ visit_id: visitId, patient_id: patientId })
        .select(prescriptionSelect)
        .single();

      if (createError || !createdPrescription?.id) {
        if (createError?.code === "23505") {
          const { data: existingPrescription, error: lookupError } = await supabase
            .from("prescriptions")
            .select(prescriptionSelect)
            .eq("visit_id", visitId)
            .eq("patient_id", patientId)
            .maybeSingle();

          if (lookupError || !existingPrescription) {
            console.error("Supabase prescription creation failed:", createError);
            setError(lookupError?.message ?? createError.message);
            setIsSaving(false);
            return;
          }
          activePrescription = existingPrescription as Prescription;
        } else {
          console.error("Supabase prescription creation failed:", createError);
          setError(createError?.message ?? "Prescription could not be created.");
          setIsSaving(false);
          return;
        }
      } else {
        activePrescription = createdPrescription as Prescription;
      }
    }

    if (!activePrescription) {
      setIsSaving(false);
      return;
    }

    const retainedIds = new Set(
      completedRows.map((row) => row.id).filter((id): id is string => Boolean(id)),
    );
    const removedIds = items
      .filter((item) => !retainedIds.has(item.id))
      .map((item) => item.id);

    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("prescription_items")
        .delete()
        .in("id", removedIds)
        .eq("prescription_id", activePrescription.id);

      if (deleteError) {
        console.error("Supabase prescription deletion failed:", deleteError);
        setError(deleteError.message);
        setIsSaving(false);
        return;
      }
    }

    for (const row of completedRows.filter((item) => item.id)) {
      const { error: updateError } = await supabase
        .from("prescription_items")
        .update({
          medicine_id: row.medicine_id,
          medicine_name: row.medicine_name.trim(),
          dosage: row.dosage.trim() || null,
          frequency: row.frequency.trim() || null,
          duration: row.duration.trim() || null,
          instructions: row.instructions.trim() || null,
        })
        .eq("id", row.id)
        .eq("prescription_id", activePrescription.id);

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
        prescription_id: activePrescription.id,
        medicine_id: row.medicine_id,
        medicine_name: row.medicine_name.trim(),
        dosage: row.dosage.trim() || null,
        frequency: row.frequency.trim() || null,
        duration: row.duration.trim() || null,
        instructions: row.instructions.trim() || null,
      }));

    if (newItems.length > 0) {
      const { error: insertError } = await supabase
        .from("prescription_items")
        .insert(newItems);

      if (insertError) {
        console.error("Supabase prescription creation failed:", insertError);
        setError(insertError.message);
        setIsSaving(false);
        return;
      }
    }

    const { data, error: reloadError } = await supabase
      .from("prescription_items")
      .select(itemSelect)
      .eq("prescription_id", activePrescription.id)
      .order("created_at", { ascending: true });

    if (reloadError) {
      console.error("Supabase saved prescriptions reload failed:", reloadError);
      setError(reloadError.message);
    } else {
      const savedItems = (data ?? []) as PrescriptionItem[];
      setPrescription(activePrescription);
      setItems(savedItems);
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
              const currentRows = items.map(toRow);
              setRows(
                currentRows.length > 0
                  ? currentRows
                  : [],
              );
              setMedicineSearch("");
              setMedicineSuggestions([]);
              setError("");
              setIsEditing(true);
            }}
            className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
          >
            {items.length > 0 ? "Edit prescription" : "Add prescription"}
          </button>
        )}
      </div>

      {isLoading && <p className="mt-4 text-sm text-slate-500">Loading prescriptions...</p>}
      {!isLoading && !isEditing && !error && items.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">No prescriptions recorded yet.</p>
      )}
      {!isLoading && !isEditing && items.length > 0 && (
        <div className="mt-4 space-y-4">
          {items.map((item) => (
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
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            Add medicine
            <div className="relative">
              <input
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={medicineSearch.trim().length >= 2}
                aria-controls="medicine-suggestions"
                autoComplete="off"
                placeholder="Search medicines..."
                value={medicineSearch}
                onChange={(event) => {
                  setMedicineSearch(event.target.value);
                  setMedicineSuggestions([]);
                  setIsSearchingMedicines(false);
                  setError("");
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
              {medicineSearch.trim().length >= 2 && (
                <ul
                  id="medicine-suggestions"
                  role="listbox"
                  className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                >
                  {isSearchingMedicines && (
                    <li className="px-3 py-2 text-sm text-slate-500">Searching...</li>
                  )}
                  {!isSearchingMedicines && medicineSuggestions.length === 0 && (
                    <li className="px-3 py-2 text-sm text-slate-500">No matching medicines</li>
                  )}
                  {medicineSuggestions.map((medicine) => (
                    <li key={medicine.id} role="option" aria-selected="false">
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectMedicine(medicine)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="block font-medium text-slate-900">
                          {medicine.medicine_name}
                          {medicine.strength ? ` · ${medicine.strength}` : ""}
                        </span>
                        {medicine.generic_name && (
                          <span className="block text-xs text-slate-500">
                            {medicine.generic_name}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </label>

          {rows.length > 0 && (
            <div className="space-y-4">
              {rows.map((row, index) => (
                <fieldset
                  key={row.id ?? `${row.medicine_id}-${index}`}
                  className="grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2"
                >
                  <legend className="sr-only">{row.medicine_name} details</legend>
                  <div className="flex items-center justify-between gap-3 sm:col-span-2">
                    <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-900">
                      <span className="truncate">{row.medicine_name}</span>
                      <span aria-hidden="true" className="text-cyan-700">x</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${row.medicine_name}`}
                      onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                      className="shrink-0 text-sm font-semibold text-red-700 transition hover:text-red-900"
                    >
                      Remove
                    </button>
                  </div>
                  {([
                    ["dosage", "Dosage"],
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
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Frequency
                    <select
                      value={row.frequency}
                      onChange={(event) => updateRow(index, "frequency", event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                    >
                      <option value="">Select frequency</option>
                      {row.frequency && !frequencyOptions.includes(row.frequency) && (
                        <option value={row.frequency}>{row.frequency}</option>
                      )}
                      {frequencyOptions.map((frequency) => (
                        <option key={frequency} value={frequency}>{frequency}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    Instructions
                    <textarea
                      rows={2}
                      value={row.instructions}
                      onChange={(event) => updateRow(index, "instructions", event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                    />
                  </label>
                </fieldset>
              ))}
            </div>
          )}
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
                setRows(items.map(toRow));
                setMedicineSearch("");
                setMedicineSuggestions([]);
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
