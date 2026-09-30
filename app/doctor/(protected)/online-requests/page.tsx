"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  if (status === "accepted") return "bg-emerald-50 text-emerald-800";
  if (status === "rejected") return "bg-red-50 text-red-800";
  return "bg-amber-50 text-amber-800";
}

export default function OnlineRequestsPage() {
  const [requests, setRequests] = useState<OnlineRequest[]>([]);
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
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Online Requests
        </h1>
      </header>

      {isLoading && <p className="py-8 text-sm text-slate-600">Loading online requests...</p>}
      {!isLoading && error && (
        <p className="py-6 text-sm text-red-600" role="alert">Could not load or update requests: {error}</p>
      )}
      {!isLoading && !error && requests.length === 0 && (
        <p className="py-8 text-sm text-slate-600">No online appointment requests.</p>
      )}
      {!isLoading && requests.length > 0 && (
        <div className="grid gap-3 sm:gap-4">
          {requests.map((request) => {
            const patient = getPatient(request);
            const patientName = [patient?.first_name, patient?.last_name]
              .filter(Boolean)
              .join(" ") || "Patient";

            return (
              <article key={request.id} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="font-semibold text-slate-950">
                      <Link href={`/doctor/patients/${request.patient_id}`} className="hover:text-cyan-800">
                        {patientName}
                      </Link>
                    </h2>
                    <span className="text-sm text-slate-500">{patient?.patient_code ?? "No patient code"}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${requestStatusClasses(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <dt className="text-xs text-slate-500">Phone</dt>
                      <dd className="mt-1 break-words text-slate-800">{patient?.phone ?? "No phone"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Appointment type</dt>
                      <dd className="mt-1 text-slate-800">{request.appointment_type}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Requested date</dt>
                      <dd className="mt-1 text-slate-800">{formatDate(request.preferred_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Created</dt>
                      <dd className="mt-1 text-slate-800">{formatDateTime(request.created_at)}</dd>
                    </div>
                  </dl>
                </div>
                {request.status === "pending" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyRequestId === request.id}
                      onClick={() => updateRequest(request, "accept")}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {busyRequestId === request.id ? "Working..." : "Accept"}
                    </button>
                    <button
                      type="button"
                      disabled={busyRequestId === request.id}
                      onClick={() => updateRequest(request, "reject")}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                ) : request.status === "accepted" && request.appointment_id ? (
                  <Link
                    href={`/doctor/appointments/${request.appointment_id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-cyan-200 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50"
                  >
                    View Appointment
                  </Link>
                ) : (
                  <span className="text-sm text-slate-500">Request retained</span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
