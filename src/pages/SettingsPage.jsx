import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { updateProfile } from 'firebase/auth'
import { auth } from '../firebase'
import { GradientBadge } from '../app/ui'

const SettingsPage = ({ user, onProfileSaved, theme, onThemeChange }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!user) {
      setError('Bitte zuerst anmelden.')
      return
    }
    setSaving(true)
    try {
      await user.reload()
      await updateProfile(user, { displayName: displayName || null })
      setMessage('Profil aktualisiert.')
      onProfileSaved?.()
    } catch (err) {
      console.error(err)
      setError('Konnte Profil nicht aktualisieren.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative isolate w-full px-4 pt-10 sm:px-6 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-grid-radial bg-[length:40px_40px] opacity-30" />
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent blur-3xl" />
      <div className="mx-auto max-w-xl space-y-6 rounded-3xl border border-white/5 bg-slate-900/70 p-8 shadow-soft backdrop-blur">
        <div>
          <GradientBadge>Profil</GradientBadge>
          <h1 className="mt-3 font-display text-3xl font-semibold text-white">Einstellungen</h1>
        </div>

        <form className="space-y-4" onSubmit={handleSave}>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-200/80">Design</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'dark', label: 'Dark Mode' },
                { value: 'light', label: 'Light Mode' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onThemeChange?.(opt.value)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    theme === opt.value
                      ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-50 shadow shadow-emerald-500/30'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:border-emerald-300/50 hover:text-emerald-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-2 text-sm text-slate-200/80">
            Anzeigename
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
              placeholder="Vorname, Nachname"
            />
          </label>

          {message ? (
            <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-50">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </form>
      </div>
    </div>
  )
}


export default SettingsPage

