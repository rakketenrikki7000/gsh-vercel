import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { GradientBadge } from '../app/ui'
import { useI18n } from '../app/shared'

const LoginPage = ({ user }) => {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  if (user) {
    const redirectTo = location.state?.from?.pathname || '/'
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/')
    } catch (err) {
      console.error(err)
      const code = err?.code || ''
      const friendly =
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? 'Email oder Passwort falsch.'
          : code === 'auth/user-not-found'
            ? 'Kein Nutzer mit dieser E-Mail gefunden.'
            : code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found'
              ? 'Firebase-Konfiguration fehlt/ist falsch. Bitte .env.* prufen.'
              : 'Login fehlgeschlagen. Bitte Zugangsdaten pruefen oder Auth in Firebase aktivieren.'
      setError(friendly)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative isolate w-full px-4 pt-10 sm:px-6 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-grid-radial bg-[length:40px_40px] opacity-30" />
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent blur-3xl" />
      <div className="mx-auto max-w-xl space-y-6 rounded-3xl border border-white/5 bg-slate-900/70 p-8 shadow-soft backdrop-blur">
        <div>
          <GradientBadge>{t('login_badge')}</GradientBadge>
          <h1 className="mt-3 font-display text-3xl font-semibold text-white">{t('login_title')}</h1>
          <p className="text-slate-300/80">
            {t('login_subtitle')}
            <br />
            {t('login_members')}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm text-slate-200/80">
            {t('login_email')}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-200/80">
            {t('login_password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/40"
              required
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-full border border-emerald-400/50 bg-primary px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t('login_loading') : t('login_button')}
          </button>
        </form>
      </div>
    </div>
  )
}


export default LoginPage

