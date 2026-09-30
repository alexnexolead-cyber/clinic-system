"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PaginationControls, { type PageSize } from "@/src/components/operations/PaginationControls";
import { supabase } from "@/lib/supabase";

type PatientIdentity = {
  patient_code: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

type OnlineRequest = {
  id: string;
  patient_id: string;
  appointment_id: string | number | null;
  appointment_type: string;
  preferred_date: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  patient: PatientIdentity | PatientIdentity[] | null;
};

function getPatient(request: OnlineRequest) {
  return Array.isArray(request.patient) ? request.patient[0] ?? null : request.patient;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(`${date.slice(0, 10)}T00:00:00`),
  );
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function requestStatusClasses(status: OnlineRequest["status"]) {
  if (status === "accepted") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "rejected") return "bg-rose-50 text-rose-800 border-rose-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function requestStatusLabel(status: OnlineRequest["status"]) {
  if (status === "accepted") return "Accepted & Confirmed";
  if (status === "rejected") return "Rejected";
  return "Pending Verification";
}

function cleanWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.startsWith("03")) {
    return `92${digits.slice(1)}`;
  }
  return digits;
}

export default function OnlineRequestsPage() {
  const [requests, setRequests] = useState<OnlineRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      const { data, error: fetchError } = await supabase
        .from("online_appointment_requests")
        .select("id, patient_id, appointment_id, appointment_type, preferred_date, status, created_at, patient:patients(patient_code, first_name, last_name, phone)")
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase online appointment requests fetch failed:", fetchError);
        setError(fetchError.message);
      } else {
        setRequests((data ?? []) as OnlineRequest[]);
      }
      setIsLoading(false);
    }

    loadRequests();
    return () => {
      isMounted = false;
    };
  }, []);

  const counts = useMemo(() => {
    return requests.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      { pending: 0, accepted: 0, rejected: 0 } as Record<string, number>,
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const patient = getPatient(request);
      const patientName = [patient?.first_name, patient?.last_name].filter(Boolean).join(" ").toLowerCase();
      const code = (patient?.patient_code ?? "").toLowerCase();
      const phone = (patient?.phone ?? "").toLowerCase();

      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      const matchesSearch = !query || patientName.includes(query) || code.includes(query) || phone.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const visibleRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function updateRequest(request: OnlineRequest, action: "accept" | "reject") {
    setError("");
    setBusyRequestId(request.id);

    if (action === "accept") {
      const { data, error: acceptError } = await supabase.rpc(
        "accept_online_appointment_request",
        { request_id: request.id },
      );

      if (acceptError || !data) {
        console.error("Online appointment request acceptance failed:", acceptError);
        setError(acceptError?.message ?? "Request could not be accepted.");
      } else {
        setRequests((current) => current.map((item) =>
          item.id === request.id
            ? { ...item, status: "accepted", appointment_id: data }
            : item,
        ));
      }
    } else {
      const { data: rejectedRequest, error: rejectError } = await supabase
        .from("online_appointment_requests")
        .update({ status: "rejected" })
        .eq("id", request.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (rejectError || !rejectedRequest) {
        console.error("Online appointment request rejection failed:", rejectError);
        setError(rejectError?.message ?? "This request is no longer pending.");
      } else {
        setRequests((current) => current.map((item) =>
          item.id === request.id ? { ...item, status: "rejected" } : item,
        ));
      }
    }

    setBusyRequestId(null);
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Doctor workspace
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Online Requests
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Verify payment screenshots and confirm online consultation appointments.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs sm:text-sm text-emerald-950">
            <span className="font-semibold text-emerald-900">Clinic WhatsApp:</span>{" "}
            <a href="https://wa.me/923001234567" target="_blank" rel="noreferrer" className="font-bold underline underline-offset-2">
              03001234567
            </a>
          </div>
        </div>
      </header>

      {/* Filter Tabs & Search */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
            className={`rounded-lg px-3.5 py-1.5 font-medium transition ${
              statusFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => { setStatusFilter("pending"); setCurrentPage(1); }}
            className={`rounded-lg px-3.5 py-1.5 font-medium transition ${
              statusFilter === "pending"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-900 hover:bg-amber-100"
            }`}
          >
            Pending Verification ({counts.pending || 0})
          </button>
          <button
            type="button"
            onClick={() => { setStatusFilter("accepted"); setCurrentPage(1); }}
            className={`rounded-lg px-3.5 py-1.5 font-medium transition ${
              statusFilter === "accepted"
                ? "bg-emerald-700 text-white"
                : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
            }`}
          >
            Accepted ({counts.accepted || 0})
          </button>
          <button
            type="button"
            onClick={() => { setStatusFilter("rejected"); setCurrentPage(1); }}
            className={`rounded-lg px-3.5 py-1.5 font-medium transition ${
              statusFilter === "rejected"
                ? "bg-rose-700 text-white"
                : "bg-rose-50 text-rose-900 hover:bg-rose-100"
            }`}
          >
            Rejected ({counts.rejected || 0})
          </button>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search patient, phone, or code"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </div>
      </div>

      {isLoading && <p className="py-8 text-sm text-slate-600">Loading online requests...</p>}
      {!isLoading && error && (
        <p className="py-6 text-sm text-red-600" role="alert">Could not load or update requests: {error}</p>
      )}
      {!isLoading && !error && filteredRequests.length === 0 && (
        <div className="py-12 text-center text-sm text-slate-600">
          <p className="font-semibold text-slate-800">No requests found</p>
          <p className="mt-1 text-slate-500">
            {requests.length === 0
              ? "No online appointment requests submitted yet."
              : "No requests match the selected filter or search term."}
          </p>
        </div>
      )}
      {!isLoading && visibleRequests.length > 0 && (
        <div className="mt-6 grid gap-4">
          {visibleRequests.map((request) => {
            const patient = getPatient(request);
            const patientName = [patient?.first_name, patient?.last_name]
              .filter(Boolean)
              .join(" ") || "Patient";
            const cleanPhone = cleanWhatsAppPhone(patient?.phone);

            return (
              <article
                key={request.id}
                className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h2 className="text-base font-semibold text-slate-950">
                      <Link href={`/doctor/patients/${request.patient_id}`} className="hover:text-cyan-800">
                        {patientName}
                      </Link>
                    </h2>
                    <span className="text-xs font-medium text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                      {patient?.patient_code ?? "No patient code"}
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${requestStatusClasses(request.status)}`}>
                      {requestStatusLabel(request.status)}
                    </span>
                  </div>

                  {request.status === "pending" && (
                    <p className="mt-2 text-xs font-medium text-amber-900 bg-amber-50/80 border border-amber-200/80 rounded-md px-2.5 py-1.5 max-w-xl">
                      Action needed: Verify payment screenshot sent to WhatsApp (03001234567) before confirming.
                    </p>
                  )}

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <dt className="text-xs text-slate-500">Phone</dt>
                      <dd className="mt-1 break-words font-medium text-slate-800">{patient?.phone ?? "No phone"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Appointment type</dt>
                      <dd className="mt-1 font-medium text-slate-800">{request.appointment_type}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Requested date</dt>
                      <dd className="mt-1 font-medium text-slate-800">{formatDate(request.preferred_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Submitted at</dt>
                      <dd className="mt-1 text-slate-600">{formatDateTime(request.created_at)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0">
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      <span>WhatsApp Patient</span>
                    </a>
                  )}

                  {request.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        disabled={busyRequestId === request.id}
                        onClick={() => updateRequest(request, "accept")}
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                      >
                        {busyRequestId === request.id ? "Confirming..." : "Accept & Confirm"}
                      </button>
                      <button
                        type="button"
                        disabled={busyRequestId === request.id}
                        onClick={() => updateRequest(request, "reject")}
                        className="rounded-lg border border-rose-300 px-3 py-2 text-xs sm:text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </>
                  ) : request.status === "accepted" && request.appointment_id ? (
                    <Link
                      href={`/doctor/appointments/${request.appointment_id}`}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg bg-cyan-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-cyan-800"
                    >
                      View Appointment &rarr;
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">Request rejected</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!isLoading && filteredRequests.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filteredRequests.length}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onPageSizeChange={(nextSize) => { setPageSize(nextSize); setCurrentPage(1); }}
          />
        </div>
      )}
    </section>
  );
}
