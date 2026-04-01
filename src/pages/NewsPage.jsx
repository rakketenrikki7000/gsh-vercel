import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { Card, GradientBadge } from '../app/ui'
import { formatDate, useI18n } from '../app/shared'

const NewsPage = ({ isAdmin }) => {
  const { t } = useI18n()
  const [news, setNews] = useState([])
  const [loadingNews, setLoadingNews] = useState(true)
  const [newsError, setNewsError] = useState('')
  const [savingNews, setSavingNews] = useState(false)
  const [deletingNewsId, setDeletingNewsId] = useState('')
  const [newsImage, setNewsImage] = useState(null)
  const [newsImagePreview, setNewsImagePreview] = useState('')
  const [newsForm, setNewsForm] = useState({
    title: '',
    date: new Date().toISOString().slice(0, 10),
    body: '',
  })

  useEffect(() => {
    const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setNews(next)
        setLoadingNews(false)
      },
      (err) => {
        console.error(err)
        setNewsError('Konnte News nicht laden.')
        setLoadingNews(false)
      },
    )
    return () => unsubscribe()
  }, [])

  const handleNewsField = (field) => (event) => {
    setNewsForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const resetNewsForm = () => {
    setNewsForm({
      title: '',
      date: new Date().toISOString().slice(0, 10),
      body: '',
    })
    setNewsImage(null)
    setNewsImagePreview('')
  }

  const handleNewsSubmit = async (event) => {
    event.preventDefault()
    setNewsError('')
    if (!newsForm.title.trim()) {
      setNewsError('Bitte einen Titel eingeben.')
      return
    }
    if (!newsForm.date) {
      setNewsError('Bitte ein Datum auswählen.')
      return
    }
    if (!newsForm.body.trim()) {
      setNewsError('Bitte einen Text eingeben.')
      return
    }
    setSavingNews(true)
    try {
      let imageData = newsImagePreview || ''

      if (newsImage) {
        const isValidType = ['image/png', 'image/jpeg', 'image/jpg'].includes(newsImage.type)
        if (!isValidType) {
          setNewsError('Bitte PNG oder JPG hochladen.')
          setSavingNews(false)
          return
        }
        imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Konnte Bild nicht lesen.'))
          reader.readAsDataURL(newsImage)
        })
      }

      await addDoc(collection(db, 'news'), {
        title: newsForm.title.trim(),
        date: newsForm.date,
        body: newsForm.body.trim(),
        image: imageData || null,
        createdAt: serverTimestamp(),
      })
      resetNewsForm()
    } catch (err) {
      console.error(err)
      setNewsError('Konnte News nicht speichern.')
    } finally {
      setSavingNews(false)
    }
  }

  const handleDeleteNews = async (newsId) => {
    if (!newsId) return
    const ok = window.confirm('Diese News wirklich löschen?')
    if (!ok) return
    setNewsError('')
    setDeletingNewsId(newsId)
    try {
      await deleteDoc(doc(db, 'news', newsId))
    } catch (err) {
      console.error(err)
      setNewsError('Konnte News nicht löschen.')
    } finally {
      setDeletingNewsId('')
    }
  }

  return (
  <div className="relative isolate w-full px-4 pt-10 sm:px-6 lg:px-10">
    <div className="absolute inset-0 -z-10 bg-grid-radial bg-[length:40px_40px] opacity-30" />
    <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent blur-3xl" />
    <header className="mb-8">
      <GradientBadge>{t('news_badge')}</GradientBadge>
      <h1 className="mt-3 font-display text-4xl font-semibold text-white">{t('news_title')}</h1>
      <p className="text-slate-300/80">{t('news_subtitle')}</p>
    </header>
    {isAdmin ? (
      <Card title="News erstellen" kicker="Admin" className="mb-6">
        <form className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]" onSubmit={handleNewsSubmit}>
          <div className="space-y-4">
            <label className="flex flex-col gap-2 text-sm text-slate-200/80">
              Titel
              <input
                type="text"
                value={newsForm.title}
                onChange={handleNewsField('title')}
                className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                placeholder="z.B. Derbysieg in Hauset"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-200/80">
              Datum
              <input
                type="date"
                value={newsForm.date}
                onChange={handleNewsField('date')}
                className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-200/80">
              Bild (optional)
              <input
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setNewsImage(file)
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = () => setNewsImagePreview(reader.result || '')
                    reader.readAsDataURL(file)
                  } else {
                    setNewsImagePreview('')
                  }
                }}
                className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/30 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white"
              />
              {newsImage ? (
                <span className="text-xs text-emerald-200/90">Ausgewählt: {newsImage.name}</span>
              ) : (
                <span className="text-xs text-slate-400">Optional, PNG oder JPG</span>
              )}
            </label>
            {newsImagePreview ? (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <img src={newsImagePreview} alt="News Vorschau" className="h-48 w-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewsImage(null)
                    setNewsImagePreview('')
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400/70 hover:bg-red-500/20"
                >
                  Bild entfernen
                </button>
              </div>
            ) : null}
          <label className="flex flex-col gap-2 text-sm text-slate-200/80">
            Text
            <textarea
              value={newsForm.body}
              onChange={handleNewsField('body')}
              rows="10"
              className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
              placeholder="News Text eingeben..."
            />
          </label>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">Vorschau</p>
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
                {newsImagePreview ? (
                  <img src={newsImagePreview} alt={newsForm.title || 'News Bild'} className="h-52 w-full object-cover" />
                ) : (
                  <div className="flex h-52 items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.25),transparent_25%),linear-gradient(135deg,rgba(249,115,22,0.18),rgba(15,23,42,0.35))] text-sm font-semibold text-slate-200/80">
                    Optionales News-Bild
                  </div>
                )}
                <div className="space-y-3 p-4">
                  <p className="text-xs text-slate-400">{formatDate(newsForm.date)}</p>
                  <h3 className="font-display text-2xl font-semibold text-white">
                    {newsForm.title || 'Titel deiner News'}
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200/85">
                    {newsForm.body || 'Hier siehst du direkt, wie die News nach dem Speichern wirkt.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {newsError ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {newsError}
            </p>
          ) : null}
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={savingNews}
              className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingNews ? 'Speichert...' : 'News erstellen'}
            </button>
          </div>
        </form>
      </Card>
    ) : null}
    {loadingNews ? (
      <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300/70">
        Lade News...
      </div>
    ) : null}
    {newsError && !isAdmin ? (
      <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
        {newsError}
      </div>
    ) : null}
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {news.map((item) => (
        <Card key={item.id || `${item.title}-${item.date}`} className="transition hover:border-sky-300/30 hover:bg-slate-900/70">
          <Link to={`/news/${item.id}`} className="group -m-1 block rounded-[26px] p-1">
            <article>
              {item.image ? (
                <div className="mb-5 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/40 shadow-lg shadow-slate-950/30">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-64 w-full object-cover object-center transition duration-500 group-hover:scale-[1.02]"
                  />
                </div>
              ) : (
                <div className="mb-5 rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.14),transparent_24%),linear-gradient(135deg,rgba(249,115,22,0.14),rgba(15,23,42,0.45))] px-5 py-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/80">Gut Schluck Hauset</p>
                  <h3 className="mt-3 font-display text-3xl font-semibold text-white">{item.title}</h3>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {formatDate(item.date)}
                </span>
              </div>
              <h3 className="mt-4 font-display text-2xl font-semibold leading-tight text-white transition group-hover:text-sky-100">
                {item.title}
              </h3>
              <span className="mt-5 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition group-hover:border-sky-300/60 group-hover:bg-white/10 group-hover:text-sky-100">
                {t('news_read_more')}
              </span>
            </article>
          </Link>
          {isAdmin && item.id ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={`/news/${item.id}?edit=1`}
                 className="rounded-full border border-emerald-400/50 bg-primary px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700"
              >
                Bearbeiten
              </Link>
              <button
                type="button"
                disabled={deletingNewsId === item.id}
                onClick={() => handleDeleteNews(item.id)}
                className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400/70 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingNewsId === item.id ? '...' : 'Löschen'}
              </button>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  </div>
)
}

const NewsDetailPage = ({ isAdmin }) => {
  const { newsId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [newsItem, setNewsItem] = useState(null)
  const [loadingNews, setLoadingNews] = useState(true)
  const [newsError, setNewsError] = useState('')
  const [savingNews, setSavingNews] = useState(false)
  const [deletingNews, setDeletingNews] = useState(false)
  const [newsImage, setNewsImage] = useState(null)
  const [newsImagePreview, setNewsImagePreview] = useState('')
  const [newsForm, setNewsForm] = useState({
    title: '',
    date: new Date().toISOString().slice(0, 10),
    body: '',
  })
  const isEditing = isAdmin && searchParams.get('edit') === '1'

  useEffect(() => {
    if (!newsId) {
      setNewsItem(null)
      setLoadingNews(false)
      return undefined
    }

    const unsubscribe = onSnapshot(
      doc(db, 'news', newsId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setNewsItem(null)
          setLoadingNews(false)
          return
        }
        setNewsItem({ id: snapshot.id, ...snapshot.data() })
        setLoadingNews(false)
      },
      (err) => {
        console.error(err)
        setNewsItem(null)
        setLoadingNews(false)
      },
    )
    return () => unsubscribe()
  }, [newsId])

  useEffect(() => {
    if (!newsItem) return
    setNewsForm({
      title: newsItem.title || '',
      date: newsItem.date || new Date().toISOString().slice(0, 10),
      body: newsItem.body || '',
    })
    setNewsImage(null)
    setNewsImagePreview(newsItem.image || '')
  }, [newsItem])

  const handleNewsField = (field) => (event) => {
    setNewsForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const closeEditMode = () => {
    setSearchParams({})
    setNewsError('')
    setNewsImage(null)
    setNewsImagePreview(newsItem?.image || '')
  }

  const handleUpdateNews = async (event) => {
    event.preventDefault()
    if (!newsId) return
    setNewsError('')
    if (!newsForm.title.trim()) {
      setNewsError('Bitte einen Titel eingeben.')
      return
    }
    if (!newsForm.date) {
      setNewsError('Bitte ein Datum auswählen.')
      return
    }
    if (!newsForm.body.trim()) {
      setNewsError('Bitte einen Text eingeben.')
      return
    }
    setSavingNews(true)
    try {
      let imageData = newsImagePreview || ''
      if (newsImage) {
        const isValidType = ['image/png', 'image/jpeg', 'image/jpg'].includes(newsImage.type)
        if (!isValidType) {
          setNewsError('Bitte PNG oder JPG hochladen.')
          setSavingNews(false)
          return
        }
        imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Konnte Bild nicht lesen.'))
          reader.readAsDataURL(newsImage)
        })
      }

      await updateDoc(doc(db, 'news', newsId), {
        title: newsForm.title.trim(),
        date: newsForm.date,
        body: newsForm.body.trim(),
        image: imageData || null,
        updatedAt: serverTimestamp(),
      })
      closeEditMode()
    } catch (err) {
      console.error(err)
      setNewsError('Konnte News nicht speichern.')
    } finally {
      setSavingNews(false)
    }
  }

  const handleDeleteNews = async () => {
    if (!newsId) return
    const ok = window.confirm('Diese News wirklich löschen?')
    if (!ok) return
    setNewsError('')
    setDeletingNews(true)
    try {
      await deleteDoc(doc(db, 'news', newsId))
      navigate('/news')
    } catch (err) {
      console.error(err)
      setNewsError('Konnte News nicht löschen.')
      setDeletingNews(false)
    }
  }

  if (loadingNews) {
    return (
      <div className="relative isolate w-full px-4 pt-10 sm:px-6 lg:px-10">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300/70">
          Lade News...
        </div>
      </div>
    )
  }

  if (!newsItem) {
    return (
      <div className="relative isolate w-full px-4 pt-10 sm:px-6 lg:px-10">
        <Card title="News nicht gefunden">
          <p className="text-sm text-slate-300/80">Der angeforderte Beitrag existiert nicht mehr.</p>
          <Link
            to="/news"
            className="mt-4 inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-sky-300/60 hover:text-sky-100"
          >
            Zurück zu den News
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative isolate w-full px-4 pt-10 sm:px-6 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-grid-radial bg-[length:40px_40px] opacity-30" />
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent blur-3xl" />
      {!isEditing ? (
        <header className="mx-auto mb-8 max-w-4xl">
          <h1 className="font-display text-4xl font-semibold text-white">{newsItem.title}</h1>
          <p className="text-slate-300/80">{formatDate(newsItem.date)}</p>
        </header>
      ) : null}
      {isEditing ? (
        <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[minmax(300px,1fr)_minmax(0,2fr)]">
          <Card title="News bearbeiten" kicker="Admin" className="xl:sticky xl:top-24 xl:self-start">
            <form className="space-y-4" onSubmit={handleUpdateNews}>
              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                Titel
                <input
                  type="text"
                  value={newsForm.title}
                  onChange={handleNewsField('title')}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                Datum
                <input
                  type="date"
                  value={newsForm.date}
                  onChange={handleNewsField('date')}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                Bilder
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setNewsImage(file)
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = () => setNewsImagePreview(reader.result || '')
                      reader.readAsDataURL(file)
                    }
                  }}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/30 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white"
                />
              </label>
              {newsImagePreview ? (
                <button
                  type="button"
                  onClick={() => {
                    setNewsImage(null)
                    setNewsImagePreview('')
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400/70 hover:bg-red-500/20"
                >
                  Bild entfernen
                </button>
              ) : null}
              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                Text
                <textarea
                  value={newsForm.body}
                  onChange={handleNewsField('body')}
                  rows="14"
                  className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                />
              </label>
              {newsError ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {newsError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingNews}
                  className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingNews ? 'Speichert...' : 'News aktualisieren'}
                </button>
                <button
                  type="button"
                  onClick={closeEditMode}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300/70 bg-white/95 px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-sky-400/60 hover:bg-sky-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  disabled={deletingNews}
                  onClick={handleDeleteNews}
                  className="inline-flex items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 px-5 py-2 text-sm font-semibold text-red-100 transition hover:border-red-400/70 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingNews ? 'Löscht...' : 'Löschen'}
                </button>
              </div>
            </form>
          </Card>
          <div className="min-w-0">
            <header className="mb-8">
              <h2 className="font-display text-4xl font-semibold text-white">
                {newsForm.title || 'Titel deiner News'}
              </h2>
              <p className="text-slate-300/80">{formatDate(newsForm.date)}</p>
            </header>
            {newsImagePreview ? (
              <div className="mb-10 flex justify-center">
                <div className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/40 shadow-2xl shadow-slate-950/40">
                  <img
                    src={newsImagePreview}
                    alt={newsForm.title || 'News Bild'}
                    className="max-h-[540px] w-full object-cover object-center"
                  />
                </div>
              </div>
            ) : null}
            <div className="mx-auto max-w-4xl">
              <p className="whitespace-pre-wrap text-base leading-8 text-slate-200/90">
                {newsForm.body || 'Hier erscheint der News-Text direkt in der finalen Artikelansicht.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-5xl">
          {newsItem.image ? (
            <div className="mb-10 flex justify-center">
              <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/40 shadow-2xl shadow-slate-950/40">
                <img
                  src={newsItem.image}
                  alt={newsItem.title}
                  className="max-h-[540px] w-full object-cover object-center"
                />
              </div>
            </div>
        ) : null}
        <div className="mx-auto max-w-3xl">
            <p className="whitespace-pre-wrap text-base leading-8 text-slate-200/90">{newsItem.body}</p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link
                to="/news"
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-sky-300/60 hover:text-sky-100"
              >
                Zurück zu den News
              </Link>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setSearchParams({ edit: '1' })}
                  className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700"
                >
                  Bearbeiten
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


export { NewsDetailPage, NewsPage }

