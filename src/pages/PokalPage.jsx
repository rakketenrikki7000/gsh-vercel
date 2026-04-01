import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { deleteField, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { STADIUM_OPTIONS, TEAM_OPTIONS } from '../app/shared'
import { Card, GradientBadge } from '../app/ui'

const CUP_DOC_ID = 'main'
const FIRST_ROUND_SLOT_COUNT = 14
const BYE_LABEL = 'Freilos'
const LOSER_DRAW_LABEL = 'Verliererziehung'

const createEmptySlots = (size = FIRST_ROUND_SLOT_COUNT) => Array.from({ length: size }, () => '')

const roundTitlesFor = (count) => {
  if (count === 1) return ['Finale']
  if (count === 2) return ['Halbfinale', 'Finale']
  if (count === 3) return ['Viertelfinale', 'Halbfinale', 'Finale']
  if (count === 4) return ['Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale']
  return Array.from({ length: count }, (_, idx) => `Runde ${idx + 1}`)
}

const normalizeTeam = (team) => (team ? team : BYE_LABEL)

const parseScore = (value) => {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

const isValidGermanDateValue = (value) => {
  const normalized = toGermanDateValue(value)
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(normalized)
  if (!match) return false

  const [, dayText, monthText, yearText] = match
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)
  const date = new Date(year, month - 1, day)

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

const isValidTimeValue = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, idx) => String(idx).padStart(2, '0'))
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, idx) => String(idx).padStart(2, '0'))

const toGermanDateValue = (value) => {
  if (!value) return ''
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) return value

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!isoMatch) return value

  const [, year, month, day] = isoMatch
  return `${day}.${month}.${year}`
}

const toIsoDateValue = (value) => {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const deMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value)
  if (!deMatch) return value

  const [, day, month, year] = deMatch
  return `${year}-${month}-${day}`
}

const getTimeParts = (value) => {
  if (!value) return { hour: '', minute: '' }

  if (isValidTimeValue(value)) {
    const [hour, minute] = value.split(':')
    return { hour, minute }
  }

  const partialMatch = /^(\d{2})?:?(\d{2})?$/.exec(value)
  if (!partialMatch) return { hour: '', minute: '' }

  return {
    hour: partialMatch[1] || '',
    minute: partialMatch[2] || '',
  }
}

const getWinner = (match, result) => {
  const home = match.home
  const away = match.away

  if (!home || !away) return ''
  if (home === BYE_LABEL && away === BYE_LABEL) return ''
  if (home === LOSER_DRAW_LABEL || away === LOSER_DRAW_LABEL) return ''
  if (home === BYE_LABEL) return away
  if (away === BYE_LABEL) return home
  if (home.startsWith('Sieger ') || away.startsWith('Sieger ')) return ''
  if (!result) return ''

  const homeScore = parseScore(result.homeScore)
  const awayScore = parseScore(result.awayScore)
  if (homeScore === null || awayScore === null || homeScore === awayScore) return ''

  return homeScore > awayScore ? home : away
}

const getLoser = (match, result) => {
  const home = match.home
  const away = match.away

  if (!home || !away) return ''
  if (home === BYE_LABEL || away === BYE_LABEL || home === LOSER_DRAW_LABEL || away === LOSER_DRAW_LABEL)
    return ''
  if (home.startsWith('Sieger ') || away.startsWith('Sieger ')) return ''
  if (!result) return ''

  const homeScore = parseScore(result.homeScore)
  const awayScore = parseScore(result.awayScore)
  if (homeScore === null || awayScore === null || homeScore === awayScore) return ''

  return homeScore < awayScore ? home : away
}

const getFirstRoundLosers = (slots, results) => {
  const safeSlots =
    Array.isArray(slots) && slots.length === FIRST_ROUND_SLOT_COUNT ? slots : createEmptySlots()

  return Array.from({ length: FIRST_ROUND_SLOT_COUNT / 2 }, (_, matchIdx) => {
    const match = {
      id: `r1-m${matchIdx + 1}`,
      home: normalizeTeam(safeSlots[matchIdx * 2]),
      away: normalizeTeam(safeSlots[matchIdx * 2 + 1]),
    }

    return {
      matchId: match.id,
      team: getLoser(match, results?.[match.id]),
    }
  }).filter((entry) => entry.team)
}

const buildCupRounds = (slots, results, quarterfinalLoserSelections = {}) => {
  const safeSlots =
    Array.isArray(slots) && slots.length === FIRST_ROUND_SLOT_COUNT ? slots : createEmptySlots()
  const safeResults = results && typeof results === 'object' ? results : {}
  const rounds = []

  const firstRound = []
  for (let idx = 0; idx < FIRST_ROUND_SLOT_COUNT; idx += 2) {
    const matchNumber = idx / 2 + 1
    firstRound.push({
      id: `r1-m${matchNumber}`,
      home: normalizeTeam(safeSlots[idx]),
      away: safeSlots[idx + 1] ? normalizeTeam(safeSlots[idx + 1]) : BYE_LABEL,
    })
  }
  rounds.push({ title: '', matches: firstRound })

  let previousMatches = firstRound
  let roundNumber = 2

  while (previousMatches.length > 1) {
    const nextRound = []
    for (let idx = 0; idx < previousMatches.length; idx += 2) {
      const homeSource = previousMatches[idx]
      const awaySource = previousMatches[idx + 1]

      const homeWinner = getWinner(homeSource, safeResults[homeSource.id])
      const awayWinner = awaySource ? getWinner(awaySource, safeResults[awaySource.id]) : ''
      const loserOverrideHome =
        roundNumber === 2 ? quarterfinalLoserSelections[`r${roundNumber}-m${idx / 2 + 1}-home`] || '' : ''
      const loserOverrideAway =
        roundNumber === 2 ? quarterfinalLoserSelections[`r${roundNumber}-m${idx / 2 + 1}-away`] || '' : ''

      nextRound.push({
        id: `r${roundNumber}-m${idx / 2 + 1}`,
        home: homeWinner || loserOverrideHome || `Sieger ${homeSource.id.toUpperCase()}`,
        away: awaySource
          ? awayWinner || loserOverrideAway || `Sieger ${awaySource.id.toUpperCase()}`
          : loserOverrideAway || (roundNumber === 2 && idx / 2 + 1 === 4 ? LOSER_DRAW_LABEL : BYE_LABEL),
      })
    }
    rounds.push({ title: '', matches: nextRound })
    previousMatches = nextRound
    roundNumber += 1
  }

  const titles = roundTitlesFor(rounds.length)
  return rounds.map((round, idx) => ({
    ...round,
    title: titles[idx] || `Runde ${idx + 1}`,
  }))
}

const canEnterResult = (match) => {
  if (!match.home || !match.away) return false
  if (match.home === BYE_LABEL || match.away === BYE_LABEL) return false
  if (match.home === LOSER_DRAW_LABEL || match.away === LOSER_DRAW_LABEL) return false
  if (match.home.startsWith('Sieger ') || match.away.startsWith('Sieger ')) return false
  return true
}

const getMatchLabel = (roundIndex, matchIndex) => {
  if (roundIndex === 0) return `Spiel ${matchIndex + 1}`
  if (roundIndex === 1) return `Spiel ${matchIndex + 8}`
  if (roundIndex === 2) return `Spiel ${matchIndex + 12}`
  if (roundIndex === 3) return 'Spiel 14'
  return `Spiel ${matchIndex + 1}`
}

const showLoserDrawLabel = (roundIndex, matchIndex) => roundIndex === 1 && matchIndex === 3

const getDisplayTeamName = ({ team, roundIndex, matchIndex, useLoserDrawLabel }) => {
  if (team !== BYE_LABEL) return team || ''
  if (useLoserDrawLabel) return LOSER_DRAW_LABEL
  if (roundIndex === 0 && matchIndex === 6) return BYE_LABEL
  return ''
}

const getBracketBaseMatches = (roundCount) => 2 ** (roundCount - 1)

const getBracketUnit = (isAdmin, hasOpenMap) => {
  if (isAdmin) return 720
  return hasOpenMap ? 620 : 360
}

const getBracketHeight = (roundCount, isAdmin, hasOpenMap) =>
  getBracketBaseMatches(roundCount) * getBracketUnit(isAdmin, hasOpenMap)

const getMatchTop = (roundIndex, matchIndex, roundCount, isAdmin, hasOpenMap) => {
  const baseMatches = getBracketBaseMatches(roundCount)
  const unit = getBracketUnit(isAdmin, hasOpenMap)
  const span = baseMatches / Math.max(1, 2 ** (roundCount - roundIndex - 1))
  return (matchIndex * span + span / 2) * unit
}

const getMatchWinner = (match, results) => getWinner(match, results?.[match.id])

const PokalPage = ({ isAdmin }) => {
  const [loadingCup, setLoadingCup] = useState(true)
  const [cupError, setCupError] = useState('')
  const [savingCup, setSavingCup] = useState(false)
  const [savingResultId, setSavingResultId] = useState('')
  const [savingMetaId, setSavingMetaId] = useState('')
  const [resettingMatchId, setResettingMatchId] = useState('')
  const [savingLoserSlot, setSavingLoserSlot] = useState('')
  const [openMapMatchId, setOpenMapMatchId] = useState('')
  const mapToggleRefs = useRef({})
  const mapAnchorMatchIdRef = useRef('')
  const mapAnchorTopRef = useRef(0)
  const [savedSlots, setSavedSlots] = useState(createEmptySlots())
  const [draftSlots, setDraftSlots] = useState(createEmptySlots())
  const [savedResults, setSavedResults] = useState({})
  const [resultDrafts, setResultDrafts] = useState({})
  const [savedMatchMeta, setSavedMatchMeta] = useState({})
  const [matchMetaDrafts, setMatchMetaDrafts] = useState({})
  const [savedQuarterfinalLoserSelections, setSavedQuarterfinalLoserSelections] = useState({})

  useEffect(() => {
    const ref = doc(db, 'cup', CUP_DOC_ID)
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const data = snapshot.data() || {}
        const nextSlots =
          Array.isArray(data.firstRoundSlots) && data.firstRoundSlots.length === FIRST_ROUND_SLOT_COUNT
            ? data.firstRoundSlots
            : createEmptySlots()
        const nextResults = data.results && typeof data.results === 'object' ? data.results : {}
        const nextMatchMeta = data.matchMeta && typeof data.matchMeta === 'object' ? data.matchMeta : {}
        const nextQuarterfinalLoserSelections =
          data.quarterfinalLoserSelections && typeof data.quarterfinalLoserSelections === 'object'
            ? data.quarterfinalLoserSelections
            : {}

        setSavedSlots(nextSlots)
        setDraftSlots(nextSlots)
        setSavedResults(nextResults)
        setResultDrafts(nextResults)
        setSavedMatchMeta(nextMatchMeta)
        setMatchMetaDrafts(nextMatchMeta)
        setSavedQuarterfinalLoserSelections(nextQuarterfinalLoserSelections)
        setCupError('')
        setLoadingCup(false)
      },
      (err) => {
        console.error(err)
        setCupError('Konnte Pokaldaten nicht laden.')
        setLoadingCup(false)
      },
    )
    return () => unsubscribe()
  }, [])

  const cupRounds = useMemo(
    () => buildCupRounds(draftSlots, resultDrafts, savedQuarterfinalLoserSelections),
    [draftSlots, resultDrafts, savedQuarterfinalLoserSelections],
  )
  const hasOpenMap = !isAdmin && Boolean(openMapMatchId)
  const bracketHeight = useMemo(
    () => getBracketHeight(cupRounds.length, isAdmin, hasOpenMap),
    [cupRounds.length, hasOpenMap, isAdmin],
  )
  const firstRoundLosers = useMemo(() => getFirstRoundLosers(draftSlots, savedResults), [draftSlots, savedResults])

  const hasUnsavedChanges = useMemo(() => {
    if (draftSlots.length !== savedSlots.length) return true
    return draftSlots.some((slot, idx) => slot !== savedSlots[idx])
  }, [draftSlots, savedSlots])

  const updateSlot = (slotIndex, team) => {
    setDraftSlots((prev) => {
      const next = [...prev]
      const normalized = team || ''
      const existingIndex = next.findIndex((entry, idx) => idx !== slotIndex && entry === normalized)
      if (existingIndex >= 0) next[existingIndex] = ''
      next[slotIndex] = normalized
      return next
    })
  }

  const updateResultDraft = (matchId, field, value) => {
    setResultDrafts((prev) => ({
      ...prev,
      [matchId]: {
        homeScore: prev[matchId]?.homeScore ?? '',
        awayScore: prev[matchId]?.awayScore ?? '',
        [field]: value,
      },
    }))
  }

  const updateMatchMetaDraft = (matchId, field, value) => {
    setMatchMetaDrafts((prev) => ({
      ...prev,
      [matchId]: {
        location: prev[matchId]?.location ?? '',
        date: prev[matchId]?.date ?? '',
        time: prev[matchId]?.time ?? '',
        [field]: value,
      },
    }))
  }

  const updateMatchTimePart = (matchId, part, value) => {
    setMatchMetaDrafts((prev) => {
      const current = prev[matchId]?.time ?? ''
      const { hour, minute } = getTimeParts(current)
      const nextHour = part === 'hour' ? value : hour
      const nextMinute = part === 'minute' ? value : minute
      let nextTime = ''

      if (nextHour && nextMinute) nextTime = `${nextHour}:${nextMinute}`
      else if (nextHour) nextTime = `${nextHour}:`
      else if (nextMinute) nextTime = `:${nextMinute}`

      return {
        ...prev,
        [matchId]: {
          location: prev[matchId]?.location ?? '',
          date: prev[matchId]?.date ?? '',
          time: nextTime,
        },
      }
    })
  }

  const handleResetSelection = async () => {
    if (!isAdmin) return

    setSavingCup(true)
    setCupError('')
    try {
      await setDoc(
        doc(db, 'cup', CUP_DOC_ID),
        {
          firstRoundSlots: createEmptySlots(),
          results: deleteField(),
          matchMeta: deleteField(),
          quarterfinalLoserSelections: deleteField(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      setDraftSlots(createEmptySlots())
      setSavedSlots(createEmptySlots())
      setSavedResults({})
      setResultDrafts({})
      setSavedMatchMeta({})
      setMatchMetaDrafts({})
      setSavedQuarterfinalLoserSelections({})
    } catch (err) {
      console.error(err)
      setCupError('Konnte den Pokal nicht komplett zuruecksetzen.')
    } finally {
      setSavingCup(false)
    }
  }

  const handleSaveBracket = async () => {
    if (!isAdmin) return

    const assignedTeams = draftSlots.filter(Boolean)
    if (assignedTeams.length !== TEAM_OPTIONS.length) {
      setCupError('Bitte alle 13 Mannschaften genau einmal auf Spiel 1 bis Spiel 7 verteilen.')
      return
    }

    if (new Set(assignedTeams).size !== assignedTeams.length) {
      setCupError('Jede Mannschaft darf nur einmal in der ersten Runde vorkommen.')
      return
    }

    setSavingCup(true)
    setCupError('')
    try {
      await setDoc(
        doc(db, 'cup', CUP_DOC_ID),
        {
          teams: TEAM_OPTIONS,
          firstRoundSlots: draftSlots,
          quarterfinalLoserSelections: deleteField(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    } catch (err) {
      console.error(err)
      setCupError('Konnte die Achtelfinal-Paarungen nicht speichern.')
    } finally {
      setSavingCup(false)
    }
  }

  const handleSaveResult = async (match) => {
    if (!isAdmin) return

    const draft = resultDrafts[match.id] || {}
    const homeScore = parseScore(draft.homeScore)
    const awayScore = parseScore(draft.awayScore)

    if (homeScore === null || awayScore === null) {
      setCupError('Bitte für beide Teams ein gültiges Resultat eintragen.')
      return
    }
    if (homeScore === awayScore) {
      setCupError('Im Pokal ist kein Unentschieden möglich.')
      return
    }

    const nextResults = {
      ...savedResults,
      [match.id]: {
        homeScore,
        awayScore,
      },
    }

    setSavingResultId(match.id)
    setCupError('')
    try {
      await setDoc(
        doc(db, 'cup', CUP_DOC_ID),
        {
          results: nextResults,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    } catch (err) {
      console.error(err)
      setCupError('Konnte das Resultat nicht speichern.')
    } finally {
      setSavingResultId('')
    }
  }

  const handleResetMatch = async (matchId) => {
    if (!isAdmin) return

    const nextResults = { ...savedResults }
    const nextMatchMeta = { ...savedMatchMeta }
    const nextResultDrafts = { ...resultDrafts }
    const nextMatchMetaDrafts = { ...matchMetaDrafts }
    const nextQuarterfinalLoserSelections = { ...savedQuarterfinalLoserSelections }

    delete nextResults[matchId]
    delete nextMatchMeta[matchId]
    delete nextResultDrafts[matchId]
    delete nextMatchMetaDrafts[matchId]
    delete nextQuarterfinalLoserSelections[`${matchId}-home`]
    delete nextQuarterfinalLoserSelections[`${matchId}-away`]

    setResettingMatchId(matchId)
    setCupError('')
    try {
      await updateDoc(doc(db, 'cup', CUP_DOC_ID), {
        [`results.${matchId}`]: deleteField(),
        [`matchMeta.${matchId}`]: deleteField(),
        [`quarterfinalLoserSelections.${matchId}-home`]: deleteField(),
        [`quarterfinalLoserSelections.${matchId}-away`]: deleteField(),
        updatedAt: serverTimestamp(),
      })
      setSavedResults(nextResults)
      setResultDrafts(nextResultDrafts)
      setSavedMatchMeta(nextMatchMeta)
      setMatchMetaDrafts(nextMatchMetaDrafts)
      setSavedQuarterfinalLoserSelections(nextQuarterfinalLoserSelections)
    } catch (err) {
      console.error(err)
      setCupError('Konnte dieses Spiel nicht zurücksetzen.')
    } finally {
      setResettingMatchId('')
    }
  }

  const handleSaveQuarterfinalLoser = async (matchId, side, team) => {
    if (!isAdmin) return

    const key = `${matchId}-${side}`
    const nextSelections = {
      ...savedQuarterfinalLoserSelections,
    }

    if (team) {
      nextSelections[key] = team
    } else {
      delete nextSelections[key]
    }

    setSavingLoserSlot(key)
    setCupError('')
    try {
      await setDoc(
        doc(db, 'cup', CUP_DOC_ID),
        {
          quarterfinalLoserSelections: nextSelections,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      setSavedQuarterfinalLoserSelections(nextSelections)
    } catch (err) {
      console.error(err)
      setCupError('Konnte den Viertelfinal-Platz nicht speichern.')
    } finally {
      setSavingLoserSlot('')
    }
  }

  const handleSaveMatchMeta = async (matchId) => {
    if (!isAdmin) return

    const draft = matchMetaDrafts[matchId] || {}
    if (draft.date && !isValidGermanDateValue(draft.date)) {
      setCupError('Bitte das Datum im deutschen Format TT.MM.JJJJ eingeben.')
      return
    }
    if (draft.time && !isValidTimeValue(draft.time)) {
      setCupError('Bitte die Uhrzeit im Format 00:00 bis 23:59 eingeben.')
      return
    }

    const nextMeta = {
      ...savedMatchMeta,
      [matchId]: {
        location: draft.location || '',
        date: toGermanDateValue(draft.date || ''),
        time: draft.time || '',
      },
    }

    setSavingMetaId(matchId)
    setCupError('')
    try {
      await setDoc(
        doc(db, 'cup', CUP_DOC_ID),
        {
          matchMeta: nextMeta,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      setSavedMatchMeta(nextMeta)
    } catch (err) {
      console.error(err)
      setCupError('Konnte Datum und Uhrzeit nicht speichern.')
    } finally {
      setSavingMetaId('')
    }
  }

  const handleToggleMap = (matchId) => {
    const anchor = mapToggleRefs.current[matchId]
    if (anchor) {
      mapAnchorMatchIdRef.current = matchId
      mapAnchorTopRef.current = anchor.getBoundingClientRect().top
    }
    setOpenMapMatchId((prev) => (prev === matchId ? '' : matchId))
  }

  useLayoutEffect(() => {
    const anchorMatchId = mapAnchorMatchIdRef.current
    if (!anchorMatchId) return

    const rafId = window.requestAnimationFrame(() => {
      const anchor = mapToggleRefs.current[anchorMatchId]
      if (anchor) {
        const nextTop = anchor.getBoundingClientRect().top
        const delta = nextTop - mapAnchorTopRef.current
        if (Math.abs(delta) > 1) window.scrollBy(0, delta)
      }
      mapAnchorMatchIdRef.current = ''
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [openMapMatchId])

  return (
    <div className="relative isolate w-full px-4 pt-12 sm:px-6 lg:px-10">
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-sky-400/20 via-transparent to-transparent blur-3xl" />

      <header className="mx-auto mb-10 max-w-4xl text-center">
        <GradientBadge>Pokal</GradientBadge>
        <h1 className="mt-4 font-display text-4xl font-semibold text-white sm:text-5xl">Turnierbaum</h1>
        <p className="mt-4 text-lg text-slate-200/80">
          Ausgeloste Achtelfinalpaarungen und spannende KO-Duelle auf dem Weg zum Titel 🏆
        </p>
      </header>

      {isAdmin ? (
        <Card title="Pokal Turnierbaum Verwaltung" kicker="Admin" className="mb-8">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleResetSelection}
                  disabled={savingCup}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-300/60 hover:text-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Zurücksetzen
                </button>
                <button
                  type="button"
                  onClick={handleSaveBracket}
                  disabled={savingCup}
                  className="inline-flex items-center justify-center rounded-full border border-sky-300/60 bg-sky-300 px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-sky-500/20 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingCup ? 'Speichert...' : 'Speichern'}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Paarungen für die erste Runde</p>
                  <p className="text-sm text-slate-300/80">
                    Wähle pro Spiel zwei Teams. Bereits gewählte Mannschaften verschwinden automatisch aus den anderen Auswahlen.
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-sky-200/80">7 Spiele</p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                {Array.from({ length: FIRST_ROUND_SLOT_COUNT / 2 }, (_, matchIdx) => {
                  const homeIndex = matchIdx * 2
                  const awayIndex = homeIndex + 1
                  const usedByOthers = draftSlots.filter((team, idx) => idx !== homeIndex && idx !== awayIndex && team)
                  const availableTeams = TEAM_OPTIONS.filter((team) => !usedByOthers.includes(team))

                  return (
                    <div key={`slot-match-${matchIdx + 1}`} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/80">
                        Spiel {matchIdx + 1}
                      </p>
                      <div className="space-y-3">
                        <select
                          value={draftSlots[homeIndex] || ''}
                          onChange={(event) => updateSlot(homeIndex, event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/40"
                        >
                          <option value="">{BYE_LABEL}</option>
                          {availableTeams.map((team) => (
                            <option key={`home-${matchIdx}-${team}`} value={team}>
                              {team}
                            </option>
                          ))}
                        </select>
                        <div className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          vs
                        </div>
                        <select
                          value={draftSlots[awayIndex] || ''}
                          onChange={(event) => updateSlot(awayIndex, event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/40"
                        >
                          <option value="">{BYE_LABEL}</option>
                          {availableTeams.map((team) => (
                            <option key={`away-${matchIdx}-${team}`} value={team}>
                              {team}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {cupError ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                {cupError}
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card title="Pokalbaum" kicker="Turnier">
        {loadingCup ? (
          <p className="text-sm text-slate-300/70">Pokalbaum wird geladen...</p>
        ) : cupRounds.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300/80">
            Noch kein Turnierbaum vorhanden.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[1360px] grid-cols-4 gap-10 pb-4 pr-6 xl:min-w-0 xl:grid-cols-4">
              {cupRounds.map((round, roundIndex) => (
                <div key={round.title} className="relative min-w-[320px] xl:min-w-0">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-sky-300/20" />
                    <p className="rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">
                      {round.title}
                    </p>
                    <div className="h-px flex-1 bg-sky-300/20" />
                  </div>
                  <div className="relative" style={{ height: `${bracketHeight}px` }}>
                    {roundIndex > 0
                      ? round.matches.map((_, matchIndex) => {
                          const previousRound = cupRounds[roundIndex - 1]
                          const previousMatchA = previousRound?.matches?.[matchIndex * 2]
                          const previousMatchB = previousRound?.matches?.[matchIndex * 2 + 1]
                          const topY = getMatchTop(
                            roundIndex - 1,
                            matchIndex * 2,
                            cupRounds.length,
                            isAdmin,
                            hasOpenMap,
                          )
                          const bottomY = previousMatchB
                            ? getMatchTop(
                                roundIndex - 1,
                                matchIndex * 2 + 1,
                                cupRounds.length,
                                isAdmin,
                                hasOpenMap,
                              )
                            : topY
                          const midY = getMatchTop(
                            roundIndex,
                            matchIndex,
                            cupRounds.length,
                            isAdmin,
                            hasOpenMap,
                          )
                          const xStart = -44
                          const xJoin = -16
                          const xEnd = 0
                          const activeTop = Boolean(previousMatchA && getMatchWinner(previousMatchA, resultDrafts))
                          const activeBottom = Boolean(previousMatchB && getMatchWinner(previousMatchB, resultDrafts))
                          const activeAny = activeTop || activeBottom

                          return (
                            <div key={`connector-${roundIndex}-${matchIndex}`} className="pointer-events-none absolute inset-0">
                              <div
                                className="absolute h-px bg-sky-200/15"
                                style={{ left: `${xStart}px`, top: `${topY}px`, width: `${xJoin - xStart}px` }}
                              />
                              <div
                                className="absolute h-px bg-sky-200/15"
                                style={{ left: `${xStart}px`, top: `${bottomY}px`, width: `${xJoin - xStart}px` }}
                              />
                              <div
                                className="absolute w-px bg-sky-200/15"
                                style={{ left: `${xJoin}px`, top: `${Math.min(topY, bottomY)}px`, height: `${Math.abs(bottomY - topY)}px` }}
                              />
                              <div
                                className="absolute h-px bg-sky-200/15"
                                style={{ left: `${xJoin}px`, top: `${midY}px`, width: `${xEnd - xJoin}px` }}
                              />

                              {activeTop ? (
                                <>
                                  <div
                                    className="absolute h-[3px] -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.95),0_0_26px_rgba(125,211,252,0.55)]"
                                    style={{ left: `${xStart}px`, top: `${topY}px`, width: `${xJoin - xStart}px` }}
                                  />
                                  <div
                                    className="absolute w-[3px] rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.95),0_0_26px_rgba(125,211,252,0.55)]"
                                    style={{ left: `${xJoin - 1}px`, top: `${Math.min(topY, midY)}px`, height: `${Math.max(2, Math.abs(midY - topY))}px` }}
                                  />
                                </>
                              ) : null}

                              {activeBottom ? (
                                <>
                                  <div
                                    className="absolute h-[3px] -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.95),0_0_26px_rgba(125,211,252,0.55)]"
                                    style={{ left: `${xStart}px`, top: `${bottomY}px`, width: `${xJoin - xStart}px` }}
                                  />
                                  <div
                                    className="absolute w-[3px] rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.95),0_0_26px_rgba(125,211,252,0.55)]"
                                    style={{ left: `${xJoin - 1}px`, top: `${Math.min(midY, bottomY)}px`, height: `${Math.max(2, Math.abs(bottomY - midY))}px` }}
                                  />
                                </>
                              ) : null}

                              {activeAny ? (
                                <div
                                  className="absolute h-[3px] -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.95),0_0_26px_rgba(125,211,252,0.55)]"
                                  style={{ left: `${xJoin}px`, top: `${midY}px`, width: `${xEnd - xJoin}px` }}
                                />
                              ) : null}
                            </div>
                          )
                        })
                      : null}

                    {round.matches.map((match, matchIndex) => {
                      const winner = getMatchWinner(match, resultDrafts)
                      const savedResult = savedResults[match.id]
                      const savedHomeScore =
                        savedResult && savedResult.homeScore !== undefined ? savedResult.homeScore : null
                      const savedAwayScore =
                        savedResult && savedResult.awayScore !== undefined ? savedResult.awayScore : null
                      const savedMeta = savedMatchMeta[match.id] || {}
                      const draftMeta = matchMetaDrafts[match.id] || { location: '', date: '', time: '' }
                      const timeParts = getTimeParts(draftMeta.time || '')
                      const top = getMatchTop(roundIndex, matchIndex, cupRounds.length, isAdmin, hasOpenMap)
                      const useLoserDrawLabel = showLoserDrawLabel(roundIndex, matchIndex)
                      const loserSelectionKey = `${match.id}-away`
                      const selectedLoser = savedQuarterfinalLoserSelections[loserSelectionKey] || ''
                      const usedLosers = Object.entries(savedQuarterfinalLoserSelections)
                        .filter(([key, value]) => key !== loserSelectionKey && value)
                        .map(([, value]) => value)
                      const availableLosers = firstRoundLosers.filter(
                        ({ team }) => !usedLosers.includes(team) || team === selectedLoser,
                      )

                      return (
                        <div
                          key={match.id || `${round.title}-${matchIndex}`}
                          className="group absolute left-0 right-0"
                          style={{ top: `${top}px`, transform: 'translateY(-50%)' }}
                        >
                          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,29,52,0.96),rgba(11,18,36,0.96))] p-5 shadow-[0_20px_60px_rgba(2,8,23,0.35)] transition group-hover:border-sky-300/20">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                                {getMatchLabel(roundIndex, matchIndex)}
                              </p>
                              <div className="flex items-center gap-2">
                                {winner ? (
                                  <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100">
                                    Sieger
                                  </span>
                                ) : null}
                                {isAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => handleResetMatch(match.id)}
                                    disabled={resettingMatchId === match.id}
                                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:border-sky-300/60 hover:text-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {resettingMatchId === match.id ? 'Reset...' : 'Reset'}
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div
                                className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                                  winner && winner === match.home
                                    ? 'border-sky-300/60 bg-sky-400/20 text-sky-50 shadow-[0_0_0_1px_rgba(125,211,252,0.12)]'
                                    : 'border-white/5 bg-white/[0.06] text-white'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span>
                                    {getDisplayTeamName({
                                      team: match.home,
                                      roundIndex,
                                      matchIndex,
                                      useLoserDrawLabel,
                                    })}
                                  </span>
                                  {savedHomeScore !== null ? (
                                    <span className="text-sm font-semibold text-inherit">{savedHomeScore}</span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                                vs
                              </div>
                              <div
                                className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                                  winner && winner === match.away
                                    ? 'border-sky-300/60 bg-sky-400/20 text-sky-50 shadow-[0_0_0_1px_rgba(125,211,252,0.12)]'
                                    : 'border-white/5 bg-white/[0.06] text-white'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span>
                                    {getDisplayTeamName({
                                      team: match.away,
                                      roundIndex,
                                      matchIndex,
                                      useLoserDrawLabel,
                                    })}
                                  </span>
                                  {savedAwayScore !== null ? (
                                    <span className="text-sm font-semibold text-inherit">{savedAwayScore}</span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {!isAdmin && (savedMeta.date || savedMeta.time) ? (
                              <div className="mt-4">
                                <button
                                  type="button"
                                  ref={(element) => {
                                    if (element) mapToggleRefs.current[match.id] = element
                                  }}
                                  onClick={() => handleToggleMap(match.id)}
                                  className="block w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-left transition hover:border-sky-300/40 hover:bg-sky-300/10"
                                >
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                                    Termin
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-200">
                                    {[savedMeta.date, savedMeta.time].filter(Boolean).join(' | ')}
                                  </p>
                                </button>
                                {openMapMatchId === match.id && savedMeta.location ? (
                                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200/90">
                                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Adresse</p>
                                    {(() => {
                                      const [address, rest] = savedMeta.location.split(' (')
                                      const detail = rest ? `(${rest}` : ''
                                      return (
                                        <div className="mt-2">
                                          <p className="text-sm font-semibold text-white">{address}</p>
                                          {detail ? (
                                            <p className="text-xs text-slate-300/80">{detail}</p>
                                          ) : null}
                                        </div>
                                      )
                                    })()}
                                    <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
                                      <iframe
                                        title={`Karte ${savedMeta.location}`}
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(savedMeta.location)}&z=16&output=embed`}
                                        width="100%"
                                        height="220"
                                        allowFullScreen=""
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        className="border-0"
                                      />
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {isAdmin && roundIndex === 1 && match.away === LOSER_DRAW_LABEL ? (
                              <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                                  Verlierer aus Achtelfinale
                                </p>
                                <select
                                  value={selectedLoser}
                                  onChange={(event) =>
                                    handleSaveQuarterfinalLoser(match.id, 'away', event.target.value)
                                  }
                                  disabled={savingLoserSlot === loserSelectionKey}
                                  className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/40 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <option value="">{LOSER_DRAW_LABEL}</option>
                                  {availableLosers.map(({ matchId: loserMatchId, team }) => (
                                    <option key={`${loserMatchId}-${team}`} value={team}>
                                      {team}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : null}

                            {isAdmin && canEnterResult(match) ? (
                              <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
                                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                                  Resultat
                                </p>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    value={resultDrafts[match.id]?.homeScore ?? ''}
                                    onChange={(event) => updateResultDraft(match.id, 'homeScore', event.target.value)}
                                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-center text-sm font-semibold text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/40"
                                  />
                                  <span className="text-sm font-semibold text-slate-400">:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={resultDrafts[match.id]?.awayScore ?? ''}
                                    onChange={(event) => updateResultDraft(match.id, 'awayScore', event.target.value)}
                                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-center text-sm font-semibold text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/40"
                                  />
                                </div>
                                <div className="mt-3 flex items-end justify-between gap-3">
                                  <p className="text-[11px] leading-5 text-slate-400">
                                    {savedResult ? 'Resultat gespeichert' : 'Noch kein Resultat gespeichert'}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveResult(match)}
                                    disabled={savingResultId === match.id}
                                    className="inline-flex min-w-[132px] items-center justify-center rounded-full border border-sky-300/60 bg-sky-300 px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {savingResultId === match.id ? 'Speichert...' : 'Resultat speichern'}
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            {isAdmin ? (
                              <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
                                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                                  Ort, Datum und Uhrzeit
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <select
                                    value={draftMeta.location || ''}
                                    onChange={(event) => updateMatchMetaDraft(match.id, 'location', event.target.value)}
                                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/40 sm:col-span-2"
                                  >
                                    <option value="">Ort wählen</option>
                                    {STADIUM_OPTIONS.map((stadium) => (
                                      <option key={stadium} value={stadium}>
                                        {stadium}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="w-full overflow-hidden rounded-xl">
                                    <input
                                      type="date"
                                      lang="de-DE"
                                      value={toIsoDateValue(draftMeta.date || '')}
                                      onChange={(event) => updateMatchMetaDraft(match.id, 'date', event.target.value)}
                                      className="mobile-date-input h-11 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/40"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <select
                                      value={timeParts.hour}
                                      onChange={(event) => updateMatchTimePart(match.id, 'hour', event.target.value)}
                                      className="h-11 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/40"
                                    >
                                      <option value="">Stunde</option>
                                      {HOUR_OPTIONS.map((hour) => (
                                        <option key={hour} value={hour}>
                                          {hour}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={timeParts.minute}
                                      onChange={(event) => updateMatchTimePart(match.id, 'minute', event.target.value)}
                                      className="h-11 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/40"
                                    >
                                      <option value="">Minute</option>
                                      {MINUTE_OPTIONS.map((minute) => (
                                        <option key={minute} value={minute}>
                                          {minute}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-end justify-between gap-3">
                                  <p className="text-[11px] leading-5 text-slate-400">
                                    {savedMeta.location || savedMeta.date || savedMeta.time ? 'Termin gespeichert' : 'Noch kein Termin gespeichert'}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveMatchMeta(match.id)}
                                    disabled={savingMetaId === match.id}
                                    className="inline-flex min-w-[132px] items-center justify-center rounded-full border border-sky-300/60 bg-sky-300 px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {savingMetaId === match.id ? 'Speichert...' : 'Termin speichern'}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default PokalPage
