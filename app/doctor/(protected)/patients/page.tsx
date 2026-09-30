"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PatientTable from "@/src/components/patients/PatientTable";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/types/patient";

const patientSelect =
  "id, patient_code, first_name, last_name, phone, city, created_at";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPatients() {
      const { data, error: fetchError } = await supabase
        .from("patients")
        .select(patientSelect)
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase patients fetch failed:", fetchError);
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      setPatients((data ?? []) as Patient[]);
      setIsLoading(false);
    }

    loadPatients();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredPatients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return patients;
    }

    return patients.filter((patient) =>
      [
        patient.patient_code,
        patient.first_name,
        patient.last_name,
        patient.phone,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch)),
    );
  }, [patients, search]);

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-8">
        <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Doctor workspace
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Patients
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Review patient records connected to your clinic workspace.
        </p>
        </div>
        <Link
          href="/doctor/patients/new"
          className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
        >
          Add Patient
        </Link>
      </header>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <label className="block max-w-md space-y-2 text-sm font-medium text-slate-700">
            Search patients
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Patient code, name, or phone"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        </div>

        {isLoading && (
          <div className="px-5 py-12 text-sm text-slate-600">
            Loading patients...
          </div>
        )}

        {!isLoading && error && (
          <div className="px-5 py-12" role="alert">
            <p className="text-sm font-semibold text-red-700">
              Could not load patients.
            </p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </div>
        )}

        {!isLoading && !error && filteredPatients.length === 0 && (
          <div className="px-5 py-12 text-sm text-slate-600">
            {patients.length === 0
              ? "No patients found."
              : "No patients match your search."}
          </div>
        )}

        {!isLoading && !error && filteredPatients.length > 0 && (
          <PatientTable patients={filteredPatients} />
        )}
      </section>
    </section>
  );
}
