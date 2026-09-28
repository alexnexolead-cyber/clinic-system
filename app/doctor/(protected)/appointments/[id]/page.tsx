"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppointmentCard from "@/src/components/appointments/AppointmentCard";
import { supabase } from "@/lib/supabase";
import type { AppointmentDetailRecord, AppointmentStatus } from "@/types/appointment";
import type { Patient } from "@/types/patient";

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const appointmentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const hasValidAppointmentId = Boolean(
    appointmentId &&
      (/^[0-9]+$/.test(appointmentId) || /^[0-9a-f-]{36}$/i.test(appointmentId)),
  );
  const [appointment, setAppointment] = useState<AppointmentDetailRecord | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(hasValidAppointmentId);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(
    hasValidAppointmentId ? "" : "Invalid appointment ID.",
  );

  useEffect(() => {
    let isMounted = true;

    if (!hasValidAppointmentId || !appointmentId) {
      return () => {
        isMounted = false;
      };
    }

    async function loadAppointment() {
      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .single();

      if (!isMounted) {
        return;
      }

      if (appointmentError) {
        console.error(
          "Supabase appointment detail fetch failed:",
          appointmentError,
        );
        setError(
          appointmentError.code === "PGRST116"
            ? "Appointment not found."
            : appointmentError.message,
        );
        setIsLoading(false);
        return;
      }

      if (!appointmentData) {
        setError("Appointment not found.");
        setIsLoading(false);
        return;
      }

      const appointment = appointmentData as unknown as AppointmentDetailRecord;
      let loadedPatient: Patient | null = null;

      if (appointment.patient_id) {
        const { data: patientData, error: patientError } = await supabase
          .from("patients")
          .select("*")
          .eq("id", appointment.patient_id)
          .single();

        if (patientError) {
          console.error(
            "Supabase patient detail fetch failed:",
            patientError,
          );
          setError(
            patientError.code === "PGRST116"
              ? "Patient information was not found."
              : patientError.message,
          );
        } else if (!patientData) {
          setError("Patient information was not found.");
        } else {
          loadedPatient = patientData as Patient;
        }
      } else {
        setError("This appointment has no patient relation.");
      }

      setAppointment(appointment);
      setPatient(loadedPatient);
      setIsLoading(false);
    }

    if (appointmentId) {
      loadAppointment();
    }

    return () => {
      isMounted = false;
    };
  }, [appointmentId, hasValidAppointmentId]);

  async function handleStatusChange(nextStatus: AppointmentStatus) {
    if (!appointment) {
      return;
    }

    setError("");
    setIsUpdating(true);

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status: nextStatus })
      .eq("id", appointment.id);

    if (updateError) {
      console.error("Supabase appointment status update failed:", updateError);
      setError(updateError.message);
      setIsUpdating(false);
      return;
    }

    setAppointment((current) =>
      current ? { ...current, status: nextStatus } : current,
    );
    setIsUpdating(false);
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <Link
        href="/doctor/appointments"
        className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
      >
        Back to appointments
      </Link>

      <header className="mt-6 border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Doctor workspace
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Appointment details
        </h2>
      </header>

      {isLoading && (
        <div className="py-12 text-sm text-slate-600">
          Loading appointment...
        </div>
      )}

      {!isLoading && error && !appointment && (
        <div className="py-12" role="alert">
          <p className="text-sm font-semibold text-red-700">
            Could not load appointment.
          </p>
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
      )}

      {!isLoading && appointment && (
        <div className="mt-8">
          {error && (
            <p className="mb-5 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <AppointmentCard
            appointment={appointment}
            patient={patient}
            isUpdating={isUpdating}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}
    </section>
  );
}
