import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { Card, GradientBadge } from '../app/ui'
import { TEAM_OPTIONS, computeStandings, formatDate, useI18n } from '../app/shared'

const TablePage = ({
  matches,
  form,
  handleChange,
  handleSubmit,
  saving,
  error,
  isAdmin,
  tables,
  selectedTableId,
  onSelectTable,
  activeTable,
  tablesError,
  loadingTables,
  onDeleteTable,
}) => {
  const { t } = useI18n()
  const toTime = (value) => {
    if (!value) return 0
    if (value?.toDate) return value.toDate().getTime()
    const parsed = new Date(value).getTime()
    return Number.isNaN(parsed) ? 0 : parsed
  }
  const toMatchdayValue = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (value?.toDate) return value.toDate().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
  }

  const [rankingFilter, setRankingFilter] = useState('all')
  const [notes, setNotes] = useState([])
  const [notesError, setNotesError] = useState('')
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [noteForm, setNoteForm] = useState({ body: '' })
  const [savingNote, setSavingNote] = useState(false)
  const [noteExpanded, setNoteExpanded] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState('')
  const [deletingNoteId, setDeletingNoteId] = useState('')
  const [tableForm, setTableForm] = useState({ name: '' })
  const [creatingTable, setCreatingTable] = useState(false)
  const [tableCreateError, setTableCreateError] = useState('')
  const [deletingTableId, setDeletingTableId] = useState('')
  const [tableDeleteError, setTableDeleteError] = useState('')
  const [deletingMatchId, setDeletingMatchId] = useState('')
  const [matchDeleteError, setMatchDeleteError] = useState('')
  const [matchdayFilter, setMatchdayFilter] = useState('all')

  const activeMatches = useMemo(() => {
    if (!selectedTableId) return []
    return matches.filter((match) => !match.tableId || match.tableId === selectedTableId)
  }, [matches, selectedTableId])

  const matchdayOptions = useMemo(() => {
    const seen = new Map()
    ;[...activeMatches]
      .sort((a, b) => (toTime(b.date) ?? 0) - (toTime(a.date) ?? 0))
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
  }, [activeMatches])

  const liveFeedMatches = useMemo(() => {
    const sorted = [...activeMatches].sort((a, b) => (toTime(b.createdAt || b.date) ?? 0) - (toTime(a.createdAt || a.date) ?? 0))
    if (matchdayFilter === 'all') return sorted.slice(0, 6)
    return sorted.filter((match) => toMatchdayValue(match.date) === matchdayFilter)
  }, [activeMatches, matchdayFilter])

  const standingsView = useMemo(
    () => computeStandings(activeMatches, rankingFilter),
    [activeMatches, rankingFilter],
  )
  const tableTitle = activeTable ? activeTable.name : t('nav_table')

  const handleNoteChange = (event) => {
    setNoteForm({ body: event.target.value })
  }

  const resetNoteForm = () => {
    setNoteForm({ body: '' })
    setEditingNoteId('')
  }

  const handleTableField = (field) => (event) => {
    setTableForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleCreateTable = async (event) => {
    event.preventDefault()
    setTableCreateError('')
    const name = tableForm.name.trim()
    if (!name) {
      setTableCreateError('Bitte einen Tabellennamen eingeben.')
      return
    }
    setCreatingTable(true)
    try {
      const docRef = await addDoc(collection(db, 'tables'), {
        name,
        createdAt: serverTimestamp(),
      })
      setTableForm({ name: '' })
      onSelectTable?.(docRef.id)
    } catch (err) {
      console.error(err)
      setTableCreateError('Konnte Tabelle nicht erstellen.')
    } finally {
      setCreatingTable(false)
    }
  }

  const handleDeleteTable = async (tableId, label) => {
    if (!tableId || !onDeleteTable) return
    const ok = window.confirm(
      `Tabelle "${label}" wirklich löschen? Alle Spiele darin werden ebenfalls gelöscht.`,
    )
    if (!ok) return
    setTableDeleteError('')
    setDeletingTableId(tableId)
    try {
      await onDeleteTable(tableId)
    } catch (err) {
      console.error(err)
      setTableDeleteError('Konnte Tabelle nicht löschen.')
    } finally {
      setDeletingTableId('')
    }
  }

  const handleDeleteMatch = async (matchId) => {
    if (!matchId) return
    const ok = window.confirm('Dieses Ergebnis wirklich löschen?')
    if (!ok) return
    if (!selectedTableId) {
      setMatchDeleteError('Bitte zuerst eine Tabelle auswählen.')
      return
    }
    setMatchDeleteError('')
    setDeletingMatchId(matchId)
    try {
      await deleteDoc(doc(db, 'tables', selectedTableId, 'matches', matchId))
    } catch (err) {
      console.error(err)
      setMatchDeleteError('Konnte Ergebnis nicht löschen.')
    } finally {
      setDeletingMatchId('')
    }
  }

  const handleNoteSubmit = async (event) => {
    event.preventDefault()
    setNotesError('')
    if (!noteForm.body.trim()) {
      setNotesError('Bitte einen Text eingeben.')
      return
    }
    setSavingNote(true)
    try {
      if (editingNoteId) {
        await updateDoc(doc(db, 'notes', editingNoteId), {
          body: noteForm.body.trim(),
          updatedAt: serverTimestamp(),
        })
      } else {
        await addDoc(collection(db, 'notes'), {
          body: noteForm.body.trim(),
          createdAt: serverTimestamp(),
        })
      }
      resetNoteForm()
    } catch (err) {
      console.error(err)
      setNotesError('Konnte Notiz nicht speichern.')
    } finally {
      setSavingNote(false)
    }
  }

  const handleEditNote = (note) => {
    setNotesError('')
    setEditingNoteId(note.id)
    setNoteForm({ body: note.body || note.text || '' })
  }

  const handleDeleteNote = async (noteId) => {
    const ok = window.confirm('Diese Anmerkung wirklich löschen?')
    if (!ok) return
    setNotesError('')
    setDeletingNoteId(noteId)
    try {
      await deleteDoc(doc(db, 'notes', noteId))
      if (editingNoteId === noteId) {
        resetNoteForm()
      }
    } catch (err) {
      console.error(err)
      setNotesError('Konnte Notiz nicht löschen.')
    } finally {
      setDeletingNoteId('')
    }
  }

  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setNotes(next)
        setNoteExpanded(false)
        setLoadingNotes(false)
      },
      (err) => {
        console.error(err)
        setNotesError('Konnte Anmerkung nicht laden.')
        setLoadingNotes(false)
      },
    )
    return () => unsubscribe()
  }, [])

  return (
    <div className="relative isolate w-full px-4 pt-10 sm:px-6 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-grid-radial bg-[length:40px_40px] opacity-30" />
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent blur-3xl" />
      <header className="mb-8">
        <GradientBadge>{t('results_badge')}</GradientBadge>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white">{t('results_title')}</h1>
        <p className="text-slate-300/80">{t('results_subtitle')}</p>
      </header>

      <div className="space-y-6" id="report">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {isAdmin ? (
            <Card title={t('admin_manage_tables')} kicker="Admin">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
                    {t('admin_active_table')}
                  </p>
                  <div className="mt-2">
                    {loadingTables ? (
                      <p className="text-sm text-slate-300/70">{t('admin_loading_tables')}</p>
                    ) : tablesError ? (
                      <p className="text-sm text-red-200/90">{tablesError}</p>
                    ) : tables.length === 0 ? (
                      <p className="text-sm text-slate-300/70">{t('admin_no_table')}</p>
                    ) : (
                      <select
                        value={selectedTableId || ''}
                        onChange={(event) => onSelectTable?.(event.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                      >
                        {tables.map((table) => (
                          <option key={table.id} value={table.id}>
                            {table.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {selectedTableId && activeTable ? (
                    <button
                      type="button"
                      disabled={deletingTableId === selectedTableId}
                      onClick={() => handleDeleteTable(selectedTableId, activeTable.name)}
                      className="mt-3 inline-flex items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400/70 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingTableId === selectedTableId ? 'Lösche...' : t('admin_delete_table')}
                    </button>
                  ) : null}
                </div>

                <form className="space-y-3" onSubmit={handleCreateTable}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
                    {t('admin_new_table')}
                  </p>
                  <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                    {t('admin_table_name')}
                    <input
                      type="text"
                      value={tableForm.name}
                      onChange={handleTableField('name')}
                      className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                      placeholder={t('admin_table_placeholder')}
                    />
                  </label>
                  {tableCreateError ? (
                    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                      {tableCreateError}
                    </p>
                  ) : null}
                  {tableDeleteError ? (
                    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                      {tableDeleteError}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={creatingTable}
                    className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creatingTable ? t('admin_creating') : t('admin_create_table')}
                  </button>
                </form>
              </div>
            </Card>
          ) : null}

          {isAdmin ? (
            <Card title={t('workflow_results')} kicker="Workflow">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                  {t('workflow_table')}
                  {tables.length === 0 ? (
                    <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-100">
                      {t('workflow_no_table')}
                    </div>
                  ) : (
                    <select
                      value={selectedTableId || ''}
                      onChange={(event) => onSelectTable?.(event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                    >
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.name}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                    {t('workflow_home')}
                    <select
                      value={form.homeTeam}
                      onChange={handleChange('homeTeam')}
                      className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none ring-emerald-500/50 focus:border-emerald-300 focus:ring-2"
                    >
                      {TEAM_OPTIONS.map((team) => (
                        <option key={`home-${team}`}>{team}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                    {t('workflow_away')}
                    <select
                      value={form.awayTeam}
                      onChange={handleChange('awayTeam')}
                      className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none ring-orange-500/50 focus:border-orange-300 focus:ring-2"
                    >
                      {TEAM_OPTIONS.map((team) => (
                        <option key={`away-${team}`}>{team}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                    {t('workflow_home_score')}
                    <input
                      type="number"
                      min="0"
                      value={form.homeScore}
                      onChange={handleChange('homeScore')}
                      className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                    {t('workflow_away_score')}
                    <input
                      type="number"
                      min="0"
                      value={form.awayScore}
                      onChange={handleChange('awayScore')}
                      className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/40"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                    {t('workflow_date')}
                    <input
                      type="date"
                      value={form.date}
                      onChange={handleChange('date')}
                      className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20"
                      required
                    />
                  </label>
                </div>

                {error ? (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                    {error}
                  </p>
                ) : null}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/50 bg-primary px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? t('workflow_saving') : t('workflow_save')}
                  </button>
                </div>
              </form>
            </Card>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title={t('live_feed')} kicker="Live Feed" id="results">
            <div className="space-y-3">
              {matchDeleteError ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {matchDeleteError}
                </p>
              ) : null}
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
              {liveFeedMatches.length === 0 ? (
                <p className="text-sm text-slate-300/70">
                  {selectedTableId
                    ? matchdayFilter === 'all'
                      ? t('live_feed_empty')
                      : 'Keine Spiele für diesen Spieltag gefunden.'
                    : t('live_feed_select')}
                </p>
              ) : (
                liveFeedMatches.map((match) => {
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
                      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                        <div
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                            isGsh ? 'bg-emerald-500/20 text-emerald-50' : 'bg-slate-900/80 text-emerald-100'
                          }`}
                        >
                          <span>{match.homeScore}</span>
                          <span>:</span>
                          <span>{match.awayScore}</span>
                        </div>
                        {isAdmin ? (
                          <button
                            type="button"
                            disabled={deletingMatchId === match.id}
                            onClick={() => handleDeleteMatch(match.id)}
                            className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-100 transition hover:border-red-400/70 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingMatchId === match.id ? '...' : t('live_feed_delete')}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          <Card title={t('notes_title')} kicker="GSH" id="notes">
            <div className="space-y-4">
            {isAdmin ? (
              <form className="space-y-3" onSubmit={handleNoteSubmit}>
                <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                  {t('notes_label')}
                  <textarea
                    value={noteForm.body}
                    onChange={handleNoteChange}
                    className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                    rows="3"
                    placeholder={t('notes_placeholder')}
                  />
                </label>
                {notesError ? (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                    {notesError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={savingNote}
                  className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingNote ? t('notes_saving') : editingNoteId ? t('notes_update') : t('notes_save')}
                </button>
                {editingNoteId ? (
                  <button
                    type="button"
                    onClick={resetNoteForm}
                    className="ml-2 inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700"
                  >
                    {t('notes_cancel')}
                  </button>
                ) : null}
              </form>
            ) : null}

            <div className="space-y-3">
              {loadingNotes ? (
                <p className="text-sm text-slate-300/70">{t('notes_loading')}</p>
              ) : notesError ? (
                <p className="text-sm text-red-200/90">{notesError}</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-slate-300/70">{t('notes_empty')}</p>
              ) : (
                (() => {
                  const note = notes[0]
                  const noteText = note.body || note.text || ''
                  const wordList = noteText.trim() ? noteText.trim().split(/\s+/) : []
                  const isLong = wordList.length > 150
                  const displayText =
                    isLong && !noteExpanded ? `${wordList.slice(0, 150).join(' ')} ...` : noteText
                  return (
                    <div key={note.id} className="rounded-2xl border border-white/5 bg-white/5 p-3">
                      <p className="text-sm text-slate-200/90">{displayText}</p>
                      <p className="mt-1 text-[11px] text-slate-300/70">{formatDate(note.createdAt)}</p>
                      {isAdmin ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditNote(note)}
                            className="rounded-full border border-emerald-400/50 bg-primary px-3 py-1 text-[11px] font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700"
                          >
                            {t('notes_edit')}
                          </button>
                          <button
                            type="button"
                            disabled={deletingNoteId === note.id}
                            onClick={() => handleDeleteNote(note.id)}
                            className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-100 transition hover:border-red-400/70 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingNoteId === note.id ? '...' : t('notes_delete')}
                          </button>
                        </div>
                      ) : null}
                      {isLong ? (
                        <button
                          type="button"
                          onClick={() => setNoteExpanded((v) => !v)}
                          className="mt-2 text-xs font-semibold text-emerald-200 hover:text-emerald-100"
                        >
                          {noteExpanded ? t('notes_less') : t('notes_more')}
                        </button>
                      ) : null}
                    </div>
                  )
                })()
              )}
            </div>
            </div>
          </Card>
        </div>
      </div>

      <Card title={tableTitle} kicker="Live Ranking" id="standings" className="mt-12">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          {[
            { value: 'all', label: t('public_filter_all') },
            { value: 'home', label: t('public_filter_home') },
            { value: 'away', label: t('public_filter_away') },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRankingFilter(opt.value)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${rankingFilter === opt.value
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
                    Noch keine Daten. Erfasse das erste Ergebnis.
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


export { TablePage }


