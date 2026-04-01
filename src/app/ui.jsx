import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom'
import { SPONSOR_LOOP } from './shared'

const PrivateRoute = ({ user, children }) => {
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

const GradientBadge = ({ children }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100">
    {children}
  </span>
)

const Card = ({ title, kicker, children, id, className = '' }) => (
  <section
    id={id}
    className={`rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-soft backdrop-blur-sm ${className}`}
  >
    <div className="flex items-start justify-between gap-4 pb-4">
      <div>
        {kicker ? <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">{kicker}</p> : null}
        <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
      </div>
    </div>
    {children}
  </section>
)

const SponsorMarquee = () => (
  <div className="mt-8">
    <div className="relative overflow-hidden">
      <div className="flex min-w-[200%] flex-nowrap items-center gap-6 py-4 sponsor-marquee-track">
        {SPONSOR_LOOP.map((logo, idx) => (
          logo.href ? (
            <a
              key={`${logo.alt}-${idx}`}
              href={logo.href}
              target="_blank"
              rel="noreferrer"
              className="flex h-16 w-44 items-center justify-center rounded-xl bg-white/5 px-4 py-2 shadow-inner transition hover:-translate-y-0.5 hover:scale-[1.06] hover:bg-white/15 hover:shadow-[0_0_28px_rgba(56,189,248,0.45)] hover:border hover:border-sky-300/60"
            >
              <img
                src={logo.src}
                alt={logo.alt}
                className="max-h-12 w-full object-contain brightness-110 contrast-110"
                loading="lazy"
              />
            </a>
          ) : (
            <div
              key={`${logo.alt}-${idx}`}
              className="flex h-16 w-44 items-center justify-center rounded-xl bg-white/5 px-4 py-2 shadow-inner transition hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(56,189,248,0.35)] hover:border hover:border-sky-300/60"
            >
              <img
                src={logo.src}
                alt={logo.alt}
                className="max-h-12 w-full object-contain brightness-110 contrast-110"
                loading="lazy"
              />
            </div>
          )
        ))}
      </div>
    </div>
  </div>
)

const PlayerCard = ({ player }) => {
  const initials = (player.name || '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="relative h-72 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-lg shadow-emerald-500/10">
      {player.photo ? (
        <img src={player.photo} alt={player.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-indigo-500/30 via-slate-800 to-slate-900 text-2xl font-bold text-emerald-100">
          {initials || '?'}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/30 to-slate-900/80" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 py-3">
        <div>
          {player.number ? (
            <p className="text-sm font-bold text-emerald-200 drop-shadow">#{player.number}</p>
          ) : null}
          <p className="text-lg font-semibold leading-tight text-white">{player.name || 'Unbekannt'}</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-200">Profil</span>
      </div>
    </div>
  )
}

const TopNav = ({ user, userAvatar, onLogout, navItems }) => {
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    // Close user dropdown on route change.
    setMenuOpen(false)
    setOpen(false)
  }, [location.pathname])

  const linkBase =
    'rounded-full px-4 py-2 transition border md:border-transparent text-sm font-semibold'

  return (
    <div className="sticky top-0 z-20 border-b border-white/5 bg-slate-950/90 backdrop-blur">
      <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2 text-white">
          <img
            src="/gs-hauset-logo.png"
            alt="GS Hauset Logo"
            className="h-9 w-9 rounded-md object-contain"
            loading="lazy"
          />
          <div>
            <p className="font-display text-lg font-semibold leading-none">Gut Schluck Hauset</p>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Fussball</p>
          </div>
        </Link>

        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-emerald-300/60 hover:text-emerald-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menue"
        >
          {open ? (
            <span className="text-lg leading-none">X</span>
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          )}
        </button>

        <nav
          className={`${open ? 'flex' : 'hidden'
            } absolute left-0 right-0 top-full flex-col gap-2 border-b border-white/5 bg-slate-950/95 px-4 pb-4 md:static md:flex md:flex-row md:items-center md:gap-2 md:border-none md:bg-transparent md:p-0`}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  linkBase,
                  isActive ? 'bg-white/10 text-white' : 'text-slate-200 hover:bg-white/5',
                  location.pathname === item.to ? 'border border-white/10' : '',
                ].join(' ')
              }
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <div className="flex flex-col gap-2 md:ml-3 md:flex-row md:items-center">
            {user ? (
              <>
                <div className="flex items-center gap-2 md:hidden">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-slate-900"
                    aria-label="ProfilMenue"
                  >
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={user.displayName || user.email || 'Profil'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (user.displayName || user.email || '?').slice(0, 1).toUpperCase()
                    )}
                  </button>
                  {menuOpen ? (
                    <div className="flex items-center gap-2">
                      <Link
                        to="/einstellungen"
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-50"
                        onClick={() => {
                          setMenuOpen(false)
                          setOpen(false)
                        }}
                      >
                        Einstellungen
                      </Link>
                      <button
                        className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                        onClick={() => {
                          onLogout?.()
                          setMenuOpen(false)
                          setOpen(false)
                        }}
                      >
                        Abmelden
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-full px-1 py-1 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                    aria-label="ProfilMenue"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-slate-900">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={user.displayName || user.email || 'Profil'}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        (user.displayName || user.email || '?').slice(0, 1).toUpperCase()
                      )}
                    </span>
                  </button>
                  {menuOpen ? (
                    <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-lg shadow-emerald-500/20">
                      <Link
                        to="/einstellungen"
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-white/10"
                        onClick={() => {
                          setMenuOpen(false)
                          setOpen(false)
                        }}
                      >
                        Einstellungen
                      </Link>
                      <button
                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-white/10"
                        onClick={() => {
                          onLogout?.()
                          setMenuOpen(false)
                          setOpen(false)
                        }}
                      >
                        Abmelden
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-full border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-200"
                onClick={() => setOpen(false)}
              >
                Anmelden
              </Link>
            )}
          </div>
        </nav>
      </div>
    </div>
  )
}

const Footer = ({ user }) => {
  const tableLink = user ? '/tabelle' : '/tabelle-oeffentlich'
  const quickLinks = [
    { to: '/news', label: 'News' },
    { to: tableLink, label: 'Tabelle' },
    { to: '/galerie', label: 'Galerie' },
    { to: '/ueber-uns', label: 'Ueber uns' },
  ]

  const socialLinks = [
    {
      href: 'https://www.facebook.com/FCGutSchluckHauset',
      label: 'Facebook',
      className: 'border-[#1877F2] bg-[#1877F2] text-white hover:border-[#1877F2] hover:bg-[#1877F2] hover:text-white',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.6 1.6-1.6H16V4.8c-.2 0-.9-.1-1.8-.1c-2.7 0-4.2 1.6-4.2 4.5V11H7.5v3H10v7h3.5Z" />
        </svg>
      ),
    },
    {
      href: 'https://www.instagram.com/gutschluckhauset/',
      label: 'Instagram',
      className: 'border-transparent text-white hover:border-transparent hover:text-white',
      style: {
        background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
      },
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
  ]

  return (
    <footer className="relative mt-14 border-t border-white/10 bg-slate-950/92 backdrop-blur">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 -z-10">
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-emerald-500/20 via-transparent to-transparent blur-3xl" />
      </div>
      <div className="flex w-full items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3 text-white">
          <img
            src="/gs-hauset-logo.png"
            alt="GS Hauset Logo"
            className="h-8 w-8 rounded-md object-contain"
            loading="lazy"
          />
          <div className="leading-none">
            <p className="text-sm font-semibold">Gut Schluck Hauset</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-emerald-100/80">Fussball</p>
          </div>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-x-4 text-xs text-slate-300/85 md:flex">
          {quickLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="transition hover:text-sky-100"
            >
              {item.label}
            </Link>
          ))}
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Kirchstrasse 97, 4730 Hauset</span>
        </div>

        <div className="flex items-center gap-2">
          {socialLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              aria-label={item.label}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${item.className}`}
              style={item.style}
            >
              {item.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}

export { Card, Footer, GradientBadge, PlayerCard, PrivateRoute, SponsorMarquee, TopNav }
