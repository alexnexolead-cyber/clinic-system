"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PatientClinicalTimeline from "@/src/components/patients/PatientClinicalTimeline";
import PatientLedgerSection from "@/src/components/patients/PatientLedgerSection";
import PatientPrescriptionsSection from "@/src/components/patients/PatientPrescriptionsSection";
import PatientVitalsSection from "@/src/components/patients/PatientVitalsSection";
import PatientVisitsSection from "@/src/components/patients/PatientVisitsSection";
import type { Patient, PatientAppointmentHistory } from "@/types/patient";

const patientSelect =
  "id, patient_code, first_name, last_name, phone, city, created_at";
const appointmentSelect =
  "id, appointment_type, preferred_date, status, created_at";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function PatientField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value || "-"}</dd>
    </div>
  );
}

export default function PatientProfilePage() {
  const params = useParams<{ id: string }>();
  const patientId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isValidPatientId = /^[0-9a-f-]{36}$/i.test(patientId ?? "");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<PatientAppointmentHistory[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(isValidPatientId);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [error, setError] = useState(
    isValidPatientId ? "" : "Invalid patient ID.",
  );
  const [appointmentsError, setAppointmentsError] = useState("");

  useEffect(() => {
    let isMounted = true;

    if (!isValidPatientId || !patientId) {
      return () => {
        isMounted = false;
      };
    }

    async function loadPatientProfile() {
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select(patientSelect)
        .eq("id", patientId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (patientError) {
        console.error("Supabase patient profile fetch failed:", patientError);
        setError(patientError.message);
        setIsLoading(false);
        return;
      }

      if (!patientData) {
        setError("Patient not found.");
        setIsLoading(false);
        return;
      }

      setPatient(patientData as Patient);
      setIsLoading(false);
      setIsLoadingAppointments(true);

      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .select(appointmentSelect)
        .eq("patient_id", patientId)
        .order("preferred_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (appointmentError) {
        console.error(
          "Supabase patient appointments fetch failed:",
          appointmentError,
        );
        setAppointmentsError(appointmentError.message);
      } else {
        setAppointments((appointmentData ?? []) as PatientAppointmentHistory[]);
      }

      setIsLoadingAppointments(false);
    }

    loadPatientProfile();

    return () => {
      isMounted = false;
    };
  }, [isValidPatientId, patientId]);

  const fullName = [patient?.first_name, patient?.last_name]
    .filter(Boolean)
    .join(" ") || "-";

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <Link
        href="/doctor/patients"
        className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
      >
        Back to patients
      </Link>

      {isLoading && (
        <p className="py-12 text-sm text-slate-600">Loading patient profile...</p>
      )}

      {!isLoading && error && !patient && (
        <div className="py-12" role="alert">
          <p className="text-sm font-semibold text-red-700">
            Could not load patient profile.
          </p>
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
      )}

      {!isLoading && patient && (
        <>
          <header className="mt-6 border-b border-slate-200 pb-7">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Patient Profile
            </p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {fullName}
              </h1>
              <span className="text-sm font-semibold text-cyan-700">
                {patient.patient_code ?? "-"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <span>Phone: {patient.phone ?? "-"}</span>
              <span>City: {patient.city ?? "-"}</span>
              <span>Created: {formatDateTime(patient.created_at)}</span>
            </div>
          </header>

          <div className="mt-6 grid items-start gap-4 sm:gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-cyan-200 hover:shadow-md sm:p-6">
              <h2 className="text-base font-semibold text-slate-950">
                Personal Information
              </h2>
              <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <PatientField label="Patient code" value={patient.patient_code ?? "-"} />
                <PatientField label="Full name" value={fullName} />
                <PatientField label="Phone" value={patient.phone ?? "-"} />
                <PatientField label="City" value={patient.city ?? "-"} />
                <PatientField
                  label="Created date"
                  value={formatDateTime(patient.created_at)}
                />
              </dl>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-cyan-200 hover:shadow-md sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">Appointments</h2>
                <Link href="/doctor/appointments" className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">
                  All appointments
                </Link>
              </div>
              {isLoadingAppointments && (
                <p className="mt-4 text-sm text-slate-500">
                  Loading appointments...
                </p>
              )}
              {!isLoadingAppointments && appointmentsError && (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  Could not load appointments: {appointmentsError}
                </p>
              )}
              {!isLoadingAppointments &&
                !appointmentsError &&
                appointments.length === 0 && (
                  <p className="mt-4 text-sm text-slate-500">
                    No appointments found yet.
                  </p>
                )}
              {!isLoadingAppointments &&
                !appointmentsError &&
                appointments.length > 0 && (
                  <div className="mt-4 divide-y divide-slate-200">
                    {appointments.map((appointment) => (
                      <article
                        key={appointment.id}
                        className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {appointment.appointment_type}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatDate(appointment.preferred_date)} ·{" "}
                            <span className="capitalize">{appointment.status}</span>
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Created {formatDateTime(appointment.created_at)}
                          </p>
                        </div>
                        <Link
                          href={`/doctor/appointments/${appointment.id}`}
                          className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
                        >
                          View appointment
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
            </section>

            <PatientVisitsSection patientId={patient.id} />
            <PatientPrescriptionsSection patientId={patient.id} />
            <PatientVitalsSection patientId={patient.id} />
            <PatientLedgerSection patientId={patient.id} />
            <PatientClinicalTimeline patientId={patient.id} />
          </div>
        </>
      )}
    </section>
  );
}