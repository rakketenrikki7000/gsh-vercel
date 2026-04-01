import { GradientBadge } from '../app/ui'

const CommunityIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z" />
    <path d="M16 12a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5Z" />
    <path d="M3.5 19a4.5 4.5 0 0 1 9 0" />
    <path d="M13 19a3.8 3.8 0 0 1 7.5 0" />
  </svg>
)

const TraditionIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 3v5c0 4.5-2.8 7.7-7 10c-4.2-2.3-7-5.5-7-10V6l7-3Z" />
    <path d="M9.5 12l1.7 1.7L14.8 10" />
  </svg>
)

const YouthIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20c0-4.5 2-7.7 6-9c0 5-2.8 8.5-6 9Z" />
    <path d="M12 20c0-4.2-1.9-7-6-8.5c0 4.8 2.6 8 6 8.5Z" />
    <path d="M12 20V9" />
  </svg>
)

const FairplayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v16" />
    <path d="M6 7h12" />
    <path d="M8 7c0 3-1.5 5-4 6c2.5 1 4 3 4 6" />
    <path d="M16 7c0 3 1.5 5 4 6c-2.5 1-4 3-4 6" />
  </svg>
)

const AboutPage = () => (
  <div className="relative isolate w-full px-4 pt-12 sm:px-6 lg:px-10">
    <div className="absolute inset-0 -z-10 bg-grid-radial bg-[length:42px_42px] opacity-30" />
    <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent blur-3xl" />

    <header className="mx-auto mb-12 max-w-4xl text-center">
      <GradientBadge>Über Gut Schluck Hauset</GradientBadge>
      <h1 className="mt-4 font-display text-4xl font-semibold text-white sm:text-5xl">Tradition trifft Zukunft</h1>
      <p className="mt-4 text-lg text-slate-200/80">
        Seit 1973 stehen wir für Leidenschaft, Gemeinschaft und die Liebe zum Fussball.
        <br />
        Was als Dorfmannschaft begann,
        ist heute ein stolzer Verein mit einer grossen Familie.
      </p>
    </header>

    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      <div className="relative flex h-[520px] items-center justify-center overflow-hidden rounded-3xl lg:col-span-3">
        <img
          src="/Vereinsfoto.png"
          alt="Vereinsfoto GS Hauset"
          className="h-full w-full rounded-3xl object-cover drop-shadow-xl"
          loading="lazy"
        />
      </div>

      <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-soft lg:col-span-2">
        <h2 className="text-2xl font-semibold text-white">Unsere Geschichte</h2>
        <p className="text-sm text-slate-200/90">
          Gegründet 1973 von fussballbegeisterten Menschen aus Hauset, entwickelte sich Gut Schluck Hauset zu einem der
          respektiertesten Vereine der Region.
        </p>
        <p className="text-sm text-slate-200/90">
          Mit mehr als 100 Mitgliedern von Jugend bis Senioren leben wir Gemeinschaftsgeist, Fairplay und die Werte, die
          uns seit Jahrzehnten prägen.
        </p>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-50">
          Mehr als Fussball - wir sind eine Familie, die zusammenhält und gemeinsam träumt.
        </div>
      </div>
    </div>

    <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { icon: <CommunityIcon />, title: 'Gemeinschaft', body: 'Wir sind mehr als ein Verein - wir sind eine Familie' },
        { icon: <TraditionIcon />, title: 'Tradition', body: 'Über 50 Jahre Vereinsgeschichte prägen unsere Identität' },
        { icon: <YouthIcon />, title: 'Nachwuchs', body: 'Förderung junger Talente' },
        { icon: <FairplayIcon />, title: 'Fairplay', body: 'Respekt und Fairness sind die Grundpfeiler unseres Sports' },
      ].map((item) => (
        <div
          key={item.title}
          className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-soft"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-100">
            {item.icon}
          </div>
          <p className="text-base font-semibold text-white">{item.title}</p>
          <p className="text-sm text-slate-200/80">{item.body}</p>
        </div>
      ))}
    </div>
  </div>
)

export default AboutPage
