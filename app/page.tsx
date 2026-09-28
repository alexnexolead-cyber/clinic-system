import AppointmentForm from "@/components/AppointmentForm";

export default function Home() {
  return (
    <main className="min-h-screen p-10">
      <h1 className="text-3xl font-bold">
        Clinic Appointment System
      </h1>

      <p className="mt-2">
        Book your appointment
      </p>

      <div className="mt-8">
        <AppointmentForm />
      </div>
    </main>
  );
}