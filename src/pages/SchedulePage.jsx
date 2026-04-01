import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { Card, GradientBadge } from '../app/ui'
import { STADIUM_OPTIONS, TEAM_OPTIONS, formatDate, normalizeName, useI18n } from '../app/shared'

const SchedulePage = ({ user, isAdmin, playerProfiles = [] }) => {
  const { t } = useI18n()
  const [openLineupGameId, setOpenLineupGameId] = useState('')
  const [lineupFormationByGame, setLineupFormationByGame] = useState({})
  const [lineupAssignmentsByGame, setLineupAssignmentsByGame] = useState({})
  const [selectedLineupPlayerByGame, setSelectedLineupPlayerByGame] = useState({})
  const defaultDate = new Date().toLocaleDateString('sv-SE')
  const defaultHour = new Date().toLocaleTimeString('de-DE', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'Europe/Berlin',
  })
  const defaultMinute = String(
    Math.max(
      1,
      Math.min(
        59,
        Number(
          new Date().toLocaleTimeString('de-DE', {
            minute: '2-digit',
            hour12: false,
            timeZone: 'Europe/Berlin',
          }),
        ),
      ),
    ),
  ).padStart(2, '0')
  const [games, setGames] = useState([])
  const [loadingGames, setLoadingGames] = useState(true)
  const [gamesError, setGamesError] = useState('')
  const [savingGame, setSavingGame] = useState(false)
  const [editingGameId, setEditingGameId] = useState('')
  const [editForm, setEditForm] = useState({
    opponent: '',
    location: '',
    gshSide: 'home',
    date: defaultDate,
    meetTime: `${defaultHour}:${defaultMinute}`,
    startTime: `${defaultHour}:${defaultMinute}`,
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingGameId, setDeletingGameId] = useState('')
  const [nowTick, setNowTick] = useState(Date.now())
  const [openGameId, setOpenGameId] = useState('')
  const [gameForm, setGameForm] = useState({
    opponent: '',
    location: '',
    gshSide: 'home',
    date: defaultDate,
    meetTime: `${defaultHour}:${defaultMinute}`,
    startTime: `${defaultHour}:${defaultMinute}`,
  })
  const [votingId, setVotingId] = useState('')
  const [voteReasonsByGame, setVoteReasonsByGame] = useState({})
  const [openVoteDetailsByGame, setOpenVoteDetailsByGame] = useState({})

  useEffect(() => {
    const q = query(collection(db, 'schedule'), orderBy('date', 'asc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setGames(next)
        setLoadingGames(false)
      },
      (err) => {
        console.error(err)
        setGamesError('Konnte Spielplan nicht laden.')
        setLoadingGames(false)
      },
    )
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!user) {
      setVoteReasonsByGame({})
      return
    }
    setVoteReasonsByGame((prev) => {
      const next = { ...prev }
      games.forEach((game) => {
        const reason = game?.votes?.[user.uid]?.reason || ''
        if (typeof next[game.id] === 'undefined') next[game.id] = reason
      })
      return next
    })
  }, [games, user])

  const handleGameField = (field) => (event) => {
    setGameForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleEditField = (field) => (event) => {
    setEditForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleCreateGame = async (event) => {
    event.preventDefault()
    if (!isAdmin) return
    setGamesError('')
    if (!gameForm.opponent.trim()) {
      setGamesError('Bitte Gegner eintragen.')
      return
    }
    if (!gameForm.location.trim()) {
      setGamesError('Bitte Ort eintragen.')
      return
    }
    if (!gameForm.date) {
      setGamesError('Bitte Datum auswählen.')
      return
    }
    setSavingGame(true)
    try {
      await addDoc(collection(db, 'schedule'), {
        opponent: gameForm.opponent.trim(),
        location: gameForm.location.trim(),
        gshSide: gameForm.gshSide || 'home',
        date: gameForm.date,
        meetTime: gameForm.meetTime || null,
        startTime: gameForm.startTime || null,
        createdAt: serverTimestamp(),
        votes: {},
      })
      setGameForm((prev) => ({ ...prev, opponent: '', location: '' }))
    } catch (err) {
      console.error(err)
      setGamesError('Konnte Spiel nicht speichern.')
    } finally {
      setSavingGame(false)
    }
  }

  const handleVote = async (gameId, value, reason = '') => {
    if (!user) return
    setGamesError('')
    setVotingId(gameId)
    try {
      const displayName = user.displayName?.trim() || 'Spieler'
      const normalizedReason = value === 'yes' ? null : (reason || '').trim() || null
      await updateDoc(doc(db, 'schedule', gameId), {
        [`votes.${user.uid}`]: {
          status: value,
          name: displayName,
          email: user.email || null,
          reason: normalizedReason,
          updatedAt: serverTimestamp(),
        },
      })
      setVoteReasonsByGame((prev) => ({
        ...prev,
        [gameId]: normalizedReason || '',
      }))
    } catch (err) {
      console.error(err)
      setGamesError('Abstimmung fehlgeschlagen.')
    } finally {
      setVotingId('')
    }
  }

  const formationOptions = [
    { value: '4-3-3', label: '4-3-3' },
    { value: '4-4-2', label: '4-4-2' },
    { value: '4-3-1-2', label: '4-3-1-2' },
    { value: '3-4-2-1', label: '3-4-2-1' },
    { value: '4-1-4-1', label: '4-1-4-1' },
    { value: '4-5-1', label: '4-5-1' },
  ]

  const normalizeFormation = (formation) => {
    if (!formation) return '4-4-2'
    return formation.startsWith('1-') ? formation.slice(2) : formation
  }

  const formationSlots = (formation) => {
    const base = {
      '4-4-2': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LM', 'LCM', 'RCM', 'RM', 'LS', 'RS'],
      '4-3-3': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'CM', 'RCM', 'LW', 'ST', 'RW'],
      '4-3-1-2': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'CM', 'RCM', 'CAM', 'LS', 'RS'],
      '3-4-2-1': ['GK', 'LCB', 'CB', 'RCB', 'LM', 'LCM', 'RCM', 'RM', 'LAM', 'RAM', 'ST'],
      '4-1-4-1': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'CDM', 'LM', 'LCM', 'RCM', 'RM', 'ST'],
      '4-5-1': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LM', 'LCM', 'CM', 'RCM', 'RM', 'ST'],
    }
    const key = normalizeFormation(formation)
    return base[key] || base['4-4-2']
  }

  const formationLayout = (formation) => {
    const key = normalizeFormation(formation)
    const slots = formationSlots(key)
    const layouts = {
      '4-4-2': [
        { x: 50, y: 88 }, // GK
        { x: 15, y: 70 }, { x: 38, y: 70 }, { x: 62, y: 70 }, { x: 85, y: 70 }, // DEF
        { x: 15, y: 48 }, { x: 38, y: 48 }, { x: 62, y: 48 }, { x: 85, y: 48 }, // MID
        { x: 38, y: 26 }, { x: 62, y: 26 }, // ST
      ],
      '4-3-3': [
        { x: 50, y: 88 },
        { x: 15, y: 70 }, { x: 38, y: 70 }, { x: 62, y: 70 }, { x: 85, y: 70 },
        { x: 30, y: 50 }, { x: 50, y: 46 }, { x: 70, y: 50 },
        { x: 18, y: 24 }, { x: 50, y: 18 }, { x: 82, y: 24 },
      ],
      '4-3-1-2': [
        { x: 50, y: 88 },
        { x: 15, y: 70 }, { x: 38, y: 70 }, { x: 62, y: 70 }, { x: 85, y: 70 },
        { x: 30, y: 52 }, { x: 50, y: 48 }, { x: 70, y: 52 },
        { x: 50, y: 34 },
        { x: 38, y: 20 }, { x: 62, y: 20 },
      ],
      '3-4-2-1': [
        { x: 50, y: 88 },
        { x: 25, y: 70 }, { x: 50, y: 70 }, { x: 75, y: 70 },
        { x: 15, y: 52 }, { x: 35, y: 52 }, { x: 65, y: 52 }, { x: 85, y: 52 },
        { x: 35, y: 32 }, { x: 65, y: 32 },
        { x: 50, y: 16 },
      ],
      '4-1-4-1': [
        { x: 50, y: 88 },
        { x: 15, y: 70 }, { x: 38, y: 70 }, { x: 62, y: 70 }, { x: 85, y: 70 },
        { x: 50, y: 56 },
        { x: 15, y: 44 }, { x: 38, y: 44 }, { x: 62, y: 44 }, { x: 85, y: 44 },
        { x: 50, y: 20 },
      ],
      '4-5-1': [
        { x: 50, y: 88 },
        { x: 15, y: 70 }, { x: 38, y: 70 }, { x: 62, y: 70 }, { x: 85, y: 70 },
        { x: 12, y: 48 }, { x: 32, y: 48 }, { x: 50, y: 44 }, { x: 68, y: 48 }, { x: 88, y: 48 },
        { x: 50, y: 20 },
      ],
    }
    const coords = layouts[key] || layouts['4-4-2']
    return slots.map((slot, idx) => ({ slot, ...coords[idx] }))
  }

  const getLineupFormation = (gameId) =>
    normalizeFormation(lineupFormationByGame[gameId]) || '4-4-2'

  const getLineupAssignments = (gameId) => lineupAssignmentsByGame[gameId] || {}

  const setLineupAssignment = (gameId, slot, playerKey) => {
    setLineupAssignmentsByGame((prev) => {
      const currentAssignments = prev[gameId] || {}
      const nextAssignments = Object.fromEntries(
        Object.entries(currentAssignments).filter(([, assignedPlayerKey]) => assignedPlayerKey !== playerKey),
      )
      nextAssignments[slot] = playerKey

      return {
        ...prev,
        [gameId]: nextAssignments,
      }
    })
  }

  const clearLineupAssignment = (gameId, slot) => {
    setLineupAssignmentsByGame((prev) => {
      const next = { ...(prev[gameId] || {}) }
      delete next[slot]
      return { ...prev, [gameId]: next }
    })
  }

  const resetLineupAssignments = (gameId) => {
    setLineupAssignmentsByGame((prev) => ({
      ...prev,
      [gameId]: {},
    }))
    setSelectedLineupPlayer(gameId, '')
  }

  const handleFormationChange = (gameId, nextFormation) => {
    setLineupFormationByGame((prev) => ({
      ...prev,
      [gameId]: nextFormation,
    }))
  }

  const getSelectedLineupPlayer = (gameId) => selectedLineupPlayerByGame[gameId] || ''
  const setSelectedLineupPlayer = (gameId, playerKey) => {
    setSelectedLineupPlayerByGame((prev) => ({ ...prev, [gameId]: playerKey || '' }))
  }

  const getGameDateTime = (game) => {
    if (!game?.date) return null
    const [y, m, d] = game.date.split('-').map(Number)
    const base = new Date(y, (m || 1) - 1, d || 1)
    if (Number.isNaN(base.getTime())) return null
    const time = (game.startTime || '00:00').split(':')
    const hours = Number(time[0] || 0)
    const minutes = Number(time[1] || 0)
    base.setHours(hours, minutes, 0, 0)
    return base
  }

  const isVotingClosed = (game) => {
    const gameDateTime = getGameDateTime(game)
    if (!gameDateTime) return false
    const closeDate = new Date(gameDateTime)
    closeDate.setDate(closeDate.getDate() - 4)
    return nowTick >= closeDate.getTime()
  }

  const getVotingCountdown = (game) => {
    const gameDateTime = getGameDateTime(game)
    if (!gameDateTime) return ''
    const closeDate = new Date(gameDateTime)
    closeDate.setDate(closeDate.getDate() - 4)
    const diffMs = closeDate.getTime() - nowTick
    if (diffMs <= 0) return 'Geschlossen'
    const totalMinutes = Math.floor(diffMs / 60000)
    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const minutes = totalMinutes % 60
    const parts = []
    if (days) parts.push(`${days}d`)
    if (hours) parts.push(`${hours}h`)
    parts.push(`${minutes}m`)
    return parts.join(' ')
  }

  const formatWeekday = (value) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toLocaleDateString('de-DE', { weekday: 'long', timeZone: 'Europe/Berlin' })
  }

  const startEditGame = (game) => {
    setEditingGameId(game.id)
    setEditForm({
      opponent: game.opponent || '',
      location: game.location || '',
      gshSide: game.gshSide || 'home',
      date: game.date || defaultDate,
      meetTime: game.meetTime || `${defaultHour}:${defaultMinute}`,
      startTime: game.startTime || `${defaultHour}:${defaultMinute}`,
    })
  }

  const cancelEditGame = () => {
    setEditingGameId('')
  }

  const handleUpdateGame = async (event) => {
    event.preventDefault()
    if (!isAdmin || !editingGameId) return
    setGamesError('')
    if (!editForm.opponent.trim()) {
      setGamesError('Bitte Gegner eintragen.')
      return
    }
    if (!editForm.location.trim()) {
      setGamesError('Bitte Ort eintragen.')
      return
    }
    if (!editForm.date) {
      setGamesError('Bitte Datum auswählen.')
      return
    }
    setSavingEdit(true)
    try {
      await updateDoc(doc(db, 'schedule', editingGameId), {
        opponent: editForm.opponent.trim(),
        location: editForm.location.trim(),
        gshSide: editForm.gshSide || 'home',
        date: editForm.date,
        meetTime: editForm.meetTime || null,
        startTime: editForm.startTime || null,
        updatedAt: serverTimestamp(),
      })
      setEditingGameId('')
    } catch (err) {
      console.error(err)
      setGamesError('Konnte Spiel nicht aktualisieren.')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteGame = async (gameId) => {
    if (!isAdmin || !gameId) return
    const ok = window.confirm('Spiel wirklich löschen?')
    if (!ok) return
    setGamesError('')
    setDeletingGameId(gameId)
    try {
      await deleteDoc(doc(db, 'schedule', gameId))
    } catch (err) {
      console.error(err)
      setGamesError('Konnte Spiel nicht löschen.')
    } finally {
      setDeletingGameId('')
    }
  }

  const handleVoteReasonChange = (gameId, value) => {
    setVoteReasonsByGame((prev) => ({
      ...prev,
      [gameId]: value,
    }))
  }

  const toggleVoteDetails = (gameId, status) => {
    setOpenVoteDetailsByGame((prev) => ({
      ...prev,
      [gameId]: prev[gameId] === status ? '' : status,
    }))
  }

  const toggleGameDetails = (gameId) => {
    setOpenGameId((prev) => (prev === gameId ? '' : gameId))
  }

  return (
    <div className="relative isolate w-full px-4 pt-10 sm:px-6 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-grid-radial bg-[length:40px_40px] opacity-30" />
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent blur-3xl" />
      <header className="mb-8">
        <GradientBadge>{t('schedule_badge')}</GradientBadge>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white">{t('schedule_title')}</h1>
        <p className="text-slate-300/80">{t('schedule_subtitle')}</p>
      </header>

      <div className="space-y-6">
        {isAdmin ? (
          <Card title="Spiel erstellen" kicker="Admin">
            <form className="space-y-4" onSubmit={handleCreateGame}>
              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                Gegner
                <select
                  value={gameForm.opponent}
                  onChange={handleGameField('opponent')}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                  required
                >
                  <option value="">Bitte wählen</option>
                    {TEAM_OPTIONS.filter((team) => team !== 'Gut Schluck Hauset').map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                Ort
                <select
                  value={gameForm.location}
                  onChange={handleGameField('location')}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                  required
                >
                  <option value="">Bitte wählen</option>
                  {STADIUM_OPTIONS.map((stadium) => (
                    <option key={stadium} value={stadium}>
                      {stadium}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                Gut Schluck Hauset
                <select
                  value={gameForm.gshSide}
                  onChange={handleGameField('gshSide')}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="home">Heim</option>
                  <option value="away">Auswärts</option>
                </select>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                  Datum
                  <input
                    type="date"
                    value={gameForm.date}
                    onChange={handleGameField('date')}
                    lang="de"
                    className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                    required
                  />
                </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                    Treffpunkt Stunde
                    <select
                      value={gameForm.meetTime.split(':')[0]}
                      onChange={(event) => {
                        const hour = event.target.value
                        const minute = gameForm.meetTime.split(':')[1] || '00'
                        setGameForm((prev) => ({ ...prev, meetTime: `${hour}:${minute}` }))
                      }}
                      className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                    >
                      {Array.from({ length: 24 }, (_, idx) => String(idx).padStart(2, '0')).map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                    Treffpunkt Minute
                    <select
                      value={gameForm.meetTime.split(':')[1]}
                      onChange={(event) => {
                        const minute = event.target.value
                        const hour = gameForm.meetTime.split(':')[0] || '00'
                        setGameForm((prev) => ({ ...prev, meetTime: `${hour}:${minute}` }))
                      }}
                      className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                    >
                      {Array.from({ length: 60 }, (_, idx) => String(idx).padStart(2, '0')).map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                    Spielbeginn Stunde
                    <select
                      value={gameForm.startTime.split(':')[0]}
                      onChange={(event) => {
                        const hour = event.target.value
                        const minute = gameForm.startTime.split(':')[1] || '00'
                        setGameForm((prev) => ({ ...prev, startTime: `${hour}:${minute}` }))
                      }}
                      className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                    >
                      {Array.from({ length: 24 }, (_, idx) => String(idx).padStart(2, '0')).map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                    Spielbeginn Minute
                    <select
                      value={gameForm.startTime.split(':')[1]}
                      onChange={(event) => {
                        const minute = event.target.value
                        const hour = gameForm.startTime.split(':')[0] || '00'
                        setGameForm((prev) => ({ ...prev, startTime: `${hour}:${minute}` }))
                      }}
                      className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                    >
                      {Array.from({ length: 60 }, (_, idx) => String(idx).padStart(2, '0')).map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              </div>
              {gamesError ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {gamesError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={savingGame}
                className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingGame ? 'Speichert...' : 'Spiel erstellen'}
              </button>
            </form>
          </Card>
        ) : null}

        <div className="space-y-4">
          {loadingGames ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300/70">
              Lade Spielplan...
            </div>
          ) : games.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300/70">
              Noch keine Spiele geplant.
            </div>
          ) : (
            games.map((game) => {
              const votes = game.votes || {}
              const values = Object.values(votes)
              const yesList = values.filter((v) => v?.status === 'yes')
              const noList = values.filter((v) => v?.status === 'no')
              const maybeList = values.filter((v) => v?.status === 'maybe')
              const userVote = user ? votes[user.uid]?.status : null
              const savedUserVoteReason = game?.votes?.[user?.uid || '']?.reason || ''
              const userVoteReason =
                typeof voteReasonsByGame[game.id] === 'string'
                  ? voteReasonsByGame[game.id]
                  : savedUserVoteReason
              const isEditing = editingGameId === game.id
              const openVoteDetails = openVoteDetailsByGame[game.id] || ''
              return (
                <div
                  key={game.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 transition hover:border-sky-300/40"
                >
                    {isEditing ? (
                      <form className="space-y-3" onSubmit={handleUpdateGame}>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                            Gegner
                            <select
                              value={editForm.opponent}
                              onChange={handleEditField('opponent')}
                              className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                              required
                            >
                              <option value="">Bitte wählen</option>
                              {TEAM_OPTIONS.filter((team) => team !== 'Gut Schluck Hauset').map((team) => (
                                <option key={team} value={team}>
                                  {team}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                            Ort
                            <select
                              value={editForm.location}
                              onChange={handleEditField('location')}
                              className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                              required
                            >
                              <option value="">Bitte wählen</option>
                              {STADIUM_OPTIONS.map((stadium) => (
                                <option key={stadium} value={stadium}>
                                  {stadium}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                            Gut Schluck Hauset
                            <select
                              value={editForm.gshSide}
                              onChange={handleEditField('gshSide')}
                              className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                            >
                              <option value="home">Heim</option>
                              <option value="away">Auswärts</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                            Datum
                            <input
                              type="date"
                              value={editForm.date}
                              onChange={handleEditField('date')}
                              lang="de"
                              className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                              required
                            />
                          </label>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                            Treffpunkt Stunde
                            <select
                              value={editForm.meetTime.split(':')[0]}
                              onChange={(event) => {
                                const hour = event.target.value
                                const minute = editForm.meetTime.split(':')[1] || '00'
                                setEditForm((prev) => ({ ...prev, meetTime: `${hour}:${minute}` }))
                              }}
                              className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                            >
                              {Array.from({ length: 24 }, (_, idx) => String(idx).padStart(2, '0')).map((hour) => (
                                <option key={hour} value={hour}>
                                  {hour}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                            Treffpunkt Minute
                            <select
                              value={editForm.meetTime.split(':')[1]}
                              onChange={(event) => {
                                const minute = event.target.value
                                const hour = editForm.meetTime.split(':')[0] || '00'
                                setEditForm((prev) => ({ ...prev, meetTime: `${hour}:${minute}` }))
                              }}
                              className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                            >
                              {Array.from({ length: 60 }, (_, idx) => String(idx).padStart(2, '0')).map((minute) => (
                                <option key={minute} value={minute}>
                                  {minute}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                            Spielbeginn Stunde
                            <select
                              value={editForm.startTime.split(':')[0]}
                              onChange={(event) => {
                                const hour = event.target.value
                                const minute = editForm.startTime.split(':')[1] || '00'
                                setEditForm((prev) => ({ ...prev, startTime: `${hour}:${minute}` }))
                              }}
                              className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                            >
                              {Array.from({ length: 24 }, (_, idx) => String(idx).padStart(2, '0')).map((hour) => (
                                <option key={hour} value={hour}>
                                  {hour}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                            Spielbeginn Minute
                            <select
                              value={editForm.startTime.split(':')[1]}
                              onChange={(event) => {
                                const minute = event.target.value
                                const hour = editForm.startTime.split(':')[0] || '00'
                                setEditForm((prev) => ({ ...prev, startTime: `${hour}:${minute}` }))
                              }}
                              className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                            >
                              {Array.from({ length: 60 }, (_, idx) => String(idx).padStart(2, '0')).map((minute) => (
                                <option key={minute} value={minute}>
                                  {minute}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            disabled={savingEdit}
                            className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingEdit ? 'Speichert...' : 'Speichern'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditGame}
                            className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-sky-300"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div
                          className="cursor-pointer"
                          onClick={() => toggleGameDetails(game.id)}
                        >
                          <p className="text-lg font-semibold text-white">
                            {game.gshSide === 'away'
                              ? `${game.opponent} vs Gut Schluck Hauset`
                              : `Gut Schluck Hauset vs ${game.opponent}`}
                          </p>
                          <div className="mt-3 text-white">
                            <div className="space-y-2 sm:hidden">
                              {[
                                { label: 'Datum', value: formatDate(game.date) },
                                { label: 'Treffpunkt', value: game.meetTime || '--:--' },
                                { label: 'Spielbeginn', value: game.startTime || '--:--' },
                                { label: 'Timer', value: getVotingCountdown(game) },
                              ].map((item) => (
                                <div key={item.label} className="flex items-baseline justify-between gap-3">
                                  <span className="text-xs uppercase tracking-[0.2em] text-slate-300/80">
                                    {item.label}
                                  </span>
                                  <span className="text-sm font-semibold text-white">{item.value}</span>
                                </div>
                              ))}
                            </div>
                            <div className="hidden sm:block">
                              <div className="grid grid-cols-[1.1fr_0.9fr_1.3fr_1.2fr] gap-2 sm:gap-10 px-1 text-sm uppercase tracking-[0.2em] text-slate-300/80">
                                <span className="text-center">Datum</span>
                                <span className="text-center">Treffpunkt</span>
                                <span className="text-center">Spielbeginn</span>
                                <span className="text-center">Timer</span>
                              </div>
                              <div className="mt-2 grid grid-cols-[1.1fr_0.9fr_1.3fr_1.2fr] gap-2 sm:gap-6 px-1 text-base font-semibold text-white">
                                <span className="text-center">{formatDate(game.date)}</span>
                                <span className="text-center">{game.meetTime || '--:--'}</span>
                                <span className="text-center">{game.startTime || '--:--'}</span>
                                <span className="text-center">{getVotingCountdown(game)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {isVotingClosed(game) ? null : null}
                          <button
                            type="button"
                            disabled={!user || votingId === game.id || isVotingClosed(game)}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleVote(game.id, 'yes')
                            }}
                            className={`rounded-full px-4 py-2 text-lg font-semibold transition ${
                              userVote === 'yes'
                                ? 'bg-emerald-500/20 text-emerald-50 border border-emerald-400/60'
                                : 'border border-white/10 bg-white/5 text-slate-200 hover:border-sky-300/60 hover:text-sky-100'
                            }`}
                          >
                            👍
                          </button>
                          <button
                            type="button"
                            disabled={!user || votingId === game.id || isVotingClosed(game)}
                            onClick={(e) => {
                              e.stopPropagation()
                              const nextReason = userVote === 'no' ? '' : (voteReasonsByGame[game.id] || '')
                              handleVote(game.id, 'maybe', nextReason)
                            }}
                            className={`rounded-full px-4 py-2 text-lg font-semibold transition ${
                              userVote === 'maybe'
                                ? 'bg-amber-500/20 text-amber-50 border border-amber-400/60'
                                : 'border border-white/10 bg-white/5 text-slate-200 hover:border-amber-300/50 hover:text-amber-50'
                            }`}
                          >
                            ?
                          </button>
                          <button
                            type="button"
                            disabled={!user || votingId === game.id || isVotingClosed(game)}
                            onClick={(e) => {
                              e.stopPropagation()
                              const nextReason = userVote === 'maybe' ? '' : (voteReasonsByGame[game.id] || '')
                              handleVote(game.id, 'no', nextReason)
                            }}
                            className={`rounded-full px-4 py-2 text-lg font-semibold transition ${
                              userVote === 'no'
                                ? 'bg-red-500/20 text-red-100 border border-red-400/60'
                                : 'border border-white/10 bg-white/5 text-slate-200 hover:border-red-300/50 hover:text-red-100'
                            }`}
                          >
                            👎
                          </button>
                          {isAdmin ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEditGame(game)
                                }}
                                className="rounded-full border border-emerald-400/50 bg-primary px-3 py-1 text-[11px] font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-sky-300"
                              >
                                Bearbeiten
                              </button>
                              <button
                                type="button"
                                disabled={deletingGameId === game.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteGame(game.id)
                                }}
                                className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-100 transition hover:border-red-400/70 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingGameId === game.id ? '...' : 'Löschen'}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {user && !isVotingClosed(game) && (userVote === 'maybe' || userVote === 'no') ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                        <label className="flex flex-col gap-2 text-sm text-slate-200/90">
                          {userVote === 'maybe' ? 'Grund für Vielleicht' : 'Grund für Absage'}
                          <textarea
                            value={userVoteReason}
                            onChange={(e) => handleVoteReasonChange(game.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            rows="3"
                            placeholder="Optionalen Grund eintragen..."
                            className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/40"
                          />
                        </label>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            disabled={!user || votingId === game.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleVote(game.id, userVote, voteReasonsByGame[game.id] || '')
                            }}
                            className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {votingId === game.id ? 'Speichert...' : 'Grund speichern'}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {openGameId === game.id ? (
                      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200/90">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Adresse</p>
                        {game.location ? (
                          (() => {
                            const [address, rest] = game.location.split(' (')
                            const detail = rest ? `(${rest}` : ''
                            return (
                              <div className="mt-2">
                                <p className="text-sm font-semibold text-white">{address}</p>
                                {detail ? (
                                  <p className="text-xs text-slate-300/80">{detail}</p>
                                ) : null}
                              </div>
                            )
                          })()
                        ) : (
                          <p className="mt-2">Keine Adresse hinterlegt.</p>
                        )}
                        {game.location ? (
                          <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
                            <iframe
                              title={`Karte ${game.location}`}
                              src={`https://maps.google.com/maps?q=${encodeURIComponent(game.location)}&z=16&output=embed`}
                              width="100%"
                              height="220"
                              allowFullScreen=""
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              className="border-0"
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {isAdmin ? (
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-50">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenLineupGameId((prev) => (prev === game.id ? '' : game.id))
                            }
                            className="text-left font-semibold text-emerald-50"
                          >
                            Dabei
                          </button>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {yesList.length
                              ? yesList.map((v) => {
                                  const resolvedName =
                                    v?.email && user?.email && v.email === user.email && user.displayName
                                      ? user.displayName
                                      : v?.name
                                  const label = resolvedName || 'Spieler'
                                  const match = playerProfiles.find(
                                    (p) => normalizeName(p?.name) === normalizeName(resolvedName),
                                  )
                                  return (
                                    <span
                                      key={`${v?.email || v?.name}-${v?.status}`}
                                      className="inline-flex flex-col items-center gap-1 text-[10px] font-semibold text-emerald-50"
                                    >
                                      <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-50">
                                        {match?.photo ? (
                                          <img
                                            src={match.photo}
                                            alt={label}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          (label || '?').slice(0, 1).toUpperCase()
                                        )}
                                      </span>
                                      <span className="max-w-[120px] truncate">{label}</span>
                                    </span>
                                  )
                                })
                              : '-'}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <button
                            type="button"
                            onClick={() => toggleVoteDetails(game.id, 'maybe')}
                            className="w-full rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-left text-xs text-amber-50"
                          >
                            <p className="font-semibold">Vielleicht</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {maybeList.length
                                ? maybeList.map((v) => {
                                      const resolvedName =
                                        v?.email && user?.email && v.email === user.email && user.displayName
                                          ? user.displayName
                                          : v?.name
                                      const label = resolvedName || 'Spieler'
                                      const match = playerProfiles.find(
                                        (p) => normalizeName(p?.name) === normalizeName(resolvedName),
                                      )
                                      return (
                                        <span
                                          key={`${v?.email || v?.name}-${v?.status}`}
                                          className="inline-flex flex-col items-center gap-1 text-[10px] font-semibold text-amber-50"
                                        >
                                          <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-amber-400/20 text-xs font-bold text-amber-50">
                                            {match?.photo ? (
                                              <img
                                                src={match.photo}
                                                alt={label}
                                                className="h-full w-full object-cover"
                                              />
                                            ) : (
                                              (label || '?').slice(0, 1).toUpperCase()
                                            )}
                                          </span>
                                          <span className="max-w-[120px] truncate">{label}</span>
                                        </span>
                                      )
                                    })
                                : '-'}
                            </div>
                          </button>
                          {openVoteDetails === 'maybe' ? (
                            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-4 text-xs text-amber-50">
                              <p className="font-semibold">Gründe für Vielleicht</p>
                              <div className="mt-3 grid gap-3">
                                {maybeList.length
                                  ? maybeList.map((v) => {
                                      const resolvedName =
                                        v?.email && user?.email && v.email === user.email && user.displayName
                                          ? user.displayName
                                          : v?.name
                                      const label = resolvedName || 'Spieler'
                                      const match = playerProfiles.find(
                                        (p) => normalizeName(p?.name) === normalizeName(resolvedName),
                                      )
                                      return (
                                        <div
                                          key={`detail-${v?.email || v?.name}-${v?.status}`}
                                          className="flex items-start gap-3 rounded-lg border border-amber-300/20 bg-black/10 p-3"
                                        >
                                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-400/20 text-xs font-bold text-amber-50">
                                            {match?.photo ? (
                                              <img
                                                src={match.photo}
                                                alt={label}
                                                className="h-full w-full object-cover"
                                              />
                                            ) : (
                                              (label || '?').slice(0, 1).toUpperCase()
                                            )}
                                          </span>
                                          <div className="min-w-0">
                                            <p className="font-semibold text-amber-50">{label}</p>
                                            <p className="mt-1 whitespace-pre-wrap break-words text-amber-100/90">
                                              {v?.reason || 'Kein Grund angegeben.'}
                                            </p>
                                          </div>
                                        </div>
                                      )
                                    })
                                  : <p>-</p>}
                              </div>
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => toggleVoteDetails(game.id, 'no')}
                            className="w-full rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-left text-xs text-red-100"
                          >
                            <p className="font-semibold">Nicht dabei</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {noList.length
                                ? noList.map((v) => {
                                    const resolvedName =
                                      v?.email && user?.email && v.email === user.email && user.displayName
                                        ? user.displayName
                                        : v?.name
                                    const label = resolvedName || 'Spieler'
                                    const match = playerProfiles.find(
                                      (p) => normalizeName(p?.name) === normalizeName(resolvedName),
                                    )
                                    return (
                                    <span
                                      key={`${v?.email || v?.name}-${v?.status}`}
                                      className="inline-flex flex-col items-center gap-1 text-[10px] font-semibold text-red-100"
                                    >
                                      <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-red-400/20 text-xs font-bold text-red-100">
                                        {match?.photo ? (
                                          <img
                                            src={match.photo}
                                            alt={label}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          (label || '?').slice(0, 1).toUpperCase()
                                        )}
                                      </span>
                                      <span className="max-w-[120px] truncate">{label}</span>
                                    </span>
                                  )
                                })
                                : '-'}
                            </div>
                          </button>
                          {openVoteDetails === 'no' ? (
                            <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-4 text-xs text-red-100">
                              <p className="font-semibold">Gründe für Nicht dabei</p>
                              <div className="mt-3 grid gap-3">
                                {noList.length
                                  ? noList.map((v) => {
                                      const resolvedName =
                                        v?.email && user?.email && v.email === user.email && user.displayName
                                          ? user.displayName
                                          : v?.name
                                      const label = resolvedName || 'Spieler'
                                      const match = playerProfiles.find(
                                        (p) => normalizeName(p?.name) === normalizeName(resolvedName),
                                      )
                                      return (
                                        <div
                                          key={`detail-${v?.email || v?.name}-${v?.status}`}
                                          className="flex items-start gap-3 rounded-lg border border-red-300/20 bg-black/10 p-3"
                                        >
                                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-400/20 text-xs font-bold text-red-100">
                                            {match?.photo ? (
                                              <img
                                                src={match.photo}
                                                alt={label}
                                                className="h-full w-full object-cover"
                                              />
                                            ) : (
                                              (label || '?').slice(0, 1).toUpperCase()
                                            )}
                                          </span>
                                          <div className="min-w-0">
                                            <p className="font-semibold text-red-100">{label}</p>
                                            <p className="mt-1 whitespace-pre-wrap break-words text-red-100/90">
                                              {v?.reason || 'Kein Grund angegeben.'}
                                            </p>
                                          </div>
                                        </div>
                                      )
                                    })
                                  : <p>-</p>}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {isAdmin && openLineupGameId === game.id ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                        <div className="grid gap-4 lg:grid-cols-[1fr_2fr_1fr] lg:items-start">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
                              Spieler (Dabei)
                            </p>
                            <div className="mt-2 grid grid-cols-1 gap-3">
                              {(() => {
                                const visibleSlots = new Set(formationSlots(getLineupFormation(game.id)))
                                const assignedKeys = new Set(
                                  Object.entries(getLineupAssignments(game.id) || {})
                                    .filter(([slot, playerKey]) => visibleSlots.has(slot) && playerKey)
                                    .map(([, playerKey]) => playerKey),
                                )
                                const availablePlayers = yesList.filter((v) => {
                                  const key = (v?.email || v?.name || '').toLowerCase()
                                  return key && !assignedKeys.has(key)
                                })
                                return availablePlayers.length ? (
                                  availablePlayers.map((v) => {
                                    const name = v?.name || v?.email || 'Spieler'
                                    const match = playerProfiles.find(
                                      (p) => normalizeName(p?.name) === normalizeName(name),
                                    )
                                    const key = (v?.email || v?.name || '').toLowerCase()
                                  return (
                                    <button
                                      key={key}
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', key)
                                      }}
                                      type="button"
                                      onClick={() =>
                                        setSelectedLineupPlayer(
                                          game.id,
                                          getSelectedLineupPlayer(game.id) === key ? '' : key,
                                        )
                                      }
                                      className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-semibold text-white ${
                                        getSelectedLineupPlayer(game.id) === key
                                          ? 'rounded-lg border border-emerald-400/60 bg-emerald-500/10'
                                          : ''
                                      }`}
                                    >
                                      <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-emerald-400/20 text-[10px] font-bold text-emerald-50">
                                        {match?.photo ? (
                                          <img
                                            src={match.photo}
                                            alt={name}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          name.slice(0, 1).toUpperCase()
                                        )}
                                      </span>
                                      <span className="max-w-[180px] truncate">{name}</span>
                                    </button>
                                  )
                                })
                                ) : (
                                  <p className="text-xs text-slate-400">Keine Zusagen.</p>
                                )
                              })()}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                          <div className="relative mx-auto w-full max-w-full overflow-hidden rounded-2xl border border-transparent bg-transparent p-0 sm:max-w-4xl sm:border-emerald-400/20 sm:bg-[radial-gradient(circle_at_50%_20%,rgba(16,185,129,0.25),transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.6),rgba(15,23,42,0.9))] sm:p-3">
                            <div className="relative aspect-[2/3] w-full rounded-xl border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.12),transparent_55%),linear-gradient(180deg,rgba(3,105,80,0.25),rgba(2,44,34,0.5))]">
                              <div className="absolute inset-1 rounded-lg border-[2px] border-emerald-200/50 sm:border-[3px]" />
                              <div className="absolute left-1 top-1 h-10 w-10 rounded-br-full border-b-[3px] border-r-[3px] border-emerald-200/45 hidden sm:block" />
                              <div className="absolute right-1 top-1 h-10 w-10 rounded-bl-full border-b-[3px] border-l-[3px] border-emerald-200/45 hidden sm:block" />
                              <div className="absolute left-1 bottom-1 h-10 w-10 rounded-tr-full border-t-[3px] border-r-[3px] border-emerald-200/45 hidden sm:block" />
                              <div className="absolute right-1 bottom-1 h-10 w-10 rounded-tl-full border-t-[3px] border-l-[3px] border-emerald-200/45 hidden sm:block" />
                              <div className="absolute left-1/2 top-1/2 w-[42%] -translate-x-1/2 -translate-y-1/2 aspect-square rounded-full border-[2px] border-emerald-200/45 sm:h-72 sm:w-72 sm:border-[3px]" />
                              <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-emerald-200/45 sm:h-[3px]" />
                              <div className="absolute left-1/2 top-1 h-[12%] w-[36%] -translate-x-1/2 rounded-b-lg border-[2px] border-emerald-200/45 sm:h-28 sm:w-56 sm:border-[3px]" />
                              <div className="absolute left-1/2 bottom-1 h-[12%] w-[36%] -translate-x-1/2 rounded-t-lg border-[2px] border-emerald-200/45 sm:h-28 sm:w-56 sm:border-[3px]" />
                              <div className="absolute left-1/2 top-1 h-[26%] w-[70%] -translate-x-1/2 rounded-b-xl border-[2px] border-emerald-200/45 sm:h-56 sm:w-[24rem] sm:border-[3px]" />
                              <div className="absolute left-1/2 bottom-1 h-[26%] w-[70%] -translate-x-1/2 rounded-t-xl border-[2px] border-emerald-200/45 sm:h-56 sm:w-[24rem] sm:border-[3px]" />

                              <div className="absolute left-1/2 top-[18%] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-emerald-200/80 sm:top-[11%]" />
                              <div className="absolute left-1/2 bottom-[18%] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-emerald-200/80 sm:bottom-[11%]" />
                              <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200/80" />
                              {formationLayout(getLineupFormation(game.id)).map(({ slot, x, y }) => {
                              const assigned = getLineupAssignments(game.id)[slot]
                              const assignedPlayer = yesList.find(
                                (v) =>
                                  (v?.email || v?.name || '').toLowerCase() ===
                                  (assigned || '').toLowerCase(),
                              )
                              const assignedName =
                                assignedPlayer?.name || assignedPlayer?.email || assigned || ''
                              const match = playerProfiles.find(
                                (p) => normalizeName(p?.name) === normalizeName(assignedName),
                              )
                              return (
                                <div
                                  key={slot}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault()
                                    const key = e.dataTransfer.getData('text/plain')
                                    if (key) setLineupAssignment(game.id, slot, key)
                                  }}
                                  onClick={() => {
                                    const selected = getSelectedLineupPlayer(game.id)
                                    if (selected) {
                                      setLineupAssignment(game.id, slot, selected)
                                      setSelectedLineupPlayer(game.id, '')
                                    }
                                  }}
                                  style={{ left: `${x}%`, top: `${y}%` }}
                                  className="absolute -translate-x-1/2 -translate-y-1/2 text-center text-[10px] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200/90">
                                      {slot}
                                    </span>
                                    {assignedName ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          clearLineupAssignment(game.id, slot)
                                        }}
                                        className="inline-flex flex-col items-center gap-1 text-[10px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
                                      >
                                        <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-400/20 text-[10px] font-bold text-emerald-50">
                                          {match?.photo ? (
                                            <img
                                              src={match.photo}
                                              alt={assignedName}
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            assignedName.slice(0, 1).toUpperCase()
                                          )}
                                        </span>
                                        <span className="max-w-[90px] truncate">{assignedName}</span>
                                      </button>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-slate-200">Leer</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                            </div>
                          </div>
                        </div>
                          <div className="flex flex-col items-start gap-2 lg:items-end">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
                              Formation
                            </p>
                            <div className="flex flex-wrap gap-3 lg:flex-col">
                              {formationOptions.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleFormationChange(game.id, opt.value)}
                                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                    getLineupFormation(game.id) === opt.value
                                      ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-50'
                                      : 'border-white/10 bg-white/5 text-slate-200 hover:border-sky-300/60'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => resetLineupAssignments(game.id)}
                              className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:border-red-400/70 hover:bg-red-500/20"
                            >
                              Zurücksetzen
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}


export default SchedulePage
