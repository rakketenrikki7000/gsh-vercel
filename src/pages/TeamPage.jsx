import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { Card, GradientBadge, PlayerCard } from '../app/ui'
import { POSITION_GROUPS, useI18n } from '../app/shared'

const TeamPage = ({ isAdmin }) => {
  const { t } = useI18n()
  const [players, setPlayers] = useState([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [playersError, setPlayersError] = useState('')
  const [playerForm, setPlayerForm] = useState({
    name: '',
    number: '',
    position: 'tor',
    staffRole: '',
  })
  const [savingPlayer, setSavingPlayer] = useState(false)
  const [playerImage, setPlayerImage] = useState(null)
  const [deletingPlayerId, setDeletingPlayerId] = useState('')

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'playerprofiles'),
      (snapshot) => {
        const next = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setPlayers(next)
        setLoadingPlayers(false)
      },
      (err) => {
        console.error(err)
        setPlayersError('Konnte Spieler nicht laden.')
        setLoadingPlayers(false)
      },
    )
    return () => unsubscribe()
  }, [])

  const handlePlayerChange = (field) => (event) => {
    setPlayerForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handlePlayerSubmit = async (event) => {
    event.preventDefault()
    setPlayersError('')
    if (!isAdmin) {
      setPlayersError('Nur Admins können Profile anlegen.')
      return
    }
    if (!playerForm.name.trim()) {
      setPlayersError('Bitte Name eingeben.')
      return
    }
    if (!playerForm.position) {
      setPlayersError('Bitte Position wählen.')
      return
    }
    if (playerForm.position === 'staff' && !playerForm.staffRole.trim()) {
      setPlayersError('Bitte Rolle für Trainerstab auswählen.')
      return
    }
    setSavingPlayer(true)
    try {
      let photoData = null
      if (playerImage) {
        const isValidType = ['image/png', 'image/jpeg', 'image/jpg'].includes(playerImage.type)
        if (!isValidType) {
          setPlayersError('Bitte PNG oder JPG hochladen.')
          setSavingPlayer(false)
          return
        }
        photoData = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Konnte Bild nicht lesen.'))
          reader.readAsDataURL(playerImage)
        })
      }

      const num = playerForm.number ? Number(playerForm.number) : null
      await addDoc(collection(db, 'playerprofiles'), {
        name: playerForm.name,
        number: Number.isNaN(num) ? null : num,
        position: playerForm.position || 'tor',
        staffRole: playerForm.position === 'staff' ? playerForm.staffRole || null : null,
        photo: photoData,
        createdAt: serverTimestamp(),
      })
      setPlayerForm({ name: '', number: '', position: 'tor', staffRole: '' })
      setPlayerImage(null)
    } catch (err) {
      console.error(err)
      setPlayersError('Konnte Spieler nicht speichern.')
    } finally {
      setSavingPlayer(false)
    }
  }

  const handleDeletePlayer = async (playerId) => {
    if (!isAdmin) {
      setPlayersError('Nur Admins können Profile löschen.')
      return
    }
    if (!playerId) return
    const confirmDelete = window.confirm('Profil wirklich löschen?')
    if (!confirmDelete) return
    setPlayersError('')
    setDeletingPlayerId(playerId)
    try {
      await deleteDoc(doc(db, 'playerprofiles', playerId))
    } catch (err) {
      console.error(err)
      setPlayersError('Profil konnte nicht gelöscht werden.')
    } finally {
      setDeletingPlayerId('')
    }
  }

  const positionOrder = useMemo(
    () =>
      POSITION_GROUPS.reduce((acc, pos, idx) => {
        acc[pos.key] = idx
        return acc
      }, {}),
    [],
  )

  const staffRoleOrder = useMemo(
    () => ({
      Trainer: 0,
      'Co-Trainer': 1,
      Assistent: 2,
    }),
    [],
  )

  const groupedPlayers = useMemo(() => {
    const base = POSITION_GROUPS.map((group) => ({ ...group, list: [] }))
    const unknown = { key: 'other', label: 'Sonstiges', list: [] }
    const sorted = [...players].sort((a, b) => {
      const posA = positionOrder[a.position] ?? 99
      const posB = positionOrder[b.position] ?? 99
      if (posA !== posB) return posA - posB
      if (a.position === 'staff' && b.position === 'staff') {
        const roleA = staffRoleOrder[a.staffRole] ?? 99
        const roleB = staffRoleOrder[b.staffRole] ?? 99
        if (roleA !== roleB) return roleA - roleB
      }
      const numA = Number(a.number)
      const numB = Number(b.number)
      const hasNumA = !Number.isNaN(numA)
      const hasNumB = !Number.isNaN(numB)
      if (hasNumA && hasNumB && numA !== numB) return numA - numB
      return (a.name || '').localeCompare(b.name || '')
    })

    sorted.forEach((player) => {
      const target = base.find((g) => g.key === player.position) || unknown
      target.list.push(player)
    })
    return [...base, ...(unknown.list.length ? [unknown] : [])]
  }, [players, positionOrder, staffRoleOrder])

  return (
    <div className="relative isolate w-full px-4 pt-10 sm:px-6 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-grid-radial bg-[length:40px_40px] opacity-30" />
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-emerald-500/15 via-transparent to-transparent blur-3xl" />
      <header className="mb-8">
        <GradientBadge>{t('team_badge')}</GradientBadge>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white">{t('team_title')}</h1>
      </header>

      {isAdmin ? (
        <Card title="Profil anlegen" kicker="Admin" id="player-create">
          <form className="space-y-4" onSubmit={handlePlayerSubmit}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                Name
                <input
                  type="text"
                  value={playerForm.name}
                  onChange={handlePlayerChange('name')}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                Nummer
                <input
                  type="number"
                  min="0"
                  value={playerForm.number}
                  onChange={handlePlayerChange('number')}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="z.B. 13 (optional)"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                Position
                <select
                  value={playerForm.position}
                  onChange={handlePlayerChange('position')}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                >
                  {POSITION_GROUPS.map((pos) => (
                    <option key={pos.key} value={pos.key}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </label>
              {playerForm.position === 'staff' ? (
                <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                  Rolle (Trainerstab)
                  <select
                    value={playerForm.staffRole}
                    onChange={handlePlayerChange('staffRole')}
                    className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option value="">Bitte wählen</option>
                    <option value="Trainer">Trainer</option>
                    <option value="Co-Trainer">Co-Trainer</option>
                    <option value="Assistent">Assistent</option>
                  </select>
                </label>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                Bild (PNG/JPG)
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={(e) => setPlayerImage(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/30 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white"
                />
                {playerImage ? (
                  <span className="text-xs text-emerald-200/90">Ausgewählt: {playerImage.name}</span>
                ) : (
                  <span className="text-xs text-slate-400">Optional, PNG oder JPG</span>
                )}
              </label>
            </div>
            {playersError ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                {playersError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={savingPlayer}
              className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingPlayer ? 'Speichert...' : 'Profil speichern'}
            </button>
          </form>
        </Card>
      ) : null}

      <div className="space-y-10">
        {loadingPlayers ? (
          <Card title="Lade Kader..." kicker="Status">
            <p className="text-sm text-slate-300/70">Spieler werden geladen.</p>
          </Card>
        ) : playersError ? (
          <Card title="Fehler" kicker="Kader">
            <p className="text-sm text-red-200/90">{playersError}</p>
          </Card>
        ) : (
          groupedPlayers.map((group) =>
            group.list.length === 0 ? null : (
              <div key={group.key}>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {group.list.map((player) => {
                    const initials = (player.name || '')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                    return (
                      <div
                        key={player.id}
                        className="relative h-72 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-lg shadow-emerald-500/10"
                      >
                        {player.photo ? (
                          <img
                            src={player.photo}
                            alt={player.name}
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-indigo-500/30 via-slate-800 to-slate-900 text-2xl font-bold text-emerald-100">
                            {initials || '?'}
                          </div>
                        )}
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDeletePlayer(player.id)}
                            disabled={deletingPlayerId === player.id}
                            className="absolute right-3 top-3 z-10 rounded-full border border-white/20 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-white shadow hover:border-red-400/70 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingPlayerId === player.id ? '...' : 'Löschen'}
                          </button>
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/30 to-slate-900/80" />
                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 py-3">
                          <div>
                            <p className="text-lg font-semibold leading-tight text-white">{player.name || 'Unbekannt'}</p>
                          </div>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-200">
                            {player.position === 'staff'
                              ? player.staffRole || 'Staff'
                              : player.number
                                ? `#${player.number}`
                                : '--'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ),
          )
        )}
      </div>
    </div>
  )
}


export default TeamPage
