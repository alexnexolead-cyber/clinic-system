"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PatientFields from "@/src/components/patients/PatientFields";
import { isAllowedPakistanCity, isValidPakistanMobile, isValidPersonName, normalizePakistanPhone, sanitizePersonName } from "@/lib/patient-validation";
import { supabase } from "@/lib/supabase";
import type { Patient, PatientAttributes } from "@/types/patient";

type PatientFormValues = {
  [Field in keyof PatientAttributes]: string;
};

type PossibleMatch = Pick<
  Patient,
  "id" | "patient_code" | "first_name" | "last_name" | "phone" | "city"
>;

const initialValues: PatientFormValues = {
  first_name: "",
  last_name: "",
  phone: "",
  city: "",
};

const matchSelect =
  "id, patient_code, first_name, last_name, phone, city";

export default function PatientCreationForm() {
  const router = useRouter();
  const [values, setValues] = useState<PatientFormValues>(initialValues);
  const [matches, setMatches] = useState<PossibleMatch[]>([]);
  const [hasCheckedDuplicates, setHasCheckedDuplicates] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: keyof PatientFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setMatches([]);
    setHasCheckedDuplicates(false);
    setError("");
  }

  async function createPatient() {
    setError("");
    if (!isValidPersonName(values.first_name) || !isValidPersonName(values.last_name)) {
      setError("Enter valid first and last names using letters and spaces only.");
      return;
    }
    if (!isValidPakistanMobile(values.phone)) {
      setError("Enter a valid Pakistan mobile number, for example 03001234567 or +923001234567.");
      return;
    }
    if (!isAllowedPakistanCity(values.city)) {
      setError("Choose a city from the list.");
      return;
    }

    setIsCreating(true);
    const attributes: PatientAttributes = {
      first_name: sanitizePersonName(values.first_name),
      last_name: sanitizePersonName(values.last_name),
      phone: normalizePakistanPhone(values.phone),
      city: values.city.trim(),
    };

    const { data, error: insertError } = await supabase
      .from("patients")
      .insert(attributes)
      .select("id")
      .single();

    if (insertError || !data?.id) {
      console.error("Supabase manual patient creation failed:", insertError);
      setError(insertError?.message ?? "Patient could not be created.");
      setIsCreating(false);
      return;
    }

    router.push(`/doctor/patients/${data.id}`);
  }

  async function checkForDuplicates(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMatches([]);

    if (!isValidPersonName(values.first_name) || !isValidPersonName(values.last_name)) {
      setError("Enter valid first and last names using letters and spaces only.");
      return;
    }
    if (!isValidPakistanMobile(values.phone)) {
      setError("Enter a valid Pakistan mobile number, for example 03001234567 or +923001234567.");
      return;
    }
    if (!isAllowedPakistanCity(values.city)) {
      setError("Choose a city from the list.");
      return;
    }

    setIsChecking(true);

    const firstName = values.first_name.trim();
    const lastName = values.last_name.trim();
    const phone = normalizePakistanPhone(values.phone);

    const [phoneResult, nameResult] = await Promise.all([
      supabase.from("patients").select(matchSelect).eq("phone", phone),
      supabase
        .from("patients")
        .select(matchSelect)
        .ilike("first_name", firstName)
        .ilike("last_name", lastName),
    ]);

    const lookupError = phoneResult.error ?? nameResult.error;
    if (lookupError) {
      console.error("Supabase possible patient duplicate lookup failed:", lookupError);
      setError(lookupError.message);
      setIsChecking(false);
      return;
    }

    const uniqueMatches = new Map<string, PossibleMatch>();
    for (const patient of [...(phoneResult.data ?? []), ...(nameResult.data ?? [])]) {
      uniqueMatches.set(patient.id, patient as PossibleMatch);
    }

    const foundMatches = [...uniqueMatches.values()];
    setMatches(foundMatches);
    setHasCheckedDuplicates(true);
    setIsChecking(false);

    if (foundMatches.length === 0) {
      await createPatient();
    }
  }

  const hasRequiredFields = Object.values(values).every((value) => value.trim());

  return (
    <div className="mt-7 space-y-5">
      <form
        onSubmit={checkForDuplicates}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <PatientFields values={values} onChange={updateField} disabled={isChecking || isCreating} />
        {!hasCheckedDuplicates && (
          <button
            type="submit"
            disabled={!hasRequiredFields || isChecking || isCreating}
            className="mt-6 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isChecking ? "Checking patients..." : "Check and continue"}
          </button>
        )}
      </form>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {hasCheckedDuplicates && matches.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-amber-950">
            Possible existing patients
          </h2>
          <p className="mt-2 text-sm text-amber-900">
            Review these records before creating another patient. No record has
            been selected or changed.
          </p>
          <div className="mt-4 divide-y divide-amber-200">
            {matches.map((patient) => (
              <article
                key={patient.id}
                className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-950">
                    {patient.patient_code ?? "-"} ·{" "}
                    {[patient.first_name, patient.last_name]
                      .filter(Boolean)
                      .join(" ") || "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {patient.phone ?? "-"} · {patient.city ?? "-"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href={`/doctor/patients/${patient.id}`}
                    className="text-sm font-semibold text-cyan-800 transition hover:text-cyan-950"
                  >
                    View Profile
                  </Link>
                  <Link
                    href={`/doctor/patients/${patient.id}`}
                    className="text-sm font-semibold text-amber-950 underline underline-offset-2"
                  >
                    Use existing patient
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 border-t border-amber-200 pt-4">
            <button
              type="button"
              onClick={createPatient}
              disabled={isCreating}
              className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
            >
              {isCreating ? "Creating patient..." : "Create new patient anyway"}
            </button>
            <button
              type="button"
              onClick={() => {
                setHasCheckedDuplicates(false);
                setMatches([]);
              }}
              disabled={isCreating}
              className="rounded-lg border border-amber-400 px-4 py-2.5 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 disabled:opacity-60"
            >
              Edit details
            </button>
          </div>
        </section>
      )}

      {hasCheckedDuplicates && matches.length === 0 && isCreating && (
        <p className="text-sm text-slate-600">Creating patient...</p>
      )}
    </div>
  );
}
