import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import LogoutButton from "@/components/doctor/LogoutButton";

const navigationItems = [
  { label: "Appointments", shortLabel: "Appointments", href: "/doctor/appointments" },
  { label: "Patients", shortLabel: "Patients", href: "/doctor/patients" },
  { label: "Online Requests", shortLabel: "Online Requests", href: "/doctor/online-requests" },
  { label: "Visits", shortLabel: "Visits", href: "/doctor/visits" },
  { label: "Prescriptions", shortLabel: "Prescriptions", href: "/doctor/prescriptions" },
  { label: "Ledger", shortLabel: "Ledger", href: "/doctor/ledger" },
  { label: "Settings", shortLabel: "Settings", href: "/doctor/settings" },
];

export default async function ProtectedDoctorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/doctor/login");
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-slate-950 text-slate-100 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-5 py-5 lg:block lg:px-6 lg:py-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                Clinic System
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">
                Doctor Portal
              </h1>
            </div>
            <LogoutButton />
          </div>

          <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:space-y-1 lg:px-4 lg:pb-6">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex min-w-max items-center rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                {item.shortLabel}
              </Link>
            ))}
          </nav>

          <div className="hidden border-t border-slate-800 px-6 py-5 text-xs leading-5 text-slate-500 lg:block">
            Portal workspace
            <br />
            Data connections will be added in a later phase.
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}