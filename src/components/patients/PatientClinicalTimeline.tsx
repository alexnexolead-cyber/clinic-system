"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AppointmentTimelineRow = {
  id: string | number;
  appointment_type: string;
  preferred_date: string;
  created_at: string;
};

type VisitTimelineRow = {
  id: string;
  visit_date: string;
  visit_type: string | null;
  diagnosis: string | null;
  status: "in_progress" | "completed";
  prescriptions: Array<{
    id: string;
    prescription_items: Array<{ id: string; medicine_name: string }>;
  }>;
};

type TimelineEvent = {
  id: string;
  date: string;
  label: string;
  summary: string;
  href: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
}

export default function PatientClinicalTimeline({
  patientId,
}: {
  patientId: string;
}) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTimeline() {
      const [appointmentResult, visitResult] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, appointment_type, preferred_date, created_at")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("visits")
          .select("id, visit_date, visit_type, diagnosis, status, prescriptions(id, prescription_items(id, medicine_name))")
          .eq("patient_id", patientId)
          .order("visit_date", { ascending: false }),
      ]);

      if (!isMounted) {
        return;
      }

      if (appointmentResult.error || visitResult.error) {
        const timelineError = appointmentResult.error ?? visitResult.error;
        console.error("Supabase patient clinical timeline fetch failed:", timelineError);
        setError(timelineError?.message ?? "Clinical history could not be loaded.");
        setIsLoading(false);
        return;
      }

      const timelineEvents: TimelineEvent[] = (
        (appointmentResult.data ?? []) as AppointmentTimelineRow[]
      ).map((appointment) => ({
        id: `appointment-${appointment.id}`,
        date: appointment.created_at,
        label: "Appointment booked",
        summary: `${appointment.appointment_type} · scheduled ${formatDate(appointment.preferred_date)}`,
        href: `/doctor/appointments/${appointment.id}`,
      }));

      for (const visit of (visitResult.data ?? []) as VisitTimelineRow[]) {
        timelineEvents.push({
          id: `visit-${visit.id}`,
          date: visit.visit_date,
          label: visit.status === "completed" ? "Visit completed" : "Visit in progress",
          summary: visit.diagnosis || visit.visit_type || "Clinical visit",
          href: `/doctor/visits/${visit.id}`,
        });

        for (const prescription of visit.prescriptions ?? []) {
          const medicineNames = prescription.prescription_items
            .map((item) => item.medicine_name)
            .filter(Boolean);
          if (medicineNames.length > 0) {
            timelineEvents.push({
              id: `prescription-${prescription.id}`,
              date: visit.visit_date,
              label: "Prescription issued",
              summary: medicineNames.join(", "),
              href: `/doctor/visits/${visit.id}/prescription`,
            });
          }
        }
      }

      timelineEvents.sort(
        (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
      );
      setEvents(timelineEvents);
      setIsLoading(false);
    }

    loadTimeline();
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-cyan-200 hover:shadow-md sm:p-6 lg:col-span-2">
      <h2 className="text-base font-semibold text-slate-950">Clinical timeline</h2>
      {isLoading && <p className="mt-4 text-sm text-slate-500">Loading clinical history...</p>}
      {!isLoading && error && (
        <p className="mt-4 text-sm text-red-600" role="alert">Could not load clinical history: {error}</p>
      )}
      {!isLoading && !error && events.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">No appointments or clinical history recorded yet.</p>
      )}
      {!isLoading && !error && events.length > 0 && (
        <ol className="mt-5 divide-y divide-slate-200">
          {events.map((event) => (
            <li key={event.id} className="flex flex-col gap-1 py-4 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div>
                <time className="text-sm text-slate-500" dateTime={event.date}>
                  {formatDate(event.date)}
                </time>
                <p className="mt-1 font-semibold text-slate-950">{event.label}</p>
                <p className="mt-1 text-sm text-slate-600">{event.summary}</p>
              </div>
              <Link href={event.href} className="mt-1 text-sm font-semibold text-cyan-700 transition hover:text-cyan-900">
                View record
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}