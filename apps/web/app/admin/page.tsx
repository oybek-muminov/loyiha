export default function AdminPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-bold">Admin panel</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Kontent boshqaruvi keyingi bosqichda ulanadi. Hozircha API
        <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-sm dark:bg-slate-800">
          /v1/admin
        </code>
        endpoint&apos;lari tayyorlanmoqda.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Fanlar', "6 ta fan, Fizika pilot"],
          ['Darslar', 'Video + konspekt'],
          ['Savollar', '300 ta item bank'],
          ['Imtihonlar', 'Milliy sertifikat, DTM'],
          ['Foydalanuvchilar', 'Beta guruh'],
          ['Audit', "Admin amallari tarixi"],
        ].map(([title, hint]) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
          >
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {hint}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
