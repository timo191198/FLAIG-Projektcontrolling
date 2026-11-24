import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileJson,
  FileSpreadsheet,
  Gauge,
  Info,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Search,
  SlidersHorizontal,
  Target,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  WalletCards,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  allMetrics,
  metrics,
  orderMetrics,
  parseImportFile,
  workstationSummaries,
  type ImportDataset,
  type Insight,
  type Metrics,
  type Order,
  type WorkstationName,
  type WorkstationSummary,
} from './data'
import flaigLogo from './assets/flaig-logo.svg'

const orange = '#ff6900'
const brown = '#453a35'
const green = '#1f8a62'
const red = '#d95749'
const localStorageKey = 'flaig-projektcontrolling:project-data:v1'

interface LocalImportSource {
  raw: string
  sourceFileName: string
}

interface StoredProjectData extends LocalImportSource {
  storageVersion: 1
  insights: Record<string, Insight>
  savedAt: string
}

interface RestoredProjectData {
  dataset: ImportDataset | null
  source: LocalImportSource | null
  insights: Record<string, Insight>
}

const validStoredInsights = (value: unknown): Record<string, Insight> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).flatMap(([key, insight]) => {
    if (!insight || typeof insight !== 'object' || Array.isArray(insight)) return []
    const candidate = insight as Record<string, unknown>
    const cause = typeof candidate.cause === 'string' ? candidate.cause : ''
    const note = typeof candidate.note === 'string' ? candidate.note : ''
    return cause || note ? [[key, { cause, note }]] : []
  }))
}

const persistProjectData = (source: LocalImportSource, insights: Record<string, Insight>) => {
  const stored: StoredProjectData = {
    storageVersion: 1,
    ...source,
    insights,
    savedAt: new Date().toISOString(),
  }
  window.localStorage.setItem(localStorageKey, JSON.stringify(stored))
}

const restoreProjectData = (): RestoredProjectData => {
  if (typeof window === 'undefined') return { dataset: null, source: null, insights: {} }
  try {
    const rawStored = window.localStorage.getItem(localStorageKey)
    if (!rawStored) return { dataset: null, source: null, insights: {} }
    const stored = JSON.parse(rawStored) as Partial<StoredProjectData>
    if (stored.storageVersion !== 1 || typeof stored.raw !== 'string' || typeof stored.sourceFileName !== 'string') {
      return { dataset: null, source: null, insights: {} }
    }
    const dataset = parseImportFile(stored.raw, stored.sourceFileName)
    return {
      dataset,
      source: { raw: stored.raw, sourceFileName: stored.sourceFileName },
      insights: { ...dataset.existingInsights, ...validStoredInsights(stored.insights) },
    }
  } catch {
    return { dataset: null, source: null, insights: {} }
  }
}

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const axisEuro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const date = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
const month = new Intl.DateTimeFormat('de-DE', { month: 'short' })

const asDate = (value: string) => new Date(`${value}T12:00:00`)
const fmtDate = (value: string | null) => value ? date.format(asDate(value)) : 'Nicht dokumentiert'
const fmtPercent = (value: number | null, signed = true) =>
  value === null ? 'n. a.' : `${signed && value > 0 ? '+' : ''}${number.format(value)} %`
const fmtDeltaHours = (value: number) => `${value > 0 ? '+' : ''}${number.format(value)} h`
const fmtDeltaEuro = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${euro.format(Math.abs(value))}`
const deltaClass = (value: number) => (value > 0 ? 'negative' : value < 0 ? 'positive' : 'neutral')
const orderPath = (order: Order) => `/auftraege/${encodeURIComponent(order.id)}`

interface ProjectDataContextValue {
  dataset: ImportDataset | null
  orders: Order[]
  insights: Record<string, Insight>
  setInsights: React.Dispatch<React.SetStateAction<Record<string, Insight>>>
  openImport: () => void
}

const ProjectDataContext = createContext<ProjectDataContextValue | null>(null)

function useProjectData() {
  const value = useContext(ProjectDataContext)
  if (!value) throw new Error('ProjectDataContext fehlt.')
  return value
}

function Logo() {
  return <img className="brand-logo" src={flaigLogo} alt="FLAIG Innenausbau" />
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { dataset } = useProjectData()
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.pathname])
  const nav = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/auftraege', label: 'Meine Aufträge', icon: BriefcaseBusiness },
    { to: '/arbeitsplaetze', label: 'Arbeitsplatzanalyse', icon: BarChart3 },
  ]
  const page = location.pathname.startsWith('/auftraege/')
    ? 'Auftragsdetails'
    : nav.find((item) => item.to === location.pathname)?.label ?? 'Dashboard'

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Logo />
          <div className="product-name"><span>PROJEKT</span>CONTROLLING</div>
        </div>
        <nav className="main-nav" aria-label="Hauptnavigation">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setMobileOpen(false)}>
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              <ChevronRight className="nav-chevron" size={16} />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="prototype-tag"><span /> {dataset ? 'LOKAL IM BROWSER GESPEICHERT' : 'LOKALER JSON-IMPORT'}</div>
          <div className="profile-card">
            <div className="avatar">T</div>
            <div><strong>Timo</strong><span>Projektleitung</span></div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen((value) => !value)} aria-label="Navigation öffnen"><Menu /></button>
          <div><span className="eyebrow">FLAIG PROJEKTCONTROLLING</span><strong>{page}</strong></div>
          <div className="topbar-meta"><span>Datenstand Nachkalkulationen</span><strong>{dataset ? fmtDate(dataset.reportDate) : 'Noch kein Import'}</strong></div>
        </header>
        <main>{children}</main>
      </div>
      {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Navigation schließen" />}
    </div>
  )
}

function PageIntro({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return (
    <div className="page-intro">
      <div><span className="section-label">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>
      {action}
    </div>
  )
}

function Delta({ value, kind = 'currency', percent }: { value: number; kind?: 'currency' | 'hours'; percent?: number | null }) {
  return (
    <span className={`delta ${deltaClass(value)}`}>
      {value > 0 ? <TrendingUp size={15} /> : value < 0 ? <TrendingDown size={15} /> : null}
      {kind === 'currency' ? fmtDeltaEuro(value) : fmtDeltaHours(value)}
      {percent !== undefined && <small>{fmtPercent(percent)}</small>}
    </span>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ '--tip-color': entry.color } as React.CSSProperties}>
          <span /> {entry.name}: <b>{entry.dataKey.toLowerCase().includes('cost') || entry.dataKey.toLowerCase().includes('kosten') || entry.dataKey === 'Abweichung' ? euro.format(entry.value) : `${number.format(entry.value)} h`}</b>
        </div>
      ))}
    </div>
  )
}

function MetricCard({ label, value, detail, icon: Icon, onClick }: { label: string; value: string; detail?: React.ReactNode; icon: any; onClick?: () => void }) {
  const content = <><div className="metric-icon"><Icon size={20} /></div><span>{label}</span><strong>{value}</strong>{detail && <div className="metric-detail">{detail}</div>}</>
  return onClick ? <button className="metric-card clickable" onClick={onClick}>{content}</button> : <div className="metric-card">{content}</div>
}

function EmptyImportState({ title = 'Noch keine Nachkalkulationen importiert' }: { title?: string }) {
  const { openImport } = useProjectData()
  return (
    <div className="empty-import panel">
      <div className="empty-import-icon"><FileJson size={30} /></div>
      <span className="section-label">Lokale Datenquelle</span>
      <h2>{title}</h2>
      <p>Wählen Sie die JSON-Exportdatei aus. Die Daten werden ausschließlich in diesem Browser verarbeitet und dauerhaft lokal auf diesem Gerät gespeichert.</p>
      <button className="button primary" onClick={openImport}><UploadCloud size={18} /> JSON-Datei auswählen</button>
    </div>
  )
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (dataset: ImportDataset, source: LocalImportSource) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  const readFile = async (file: File) => {
    setLoading(true)
    setError('')
    try {
      const raw = await file.text()
      const dataset = parseImportFile(raw, file.name)
      onImport(dataset, { raw, sourceFileName: file.name })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Die Importdatei konnte nicht verarbeitet werden.')
      setLoading(false)
    }
  }

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <div className="modal import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <button className="modal-close" onClick={onClose} aria-label="Dialog schließen"><X /></button>
        <span className="section-label">Lokaler JSON-Import</span>
        <h2 id="import-title">Nachkalkulationen einlesen</h2>
        <p>Die Datei wird ausschließlich in diesem Browser verarbeitet und lokal auf diesem Gerät gespeichert. Es findet keine Übertragung an einen Server statt.</p>
        <input ref={inputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void readFile(file)
          event.currentTarget.value = ''
        }} />
        <button className="upload-zone import-zone" onClick={() => inputRef.current?.click()} disabled={loading}>
          <UploadCloud size={28} />
          <strong>{loading ? 'Datei wird geprüft …' : 'JSON-Datei auswählen'}</strong>
          <span>Schema-Version 1 · Verarbeitung ausschließlich lokal</span>
        </button>
        {error && <div className="import-error"><CircleAlert size={18} /><span>{error}</span></div>}
        <div className="privacy-note"><Info size={17} /><p><strong>Datenschutz</strong>Der Import wird im lokalen Browserspeicher abgelegt und bleibt nach einem Neustart erhalten. Er wird weder hochgeladen noch Bestandteil der Anwendung.</p></div>
        <div className="modal-actions"><button className="button secondary" onClick={onClose}>Abbrechen</button></div>
      </div>
    </div>,
    document.body,
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const { dataset, orders, openImport } = useProjectData()
  if (!dataset) return <div className="page"><PageIntro eyebrow="Persönliche Projektübersicht" title="Guten Abend, Timo" copy="Importieren Sie die aktuellen Nachkalkulationen, um Kennzahlen und Abweichungen lokal auszuwerten." /><EmptyImportState /></div>

  const total = allMetrics(orders)
  const orderData = orders.map((order) => {
    const value = orderMetrics(order)
    return { id: order.id, name: order.title, Sollkosten: value.plannedCost, Istkosten: value.actualCost }
  })
  const stations = workstationSummaries(orders)
  const stationData = stations.map((station) => ({ name: station.name, Abweichung: station.costDelta }))
  const strongestOrders = [...orders].sort((a, b) => orderMetrics(b).costDelta - orderMetrics(a).costDelta)
  const strongestStation = [...stations].sort((a, b) => b.costDelta - a.costDelta)[0]
  const repeated = [...stations].filter((station) => station.exceededOrders > 1).sort((a, b) => b.costDelta - a.costDelta)[0]

  return (
    <div className="page dashboard-page">
      <PageIntro eyebrow="Persönliche Projektübersicht" title="Guten Abend, Timo" copy={`${orders.length} Nachkalkulationen im Blick – vollständig aus der lokal importierten Datei berechnet.`} action={<button className="button secondary" onClick={openImport}><UploadCloud size={17} /> Import ersetzen</button>} />
      <section className="financial-hero">
        <div className="financial-heading"><span className="section-label light">Bewertete Arbeitszeitkosten</span><h2>Von der Nachkalkulation<br />zur besseren Entscheidung.</h2><button className="text-link light" onClick={() => navigate('/auftraege')}>Alle Aufträge analysieren <ArrowUpRight size={17} /></button></div>
        <div className="financial-figures">
          <div><span>Sollkosten</span><strong>{euro.format(total.plannedCost)}</strong><small>{number.format(total.plannedHours)} Sollstunden</small></div>
          <div className="actual"><span>Bewertete Istkosten</span><strong>{euro.format(total.actualCost)}</strong><small>{number.format(total.actualHours)} Iststunden</small></div>
          <div className={`hero-delta ${deltaClass(total.costDelta)}`}><span>Nettokostenabweichung</span><strong>{fmtDeltaEuro(total.costDelta)}</strong><em>{fmtPercent(total.costDeltaPercent)}</em></div>
        </div>
      </section>
      <section className="metric-grid metric-grid-five">
        <MetricCard icon={FileSpreadsheet} label="Ausgewertete Aufträge" value={String(orders.length)} detail={`Datenstand ${fmtDate(dataset.reportDate)}`} onClick={() => navigate('/auftraege')} />
        <MetricCard icon={Clock3} label="Zeitabweichung gesamt" value={fmtDeltaHours(total.hourDelta)} detail={<Delta value={total.hourDelta} kind="hours" percent={total.hourDeltaPercent} />} onClick={() => navigate('/auftraege')} />
        <MetricCard icon={TrendingUp} label="Mehrkosten" value={euro.format(total.additionalCost)} detail="Summe positiver Abweichungen" onClick={() => navigate('/arbeitsplaetze')} />
        <MetricCard icon={TrendingDown} label="Minderkosten" value={euro.format(total.savingsCost)} detail="Summe negativer Abweichungen" onClick={() => navigate('/arbeitsplaetze')} />
        <MetricCard icon={WalletCards} label="Nettoabweichung" value={fmtDeltaEuro(total.costDelta)} detail={<Delta value={total.costDelta} percent={total.costDeltaPercent} />} onClick={() => navigate('/auftraege')} />
      </section>
      <section className="content-grid two-thirds">
        <div className="panel chart-panel"><div className="panel-heading"><div><span className="section-label">Kosten im Vergleich</span><h3>Soll- und Istkosten je Auftrag</h3></div><span className="hint"><Info size={14} /> Balken anklicken</span></div><div className="chart-wrap large"><ResponsiveContainer width="100%" height="100%"><BarChart data={orderData} barGap={8} onClick={(state: any) => state?.activePayload?.[0]?.payload?.id && navigate(`/auftraege/${encodeURIComponent(state.activePayload[0].payload.id)}`)}><CartesianGrid stroke="#e8e2dc" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#756a65', fontSize: 11 }} /><YAxis tickFormatter={(value) => axisEuro.format(value)} tickLine={false} axisLine={false} tick={{ fill: '#918781', fontSize: 11 }} width={72} /><Tooltip content={<ChartTooltip />} cursor={{ fill: '#f6f2ee' }} /><Legend iconType="square" wrapperStyle={{ fontSize: 12, paddingTop: 12 }} /><Bar dataKey="Sollkosten" fill="#c8beb5" radius={[4, 4, 0, 0]} maxBarSize={44} /><Bar dataKey="Istkosten" fill={orange} radius={[4, 4, 0, 0]} maxBarSize={44} /></BarChart></ResponsiveContainer></div></div>
        <div className="panel insight-panel"><div className="panel-heading"><div><span className="section-label">Früherkennung</span><h3>Größte Nettoabweichungen</h3></div></div><div className="ranking-list">{strongestOrders.map((order, index) => { const value = orderMetrics(order); return <button key={order.id} onClick={() => navigate(orderPath(order))}><span className="rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{order.title}</strong><small>{order.number} · {order.customer}</small></div><Delta value={value.costDelta} percent={value.costDeltaPercent} /><ChevronRight size={17} /></button> })}</div>{strongestStation && <div className="analysis-note"><Lightbulb size={19} /><p><strong>{repeated ? 'Wiederkehrendes Muster erkannt' : 'Stärkstes Kostensignal'}</strong>{repeated ? `${repeated.name} liegt in ${repeated.exceededOrders} Aufträgen über der Kalkulation.` : `${strongestStation.name} weist die höchste positive Nettoabweichung auf.`}</p></div>}</div>
      </section>
      <section className="content-grid half">
        <div className="panel chart-panel"><div className="panel-heading"><div><span className="section-label">Prozesssicht</span><h3>Kostenabweichung nach Arbeitsplatz</h3></div><button className="text-link" onClick={() => navigate('/arbeitsplaetze')}>Details ansehen <ArrowUpRight size={16} /></button></div><div className="chart-wrap medium" style={{ height: Math.max(300, stationData.length * 31) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={stationData} layout="vertical" margin={{ left: 32, right: 42 }}><CartesianGrid stroke="#eee8e2" horizontal={false} /><XAxis type="number" tickFormatter={(value) => axisEuro.format(value)} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={148} interval={0} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: brown }} /><ReferenceLine x={0} stroke="#9d938c" /><Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8f5f2' }} /><Bar dataKey="Abweichung" name="Kostenabweichung" radius={[0, 4, 4, 0]} maxBarSize={18} onClick={(data: any) => navigate(`/arbeitsplaetze?station=${encodeURIComponent(data.name)}`)}>{stationData.map((entry) => <Cell key={entry.name} fill={entry.Abweichung > 0 ? red : green} />)}</Bar></BarChart></ResponsiveContainer></div></div>
        <div className="panel recent-panel"><div className="panel-heading"><div><span className="section-label">Importierte Daten</span><h3>Nachkalkulationen</h3></div></div>{orders.map((order) => { const value = orderMetrics(order); return <button className="recent-order" key={order.id} onClick={() => navigate(orderPath(order))}><div className="date-tile"><b>{fmtDate(order.reportDate).slice(0, 2)}</b><span>{month.format(asDate(order.reportDate))}</span></div><div><strong>{order.title}</strong><span>{order.customer} · Datenstand {fmtDate(order.reportDate)}</span></div><Delta value={value.costDelta} /><ChevronRight size={17} /></button> })}</div>
      </section>
      <p className="cost-disclaimer"><Info size={14} /> Berechnung aus den importierten Sollkosten und bewerteten Istkosten. Abschlussdaten werden nur angezeigt, wenn sie dokumentiert sind.</p>
    </div>
  )
}

function OrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { dataset, orders, openImport } = useProjectData()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState(new URLSearchParams(location.search).get('status') ?? 'alle')
  const [sort, setSort] = useState('nummer')
  const filtered = useMemo(() => {
    const result = orders.filter((order) => {
      const value = orderMetrics(order)
      const matchesQuery = `${order.number} ${order.title} ${order.customer}`.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = status === 'alle' || (status === 'ueber' ? value.costDelta > 0 : value.costDelta <= 0)
      return matchesQuery && matchesStatus
    })
    return result.sort((a, b) => {
      if (sort === 'abweichung-desc') return orderMetrics(b).costDelta - orderMetrics(a).costDelta
      if (sort === 'name') return a.title.localeCompare(b.title, 'de')
      return b.number.localeCompare(a.number, 'de', { numeric: true })
    })
  }, [orders, query, status, sort])

  if (!dataset) return <div className="page"><PageIntro eyebrow="Persönliches Portfolio" title="Meine Aufträge" copy="Importieren Sie die Nachkalkulationen, um Aufträge vergleichen zu können." /><EmptyImportState /></div>

  return (
    <div className="page">
      <PageIntro eyebrow="Persönliches Portfolio" title="Meine Aufträge" copy="Importierte Nachkalkulationen vergleichen, Abweichungen verstehen und Erkenntnisse lokal dokumentieren." action={<button className="button primary" onClick={openImport}><UploadCloud size={18} /> JSON importieren</button>} />
      <div className="toolbar"><label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Auftrag, Nummer oder Kunde suchen …" /></label><label className="select-field"><SlidersHorizontal size={17} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="alle">Alle Ergebnisse</option><option value="ueber">Über Kalkulation</option><option value="unter">Innerhalb Kalkulation</option></select></label><label className="select-field"><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="nummer">Auftragsnummer</option><option value="abweichung-desc">Höchste Abweichung</option><option value="name">Bezeichnung A–Z</option></select></label></div>
      <div className="orders-summary"><span><b>{filtered.length}</b> von {orders.length} Aufträgen</span><span><span className="legend-dot red" /> Mehrkosten</span><span><span className="legend-dot green" /> Minderkosten</span></div>
      <div className="panel table-panel"><table className="data-table orders-table"><thead><tr><th>Auftrag</th><th>Abschluss</th><th className="num">Soll / Ist Zeit</th><th className="num">Zeitabweichung</th><th className="num">Nettoabweichung</th><th /></tr></thead><tbody>{filtered.map((order) => { const value = orderMetrics(order); return <tr key={order.id} onClick={() => navigate(orderPath(order))} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && navigate(orderPath(order))}><td><div className="order-identity"><span className="order-number">{order.number}</span><div><strong>{order.title}</strong><small>{[order.customer, order.category].filter(Boolean).join(' · ')}</small></div></div></td><td><strong>{fmtDate(order.completedAt)}</strong><small>{order.location}</small></td><td className="num"><strong>{number.format(value.plannedHours)} / {number.format(value.actualHours)} h</strong><small>Soll / Ist</small></td><td className="num"><Delta value={value.hourDelta} kind="hours" percent={value.hourDeltaPercent} /></td><td className="num"><Delta value={value.costDelta} percent={value.costDeltaPercent} /></td><td><span className="row-action"><ChevronRight size={18} /></span></td></tr> })}</tbody></table>{!filtered.length && <div className="empty-state"><Search /><h3>Keine Aufträge gefunden</h3><p>Passen Sie Suche oder Filter an.</p></div>}</div>
    </div>
  )
}

function RateLabel({ station }: { station: WorkstationSummary }) {
  if (station.hourlyRate !== null) return <>{euro.format(station.hourlyRate)} / Stunde</>
  return <>Variable Sätze · {station.hourlyRates.length} Bewertungen</>
}

function WorkstationDrawer({ station, onClose }: { station: WorkstationSummary; onClose: () => void }) {
  const navigate = useNavigate()
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape) }
  }, [onClose])
  return createPortal(
    <div className="drawer-backdrop" onMouseDown={(event) => event.currentTarget === event.target && onClose()}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><header className="drawer-header"><div><span className="section-label">Arbeitsplatzanalyse</span><h2 id="drawer-title">{station.name}</h2></div><button className="drawer-close" onClick={onClose} aria-label="Detailfenster schließen"><X /></button></header><div className="drawer-content"><p className="drawer-intro">Abweichungen über alle importierten Nachkalkulationen.</p><div className="drawer-kpis"><div><span>Nettoabweichung</span><strong className={deltaClass(station.costDelta)}>{fmtDeltaEuro(station.costDelta)}</strong><small>{fmtPercent(station.costDeltaPercent)}</small></div><div><span>Zeitabweichung</span><strong className={deltaClass(station.hourDelta)}>{fmtDeltaHours(station.hourDelta)}</strong><small>{fmtPercent(station.hourDeltaPercent)}</small></div></div><h3>Aufschlüsselung nach Auftrag</h3><div className="drawer-orders">{station.orders.map(({ order, entry, metrics: value }) => <button key={order.id} onClick={() => { onClose(); navigate(orderPath(order)) }}><div><strong>{order.title}</strong><small>{order.number} · Soll {number.format(value.plannedHours)} h · Ist {number.format(value.actualHours)} h{entry.unplanned ? ' · Nicht kalkuliert' : ''}</small></div><Delta value={value.costDelta} percent={value.costDeltaPercent} /><ChevronRight size={17} /></button>)}</div><div className="context-note"><CircleAlert size={19} /><p><strong>Abweichung ist kein Schuldnachweis</strong>Die Analyse zeigt bewertete Abweichungen. Ursachen werden ausschließlich aus dokumentierten Angaben übernommen oder lokal ergänzt.</p></div></div></aside></div>,
    document.body,
  )
}

function WorkstationsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { dataset, orders } = useProjectData()
  const stations = useMemo(() => workstationSummaries(orders), [orders])
  const queryStation = new URLSearchParams(location.search).get('station')
  const [selectedName, setSelectedName] = useState<string | null>(queryStation)
  const selected = stations.find((station) => station.name === selectedName) ?? null
  if (!dataset) return <div className="page"><PageIntro eyebrow="Auftragsübergreifende Analyse" title="Wo entstehen Abweichungen?" copy="Importieren Sie Nachkalkulationen, um Arbeitsplätze dynamisch auszuwerten." /><EmptyImportState /></div>
  const chartData = stations.map((station) => ({ name: station.name, Sollstunden: station.plannedHours, Iststunden: station.actualHours }))
  const highest = [...stations].sort((a, b) => b.costDelta - a.costDelta)[0]
  return (
    <div className="page"><PageIntro eyebrow="Auftragsübergreifende Analyse" title="Wo entstehen Abweichungen?" copy="Arbeitsplätze werden dynamisch aus dem Import ermittelt; BAZ und BMG werden gemeinsam, BHX und CNC-Programmierung separat ausgewertet." /><div className="analysis-banner"><div className="analysis-icon"><Activity /></div><div><span>Stärkstes Signal</span><strong>{highest.name}</strong><p>{highest.exceededOrders} von {orders.length} Aufträgen über Soll · {fmtDeltaEuro(highest.costDelta)} Nettoabweichung</p></div><button className="button secondary dark" onClick={() => setSelectedName(highest.name)}>Analyse öffnen</button></div><section className="content-grid two-thirds workplace-top"><div className="panel chart-panel"><div className="panel-heading"><div><span className="section-label">Gesamtstunden</span><h3>Soll-Ist-Vergleich nach Arbeitsplatz</h3></div></div><div className="chart-wrap large"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} barGap={7}><CartesianGrid stroke="#e9e3dd" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: brown }} interval={0} angle={-18} textAnchor="end" height={68} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><Tooltip content={<ChartTooltip />} cursor={{ fill: '#f7f3ef' }} /><Legend iconType="square" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} /><Bar dataKey="Sollstunden" fill="#c8beb5" radius={[4, 4, 0, 0]} maxBarSize={28} /><Bar dataKey="Iststunden" fill={orange} radius={[4, 4, 0, 0]} maxBarSize={28} /></BarChart></ResponsiveContainer></div></div><div className="panel pattern-panel"><div className="panel-heading"><div><span className="section-label">Verteilung</span><h3>Überschreitungen</h3></div></div>{stations.slice().sort((a, b) => b.costDelta - a.costDelta).map((station) => <button key={station.name} onClick={() => setSelectedName(station.name)}><div><strong>{station.name}</strong><small>{station.exceededOrders} von {orders.length} Aufträgen{station.unplannedOrders ? ` · ${station.unplannedOrders}× nicht kalkuliert` : ''}</small></div><div className="mini-track"><span style={{ width: `${Math.max(0, (station.exceededOrders / orders.length) * 100)}%` }} /></div><Delta value={station.costDelta} /></button>)}</div></section><div className="panel table-panel workplace-table"><div className="panel-heading table-title"><div><span className="section-label">Detailübersicht</span><h3>Alle Arbeitsplätze</h3></div><span className="hint"><Info size={14} /> Zeile anklicken für Auftragsdetails</span></div><table className="data-table"><thead><tr><th>Arbeitsplatz</th><th className="num">Soll / Ist Stunden</th><th className="num">Zeitabweichung</th><th className="num">Soll / Ist Kosten</th><th className="num">Nettoabweichung</th><th className="num">Aufträge über Soll</th><th /></tr></thead><tbody>{stations.map((station) => <tr key={station.name} onClick={() => setSelectedName(station.name)}><td><strong>{station.name}</strong><small><RateLabel station={station} /></small>{station.unplannedOrders > 0 && <small className="unplanned-label">{station.unplannedOrders}× nicht kalkuliert</small>}</td><td className="num"><strong>{number.format(station.plannedHours)} / {number.format(station.actualHours)} h</strong></td><td className="num"><Delta value={station.hourDelta} kind="hours" percent={station.hourDeltaPercent} /></td><td className="num"><strong>{euro.format(station.plannedCost)} / {euro.format(station.actualCost)}</strong></td><td className="num"><Delta value={station.costDelta} percent={station.costDeltaPercent} /></td><td className="num"><span className={`count-pill ${station.exceededOrders >= 2 ? 'warning' : ''}`}>{station.exceededOrders} / {orders.length}</span></td><td><ChevronRight size={18} /></td></tr>)}</tbody></table></div><div className="method-note"><Info size={18} /><p><strong>Berechnungsgrundlage:</strong> Importierte Sollkosten und bewertete Istkosten. Fehlende Arbeitsplätze zählen in der Gesamtbetrachtung mit null; Tätigkeiten ohne Sollansatz sind als „nicht kalkuliert“ markiert.</p></div>{selected && <WorkstationDrawer station={selected} onClose={() => { setSelectedName(null); navigate('/arbeitsplaetze', { replace: true }) }} />}</div>
  )
}

function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { dataset, orders, insights, setInsights } = useProjectData()
  const order = orders.find((item) => item.id === id)
  const [activeStation, setActiveStation] = useState<WorkstationName>('')
  const [cause, setCause] = useState('')
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (order && !order.workstations.some((entry) => entry.name === activeStation)) setActiveStation(order.workstations[0]?.name ?? '')
  }, [order, activeStation])

  useEffect(() => {
    if (!order || !activeStation) return
    const insight = insights[`${order.id}:${activeStation}`]
    setCause(insight?.cause ?? '')
    setNote(insight?.note ?? '')
    setSaved(false)
  }, [activeStation, insights, order])

  if (!dataset) return <div className="page"><EmptyImportState /></div>
  if (!order) return <div className="page"><div className="empty-state"><h2>Auftrag nicht gefunden</h2><button className="button primary" onClick={() => navigate('/auftraege')}>Zurück zu den Aufträgen</button></div></div>
  const total = orderMetrics(order)
  const chart = order.workstations.map((entry) => ({ name: entry.name, Sollstunden: entry.plannedHours, Iststunden: entry.actualHours }))
  const selectStation = (name: WorkstationName) => setActiveStation(name)
  const save = () => {
    setInsights((current) => ({ ...current, [`${order.id}:${activeStation}`]: { cause: cause.trim(), note: note.trim() } }))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2600)
  }

  return (
    <div className="page detail-page"><button className="back-link" onClick={() => navigate('/auftraege')}><ArrowLeft size={17} /> Meine Aufträge</button><div className="detail-head"><div><div className="detail-tags"><span>{order.number}</span>{order.category && <span>{order.category}</span>}<span>Nachkalkuliert</span></div><h1>{order.title}</h1><p>{order.customer} · {order.location}{order.completedAt ? ` · Abschluss ${fmtDate(order.completedAt)}` : ' · Abschluss nicht dokumentiert'} · Datenstand {fmtDate(order.reportDate)}</p></div><div className="completion"><Check size={17} /> Import geprüft</div></div><section className="detail-kpis"><div><span>Sollkosten</span><strong>{euro.format(total.plannedCost)}</strong><small>{number.format(total.plannedHours)} Stunden</small></div><div><span>Bewertete Istkosten</span><strong>{euro.format(total.actualCost)}</strong><small>{number.format(total.actualHours)} Stunden</small></div><div className={deltaClass(total.costDelta)}><span>Nettoabweichung</span><strong>{fmtDeltaEuro(total.costDelta)}</strong><small>{fmtPercent(total.costDeltaPercent)}</small></div><div className={deltaClass(total.hourDelta)}><span>Zeitabweichung</span><strong>{fmtDeltaHours(total.hourDelta)}</strong><small>{fmtPercent(total.hourDeltaPercent)}</small></div></section><section className="content-grid half detail-analysis"><div className="panel chart-panel"><div className="panel-heading"><div><span className="section-label">Stundenvergleich</span><h3>Soll und Ist nach Arbeitsplatz</h3></div></div><div className="chart-wrap medium"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{ left: 0, right: 12 }}><CartesianGrid stroke="#e9e3dd" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={58} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><Tooltip content={<ChartTooltip />} /><Legend iconType="line" wrapperStyle={{ fontSize: 12 }} /><Line type="monotone" dataKey="Sollstunden" stroke="#a89d95" strokeWidth={2} dot={{ r: 3 }} /><Line type="monotone" dataKey="Iststunden" stroke={orange} strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></div><div className="panel contribution-panel"><div className="panel-heading"><div><span className="section-label">Kostentreiber</span><h3>Beitrag zur Nettoabweichung</h3></div></div>{order.workstations.slice().sort((a, b) => metrics([b]).costDelta - metrics([a]).costDelta).map((entry) => { const value = metrics([entry]); const max = Math.max(1, ...order.workstations.map((item) => Math.abs(metrics([item]).costDelta))); return <button key={entry.name} onClick={() => selectStation(entry.name)}><div><strong>{entry.name}{entry.unplanned ? ' · Nicht kalkuliert' : ''}</strong><Delta value={value.costDelta} /></div><div className="contribution-track"><span className={deltaClass(value.costDelta)} style={{ width: `${Math.max(3, Math.abs(value.costDelta) / max * 100)}%` }} /></div></button> })}</div></section><div className="panel table-panel detail-table"><div className="panel-heading table-title"><div><span className="section-label">Nachkalkulation</span><h3>Soll-Ist-Gegenüberstellung</h3></div><span className="hint"><Info size={14} /> Zeile anklicken, um eine Erkenntnis zu dokumentieren</span></div><table className="data-table"><thead><tr><th>Arbeitsplatz</th><th className="num">Soll</th><th className="num">Ist</th><th className="num">Abweichung</th><th className="num">Bewertungssatz</th><th className="num">Sollkosten</th><th className="num">Istkosten</th><th className="num">Nettoabweichung</th><th /></tr></thead><tbody>{order.workstations.map((entry) => { const value = metrics([entry]); const insight = insights[`${order.id}:${entry.name}`]; return <tr key={entry.name} className={activeStation === entry.name ? 'selected' : ''} onClick={() => selectStation(entry.name)}><td><strong>{entry.name}</strong>{entry.unplanned && <small className="unplanned-label">Nicht kalkuliert</small>}{insight && (insight.cause || insight.note) && <small className="documented"><Check size={12} /> Erkenntnis dokumentiert</small>}</td><td className="num">{number.format(entry.plannedHours)} h</td><td className="num"><strong>{number.format(entry.actualHours)} h</strong></td><td className="num"><Delta value={value.hourDelta} kind="hours" percent={value.hourDeltaPercent} /></td><td className="num">{entry.unplanned ? <><strong className="unplanned-rate">Nicht kalkuliert</strong><small>{entry.hourlyRate === null ? 'Bewertete Istkosten importiert' : `Istbewertung ${euro.format(entry.hourlyRate)} / h`}</small></> : entry.hourlyRate === null ? '—' : `${euro.format(entry.hourlyRate)} / h`}</td><td className="num">{euro.format(entry.plannedCost)}</td><td className="num"><strong>{euro.format(entry.actualCost)}</strong></td><td className="num"><Delta value={value.costDelta} /></td><td><ChevronRight size={17} /></td></tr> })}</tbody><tfoot><tr><td>Gesamter Auftrag</td><td className="num">{number.format(total.plannedHours)} h</td><td className="num">{number.format(total.actualHours)} h</td><td className="num">{fmtDeltaHours(total.hourDelta)}</td><td /><td className="num">{euro.format(total.plannedCost)}</td><td className="num">{euro.format(total.actualCost)}</td><td className={`num ${deltaClass(total.costDelta)}`}>{fmtDeltaEuro(total.costDelta)}</td><td /></tr></tfoot></table></div><section className="insight-editor"><div className="insight-copy"><span className="section-label">Lernen aus Abweichungen</span><h2>Erkenntnis dokumentieren</h2><p>Es werden keine Ursachen vorgegeben. Ergänzungen werden ebenfalls dauerhaft in diesem Browser gespeichert.</p><div className="active-workstation"><Gauge /><div><span>Ausgewählter Arbeitsplatz</span><strong>{activeStation}</strong></div></div></div><div className="editor-form"><label className="field-label">Ursache / Einordnung<input value={cause} onChange={(event) => setCause(event.target.value)} placeholder="Nur dokumentierte oder geprüfte Ursache eintragen" /></label><label className="field-label">Bemerkung<textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Welche Erkenntnis ist für künftige Kalkulationen relevant?" /></label><div className="editor-actions"><span><Info size={15} /> Dauerhaft lokal im Browser gespeichert</span><button className="button primary" onClick={save} disabled={!activeStation}><Check size={17} /> Erkenntnis speichern</button></div>{saved && <div className="save-toast"><Check /> Erkenntnis für {activeStation} gespeichert</div>}</div></section><p className="cost-disclaimer"><Info size={14} /> Grundlage sind die importierten Sollkosten und bewerteten Istkosten; Rundungen der Stundensätze verändern die Kostensummen nicht.</p></div>
  )
}

export default function App() {
  const [restored] = useState(restoreProjectData)
  const [dataset, setDataset] = useState<ImportDataset | null>(restored.dataset)
  const [source, setSource] = useState<LocalImportSource | null>(restored.source)
  const [insights, setInsights] = useState<Record<string, Insight>>(restored.insights)
  const [importOpen, setImportOpen] = useState(false)
  useEffect(() => {
    if (!dataset || !source) return
    try {
      persistProjectData(source, insights)
    } catch (reason) {
      console.error('Die lokalen Projektdaten konnten nicht gespeichert werden.', reason)
    }
  }, [dataset, insights, source])
  const value = useMemo<ProjectDataContextValue>(() => ({ dataset, orders: dataset?.orders ?? [], insights, setInsights, openImport: () => setImportOpen(true) }), [dataset, insights])
  return (
    <ProjectDataContext.Provider value={value}>
      <Shell><Routes><Route path="/" element={<Dashboard />} /><Route path="/auftraege" element={<OrdersPage />} /><Route path="/auftraege/:id" element={<OrderDetail />} /><Route path="/arbeitsplaetze" element={<WorkstationsPage />} /><Route path="*" element={<Dashboard />} /></Routes></Shell>
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onImport={(nextDataset, nextSource) => {
        persistProjectData(nextSource, nextDataset.existingInsights)
        setDataset(nextDataset)
        setSource(nextSource)
        setInsights(nextDataset.existingInsights)
        setImportOpen(false)
      }} />}
    </ProjectDataContext.Provider>
  )
}
