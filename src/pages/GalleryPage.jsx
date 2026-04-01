import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { Card, GradientBadge } from '../app/ui'
import { useI18n } from '../app/shared'

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const GalleryPage = ({ isAdmin }) => {
  const { t } = useI18n()
  const [eventName, setEventName] = useState('')
  const [events, setEvents] = useState([])
  const [eventError, setEventError] = useState('')
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [images, setImages] = useState([])
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [editEventName, setEditEventName] = useState('')
  const [savingEventName, setSavingEventName] = useState(false)
  const [deletingEvent, setDeletingEvent] = useState(false)
  const [deletingImageId, setDeletingImageId] = useState('')
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'galleryEvents'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setEvents(list)
        if (selectedEventId && list.length && !list.find((evt) => evt.id === selectedEventId)) {
          setSelectedEventId('')
        }
      },
      (err) => {
        console.error(err)
        setEventError('Events konnten nicht geladen werden.')
      },
    )
    return () => unsubscribe()
  }, [selectedEventId])

  const selectedEvent = events.find((evt) => evt.id === selectedEventId)

  useEffect(() => {
    setEditEventName(selectedEvent ? selectedEvent.name || selectedEvent.id : '')
  }, [selectedEventId, selectedEvent])

  useEffect(() => {
    if (!selectedEventId) {
      setImages([])
      return undefined
    }
    const imagesRef = query(
      collection(db, 'galleryEvents', selectedEventId, 'images'),
      orderBy('createdAt', 'desc'),
    )
    const unsubscribe = onSnapshot(
      imagesRef,
      (snapshot) => {
        setImages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      },
      (err) => {
        console.error(err)
        setUploadError('Bilder konnten nicht geladen werden.')
      },
    )
    return () => unsubscribe()
  }, [selectedEventId])

  useEffect(() => {
    setLightboxIndex(null)
  }, [selectedEventId])

  useEffect(() => {
    if (lightboxIndex === null) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setLightboxIndex(null)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setLightboxIndex((prev) => {
          if (prev === null || images.length === 0) return null
          return (prev - 1 + images.length) % images.length
        })
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setLightboxIndex((prev) => {
          if (prev === null || images.length === 0) return null
          return (prev + 1) % images.length
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, images.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    if (images.length === 0) {
      setLightboxIndex(null)
      return
    }
    if (lightboxIndex > images.length - 1) {
      setLightboxIndex(images.length - 1)
    }
  }, [images, lightboxIndex])

  const currentLightboxImage =
    lightboxIndex !== null && images[lightboxIndex] ? images[lightboxIndex] : null

  const showPrevImage = () => {
    if (!images.length) return
    setLightboxIndex((prev) => {
      if (prev === null) return 0
      return (prev - 1 + images.length) % images.length
    })
  }

  const showNextImage = () => {
    if (!images.length) return
    setLightboxIndex((prev) => {
      if (prev === null) return 0
      return (prev + 1) % images.length
    })
  }

  const handleCreateEvent = async () => {
    setEventError('')
    if (!isAdmin) {
      setEventError('Nur Admins koennen Events anlegen.')
      return
    }
    const name = eventName.trim()
    if (!name) {
      setEventError('Bitte einen Event Namen eingeben.')
      return
    }
    const slug = slugify(name)
    setCreatingEvent(true)
    try {
      const eventRef = doc(db, 'galleryEvents', slug)
      await setDoc(
        eventRef,
        { name, slug, createdAt: serverTimestamp() },
        { merge: true },
      )
      setEventName('')
      setSelectedEventId(slug)
    } catch (err) {
      console.error(err)
      setEventError('Event konnte nicht angelegt werden.')
    } finally {
      setCreatingEvent(false)
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(files)
  }

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Konnte Bild nicht lesen.'))
      reader.readAsDataURL(file)
    })

  const handleUpload = async (event) => {
    event.preventDefault?.()
    setUploadError('')
    if (!isAdmin) {
      setUploadError('Nur Admins koennen Bilder hochladen.')
      return
    }
    if (!selectedEventId) {
      setUploadError('Bitte zuerst ein Event anlegen oder auswählen.')
      return
    }
    if (!selectedFiles.length) {
      setUploadError('Bitte mindestens ein Bild auswählen.')
      return
    }
    setUploading(true)
    try {
      const dataUrls = await Promise.all(selectedFiles.map((file) => fileToBase64(file)))
      const imagesRef = collection(db, 'galleryEvents', selectedEventId, 'images')
      await Promise.all(
        dataUrls.map((dataUrl, idx) =>
          addDoc(imagesRef, {
            name: selectedFiles[idx].name,
            dataUrl,
            createdAt: serverTimestamp(),
          }),
        ),
      )
      setSelectedFiles([])
    } catch (err) {
      console.error(err)
      setUploadError('Upload fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setUploading(false)
    }
  }

  const handleRenameEvent = async () => {
    if (!isAdmin) {
      setEventError('Nur Admins koennen Events bearbeiten.')
      return
    }
    if (!selectedEventId) {
      setEventError('Kein Event ausgewählt.')
      return
    }
    const name = editEventName.trim()
    if (!name) {
      setEventError('Bitte einen neuen Namen eingeben.')
      return
    }
    setSavingEventName(true)
    try {
      const eventRef = doc(db, 'galleryEvents', selectedEventId)
      await updateDoc(eventRef, { name })
    } catch (err) {
      console.error(err)
      setEventError('Event konnte nicht aktualisiert werden.')
    } finally {
      setSavingEventName(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!isAdmin) {
      setEventError('Nur Admins koennen Events loeschen.')
      return
    }
    if (!selectedEventId) return
    const confirmDelete = window.confirm('Event und alle zugehoerigen Bilder loeschen?')
    if (!confirmDelete) return
    setDeletingEvent(true)
    try {
      const imagesRef = collection(db, 'galleryEvents', selectedEventId, 'images')
      const imgSnap = await getDocs(imagesRef)
      await Promise.all(imgSnap.docs.map((d) => deleteDoc(d.ref)))
      await deleteDoc(doc(db, 'galleryEvents', selectedEventId))
      setSelectedEventId('')
    } catch (err) {
      console.error(err)
      setEventError('Event konnte nicht geloescht werden.')
    } finally {
      setDeletingEvent(false)
    }
  }

  const handleDeleteImage = async (imageId) => {
    if (!isAdmin) {
      setUploadError('Nur Admins koennen Bilder loeschen.')
      return
    }
    if (!selectedEventId || !imageId) return
    setDeletingImageId(imageId)
    try {
      await deleteDoc(doc(db, 'galleryEvents', selectedEventId, 'images', imageId))
    } catch (err) {
      console.error(err)
      setUploadError('Bild konnte nicht geloescht werden.')
    } finally {
      setDeletingImageId('')
    }
  }

  return (
    <div className="relative isolate w-full px-4 pt-10 sm:px-6 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-grid-radial bg-[length:40px_40px] opacity-30" />
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent blur-3xl" />
      <header className="mb-8">
        <GradientBadge>{t('gallery_badge')}</GradientBadge>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white">{t('gallery_title')}</h1>
      </header>

      {isAdmin ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title={t('gallery_create_event')} kicker={t('gallery_new')}>
            <div className="space-y-3">
              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                {t('gallery_event_name')}
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                  placeholder={t('gallery_event_placeholder')}
                />
              </label>
              {eventError ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {eventError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleCreateEvent}
                disabled={creatingEvent}
                className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingEvent ? t('gallery_creating') : t('gallery_create')}
              </button>
            </div>
          </Card>

          <Card title={t('gallery_upload')} kicker={t('gallery_upload_kicker')}>
            <form className="space-y-3" onSubmit={handleUpload}>
              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                {t('gallery_select_event')}
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="">{t('gallery_select_placeholder')}</option>
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.name || evt.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200/80">
                {t('gallery_images')}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  onChange={handleFileChange}
                  className="block w-full rounded-lg border border-dashed border-white/20 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/30 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white"
                />
                {selectedFiles.length ? (
                  <p className="text-xs text-emerald-200/80">
                    {t('gallery_selected')}: {selectedFiles.length} Datei(en)
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">{t('gallery_file_hint')}</p>
                )}
              </label>

              {uploadError ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {uploadError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? t('gallery_uploading') : t('gallery_save_images')}
              </button>
            </form>
          </Card>
        </div>
      ) : null}

      {selectedEventId === '' ? (
        <div className="mt-8 space-y-4">
          {events.length === 0 ? (
            <span className="text-sm text-slate-400">Noch keine Events vorhanden.</span>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((evt) => (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => setSelectedEventId(evt.id)}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 px-5 py-5 text-left shadow-sm transition hover:border-sky-300/50 hover:bg-white/5"
                >
                  <p className="text-lg font-semibold text-white leading-snug">{evt.name || evt.id}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xl font-semibold text-white">
              {selectedEvent ? selectedEvent.name || selectedEvent.id : 'Event'}
            </p>
            <div className="flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center md:w-auto">
              {isAdmin ? (
                <>
                  <input
                    type="text"
                    value={editEventName}
                    onChange={(e) => setEditEventName(e.target.value)}
                    className="rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
                    placeholder={t('gallery_event_name')}
                  />
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <button
                      type="button"
                      onClick={handleRenameEvent}
                      disabled={savingEventName}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white hover:border-sky-300/60 hover:text-sky-100 disabled:opacity-60"
                    >
                      {savingEventName ? t('gallery_creating') : t('gallery_save')}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteEvent}
                      disabled={deletingEvent}
                      className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100 transition hover:border-red-400/70 hover:bg-red-500/20 disabled:opacity-60"
                    >
                      {deletingEvent ? t('gallery_deleting') : t('gallery_delete')}
                    </button>
                  </div>
                </>
              ) : null}
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedEventId('')}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white hover:border-sky-300/60 hover:text-sky-100"
                >
                  {t('gallery_back')}
                </button>
              </div>
            </div>
          </div>

          {images.length === 0 ? (
            <p className="text-sm text-slate-300/80">
              Noch keine Bilder gespeichert. Lade jetzt welche hoch.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-lg shadow-emerald-500/10"
                >
                  {img.dataUrl ? (
                    <div className="relative aspect-[4/3] bg-slate-800/60">
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(idx)}
                        className="absolute inset-0 cursor-zoom-in"
                        aria-label="Bild in Originalgroesse anzeigen"
                      >
                        <img
                          src={img.dataUrl}
                          alt={img.name || 'Event Bild'}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDeleteImage(img.id)
                          }}
                          disabled={deletingImageId === img.id}
                          className="absolute right-3 top-3 rounded-full border border-white/20 bg-slate-900/70 px-2 py-1 text-[10px] font-semibold text-white shadow hover:border-red-400/60 hover:text-red-200 disabled:opacity-60"
                        >
                          {deletingImageId === img.id ? '...' : 'Loeschen'}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-slate-800/50 text-sm text-slate-300/70">
                      Kein Bildinhalt vorhanden
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentLightboxImage?.dataUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-5 top-5 rounded-full border border-white/20 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white hover:border-sky-300/60 hover:text-sky-100"
          >
            Schliessen
          </button>
          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  showPrevImage()
                }}
                className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-slate-900/80 px-3 py-2 text-lg font-bold text-white hover:border-sky-300/60 hover:text-sky-100"
                aria-label="Vorheriges Bild"
                >
                  {'<'}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  showNextImage()
                }}
                className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-slate-900/80 px-3 py-2 text-lg font-bold text-white hover:border-sky-300/60 hover:text-sky-100"
                aria-label="Nächstes Bild"
                >
                  {'>'}
              </button>
            </>
          ) : null}
          <div
            className="max-h-[90vh] max-w-[95vw] overflow-hidden rounded-2xl border border-white/15 bg-slate-900/60 p-2"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={currentLightboxImage.dataUrl}
              alt={currentLightboxImage.name || 'Event Bild'}
              className="max-h-[85vh] w-auto max-w-[90vw] object-contain sm:max-h-[85vh] sm:max-w-[90vw]"
            />
          </div>
          {images.length > 1 && lightboxIndex !== null ? (
            <p className="absolute bottom-5 rounded-full border border-white/15 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-100">
              {lightboxIndex + 1} / {images.length}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}


export default GalleryPage


