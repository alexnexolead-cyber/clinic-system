export default function PortalPlaceholder({ title }: { title: string }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Doctor workspace
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          This portal section is ready for its data connection.
        </p>
      </header>
    </section>
  );
}
