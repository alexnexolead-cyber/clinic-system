"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PaymentStatusBadge from "@/src/components/ledger/PaymentStatusBadge";
import PaginationControls, { type PageSize } from "@/src/components/operations/PaginationControls";
import { supabase } from "@/lib/supabase";
import { getPaymentStatus, type LedgerEntry, type LedgerEntryType } from "@/types/operations";

type LedgerPatient = {
  id: string;
  patient_code: string | null;
  first_name: string | null;
  last_name: string | null;
};

type LedgerRow = LedgerEntry & {
  patients: Omit<LedgerPatient, "id"> | Omit<LedgerPatient, "id">[] | null;
};

const ledgerSelect = "id, patient_id, visit_id, appointment_id, entry_type, amount, description, created_at, updated_at, patients(patient_code, first_name, last_name)";

type LedgerSort =
  | "newest"
  | "oldest"
  | "amount-high"
  | "amount-low"
  | "patient-asc"
  | "patient-desc"
  | "description-asc"
  | "description-desc"
  | "status-asc"
  | "status-desc";

function getPatient(entry: LedgerRow) {
  return Array.isArray(entry.patients) ? entry.patients[0] ?? null : entry.patients;
}

function localDateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatAmount(amount: number) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return safe.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default function LedgerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<LedgerPatient[]>([]);
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [patientId, setPatientId] = useState("");
  const [entryType, setEntryType] = useState<LedgerEntryType>("charge");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [patientFilter, setPatientFilter] = useState(searchParams.get("patientId") ?? "all");
  const [typeFilter, setTypeFilter] = useState<LedgerEntryType | "all">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<LedgerSort>("newest");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadLedger() {
      const [patientResult, entryResult] = await Promise.all([
        supabase.from("patients").select("id, patient_code, first_name, last_name").order("created_at", { ascending: false }),
        supabase.from("ledger_entries").select(ledgerSelect).order("created_at", { ascending: false }),
      ]);

      if (!isMounted) {
        return;
      }

      if (patientResult.error || entryResult.error) {
        const loadError = patientResult.error ?? entryResult.error;
        console.error("Supabase ledger page fetch failed:", loadError);
        setError(loadError?.message ?? "Ledger could not be loaded.");
      } else {
        setPatients((patientResult.data ?? []) as LedgerPatient[]);
        setEntries((entryResult.data ?? []) as LedgerRow[]);
      }
      setIsLoading(false);
    }

    loadLedger();
    return () => {
      isMounted = false;
    };
  }, []);

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
  const patientPaymentTotals = entries.reduce((totalsByPatient, entry) => {
    const totals = totalsByPatient.get(entry.patient_id) ?? { charges: 0, paid: 0 };
    const val = Number(entry.amount);
    const safeAmount = Number.isFinite(val) ? val : 0;
    if (entry.entry_type === "charge") totals.charges += safeAmount;
    else totals.paid += safeAmount;
    totalsByPatient.set(entry.patient_id, totals);
    return totalsByPatient;
  }, new Map<string, { charges: number; paid: number }>());

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      const patient = getPatient(entry);
      const patientLabel = [patient?.patient_code, patient?.first_name, patient?.last_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const date = localDateKey(entry.created_at);

      return (patientFilter === "all" || entry.patient_id === patientFilter) &&
        (typeFilter === "all" || entry.entry_type === typeFilter) &&
        (!dateFrom || date >= dateFrom) &&
        (!dateTo || date <= dateTo) &&
        (!normalizedSearch || entry.description.toLowerCase().includes(normalizedSearch) || patientLabel.includes(normalizedSearch));
    });

    return filtered.sort((left, right) => {
      const leftAmount = Number.isFinite(Number(left.amount)) ? Number(left.amount) : 0;
      const rightAmount = Number.isFinite(Number(right.amount)) ? Number(right.amount) : 0;
      if (sort === "amount-high") return rightAmount - leftAmount;
      if (sort === "amount-low") return leftAmount - rightAmount;
      if (sort === "patient-asc" || sort === "patient-desc") {
        const pLeft = getPatient(left);
        const pRight = getPatient(right);
        const nameLeft = [pLeft?.first_name, pLeft?.last_name].filter(Boolean).join(" ");
        const nameRight = [pRight?.first_name, pRight?.last_name].filter(Boolean).join(" ");
        const cmp = nameLeft.localeCompare(nameRight);
        return sort === "patient-asc" ? cmp : -cmp;
      }
      if (sort === "description-asc" || sort === "description-desc") {
        const cmp = left.description.localeCompare(right.description);
        return sort === "description-asc" ? cmp : -cmp;
      }
      if (sort === "status-asc" || sort === "status-desc") {
        const stLeft = getPaymentStatus(
          patientPaymentTotals.get(left.patient_id)?.charges ?? 0,
          patientPaymentTotals.get(left.patient_id)?.paid ?? 0,
        );
        const stRight = getPaymentStatus(
          patientPaymentTotals.get(right.patient_id)?.charges ?? 0,
          patientPaymentTotals.get(right.patient_id)?.paid ?? 0,
        );
        const cmp = stLeft.localeCompare(stRight);
        return sort === "status-asc" ? cmp : -cmp;
      }
      const dateDifference = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      return sort === "oldest" ? dateDifference : -dateDifference;
    });
  }, [dateFrom, dateTo, entries, patientFilter, patientPaymentTotals, search, sort, typeFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const visibleEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleColumnSort(field: "date" | "patient" | "description" | "status" | "amount") {
    setSort((current) => {
      switch (field) {
        case "date":
          return current === "newest" ? "oldest" : "newest";
        case "patient":
          return current === "patient-asc" ? "patient-desc" : "patient-asc";
        case "description":
          return current === "description-asc" ? "description-desc" : "description-asc";
        case "status":
          return current === "status-asc" ? "status-desc" : "status-asc";
        case "amount":
          return current === "amount-high" ? "amount-low" : "amount-high";
      }
    });
    setCurrentPage(1);
  }

  async function createEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsedAmount = Number(amount);
    if (!patientId || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !description.trim()) {
      setError("Select a patient and enter a positive amount and description.");
      return;
    }

    setIsSaving(true);
    const { data, error: insertError } = await supabase
      .from("ledger_entries")
      .insert({
        patient_id: patientId,
        entry_type: entryType,
        amount: parsedAmount,
        description: description.trim(),
      })
      .select(ledgerSelect)
      .single();

    if (insertError) {
      console.error("Supabase ledger entry creation failed:", insertError);
      setError(insertError.message);
    } else {
      setEntries((current) => [data as LedgerRow, ...current]);
      setAmount("");
      setDescription("");
    }
    setIsSaving(false);
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Doctor workspace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Ledger</h1>
      </header>

      <section aria-label="Payment summary" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-600">Total Charges (Billed)</h2>
          <p className="mt-2 text-2xl font-bold text-slate-950">Rs. {formatAmount(totals.charges)}</p>
          <p className="mt-1 text-xs text-slate-500">Cumulative charges across all patients</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-600">Total Paid (Received)</h2>
          <p className="mt-2 text-2xl font-bold text-emerald-700">Rs. {formatAmount(totals.payments)}</p>
          <p className="mt-1 text-xs text-slate-500">Total payments collected to date</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-600">Payment Due / Outstanding</h2>
            <PaymentStatusBadge status={getPaymentStatus(totals.charges, totals.payments)} />
          </div>
          <p className={`mt-2 text-2xl font-bold ${balance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
            Rs. {formatAmount(Math.max(0, balance))}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {balance > 0 ? "Outstanding amount due from patients" : "All charges fully settled"}
          </p>
        </article>
      </section>

      <form onSubmit={createEntry} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Add ledger entry</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Patient
            <select required value={patientId} onChange={(event) => setPatientId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900">
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {[patient.patient_code, patient.first_name, patient.last_name].filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Entry type
            <select value={entryType} onChange={(event) => setEntryType(event.target.value as LedgerEntryType)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900">
              <option value="charge">Charge</option>
              <option value="payment">Payment</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Amount (enter a positive value)
            <input type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900" />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Description
            <input required value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900" />
          </label>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          {entryType === "charge"
            ? "A charge increases the patient balance due."
            : "A payment reduces the patient balance due."}
        </p>
        {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
        <button type="submit" disabled={isSaving || isLoading || patients.length === 0} className="mt-4 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {isSaving ? "Saving..." : "Add entry"}
        </button>
      </form>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">Ledger entries</h2>
          <p className="mt-1 text-sm text-slate-500">Charges increase the balance; payments reduce it.</p>
        </div>
        {isLoading && <p className="px-5 py-8 text-sm text-slate-600">Loading ledger...</p>}
        {!isLoading && error && entries.length === 0 && <p className="px-5 py-8 text-sm text-red-600">Ledger entries are unavailable until the operations migration is applied.</p>}
        {!isLoading && !error && entries.length === 0 && <p className="px-5 py-8 text-sm text-slate-600">No ledger entries recorded yet.</p>}
        {!isLoading && entries.length > 0 && (
          <>
          <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-6">
            <label className="space-y-1 text-xs font-semibold text-slate-600 xl:col-span-2">
              Search
              <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} placeholder="Description or patient" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              Patient
              <select value={patientFilter} onChange={(event) => { setPatientFilter(event.target.value); setCurrentPage(1); }} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900">
                <option value="all">All patients</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {[patient.patient_code, patient.first_name, patient.last_name].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              Type
              <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as LedgerEntryType | "all"); setCurrentPage(1); }} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900">
                <option value="all">All types</option>
                <option value="charge">Charges</option>
                <option value="payment">Payments</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              From
              <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => { setDateFrom(event.target.value); setCurrentPage(1); }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              To
              <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setCurrentPage(1); }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              Sort by
              <select value={sort} onChange={(event) => { setSort(event.target.value as LedgerSort); setCurrentPage(1); }} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="amount-high">Amount: high to low</option>
                <option value="amount-low">Amount: low to high</option>
                <option value="patient-asc">Patient: A to Z</option>
                <option value="patient-desc">Patient: Z to A</option>
                <option value="status-asc">Status: A to Z</option>
              </select>
            </label>
          </div>
          {visibleEntries.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-600">No ledger entries match these filters.</p>
          ) : <>
          <div className="divide-y divide-slate-200 xl:hidden">
            {visibleEntries.map((entry) => {
              const patient = getPatient(entry);
              return (
                <article
                  key={entry.id}
                  onClick={() => router.push(`/doctor/patients/${entry.patient_id}`)}
                  className="cursor-pointer space-y-2 px-4 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/doctor/patients/${entry.patient_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-slate-950 hover:text-cyan-800"
                      >
                        {[patient?.patient_code, patient?.first_name, patient?.last_name].filter(Boolean).join(" · ") || "Patient"}
                      </Link>
                      <p className="mt-1 text-sm text-slate-700">{entry.description}</p>
                      <div className="mt-2">
                        <PaymentStatusBadge status={getPaymentStatus(
                          patientPaymentTotals.get(entry.patient_id)?.charges ?? 0,
                          patientPaymentTotals.get(entry.patient_id)?.paid ?? 0,
                        )} />
                      </div>
                    </div>
                    <span className={`shrink-0 font-semibold ${entry.entry_type === "charge" ? "text-amber-800" : "text-emerald-800"}`}>
                      {entry.entry_type === "charge" ? "+" : "-"}{formatAmount(Number(entry.amount))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{formatDate(entry.created_at)} · {entry.entry_type === "charge" ? "Charge" : "Payment"}</span>
                    <span className="font-medium text-cyan-700">View profile &rarr;</span>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden max-h-[65vh] overflow-auto xl:block">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleColumnSort("date")}
                      className="inline-flex items-center gap-1 font-semibold uppercase hover:text-cyan-800"
                    >
                      Date
                      {sort === "newest" && <span>&darr;</span>}
                      {sort === "oldest" && <span>&uarr;</span>}
                    </button>
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleColumnSort("patient")}
                      className="inline-flex items-center gap-1 font-semibold uppercase hover:text-cyan-800"
                    >
                      Patient
                      {sort === "patient-asc" && <span>&uarr;</span>}
                      {sort === "patient-desc" && <span>&darr;</span>}
                    </button>
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleColumnSort("description")}
                      className="inline-flex items-center gap-1 font-semibold uppercase hover:text-cyan-800"
                    >
                      Description
                      {sort === "description-asc" && <span>&uarr;</span>}
                      {sort === "description-desc" && <span>&darr;</span>}
                    </button>
                  </th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleColumnSort("status")}
                      className="inline-flex items-center gap-1 font-semibold uppercase hover:text-cyan-800"
                    >
                      Payment status
                      {sort === "status-asc" && <span>&uarr;</span>}
                      {sort === "status-desc" && <span>&darr;</span>}
                    </button>
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleColumnSort("amount")}
                      className="inline-flex items-center gap-1 font-semibold uppercase hover:text-cyan-800"
                    >
                      Amount
                      {sort === "amount-high" && <span>&darr;</span>}
                      {sort === "amount-low" && <span>&uarr;</span>}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visibleEntries.map((entry) => {
                  const patient = getPatient(entry);
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => router.push(`/doctor/patients/${entry.patient_id}`)}
                      className="cursor-pointer transition-colors hover:bg-cyan-50/30"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(entry.created_at)}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                        <Link
                          href={`/doctor/patients/${entry.patient_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-cyan-800"
                        >
                          {[patient?.patient_code, patient?.first_name, patient?.last_name].filter(Boolean).join(" · ") || "Patient"}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{entry.description}</td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.entry_type === "charge" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                          {entry.entry_type === "charge" ? "Charge" : "Payment"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <PaymentStatusBadge status={getPaymentStatus(
                          patientPaymentTotals.get(entry.patient_id)?.charges ?? 0,
                          patientPaymentTotals.get(entry.patient_id)?.paid ?? 0,
                        )} />
                      </td>
                      <td className={`whitespace-nowrap px-5 py-4 text-right font-semibold ${entry.entry_type === "charge" ? "text-amber-800" : "text-emerald-800"}`}>
                        {entry.entry_type === "charge" ? "+" : "-"}{formatAmount(Number(entry.amount))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>}
          </>
        )}
        {!isLoading && entries.length > 0 && (
          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filteredEntries.length}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onPageSizeChange={(nextSize) => { setPageSize(nextSize); setCurrentPage(1); }}
          />
        )}
      </section>
    </section>
  );
}
