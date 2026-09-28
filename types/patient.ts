export type Patient = {
  id: string;
  patient_code: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  created_at: string;
};

export type PatientAttributes = Pick<
  Patient,
  "first_name" | "last_name" | "phone" | "city"
>;

export type PatientCodeReference = Pick<Patient, "patient_code">;

export type PatientAppointmentReference = Pick<
  Patient,
  "patient_code" | "first_name" | "last_name" | "phone" | "city"
>;

export type PatientAppointmentHistory = {
  id: string | number;
  appointment_type: string;
  preferred_date: string;
  status: string;
  created_at: string;
};
