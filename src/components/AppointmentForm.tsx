"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  isAllowedPakistanCity,
  isValidPakistanMobile,
  isValidPersonName,
  normalizePakistanPhone,
  pakistanCities,
  sanitizePakistanPhone,
  sanitizePersonName,
} from "@/lib/patient-validation";
import type { PatientAttributes } from "@/types/patient";

type AppointmentType = "Physical Visit" | "Online Consultation";
type PatientMode = "new" | "existing";

type FormData = {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  appointmentType: AppointmentType | "";
  preferredDate: string;
};

const cities = pakistanCities;

function sanitizePatientCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);
}

function pakistanToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isValidBookingDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= pakistanToday();
}

const initialFormData: FormData = {
  firstName: "",
  lastName: "",
  phone: "",
  city: "",
  appointmentType: "",
  preferredDate: "",
};

async function submitOnlineRequest(identity: { patientCode: string } | { patientId: string }, preferredDate: string) {
  const response = await fetch("/api/book-appointment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...identity,
      appointmentType: "Online Consultation",
      preferredDate,
    }),
  });

  if (response.ok) {
    return null;
  }

  const responseBody: unknown = await response.json().catch(() => null);
  return typeof responseBody === "object" &&
    responseBody !== null &&
    "error" in responseBody &&
    typeof responseBody.error === "string"
    ? responseBody.error
    : "We could not submit your appointment. Please try again.";
}

function AppointmentForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [patientMode, setPatientMode] = useState<PatientMode>("new");
  const [patientCode, setPatientCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastSubmittedAppointmentType, setLastSubmittedAppointmentType] = useState<AppointmentType | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(
    field: keyof FormData,
    value: string,
  ) {
    const sanitizedValue = field === "firstName" || field === "lastName"
      ? sanitizePersonName(value)
      : field === "phone"
        ? sanitizePakistanPhone(value)
        : value;
    setFormData((current) => ({ ...current, [field]: sanitizedValue }));
    setError("");
    setSuccess("");
    setLastSubmittedAppointmentType("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const hasMissingField =
      !formData.appointmentType ||
      !formData.preferredDate.trim() ||
      (patientMode === "existing" && !patientCode.trim()) ||
      (patientMode === "new" && (
        !formData.firstName.trim() ||
        !formData.lastName.trim() ||
        !formData.phone.trim() ||
        !formData.city.trim()
      ));

    if (hasMissingField) {
      setError("Please complete all required fields.");
      return;
    }

    if (!isValidBookingDate(formData.preferredDate)) {
      setError("Choose today or a future date in Pakistan time.");
      return;
    }

    if (patientMode === "new" && (
      !isValidPersonName(formData.firstName) ||
      !isValidPersonName(formData.lastName)
    )) {
      setError("Enter valid first and last names using letters, spaces, apostrophes, or hyphens.");
      return;
    }

    const normalizedPhone = normalizePakistanPhone(formData.phone);
    if (patientMode === "new" && !isValidPakistanMobile(formData.phone)) {
      setError("Enter a valid Pakistan mobile number, for example 03001234567 or +923001234567.");
      return;
    }

    setIsSubmitting(true);

    try {
      const firstName = sanitizePersonName(formData.firstName);
      const lastName = sanitizePersonName(formData.lastName);
      const phone = normalizedPhone;
      const city = formData.city;

      if (patientMode === "new" && !isAllowedPakistanCity(city)) {
        setError("Choose a city from the list.");
        setIsSubmitting(false);
        return;
      }

      const patientAttributes: PatientAttributes = {
        first_name: firstName,
        last_name: lastName,
        phone,
        city,
      };

      if (patientMode === "new") {
        const { data: createdPatient, error: patientInsertError } = await supabase
          .from("patients")
          .insert(patientAttributes)
          .select("id")
          .single();

        if (patientInsertError || !createdPatient?.id) {
          console.error("Supabase patient creation failed:", patientInsertError);
          setError("We could not submit your appointment. Please try again.");
          return;
        }

        if (formData.appointmentType === "Online Consultation") {
          const requestError = await submitOnlineRequest(
            { patientId: createdPatient.id },
            formData.preferredDate,
          );
          if (requestError) {
            setError(requestError);
            return;
          }
        } else {
          const { error: appointmentInsertError } = await supabase
            .from("appointments")
            .insert({
              patient_id: createdPatient.id,
              ...patientAttributes,
              appointment_type: formData.appointmentType,
              preferred_date: formData.preferredDate,
              status: "confirmed",
            });

          if (appointmentInsertError) {
            console.error(
              "Supabase appointment creation failed:",
              appointmentInsertError,
            );
            setError("We could not submit your appointment. Please try again.");
            return;
          }
        }
      } else {
        if (formData.appointmentType === "Online Consultation") {
          const requestError = await submitOnlineRequest(
            { patientCode },
            formData.preferredDate,
          );
          if (requestError) {
            setError(requestError);
            return;
          }
        } else {
          const response = await fetch("/api/book-appointment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientCode,
              appointmentType: formData.appointmentType,
              preferredDate: formData.preferredDate,
            }),
          });
          const responseBody: unknown = await response.json();

          if (!response.ok) {
            const responseError =
              typeof responseBody === "object" &&
              responseBody !== null &&
              "error" in responseBody &&
              typeof responseBody.error === "string"
                ? responseBody.error
                : "We could not submit your appointment. Please try again.";
            setError(responseError);
            return;
          }
        }
      }

      setFormData(initialFormData);
      setPatientMode("new");
      setPatientCode("");
      setLastSubmittedAppointmentType(formData.appointmentType);
      setSuccess(formData.appointmentType === "Online Consultation"
        ? "Your booking form has been submitted successfully."
        : "Appointment submitted successfully.");
    } catch (submissionError) {
      console.error("Unexpected appointment submission error:", submissionError);
      setError(
        process.env.NODE_ENV === "development" &&
          submissionError instanceof Error
          ? submissionError.message
          : "We could not submit your appointment. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-2xl space-y-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8"
    >
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Book an appointment
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Complete the form and our clinic team will follow up with you.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-700">
          Are you an existing patient?
        </legend>
        <div className="flex gap-5 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="patientMode"
              value="new"
              checked={patientMode === "new"}
              onChange={() => {
                setPatientMode("new");
                setFormData(initialFormData);
                setPatientCode("");
                setError("");
                setSuccess("");
                setLastSubmittedAppointmentType("");
              }}
              disabled={isSubmitting}
              className="accent-blue-600"
            />
            No
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="patientMode"
              value="existing"
              checked={patientMode === "existing"}
              onChange={() => {
                setPatientMode("existing");
                setFormData(initialFormData);
                setPatientCode("");
                setError("");
                setSuccess("");
                setLastSubmittedAppointmentType("");
              }}
              disabled={isSubmitting}
              className="accent-blue-600"
            />
            Yes
          </label>
        </div>
      </fieldset>

      {patientMode === "existing" && (
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          Patient Code
          <input
            type="text"
            name="patientCode"
            value={patientCode}
            onChange={(event) => {
              setPatientCode(sanitizePatientCode(event.target.value));
              setError("");
              setSuccess("");
            }}
            placeholder="PAT-00001"
            required
            disabled={isSubmitting}
            autoCapitalize="characters"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      )}

      {patientMode === "new" && (
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          First Name
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={(event) => handleChange("firstName", event.target.value)}
            minLength={2}
            maxLength={60}
            autoComplete="given-name"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Last Name
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={(event) => handleChange("lastName", event.target.value)}
            minLength={2}
            maxLength={60}
            autoComplete="family-name"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Phone Number
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={(event) => handleChange("phone", event.target.value)}
            placeholder="03001234567"
            autoComplete="tel"
            inputMode="tel"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          City
          <select
            name="city"
            value={formData.city}
            onChange={(event) => {
              handleChange("city", event.target.value);
            }}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            <option value="" disabled>Select your city</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </label>

      </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
          Appointment Type
          <select
            name="appointmentType"
            value={formData.appointmentType}
            onChange={(event) =>
              handleChange("appointmentType", event.target.value)
            }
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            <option value="" disabled>
              Select an appointment type
            </option>
            <option value="Physical Visit">Physical Visit</option>
            <option value="Online Consultation">Online Consultation</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
          Preferred Date
          <input
            type="date"
            name="preferredDate"
            value={formData.preferredDate}
            onChange={(event) =>
              handleChange("preferredDate", event.target.value)
            }
            min={pakistanToday()}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      {lastSubmittedAppointmentType === "Online Consultation" && (
        <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p>Your booking form has been submitted successfully.</p>
          <p className="mt-2">
            Your appointment confirmation will only be completed after you send your payment screenshot on WhatsApp:{" "}
            <a href="https://wa.me/923001234567" target="_blank" rel="noreferrer" className="inline-block whitespace-nowrap font-bold text-emerald-800 underline underline-offset-2">
              03001234567
            </a>.
          </p>
          <p className="mt-2">After payment verification, your booking confirmation message will be sent to your WhatsApp number.</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {success && lastSubmittedAppointmentType !== "Online Consultation" && (
        <p role="status" className="text-sm text-green-700">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Submitting..." : "Submit appointment"}
      </button>
    </form>
  );
}

export default AppointmentForm;