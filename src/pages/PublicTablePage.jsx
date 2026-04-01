import { useMemo, useState } from 'react'
import { Card, GradientBadge } from '../app/ui'
import { computeStandings, formatDate, useI18n } from '../app/shared'

const PublicTablePage = ({ matches, activeTable }) => {
  const { t } = useI18n()
  const [publicFilter, setPublicFilter] = useState('all')
  const [matchdayFilter, setMatchdayFilter] = useState('all')
  const toMatchdayValue = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (value?.toDate) return value.toDate().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
  }
  const publicMatches = useMemo(() => {
    if (!activeTable) return []
    return matches.filter((match) => match.tableId === activeTable.id)
  }, [matches, activeTable])
  const matchdayOptions = useMemo(() => {
    const getMatchTime = (match) => {
      const sortValue = match?.date
      if (!sortValue) return 0
      if (sortValue?.toDate) return sortValue.toDate().getTime()
      const parsed = new Date(sortValue)
      return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
    }
    const seen = new Map()
    ;[...publicMatches]
      .sort((a, b) => getMatchTime(b) - getMatchTime(a))
      .forEach((match) => {
        const key = toMatchdayValue(match.date)
        if (key && !seen.has(key)) {
          seen.set(key, {
            value: key,
            label: formatDate(match.date),
          })
        }
      })
    return Array.from(seen.values())
  }, [publicMatches])
  const publicLiveFeedMatches = useMemo(() => {
    const getMatchTime = (match) => {
      const sortValue = match?.createdAt || match?.date
      if (!sortValue) return 0
      if (sortValue?.toDate) return sortValue.toDate().getTime()
      const parsed = new Date(sortValue)
      return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
    }
    const sorted = [...publicMatches].sort((a, b) => getMatchTime(b) - getMatchTime(a))
    if (matchdayFilter === 'all') return sorted.slice(0, 6)
    return sorted.filter((match) => toMatchdayValue(match.date) === matchdayFilter)
  }, [publicMatches, matchdayFilter])
  const standingsView = useMemo(
    () => computeStandings(publicMatches, publicFilter),
    [publicMatches, publicFilter],
  )
  const tableTitle = activeTable ? activeTable.name : t('nav_table')

  return (
    <div className="relative isolate w-full px-4 pt-10 sm:px-6 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-grid-radial bg-[length:40px_40px] opacity-30" />
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent blur-3xl" />
      <header className="mb-8">
        <GradientBadge>{t('public_badge')}</GradientBadge>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white">{tableTitle}</h1>
        <p className="text-slate-300/80">{t('public_subtitle')}</p>
      </header>
      <Card title={t('live_feed')} kicker="Live Feed" id="public-results" className="mb-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">Spieltag</p>
            <select
              value={matchdayFilter}
              onChange={(event) => setMatchdayFilter(event.target.value)}
              className="rounded-full border border-white/10 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-white outline-none transition hover:border-sky-300/60 focus:border-sky-300 focus:ring-2 focus:ring-sky-400/40"
            >
              <option value="all">Alle Spieltage</option>
              {matchdayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {publicLiveFeedMatches.length === 0 ? (
            <p className="text-sm text-slate-300/70">
              {activeTable
                ? matchdayFilter === 'all'
                  ? t('live_feed_empty')
                  : 'Keine Spiele fuer diesen Spieltag gefunden.'
                : t('live_feed_select')}
            </p>
          ) : (
            publicLiveFeedMatches.map((match) => {
              const isGsh = match.homeTeam === 'Gut Schluck Hauset' || match.awayTeam === 'Gut Schluck Hauset'
              return (
                <div
                  key={match.id}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                    isGsh
                      ? 'border-emerald-400/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                      : 'border-white/5 bg-white/5'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {match.homeTeam} <span className="text-emerald-200">vs</span> {match.awayTeam}
                    </p>
                    <p className="text-xs text-slate-300/70">{formatDate(match.date)}</p>
                  </div>
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                      isGsh ? 'bg-emerald-500/20 text-emerald-50' : 'bg-slate-900/80 text-emerald-100'
                    }`}
                  >
                    <span>{match.homeScore}</span>
                    <span>:</span>
                    <span>{match.awayScore}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>
      <Card title={tableTitle} kicker="Live Ranking">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          {[
            { value: 'all', label: t('public_filter_all') },
            { value: 'home', label: t('public_filter_home') },
            { value: 'away', label: t('public_filter_away') },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPublicFilter(opt.value)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                publicFilter === opt.value
                  ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-50 shadow shadow-emerald-500/30'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-emerald-300/50 hover:text-emerald-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Team</th>
                <th className="py-2 pr-3 font-medium">Sp</th>
                <th className="py-2 pr-3 font-medium">S</th>
                <th className="py-2 pr-3 font-medium">U</th>
                <th className="py-2 pr-3 font-medium">N</th>
                <th className="py-2 pr-3 font-medium">Tore</th>
                <th className="py-2 pr-3 font-medium">Diff</th>
                <th className="py-2 pr-3 font-medium text-right">Pkt</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {standingsView.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-4 text-center text-slate-300/70">
                    {t('public_no_data')}
                  </td>
                </tr>
              ) : (
                standingsView.map((row, idx) => (
                  <tr key={row.team} className="border-t border-white/5 hover:bg-white/5">
                    <td className="py-3 pr-3 text-slate-400">{idx + 1}</td>
                    <td className="py-3 pr-3 font-semibold text-white">{row.team}</td>
                    <td className="py-3 pr-3">{row.played}</td>
                    <td className="py-3 pr-3">{row.wins}</td>
                    <td className="py-3 pr-3">{row.draws}</td>
                    <td className="py-3 pr-3">{row.losses}</td>
                    <td className="py-3 pr-3">
                      {row.gf}:{row.ga}
                    </td>
                    <td className="py-3 pr-3">{row.gf - row.ga}</td>
                    <td className="py-3 pr-3 text-right font-semibold text-emerald-200">{row.points}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default PublicTablePage

