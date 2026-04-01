import { Card, GradientBadge } from '../app/ui'

const AnfahrtPage = () => (
  <div className="relative isolate w-full px-4 pt-10 sm:px-6 lg:px-10">
    <div className="absolute inset-0 -z-10 bg-grid-radial bg-[length:40px_40px] opacity-30" />
    <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-emerald-500/15 via-transparent to-transparent blur-3xl" />
    <header className="mb-8">
      <GradientBadge>Anfahrt</GradientBadge>
      <h1 className="mt-3 font-display text-4xl font-semibold text-white">So findest du uns</h1>
      <p className="text-slate-300/80">Adresse, Parken und Karte für den schnellsten Weg zum GSH.</p>
    </header>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card title="Adresse" kicker="Gut Schluck Hauset Sportplatz">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <p className="text-sm text-slate-200/90">
              Kirchstrasse 97
              <br />
              4730 Hauset
            </p>
            <p className="text-xs text-slate-400">Parkplätze direkt vor dem Platz - Buslinie 722 bis "Hauset Dorf"</p>
            <a
              href="https://maps.google.com/?q=Kirchstra%C3%9Fe+97,+4730+Hauset"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              In Google Maps öffnen
            </a>
          </div>
          <div className="w-full max-w-lg md:ml-auto">
            <video
              src="/gs-hauset-spotplatz.mp4"
              className="h-[260px] w-full rounded-2xl object-cover shadow-soft"
              autoPlay
              loop
              muted
              playsInline
              controls
            >
              Dein Browser unterstützt kein Video-Tag.
            </video>
          </div>
        </div>
      </Card>
      <Card title="Karte" kicker="Lageplan">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-soft">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/30 pointer-events-none" />
          <iframe
            title="Karte Kirchstrasse 97, Hauset"
            src="https://maps.google.com/maps?q=Kirchstra%C3%9Fe%2097%2C%204730%20Hauset&z=16&output=embed"
            width="100%"
            height="320"
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="border-0"
          />
        </div>
      </Card>
    </div>
  </div>
)


export default AnfahrtPage

