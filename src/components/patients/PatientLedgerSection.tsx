"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PaymentStatusBadge from "@/src/components/ledger/PaymentStatusBadge";
import { supabase } from "@/lib/supabase";
import { getPaymentStatus, type LedgerEntry } from "@/types/operations";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(date));
}

function formatAmount(amount: number) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return safe.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PatientLedgerSection({
  patientId,
}: {
  patientId: string;
}) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadLedger() {
      const { data, error: fetchError } = await supabase
        .from("ledger_entries")
        .select("id, patient_id, visit_id, appointment_id, entry_type, amount, description, created_at, updated_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error("Supabase patient ledger fetch failed:", fetchError);
        setError(fetchError.message);
      } else {
        setEntries((data ?? []) as LedgerEntry[]);
      }
      setIsLoading(false);
    }

    loadLedger();
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  const totals = entries.reduce(
    (summary, entry) => {
      const val = Number(entry.amount);
      const safeAmount = Number.isFinite(val) ? val : 0;
      if (entry.entry_type === "charge") {
        summary.charges += safeAmount;
      } else {
        summary.payments += safeAmount;
      }
      return summary;
    },
    { charges: 0, payments: 0 },
  );
  const balance = totals.charges - totals.payments;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-cyan-200 hover:shadow-md sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">Patient Ledger</h2>
        <Link href={`/doctor/ledger?patientId=${patientId}`} className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">
          View full ledger &rarr;
        </Link>
      </div>
      {isLoading && <p className="mt-4 text-sm text-slate-500">Loading ledger...</p>}
      {!isLoading && error && (
        <p className="mt-4 text-sm text-red-600" role="alert">Could not load ledger: {error}</p>
      )}
      {!isLoading && !error && (
        <>
          <dl className="mt-4 grid gap-3 border-b border-slate-200 pb-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Total Charges (Billed)</dt>
              <dd className="mt-1 font-semibold text-slate-900">Rs. {formatAmount(totals.charges)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Total Paid (Received)</dt>
              <dd className="mt-1 font-semibold text-emerald-800">Rs. {formatAmount(totals.payments)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Payment Due / Outstanding</dt>
              <dd className={`mt-1 font-semibold ${balance > 0 ? "text-rose-700" : "text-emerald-800"}`}>
                Rs. {formatAmount(Math.max(0, balance))}
              </dd>
            </div>
          </dl>
          <div className="mt-3">
            <PaymentStatusBadge status={getPaymentStatus(totals.charges, totals.payments)} />
          </div>
          {entries.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No ledger entries recorded yet.</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-200">
              {entries.map((entry) => (
                <article key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-slate-950">{entry.description}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(entry.created_at)} · {entry.entry_type === "charge" ? "Charge" : "Payment"}
                    </p>
                  </div>
                  <p className={`font-semibold ${entry.entry_type === "charge" ? "text-amber-800" : "text-emerald-800"}`}>
                    {entry.entry_type === "charge" ? "+" : "-"}{formatAmount(Number(entry.amount))}
                  </p>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}