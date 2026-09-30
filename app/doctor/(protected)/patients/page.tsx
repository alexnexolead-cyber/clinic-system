"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PatientTable, { type PatientSortField } from "@/src/components/patients/PatientTable";
import PaginationControls, { type PageSize } from "@/src/components/operations/PaginationControls";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/types/patient";

const patientSelect =
  "id, patient_code, first_name, last_name, phone, city, created_at";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<PatientSortField>("created");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  function handleSort(field: PatientSortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "created" ? "desc" : "asc");
    }
    setCurrentPage(1);
  }

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
    const matchingPatients = normalizedSearch
      ? patients.filter((patient) => [
        patient.patient_code,
        patient.first_name,
        patient.last_name,
        patient.phone,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch)))
      : patients;

    return [...matchingPatients].sort((left, right) => {
      let comparison = 0;
      if (sortField === "name") {
        const leftName = [left.first_name, left.last_name].filter(Boolean).join(" ");
        const rightName = [right.first_name, right.last_name].filter(Boolean).join(" ");
        comparison = leftName.localeCompare(rightName);
      } else if (sortField === "code") {
        comparison = (left.patient_code ?? "").localeCompare(right.patient_code ?? "");
      } else if (sortField === "phone") {
        comparison = (left.phone ?? "").localeCompare(right.phone ?? "");
      } else if (sortField === "city") {
        comparison = (left.city ?? "").localeCompare(right.city ?? "");
      } else {
        comparison = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [patients, search, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const visiblePatients = filteredPatients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
        <div className="grid gap-4 border-b border-slate-200 p-4 sm:grid-cols-2 sm:p-5">
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            Search patients
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Patient code, name, phone, or city"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            Sort patients
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(event) => {
                const [f, d] = event.target.value.split("-") as [PatientSortField, "asc" | "desc"];
                setSortField(f);
                setSortDirection(d);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900"
            >
              <option value="created-desc">Created Date (Newest first)</option>
              <option value="created-asc">Created Date (Oldest first)</option>
              <option value="name-asc">Patient Name (A to Z)</option>
              <option value="name-desc">Patient Name (Z to A)</option>
              <option value="code-asc">Patient Code (A to Z)</option>
              <option value="city-asc">City (A to Z)</option>
            </select>
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
          <>
            <PatientTable
              patients={visiblePatients}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalCount={filteredPatients.length}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onPageSizeChange={(nextSize) => { setPageSize(nextSize); setCurrentPage(1); }}
            />
          </>
        )}
      </section>
    </section>
  );
}
