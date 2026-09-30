"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PaginationControls, { type PageSize } from "@/src/components/operations/PaginationControls";
import { supabase } from "@/lib/supabase";
import type { Visit, VisitStatus } from "@/types/clinical";

type VisitListPatient = {
  first_name: string;
  last_name: string | null;
  patient_code: string | null;
};

type VisitListRecord = Pick<
  Visit,
  "id" | "patient_id" | "visit_date" | "visit_type" | "chief_complaint" | "diagnosis" | "status"
> & {
  patients: VisitListPatient[] | VisitListPatient | null;
};

type StatusFilter = "all" | "in_progress" | "completed";
type SortOption = "newest" | "oldest" | "name_asc" | "name_desc";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default function VisitsPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<VisitListRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function loadVisits() {
      const { data, error: fetchError } = await supabase
        .from("visits")
        .select("id, patient_id, visit_date, visit_type, chief_complaint, diagnosis, status, patients(first_name, last_name, patient_code)")
        .order("visit_date", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase visits fetch failed:", fetchError);
        setError(fetchError.message);
      } else {
        setVisits((data ?? []) as VisitListRecord[]);
      }
      setIsLoading(false);
    }

    loadVisits();
    return () => {
      isMounted = false;
    };
  }, []);

  const counts = useMemo(() => {
    return {
      all: visits.length,
      in_progress: visits.filter((v) => v.status === "in_progress").length,
      completed: visits.filter((v) => v.status === "completed").length,
    };
  }, [visits]);

  const filteredVisits = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = visits.filter((visit) => {
      if (statusFilter !== "all" && visit.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const patient = Array.isArray(visit.patients) ? visit.patients[0] : visit.patients;
      const patientName = [patient?.first_name, patient?.last_name].filter(Boolean).join(" ").toLowerCase();
      const patientCode = (patient?.patient_code ?? "").toLowerCase();
      const diagnosis = (visit.diagnosis ?? "").toLowerCase();
      const complaint = (visit.chief_complaint ?? "").toLowerCase();
      const visitType = (visit.visit_type ?? "").toLowerCase();

      return (
        patientName.includes(query) ||
        patientCode.includes(query) ||
        diagnosis.includes(query) ||
        complaint.includes(query) ||
        visitType.includes(query)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortOption === "newest") {
        return new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime();
      }
      if (sortOption === "oldest") {
        return new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime();
      }

      const pA = Array.isArray(a.patients) ? a.patients[0] : a.patients;
      const pB = Array.isArray(b.patients) ? b.patients[0] : b.patients;
      const nameA = [pA?.first_name, pA?.last_name].filter(Boolean).join(" ").toLowerCase();
      const nameB = [pB?.first_name, pB?.last_name].filter(Boolean).join(" ").toLowerCase();

      if (sortOption === "name_asc") {
        return nameA.localeCompare(nameB);
      }
      return nameB.localeCompare(nameA);
    });
  }, [visits, search, statusFilter, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filteredVisits.length / pageSize));
  const paginatedVisits = filteredVisits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSortOption("newest");
    setCurrentPage(1);
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Doctor workspace
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Visits
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage clinical encounters, diagnoses, notes, and prescriptions.
            </p>
          </div>
        </div>
      </header>

      {/* Filter and Search Controls */}
      <div className="mt-6 flex flex-col gap-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {(
            [
              { id: "all", label: "All Visits", count: counts.all },
              { id: "in_progress", label: "In Progress", count: counts.in_progress },
              { id: "completed", label: "Completed", count: counts.completed },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-cyan-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                    isActive ? "bg-cyan-800 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search patient, code, complaint, or diagnosis..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="visit-sort" className="text-xs font-medium text-slate-500 whitespace-nowrap">
              Sort by:
            </label>
            <select
              id="visit-sort"
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value as SortOption);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="newest">Visit Date (Newest first)</option>
              <option value="oldest">Visit Date (Oldest first)</option>
              <option value="name_asc">Patient Name (A to Z)</option>
              <option value="name_desc">Patient Name (Z to A)</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading && <p className="py-12 text-sm text-slate-600">Loading visits...</p>}

      {!isLoading && error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          Could not load visits: {error}
        </div>
      )}

      {!isLoading && !error && visits.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">No visits recorded yet.</p>
        </div>
      )}

      {!isLoading && !error && visits.length > 0 && filteredVisits.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">No visits match your search or filter.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-3 text-sm font-semibold text-cyan-700 hover:text-cyan-900 underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {!isLoading && !error && filteredVisits.length > 0 && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {paginatedVisits.map((visit) => {
              const patient = Array.isArray(visit.patients)
                ? visit.patients[0]
                : visit.patients;
              const patientName = [patient?.first_name, patient?.last_name]
                .filter(Boolean)
                .join(" ") || "Patient";
              const status = visit.status as VisitStatus;
              const isCompleted = status === "completed";

              return (
                <article
                  key={visit.id}
                  onClick={() => router.push(`/doctor/visits/${visit.id}`)}
                  className="group flex h-full cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
                >
                  <div>
                    {/* Top Row: Title & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold text-slate-950 truncate group-hover:text-cyan-800 transition">
                          {visit.diagnosis || visit.chief_complaint || visit.visit_type || "Clinical Visit"}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                          <Link
                            href={`/doctor/patients/${visit.patient_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-cyan-700 hover:text-cyan-900 hover:underline"
                          >
                            {patientName}
                          </Link>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-slate-500">{patient?.patient_code ?? "No code"}</span>
                          {visit.visit_type && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-medium capitalize">
                                {visit.visit_type}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isCompleted ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        {isCompleted ? "Completed" : "In Progress"}
                      </span>
                    </div>

                    {/* Visit Date */}
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDate(visit.visit_date)}</span>
                    </div>

                    {/* Complaint/Diagnosis Details */}
                    {(visit.chief_complaint || visit.diagnosis) && (
                      <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700 space-y-1">
                        {visit.chief_complaint && (
                          <p className="line-clamp-2">
                            <span className="font-semibold text-slate-800">Complaint:</span> {visit.chief_complaint}
                          </p>
                        )}
                        {visit.diagnosis && visit.chief_complaint && (
                          <p className="line-clamp-2">
                            <span className="font-semibold text-slate-800">Diagnosis:</span> {visit.diagnosis}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs font-semibold text-cyan-700 group-hover:text-cyan-800 inline-flex items-center gap-1">
                      View Visit Details
                      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                    <Link
                      href={`/doctor/visits/${visit.id}/prescription`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-medium text-slate-500 hover:text-cyan-700 hover:underline"
                    >
                      Prescription
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalCount={filteredVisits.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </>
      )}
    </section>
  );
}

