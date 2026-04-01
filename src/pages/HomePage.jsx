import { Card, GradientBadge, SponsorMarquee } from '../app/ui'

import { Link } from 'react-router-dom'

const HomePage = ({ user }) => {
  const tableHref = user ? '/tabelle' : '/tabelle-oeffentlich'

  return (
    <div className="relative isolate w-full px-4 pt-10 sm:px-6 lg:px-10">
    <div className="absolute inset-0 -z-10 bg-grid-radial bg-[length:40px_40px] opacity-30" />
    <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent blur-3xl" />

    <header className="mb-10 rounded-3xl border border-white/5 bg-slate-900/70 p-8 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-6">
        <div className="space-y-3">
          <GradientBadge>Gut Schluck Hauset - Fussball</GradientBadge>
          <h1 className="font-display text-4xl font-semibold text-white sm:text-5xl">
            Ergebnisse, Tabelle & News
          </h1>
          <p className="max-w-2xl text-lg text-slate-200/80">
            Gut Schluck Hauset - Fussball mit Herz in Ostbelgien. Tradition, Gemeinschaft und ein klarer Blick nach
            vorn.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={tableHref}
             className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              Zur Tabelle
            </Link>
            <Link
              to="/news"
             className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              News & Updates
            </Link>
          </div>
        </div>
      </div>
    </header>

    <SponsorMarquee />

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card title="Ein Verein mit Geschichte" kicker="Seit 1973" className="h-full">
        <p className="text-sm leading-7 text-slate-200/90">
          Gut Schluck Hauset steht seit Jahrzehnten für Zusammenhalt, Leidenschaft und echten Dorf-Fussball in
          Ostbelgien. Aus einer engagierten Gemeinschaft entstanden, lebt der Verein heute von Menschen, die sich Woche
          für Woche auf und neben dem Platz einsetzen.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-2xl font-semibold text-white">1973</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-emerald-200/70">Gründung</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-2xl font-semibold text-white">100+</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-emerald-200/70">Mitglieder</p>
          </div>
        </div>
        <div className="mt-5">
          <Link
            to="/ueber-uns"
             className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white shadow-inner transition hover:-translate-y-0.5 hover:border-sky-400/60 hover:bg-white/15 hover:text-sky-100 hover:shadow-[0_0_24px_rgba(56,189,248,0.35)]"
          >
            Mehr über den Verein
          </Link>
        </div>
      </Card>

      <Card title="Unser Zuhause" kicker="Sportplatz Hauset" className="h-full">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <img
            src="/Vereinsfoto.png"
            alt="Vereinsfoto Gut Schluck Hauset"
            className="h-48 w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-200/90">
          <p>
            Treffpunkt des Vereinslebens ist unser Platz in Hauset. Hier kommen Mannschaft, Mitglieder, Familien und
            Freunde zusammen.
          </p>
          <p>
            Kirchstrasse 97
            <br />
            4730 Hauset
          </p>
          <p className="text-slate-300/80">Parkplätze direkt vor Ort, Buslinie 722 bis Hauset Dorf.</p>
        </div>
        <div className="mt-4">
          <Link
            to="/anfahrt"
             className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white shadow-inner transition hover:-translate-y-0.5 hover:border-sky-400/60 hover:bg-white/15 hover:text-sky-100 hover:shadow-[0_0_24px_rgba(56,189,248,0.35)]"
          >
            Anfahrt ansehen
          </Link>
        </div>
      </Card>

      <Card title="Schnellzugriff" kicker="Direkt rein" className="h-full">
        <div className="space-y-3">
          <Link
            to={tableHref}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold text-white shadow-inner transition hover:-translate-y-0.5 hover:border-sky-400/60 hover:bg-white/15 hover:shadow-[0_0_24px_rgba(56,189,248,0.35)]"
          >
            <span>Ergebnisse und Tabelle</span>
          </Link>
          <Link
            to="/news"
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold text-white shadow-inner transition hover:-translate-y-0.5 hover:border-sky-400/60 hover:bg-white/15 hover:shadow-[0_0_24px_rgba(56,189,248,0.35)]"
          >
            <span>Aktuelle News</span>
          </Link>
          <Link
            to="/galerie"
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold text-white shadow-inner transition hover:-translate-y-0.5 hover:border-sky-400/60 hover:bg-white/15 hover:shadow-[0_0_24px_rgba(56,189,248,0.35)]"
          >
            <span>Fotos und Events</span>
          </Link>
          <Link
            to="/mannschaft"
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold text-white shadow-inner transition hover:-translate-y-0.5 hover:border-sky-400/60 hover:bg-white/15 hover:shadow-[0_0_24px_rgba(56,189,248,0.35)]"
          >
            <span>Mannschaft und Trainerstab</span>
          </Link>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-300/85">
          Alles Wichtige auf einen Blick: Spielbetrieb, Vereinsleben, Fotos und aktuelle Meldungen.
        </p>
      </Card>
    </div>
    </div>
  )
}


export default HomePage
