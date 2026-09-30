export default function SettingsPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Doctor workspace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Settings</h1>
      </header>

      <div className="mt-6 space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-950">Clinic Information</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Clinic name</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">Not configured</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Address and contact</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">Not configured</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-950">Doctor Profile</h2>
          <p className="mt-3 text-sm text-slate-600">Doctor profile fields are not configured.</p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-950">System Preferences</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Timezone</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">Uses browser local time</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Currency</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">Not configured</dd>
            </div>
          </dl>
        </section>
      </div>
    </section>
  );
}
