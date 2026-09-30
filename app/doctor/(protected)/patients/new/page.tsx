import Link from "next/link";
import PatientCreationForm from "@/src/components/patients/PatientCreationForm";

export default function NewPatientPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <Link
        href="/doctor/patients"
        className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
      >
        Back to patients
      </Link>
      <header className="mt-6 border-b border-slate-200 pb-7">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Doctor workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Add Patient
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter the patient details and review possible existing records before creation.
        </p>
      </header>
      <PatientCreationForm />
    </section>
  );
}
