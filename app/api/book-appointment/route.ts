import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
type AppointmentType = "Physical Visit" | "Online Consultation";
const genericBookingError =
  "We could not submit your appointment. Please try again.";

function bookingError(message: string, status: number) {
  return NextResponse.json(
    {
      error:
        process.env.NODE_ENV === "development"
          ? message
          : genericBookingError,
    },
    { status },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRequiredString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function isAppointmentType(value: unknown): value is AppointmentType {
  return value === "Physical Visit" || value === "Online Consultation";
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return false;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const todayInPakistan = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  return value >= todayInPakistan;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid booking request." }, { status: 400 });
  }

  if (!isRecord(requestBody)) {
    return NextResponse.json({ error: "Invalid booking request." }, { status: 400 });
  }

  const patientCode = readRequiredString(requestBody.patientCode)?.toUpperCase();
  const patientId = readRequiredString(requestBody.patientId);
  const appointmentType = requestBody.appointmentType;
  const preferredDate = readRequiredString(requestBody.preferredDate);

  if (
    Boolean(patientCode) === Boolean(patientId) ||
    (patientId !== null && !isUuid(patientId)) ||
    !isAppointmentType(appointmentType) ||
    !preferredDate ||
    !isDateKey(preferredDate)
  ) {
    return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const missingCredentials = [
      !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
      !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    const configurationError = new Error(
      `Missing Supabase server configuration: ${missingCredentials.join(", ")}`,
    );
    console.error("Existing-patient booking configuration failed:", configurationError);
    return bookingError(configurationError.message, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let matchingPatients;
  try {
    const patientQuery = supabase
      .from("patients")
      .select("id, first_name, last_name, phone, city");
    const { data, error: patientLookupError } = patientCode
      ? await patientQuery.eq("patient_code", patientCode)
      : await patientQuery.eq("id", patientId!);

    if (patientLookupError) {
      console.error("Patient code lookup failed:", patientLookupError);
      return bookingError(
        `Patient code lookup failed: ${patientLookupError.message}`,
        500,
      );
    }

    matchingPatients = data ?? [];
  } catch (lookupError) {
    const message =
      lookupError instanceof Error ? lookupError.message : String(lookupError);
    console.error("Patient code lookup threw an error:", lookupError);
    return bookingError(`Patient code lookup failed: ${message}`, 500);
  }

  if (matchingPatients.length === 0) {
    return NextResponse.json(
      { error: "Patient code not found." },
      { status: 404 },
    );
  }

  if (matchingPatients.length > 1) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "Duplicate patient_code matches:",
        matchingPatients.map((patient) => patient.id),
      );
    }
    return NextResponse.json(
      { error: "Patient code is not unique. Please contact the clinic." },
      { status: 409 },
    );
  }

  const existingPatient = matchingPatients[0];
  try {
    if (appointmentType === "Online Consultation") {
      const { data: requestRecord, error: requestInsertError } = await supabase
        .from("online_appointment_requests")
        .insert({
          patient_id: existingPatient.id,
          appointment_type: appointmentType,
          preferred_date: preferredDate,
          status: "pending",
        })
        .select("id")
        .single();

      if (requestInsertError) {
        console.error("Online appointment request creation failed:", requestInsertError);
        return bookingError(
          `Online appointment request creation failed: ${requestInsertError.message}`,
          500,
        );
      }

      return NextResponse.json({ success: true, requestId: requestRecord.id }, { status: 201 });
    }

    const { error: appointmentInsertError } = await supabase
      .from("appointments")
      .insert({
        patient_id: existingPatient.id,
        first_name: existingPatient.first_name ?? "",
        last_name: existingPatient.last_name ?? "",
        phone: existingPatient.phone ?? "",
        city: existingPatient.city ?? "",
        appointment_type: appointmentType,
        preferred_date: preferredDate,
        status: "confirmed",
      });

    if (appointmentInsertError) {
      console.error("Appointment creation failed:", appointmentInsertError);
      return bookingError(
        `Appointment creation failed: ${appointmentInsertError.message}`,
        500,
      );
    }
  } catch (appointmentError) {
    const message =
      appointmentError instanceof Error
        ? appointmentError.message
        : String(appointmentError);
    console.error("Appointment creation threw an error:", appointmentError);
    return bookingError(`Appointment creation failed: ${message}`, 500);
  }

  return NextResponse.json({ success: true }, { status: 201 });
}