const TEAM_OPTIONS = [
  'Bilstain',
  'Gut Schluck Hauset',
  'Hall Star',
  'Herbestha',
  'Inferno',
  'Kettenis A',
  'Kettenis B',
  'Rakete',
  'Tanja',
  'Tornado',
  'Tülje',
  'Walk',
  'Werth',
]

const STADIUM_OPTIONS = [
  'Stadionstrasse 10, 4721 Kelmis, Belgien (Untergrund: Kunstrasen)',
  'Kirchstrasse 97, 4730 Hauset, Belgien (Untergrund: Rasen)',
  'Schönefelderweg 240, 4700 Eupen, Belgien (Untergrund: Rasen)',
  'Lichtenbuscher Strasse 155, 4731 Raeren, Belgien (Untergrund: Rasen)',
  'Talstrasse 43, 4701 Eupen, Belgien (Untergrund: Rasen)',
  'Rue Cesar Franck 163, 4851 Plombieres, Belgien',
  'Rue de Robrou 5,4950 Waimes, Belgien (Untergrund: Rasen)',
]

const POSITION_GROUPS = [
  { key: 'tor', label: 'Tor' },
  { key: 'verteidigung', label: 'Verteidigung' },
  { key: 'mittelfeld', label: 'Mittelfeld' },
  { key: 'angriff', label: 'Angriff' },
  { key: 'staff', label: 'Trainerstab' },
]

const SPONSOR_LOGOS = [
  { src: '/Dienstleistungen_Stefan_Siffrin.jpg', alt: 'Dienstleistungen Stefan Siffrin', href: 'https://be.linkedin.com/in/stefan-siffrin-552864158' },
  { src: '/jkmotor-raeder.jpg', alt: 'JK Motor Raeder', href: 'https://www.jkmotorraeder.be/' },
  { src: '/Elektro_Bemelmans.png', alt: 'Elektro Bemelmans', href: 'https://elektro-bemelmans.be/' },
  { src: '/Metzgerei_Vincent.jpg', alt: 'Metzgerei Vincent', href: 'https://www.facebook.com/people/Metzgerei-boucherie-Dorthu-Steyns/100054569703802/' },
  { src: '/Mauel.png', alt: 'Mauel', href: 'https://www.mauel.be/' },
  { src: '/Ralph_Creutz.jpg', alt: 'Ralph Creutz', href: 'https://www.creutz-ralph.be/' },
]
const SPONSOR_LOOP = [...SPONSOR_LOGOS, ...SPONSOR_LOGOS, ...SPONSOR_LOGOS, ...SPONSOR_LOGOS]

const PUBLIC_NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/news', label: 'News' },
  { to: '/tabelle-oeffentlich', label: 'Tabelle' },
  { to: '/pokal', label: 'Pokal' },
  { to: '/galerie', label: 'Galerie' },
  { to: '/anfahrt', label: 'Anfahrt' },
  { to: '/ueber-uns', label: 'Über uns' },
]

const PRIVATE_NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/news', label: 'News' },
  { to: '/tabelle', label: 'Tabelle' },
  { to: '/pokal', label: 'Pokal' },
  { to: '/spielplan', label: 'Spielplan' },
  { to: '/mannschaft', label: 'Mannschaft' },
  { to: '/galerie', label: 'Galerie' },
  { to: '/anfahrt', label: 'Anfahrt' },
  { to: '/ueber-uns', label: 'Über uns' },
]

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean)

const I18N_DE = {
  nav_table: 'Tabelle',
  results_badge: 'Ergebnisse & Tabelle',
  results_title: 'Spielstände und Ranking',
  results_subtitle: 'Checke die aktuelle Tabelle und sieh dir den Live-Feed an',
  news_badge: 'News & Updates',
  news_title: 'Aktuelles aus dem Verein',
  news_subtitle: 'Berichte, Ankündigungen und Stories rund um Gut Schluck Hauset.',
  news_read_more: 'Mehr lesen',
  admin_manage_tables: 'Tabellen verwalten',
  admin_active_table: 'Aktive Tabelle',
  admin_loading_tables: 'Lade Tabellen...',
  admin_no_table: 'Noch keine Tabelle vorhanden.',
  admin_delete_table: 'Tabelle löschen',
  admin_new_table: 'Neue Tabelle',
  admin_table_name: 'Name',
  admin_table_placeholder: 'z.B. Saison 2026',
  admin_create_table: 'Tabelle erstellen',
  admin_creating: 'Erstellt...',
  workflow_results: 'Ergebnis erfassen',
  workflow_table: 'Tabelle',
  workflow_no_table: 'Noch keine Tabelle vorhanden. Bitte zuerst eine Tabelle anlegen.',
  workflow_home: 'Heimteam',
  workflow_away: 'Ausärtsteam',
  workflow_home_score: 'Heim-Tore',
  workflow_away_score: 'Auswärts-Tore',
  workflow_date: 'Datum',
  workflow_save: 'Ergebnis speichern',
  workflow_saving: 'Speichern...',
  live_feed: 'Letzte Ergebnisse',
  live_feed_empty: 'Noch keine Spiele für diese Tabelle.',
  live_feed_select: 'Bitte zuerst eine Tabelle auswählen.',
  live_feed_delete: 'Löschen',
  notes_title: 'Traineranmerkung',
  notes_label: 'Anmerkung',
  notes_placeholder: 'Kurz anmerken...',
  notes_save: 'Anmerkung speichern',
  notes_update: 'Anmerkung aktualisieren',
  notes_saving: 'Speichert...',
  notes_loading: 'Lade Notizen...',
  notes_empty: 'Noch keine Notizen vorhanden.',
  notes_more: 'Mehr öffnen',
  notes_less: 'Weniger anzeigen',
  notes_edit: 'Bearbeiten',
  notes_delete: 'Löschen',
  notes_cancel: 'Abbrechen',
  public_badge: 'Spielstand',
  public_subtitle: 'Ergebnisse und Tabelle für alle Fans und Mitglieder',
  public_filter_all: 'All',
  public_filter_home: 'Home',
  public_filter_away: 'Away',
  public_no_data: 'Noch keine Daten. Erfasse das erste Ergebnis im privaten Bereich.',
  gallery_badge: 'Galerie',
  gallery_title: 'Momentes & Events',
  gallery_create_event: 'Event anlegen',
  gallery_new: 'Neues',
  gallery_event_name: 'Event Name',
  gallery_event_placeholder: 'z.B. Derby 2025',
  gallery_create: 'Event erstellen',
  gallery_creating: 'Legt an...',
  gallery_upload: 'Bilder hochladen',
  gallery_upload_kicker: 'Upload',
  gallery_select_event: 'Event Auswahl',
  gallery_select_placeholder: 'Event wählen...',
  gallery_images: 'Bilder',
  gallery_selected: 'Ausgewählt',
  gallery_file_hint: 'PNG oder JPG, mehrere Dateien möglich.',
  gallery_save_images: 'Bilder speichern',
  gallery_uploading: 'lädt hoch...',
  gallery_back: 'Zurück zu Events',
  gallery_save: 'Speichern',
  gallery_deleting: 'löscht...',
  gallery_delete: 'Event löschen',
  schedule_badge: 'Spielplan',
  schedule_title: 'Spiele & Zusagen',
  schedule_subtitle: 'Nur für angemeldete Spieler und Admins.',
  team_badge: 'Mannschaft',
  team_title: 'Gut Schluck Hauset',
  login_badge: 'Login',
  login_title: 'Anmelden',
  login_subtitle: 'Melde dich mit deiner E-Mail und deinem Passwort an.',
  login_members: 'Nur für Vereinsmitglieder.',
  login_email: 'E-Mail',
  login_password: 'Passwort',
  login_button: 'Anmelden',
  login_loading: 'Anmeldung läuft...',
}

const useI18n = () => ({
  t: (key) => I18N_DE[key] || key,
})

const TABLE_STORAGE_KEY = 'gsh-active-table'

const formatDate = (value) => {
  if (!value) return '-'
  if (value?.toDate) return value.toDate().toLocaleDateString('de-DE')
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('de-DE')
}

const normalizeName = (value) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const computeStandings = (matches, mode = 'all') => {
  const table = {}
  matches.forEach((match) => {
    const { homeTeam, awayTeam, homeScore, awayScore } = match
    if (!homeTeam || !awayTeam) return
    const hs = Number(homeScore)
    const as = Number(awayScore)
    if (Number.isNaN(hs) || Number.isNaN(as)) return
    const includeHome = mode !== 'away'
    const includeAway = mode !== 'home'
    const ensure = (team) =>
      (table[team] ??= { team, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 })

    if (includeHome) {
      ensure(homeTeam)
      table[homeTeam].played += 1
      table[homeTeam].gf += hs
      table[homeTeam].ga += as
      if (hs > as) {
        table[homeTeam].wins += 1
        table[homeTeam].points += 3
      } else if (hs < as) {
        table[homeTeam].losses += 1
      } else {
        table[homeTeam].draws += 1
        table[homeTeam].points += 1
      }
    }

    if (includeAway) {
      ensure(awayTeam)
      table[awayTeam].played += 1
      table[awayTeam].gf += as
      table[awayTeam].ga += hs
      if (as > hs) {
        table[awayTeam].wins += 1
        table[awayTeam].points += 3
      } else if (as < hs) {
        table[awayTeam].losses += 1
      } else {
        table[awayTeam].draws += 1
        table[awayTeam].points += 1
      }
    }
  })
  return Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const gdA = a.gf - a.ga
    const gdB = b.gf - b.ga
    if (gdB !== gdA) return gdB - gdA
    return (b.gf || 0) - (a.gf || 0)
  })
}


export {
  ADMIN_EMAILS,
  POSITION_GROUPS,
  PRIVATE_NAV_ITEMS,
  PUBLIC_NAV_ITEMS,
  SPONSOR_LOOP,
  STADIUM_OPTIONS,
  TABLE_STORAGE_KEY,
  TEAM_OPTIONS,
  computeStandings,
  formatDate,
  normalizeName,
  useI18n,
}
