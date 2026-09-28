"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
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

const initialFormData: FormData = {
  firstName: "",
  lastName: "",
  phone: "",
  city: "",
  appointmentType: "",
  preferredDate: "",
};

function AppointmentForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [patientMode, setPatientMode] = useState<PatientMode>("new");
  const [patientCode, setPatientCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(
    field: keyof FormData,
    value: string,
  ) {
    setFormData((current) => ({ ...current, [field]: value }));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const hasMissingField =
      Object.values(formData).some((value) => !value.trim()) ||
      (patientMode === "existing" && !patientCode.trim());

    if (hasMissingField) {
      setError("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const firstName = formData.firstName.trim();
      const lastName = formData.lastName.trim();
      const phone = formData.phone.trim();
      const city = formData.city.trim();

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

        const { error: appointmentInsertError } = await supabase
          .from("appointments")
          .insert({
            patient_id: createdPatient.id,
            ...patientAttributes,
            appointment_type: formData.appointmentType,
            preferred_date: formData.preferredDate,
            status:
              formData.appointmentType === "Physical Visit"
                ? "confirmed"
                : "pending",
          });

        if (appointmentInsertError) {
          console.error(
            "Supabase appointment creation failed:",
            appointmentInsertError,
          );
          setError("We could not submit your appointment. Please try again.");
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

      setFormData(initialFormData);
      setPatientMode("new");
      setPatientCode("");
      setSuccess("Appointment submitted successfully");
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
              onChange={() => setPatientMode("new")}
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
              onChange={() => setPatientMode("existing")}
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
              setPatientCode(event.target.value);
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

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          First Name
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={(event) => handleChange("firstName", event.target.value)}
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
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          City
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={(event) => handleChange("city", event.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>

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
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {success && (
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