import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, db } from './firebase'
import { ADMIN_EMAILS, PRIVATE_NAV_ITEMS, PUBLIC_NAV_ITEMS, TABLE_STORAGE_KEY, computeStandings, normalizeName } from './app/shared'
import { Footer, PrivateRoute, TopNav } from './app/ui'
import HomePage from './pages/HomePage'
import { NewsDetailPage, NewsPage } from './pages/NewsPage'
import { TablePage } from './pages/TablePage'
import PublicTablePage from './pages/PublicTablePage'
import AnfahrtPage from './pages/AnfahrtPage'
import AboutPage from './pages/AboutPage'
import PokalPage from './pages/PokalPage'
import GalleryPage from './pages/GalleryPage'
import SchedulePage from './pages/SchedulePage'
import TeamPage from './pages/TeamPage'
import LoginPage from './pages/LoginPage'
import SettingsPage from './pages/SettingsPage'

const AppShell = () => {
  const [matches, setMatches] = useState([])
  const [tables, setTables] = useState([])
  const [playerProfiles, setPlayerProfiles] = useState([])
  const [theme, setTheme] = useState(() => {
    try {
      return window?.localStorage?.getItem('gsh-theme') || 'dark'
    } catch {
      return 'dark'
    }
  })
  const [loadingTables, setLoadingTables] = useState(true)
  const [tablesError, setTablesError] = useState('')
  const [selectedTableId, setSelectedTableId] = useState('')
  const [form, setForm] = useState({
    homeTeam: 'Gut Schluck Hauset',
    awayTeam: 'Gut Schluck Hauset',
    homeScore: '',
    awayScore: '',
    date: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const standings = useMemo(() => computeStandings(matches), [matches])
  const navItems = user ? PRIVATE_NAV_ITEMS : PUBLIC_NAV_ITEMS
  const activeTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) || null,
    [tables, selectedTableId],
  )
  const isAdmin = useMemo(() => {
    const email = (user?.email || '').toLowerCase()
    if (!email) return false
    return ADMIN_EMAILS.includes(email)
  }, [user])
  const userAvatar = useMemo(() => {
    const name = normalizeName(user?.displayName)
    if (!name) return null
    const match = playerProfiles.find((player) => normalizeName(player?.name) === name)
    return match?.photo || null
  }, [playerProfiles, user])

  useEffect(() => {
    if (!selectedTableId) {
      setMatches([])
      return undefined
    }
    const q = query(collection(db, 'tables', selectedTableId, 'matches'), orderBy('date', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        setMatches(next)
      },
      (err) => {
        console.error(err)
        setError('Konnte Daten nicht laden. Bitte pruefe die Firebase-Konfiguration.')
      },
    )
    return () => unsubscribe()
  }, [selectedTableId])

  useEffect(() => {
    const q = query(collection(db, 'tables'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        setTables(next)
        setTablesError('')
        setLoadingTables(false)
        setSelectedTableId((prev) => {
          if (prev && next.some((table) => table.id === prev)) return prev
          const stored = window?.localStorage?.getItem(TABLE_STORAGE_KEY) || ''
          if (stored && next.some((table) => table.id === stored)) return stored
          return next[0]?.id || ''
        })
      },
      (err) => {
        console.error(err)
        setTablesError('Konnte Tabellen nicht laden.')
        setLoadingTables(false)
      },
    )
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!selectedTableId) return
    try {
      window?.localStorage?.setItem(TABLE_STORAGE_KEY, selectedTableId)
    } catch (err) {
      console.warn('Konnte Tabellenauswahl nicht speichern.', err)
    }
  }, [selectedTableId])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => setUser(nextUser))
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const next = theme === 'light' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      window?.localStorage?.setItem('gsh-theme', next)
    } catch (err) {
      console.warn('Konnte Theme nicht speichern.', err)
    }
  }, [theme])

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'playerprofiles'),
      (snapshot) => {
        const next = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        setPlayerProfiles(next)
      },
      (err) => {
        console.error(err)
      },
    )
    return () => unsubscribe()
  }, [])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!selectedTableId) {
      setError('Bitte zuerst eine Tabelle anlegen oder auswählen.')
      return
    }
    if (form.homeTeam === form.awayTeam) {
      setError('Heim- und Auswärtssteam müssen unterschiedlich sein.')
      return
    }
    const hs = Number(form.homeScore)
    const as = Number(form.awayScore)
    if ([hs, as].some(Number.isNaN) || hs < 0 || as < 0) {
      setError('Bitte gültige Tore eingeben (0 oder höher).')
      return
    }
    setSaving(true)
    try {
      await addDoc(collection(db, 'tables', selectedTableId, 'matches'), {
        tableId: selectedTableId,
        tableName: activeTable?.name || null,
        homeTeam: form.homeTeam,
        awayTeam: form.awayTeam,
        homeScore: hs,
        awayScore: as,
        date: new Date(form.date),
        createdAt: serverTimestamp(),
      })
      setForm((prev) => ({ ...prev, homeScore: '', awayScore: '' }))
    } catch (err) {
      console.error(err)
      setError('Speichern fehlgeschlagen. Bitte Konfiguration pruefen.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteTable = async (tableId) => {
    if (!tableId) return
    const matchesQuery = query(collection(db, 'tables', tableId, 'matches'))
    const snapshot = await getDocs(matchesQuery)
    await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)))
    await deleteDoc(doc(db, 'tables', tableId))
    if (selectedTableId === tableId) {
      setSelectedTableId('')
      try {
        window?.localStorage?.removeItem(TABLE_STORAGE_KEY)
      } catch (err) {
        console.warn('Konnte Tabellenauswahl nicht entfernen.', err)
      }
    }
  }

  return (
    <div className={`flex min-h-screen flex-col ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-slate-950 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(15,118,110,0.25),transparent_25%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(249,115,22,0.2),transparent_25%)]" />
      </div>
      <TopNav user={user} userAvatar={userAvatar} onLogout={handleLogout} navItems={navItems} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/tabelle-oeffentlich" element={<PublicTablePage matches={matches} activeTable={activeTable} />} />
          <Route path="/galerie" element={<GalleryPage isAdmin={isAdmin} />} />
          <Route
            path="/tabelle"
            element={
              <PrivateRoute user={user}>
                <TablePage
                  matches={matches}
                  form={form}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                  saving={saving}
                  error={error}
                  isAdmin={isAdmin}
                  tables={tables}
                  selectedTableId={selectedTableId}
                  onSelectTable={setSelectedTableId}
                  activeTable={activeTable}
                  tablesError={tablesError}
                  loadingTables={loadingTables}
                  onDeleteTable={handleDeleteTable}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/mannschaft"
            element={
              <PrivateRoute user={user}>
                <TeamPage isAdmin={isAdmin} />
              </PrivateRoute>
            }
          />
          <Route
            path="/spielplan"
            element={
              <PrivateRoute user={user}>
                <SchedulePage user={user} isAdmin={isAdmin} playerProfiles={playerProfiles} />
              </PrivateRoute>
            }
          />
          <Route path="/news" element={<NewsPage isAdmin={isAdmin} />} />
          <Route path="/news/:newsId" element={<NewsDetailPage isAdmin={isAdmin} />} />
          <Route path="/pokal" element={<PokalPage isAdmin={isAdmin} />} />
          <Route path="/anfahrt" element={<AnfahrtPage />} />
          <Route path="/ueber-uns" element={<AboutPage />} />
          <Route
            path="/einstellungen"
            element={
              <PrivateRoute user={user}>
                <SettingsPage
                  user={user}
                  onProfileSaved={() => setUser(auth.currentUser)}
                  theme={theme}
                  onThemeChange={setTheme}
                />
              </PrivateRoute>
            }
          />
          <Route path="/login" element={<LoginPage user={user} />} />
        </Routes>
      </main>
      <Footer user={user} />
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  )
}

export default App

