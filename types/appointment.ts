import type { PatientAppointmentReference } from "@/types/patient";

export const appointmentStatuses = [
  "confirmed",
  "pending",
  "cancelled",
  "completed",
] as const;

export type AppointmentStatus = (typeof appointmentStatuses)[number];

export type Appointment = {
  id: string | number;
  patient_id: string | null;
  patient:
    | PatientAppointmentReference
    | PatientAppointmentReference[]
    | null;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  appointment_type: string;
  preferred_date: string;
  status: AppointmentStatus;
};

export type AppointmentDetailRecord = {
  id: string | number;
  patient_id: string | null;
  status: AppointmentStatus;
  appointment_type: string;
  preferred_date: string;
  created_at: string;
  [field: string]: unknown;
};

