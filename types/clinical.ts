export type PatientVitals = {
  id: string;
  patient_id: string;
  blood_pressure: string | null;
  pulse: number | null;
  temperature: number | null;
  weight: number | null;
  height: number | null;
  oxygen_saturation: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const visitStatuses = ["in_progress", "completed"] as const;
export type VisitStatus = (typeof visitStatuses)[number];

export type Visit = {
  id: string;
  patient_id: string;
  appointment_id: string | number | null;
  visit_date: string;
  visit_type: string | null;
  chief_complaint: string | null;
  diagnosis: string | null;
  clinical_notes: string | null;
  status: VisitStatus;
  created_at: string;
  updated_at: string;
};

export type Prescription = {
  id: string;
  visit_id: string;
  patient_id: string;
  created_at: string;
  updated_at: string;
};

export type PrescriptionItem = {
  id: string;
  prescription_id: string;
  medicine_id: string | number | null;
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  created_at: string;
};

export type PrescriptionDraft = Omit<PrescriptionItem, "id" | "prescription_id" | "created_at">;

export type VisitPrescriptionSummary = {
  id: string;
  visit_date: string;
  diagnosis: string | null;
  prescriptions: Array<{
    id: string;
    prescription_items: Pick<PrescriptionItem, "id" | "medicine_name">[];
  }>;
};
