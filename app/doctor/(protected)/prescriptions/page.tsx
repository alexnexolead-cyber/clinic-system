"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PaginationControls, { type PageSize } from "@/src/components/operations/PaginationControls";
import { supabase } from "@/lib/supabase";

type PrescriptionHistoryVisit = {
  id: string;
  patient_id: string;
  visit_date: string;
  diagnosis: string | null;
  patients: Array<{
    id: string;
    first_name: string;
    last_name: string | null;
    patient_code: string | null;
  }> | {
    id: string;
    first_name: string;
    last_name: string | null;
    patient_code: string | null;
  } | null;
  prescriptions: Array<{
    id: string;
    prescription_items: Array<{
      id: string;
      medicine_name: string;
      dosage: string | null;
      frequency: string | null;
      duration: string | null;
      instructions: string | null;
    }>;
  }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export default function PrescriptionsPage() {
  const [visits, setVisits] = useState<PrescriptionHistoryVisit[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "patient">("newest");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPrescriptions() {
      const { data, error: fetchError } = await supabase
        .from("visits")
        .select("id, patient_id, visit_date, diagnosis, patients(id, first_name, last_name, patient_code), prescriptions(id, prescription_items(id, medicine_name, dosage, frequency, duration, instructions))")
        .order("visit_date", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase prescriptions fetch failed:", fetchError);
        setError(fetchError.message);
      } else {
        setVisits(
          ((data ?? []) as PrescriptionHistoryVisit[]).filter((visit) =>
            visit.prescriptions.some((prescription) => prescription.prescription_items.length > 0),
          ),
        );
      }
      setIsLoading(false);
    }

    loadPrescriptions();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredVisits = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = visits.filter((visit) => {
      const patient = Array.isArray(visit.patients) ? visit.patients[0] : visit.patients;
      const patientName = [patient?.first_name, patient?.last_name].filter(Boolean).join(" ").toLowerCase();
      const code = (patient?.patient_code ?? "").toLowerCase();
      const diagnosis = (visit.diagnosis ?? "").toLowerCase();
      const items = visit.prescriptions.flatMap((p) => p.prescription_items);
      const matchesMedicine = items.some((item) => item.medicine_name.toLowerCase().includes(query));

      return !query || patientName.includes(query) || code.includes(query) || diagnosis.includes(query) || matchesMedicine;
    });

    return [...matching].sort((left, right) => {
      if (sort === "patient") {
        const pLeft = Array.isArray(left.patients) ? left.patients[0] : left.patients;
        const pRight = Array.isArray(right.patients) ? right.patients[0] : right.patients;
        const nameLeft = [pLeft?.first_name, pLeft?.last_name].filter(Boolean).join(" ");
        const nameRight = [pRight?.first_name, pRight?.last_name].filter(Boolean).join(" ");
        return nameLeft.localeCompare(nameRight);
      }
      const diff = new Date(left.visit_date).getTime() - new Date(right.visit_date).getTime();
      return sort === "oldest" ? diff : -diff;
    });
  }, [visits, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredVisits.length / pageSize));
  const visibleVisits = filteredVisits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Doctor workspace
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Prescriptions
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              View and print prescriptions issued during patient clinical visits.
            </p>
          </div>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div className="w-full sm:w-80">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search patient, medicine, code, or diagnosis"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 uppercase">Sort</label>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as "newest" | "oldest" | "patient"); setCurrentPage(1); }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-normal text-slate-900"
          >
            <option value="newest">Visit Date (Newest first)</option>
            <option value="oldest">Visit Date (Oldest first)</option>
            <option value="patient">Patient Name (A to Z)</option>
          </select>
        </div>
      </div>

      {isLoading && <p className="py-8 text-sm text-slate-600">Loading prescriptions...</p>}
      {!isLoading && error && (
        <p className="py-8 text-sm text-red-600" role="alert">Could not load prescriptions: {error}</p>
      )}
      {!isLoading && !error && filteredVisits.length === 0 && (
        <div className="py-12 text-center text-sm text-slate-600">
          <p className="font-semibold text-slate-800">No prescriptions found</p>
          <p className="mt-1 text-slate-500">
            {visits.length === 0 ? "No prescriptions recorded yet." : "No prescriptions match your search."}
          </p>
        </div>
      )}
      {!isLoading && !error && visibleVisits.length > 0 && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {visibleVisits.map((visit) => {
            const patient = Array.isArray(visit.patients) ? visit.patients[0] : visit.patients;
            const patientName = [patient?.first_name, patient?.last_name]
              .filter(Boolean)
              .join(" ") || "Patient";
            const items = visit.prescriptions.flatMap((prescription) => prescription.prescription_items);
            const previewItems = items.slice(0, 4);

            return (
              <article
                key={visit.id}
                className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      <Link href={`/doctor/patients/${visit.patient_id}`} className="hover:text-cyan-800">
                        {patientName}
                      </Link>
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="font-medium text-cyan-700">{patient?.patient_code ?? "No code"}</span>
                      {" · "}
                      <span>{formatDate(visit.visit_date)}</span>
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 border border-cyan-200">
                    <span className="font-bold">℞</span> {items.length} {items.length === 1 ? "medicine" : "medicines"}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Diagnosis</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{visit.diagnosis || "No diagnosis recorded"}</p>
                </div>

                <div className="mt-4 flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prescribed Items</p>
                  <ul className="mt-2 space-y-2">
                    {previewItems.map((item) => (
                      <li key={item.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs sm:text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-semibold text-slate-900">{item.medicine_name}</span>
                          <span className="text-xs font-medium text-slate-500">
                            {[item.dosage, item.frequency, item.duration].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                        {item.instructions && (
                          <p className="mt-1 text-xs text-slate-600 italic">{item.instructions}</p>
                        )}
                      </li>
                    ))}
                    {items.length > previewItems.length && (
                      <li className="text-xs font-medium text-cyan-700">
                        +{items.length - previewItems.length} more {items.length - previewItems.length === 1 ? "medicine" : "medicines"}
                      </li>
                    )}
                  </ul>
                </div>

                <div className="mt-5 flex flex-wrap gap-2.5 border-t border-slate-100 pt-4">
                  <Link
                    href={`/doctor/visits/${visit.id}/prescription`}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg bg-cyan-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-cyan-800"
                  >
                    View Prescription
                  </Link>
                  <Link
                    href={`/doctor/visits/${visit.id}/prescription?print=1`}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <svg className="mr-1.5 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!isLoading && filteredVisits.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filteredVisits.length}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onPageSizeChange={(nextSize) => { setPageSize(nextSize); setCurrentPage(1); }}
          />
        </div>
      )}
    </section>
  );
}
