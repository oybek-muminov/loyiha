import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-4">
        <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-600/15 dark:text-brand-100">
          Beta
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          UniverAcademy
        </h1>
        <p className="max-w-xl text-lg text-slate-600 dark:text-slate-300">
          Milliy sertifikat va DTM imtihonlariga tayyorgarlik: video darslar,
          yo&apos;l xaritasi va imtihon muhitini takrorlovchi testlar.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/tg"
          className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700"
        >
          Mini App&apos;ni ochish
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-slate-300 px-6 py-3 font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          Admin panel
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Yo'l xaritasi",
            text: "Fanni boshidan oxirigacha tartibli o'rganish.",
          },
          {
            title: 'Video darslar',
            text: "Qisqa, tushunarli va istalgan joyda tomosha qilinadi.",
          },
          {
            title: 'Imtihon simulyatsiyasi',
            text: 'Real format, vaqt va batafsil tahlil.',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
          >
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {item.text}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
