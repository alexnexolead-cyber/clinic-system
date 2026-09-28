"use client";

import { useParams } from "next/navigation";
import NewVisitForm from "@/src/components/visits/NewVisitForm";

export default function NewPatientVisitPage() {
  const params = useParams<{ id: string }>();
  const patientId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!/^[0-9a-f-]{36}$/i.test(patientId ?? "")) {
    return (
      <section className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:px-10">
        <p className="text-sm text-red-600" role="alert">
          Invalid patient ID.
        </p>
      </section>
    );
  }

  return <NewVisitForm patientId={patientId} />;
}
