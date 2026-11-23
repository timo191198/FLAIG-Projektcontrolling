import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileSpreadsheet,
  Gauge,
  Info,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  UserRound,
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
  causes,
  existingInsights,
  metrics,
  orderMetrics,
  orders,
  workstationSummaries,
  type Cause,
  type Metrics,
  type Order,
  type WorkstationName,
} from './data'
import flaigLogo from './assets/flaig-logo.svg'

const orange = '#ff6900'
const brown = '#453a35'
const green = '#1f8a62'
const red = '#d95749'

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })
const date = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

const fmtPercent = (value: number | null, signed = true) =>
  value === null ? 'n. a.' : `${signed && value > 0 ? '+' : ''}${number.format(value)} %`
const fmtDeltaHours = (value: number) => `${value > 0 ? '+' : ''}${number.format(value)} h`
const fmtDeltaEuro = (value: number) => `${value > 0 ? '+' : ''}${euro.format(value)}`
const deltaClass = (value: number) => (value > 0 ? 'negative' : value < 0 ? 'positive' : 'neutral')

function Logo() {
  return <img className="brand-logo" src={flaigLogo} alt="FLAIG Innenausbau" />
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
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
          <div className="prototype-tag"><span /> PROTOTYP · DEMODATEN</div>
          <div className="profile-card">
            <div className="avatar">T</div>
            <div><strong>Timo</strong><span>Projektleitung</span></div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen((v) => !v)} aria-label="Navigation öffnen"><Menu /></button>
          <div><span className="eyebrow">FLAIG PROJEKTCONTROLLING</span><strong>{page}</strong></div>
          <div className="topbar-meta"><span>Datenstand</span><strong>23. November 2026</strong></div>
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
          <span /> {entry.name}: <b>{entry.dataKey.toLowerCase().includes('cost') || entry.dataKey.toLowerCase().includes('kosten') ? euro.format(entry.value) : `${number.format(entry.value)} h`}</b>
        </div>
      ))}
    </div>
  )
}

function MetricCard({ label, value, detail, icon: Icon, onClick }: { label: string; value: string; detail?: React.ReactNode; icon: any; onClick?: () => void }) {
  const content = (
    <>
      <div className="metric-icon"><Icon size={20} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <div className="metric-detail">{detail}</div>}
    </>
  )
  return onClick ? <button className="metric-card clickable" onClick={onClick}>{content}</button> : <div className="metric-card">{content}</div>
}

function Dashboard() {
  const navigate = useNavigate()
  const total = allMetrics()
  const orderData = orders.map((order) => {
    const m = orderMetrics(order)
    return { id: order.id, name: order.title.split(' – ')[0], Sollkosten: m.plannedCost, Istkosten: m.actualCost, Abweichung: m.costDelta }
  })
  const stations = workstationSummaries()
  const stationData = stations.map((station) => ({ name: station.name, Abweichung: station.costDelta }))
  const strongest = [...orders].sort((a, b) => orderMetrics(b).costDelta - orderMetrics(a).costDelta)

  return (
    <div className="page dashboard-page">
      <PageIntro eyebrow="Persönliche Projektübersicht" title="Guten Abend, Timo" copy="Drei abgeschlossene Aufträge im Blick – mit klaren Signalen für Kalkulation und Prozessverbesserung." />

      <section className="financial-hero">
        <div className="financial-heading">
          <span className="section-label light">Kalkulatorische Arbeitszeitkosten</span>
          <h2>Von der Nachkalkulation<br />zur besseren Entscheidung.</h2>
          <button className="text-link light" onClick={() => navigate('/auftraege')}>Alle Aufträge analysieren <ArrowUpRight size={17} /></button>
        </div>
        <div className="financial-figures">
          <div><span>Geplant</span><strong>{euro.format(total.plannedCost)}</strong><small>{number.format(total.plannedHours)} Arbeitsstunden</small></div>
          <div className="actual"><span>Tatsächlich</span><strong>{euro.format(total.actualCost)}</strong><small>{number.format(total.actualHours)} Arbeitsstunden</small></div>
          <div className={`hero-delta ${deltaClass(total.costDelta)}`}><span>Nettokostenabweichung</span><strong>{fmtDeltaEuro(total.costDelta)}</strong><em>{fmtPercent(total.costDeltaPercent)}</em></div>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard icon={FileSpreadsheet} label="Ausgewertete Aufträge" value={String(orders.length)} detail="100 % vollständig" onClick={() => navigate('/auftraege')} />
        <MetricCard icon={Clock3} label="Zeitabweichung gesamt" value={fmtDeltaHours(total.hourDelta)} detail={<Delta value={total.hourDelta} kind="hours" percent={total.hourDeltaPercent} />} onClick={() => navigate('/auftraege')} />
        <MetricCard icon={WalletCards} label="Kostenabweichung gesamt" value={fmtDeltaEuro(total.costDelta)} detail={<Delta value={total.costDelta} percent={total.costDeltaPercent} />} onClick={() => navigate('/auftraege')} />
        <MetricCard icon={Target} label="Innerhalb der Kalkulation" value="1 von 3" detail="33 % der Aufträge" onClick={() => navigate('/auftraege?status=unter')} />
      </section>

      <section className="content-grid two-thirds">
        <div className="panel chart-panel">
          <div className="panel-heading"><div><span className="section-label">Kosten im Vergleich</span><h3>Soll- und Istkosten je Auftrag</h3></div><span className="hint"><Info size={14} /> Balken anklicken</span></div>
          <div className="chart-wrap large">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderData} barGap={8} onClick={(state: any) => state?.activePayload?.[0]?.payload?.id && navigate(`/auftraege/${state.activePayload[0].payload.id}`)}>
                <CartesianGrid stroke="#e8e2dc" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#756a65', fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)} T€`} tickLine={false} axisLine={false} tick={{ fill: '#918781', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f6f2ee' }} />
                <Legend iconType="square" wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="Sollkosten" name="Sollkosten" fill="#c8beb5" radius={[4, 4, 0, 0]} maxBarSize={44} />
                <Bar dataKey="Istkosten" name="Istkosten" fill={orange} radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel insight-panel">
          <div className="panel-heading"><div><span className="section-label">Früherkennung</span><h3>Größte Kostenabweichungen</h3></div></div>
          <div className="ranking-list">
            {strongest.map((order, index) => {
              const m = orderMetrics(order)
              return <button key={order.id} onClick={() => navigate(`/auftraege/${order.id}`)}><span className="rank">0{index + 1}</span><div><strong>{order.title}</strong><small>{order.number} · {order.customer}</small></div><Delta value={m.costDelta} percent={m.costDeltaPercent} /><ChevronRight size={17} /></button>
            })}
          </div>
          <div className="analysis-note"><Lightbulb size={19} /><p><strong>Wiederkehrendes Muster erkannt</strong>Montage und CNC liegen in zwei von drei Aufträgen über der Kalkulation.</p></div>
        </div>
      </section>

      <section className="content-grid half">
        <div className="panel chart-panel">
          <div className="panel-heading"><div><span className="section-label">Prozesssicht</span><h3>Kostenabweichung nach Arbeitsplatz</h3></div><button className="text-link" onClick={() => navigate('/arbeitsplaetze')}>Details ansehen <ArrowUpRight size={16} /></button></div>
          <div className="chart-wrap medium">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stationData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid stroke="#eee8e2" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${v > 0 ? '+' : ''}${Math.round(v / 1000)} T€`} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={115} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: brown }} />
                <ReferenceLine x={0} stroke="#9d938c" />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8f5f2' }} />
                <Bar dataKey="Abweichung" name="Kostenabweichung" radius={[0, 4, 4, 0]} maxBarSize={20} onClick={(data: any) => navigate(`/arbeitsplaetze?station=${encodeURIComponent(data.name)}`)}>
                  {stationData.map((entry) => <Cell key={entry.name} fill={entry.Abweichung > 0 ? red : green} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel recent-panel">
          <div className="panel-heading"><div><span className="section-label">Zuletzt abgeschlossen</span><h3>Neueste Auswertungen</h3></div></div>
          {orders.slice().sort((a, b) => b.completedAt.localeCompare(a.completedAt)).map((order) => {
            const m = orderMetrics(order)
            return <button className="recent-order" key={order.id} onClick={() => navigate(`/auftraege/${order.id}`)}><div className="date-tile"><b>{date.format(new Date(order.completedAt)).slice(0, 2)}</b><span>{new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(new Date(order.completedAt))}</span></div><div><strong>{order.title}</strong><span>{order.customer}</span></div><Delta value={m.costDelta} /><ChevronRight size={17} /></button>
          })}
        </div>
      </section>
      <p className="cost-disclaimer"><Info size={14} /> Dargestellt werden kalkulatorische Arbeitszeitkosten. Material, Fremdleistungen und Projektrentabilität sind nicht enthalten.</p>
    </div>
  )
}

function NewOrderModal({ onClose }: { onClose: () => void }) {
  const [done, setDone] = useState(false)
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.currentTarget === e.target && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-order-title">
        <button className="modal-close" onClick={onClose} aria-label="Dialog schließen"><X /></button>
        {!done ? <>
          <span className="section-label">Neue Nachkalkulation</span>
          <h2 id="new-order-title">Auftrag auswerten</h2>
          <p>Importieren Sie die Kalkulation und den Zeitnachweis. Im Prototyp wird der Ablauf nur simuliert.</p>
          <label className="field-label">Auftragsbezeichnung<input placeholder="z. B. Umbau Empfangsbereich" /></label>
          <div className="upload-grid">
            <button className="upload-zone"><UploadCloud /><strong>Kalkulation auswählen</strong><span>Excel oder CSV · max. 10 MB</span></button>
            <button className="upload-zone"><Clock3 /><strong>Zeitnachweis auswählen</strong><span>Excel oder CSV · max. 10 MB</span></button>
          </div>
          <div className="modal-actions"><button className="button secondary" onClick={onClose}>Abbrechen</button><button className="button primary" onClick={() => setDone(true)}>Demo-Import starten</button></div>
        </> : <div className="success-state"><div><Check /></div><span className="section-label">Import vorbereitet</span><h2>Bereit für die Auswertung</h2><p>Im späteren System würden die Dokumente jetzt geprüft und den Arbeitsplätzen zugeordnet.</p><button className="button primary" onClick={onClose}>Zur Auftragsübersicht</button></div>}
      </div>
    </div>
  )
}

function OrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState(new URLSearchParams(location.search).get('status') ?? 'alle')
  const [sort, setSort] = useState('datum-desc')
  const [modal, setModal] = useState(false)

  const filtered = useMemo(() => {
    const result = orders.filter((order) => {
      const m = orderMetrics(order)
      const matchesQuery = `${order.number} ${order.title} ${order.customer}`.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = status === 'alle' || (status === 'ueber' ? m.costDelta > 0 : m.costDelta <= 0)
      return matchesQuery && matchesStatus
    })
    return result.sort((a, b) => {
      if (sort === 'datum-desc') return b.completedAt.localeCompare(a.completedAt)
      if (sort === 'abweichung-desc') return orderMetrics(b).costDelta - orderMetrics(a).costDelta
      return a.title.localeCompare(b.title, 'de')
    })
  }, [query, status, sort])

  return (
    <div className="page">
      <PageIntro eyebrow="Persönliches Portfolio" title="Meine Aufträge" copy="Abgeschlossene Innenausbauprojekte vergleichen, Abweichungen verstehen und Erkenntnisse sichern." action={<button className="button primary" onClick={() => setModal(true)}><Plus size={18} /> Neuer Auftrag</button>} />
      <div className="toolbar">
        <label className="search-field"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Auftrag, Nummer oder Kunde suchen …" /></label>
        <label className="select-field"><SlidersHorizontal size={17} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="alle">Alle Ergebnisse</option><option value="ueber">Über Kalkulation</option><option value="unter">Innerhalb Kalkulation</option></select><ChevronDown /></label>
        <label className="select-field"><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="datum-desc">Neueste zuerst</option><option value="abweichung-desc">Höchste Abweichung</option><option value="name">Bezeichnung A–Z</option></select><ChevronDown /></label>
      </div>
      <div className="orders-summary"><span><b>{filtered.length}</b> von {orders.length} Aufträgen</span><span><span className="legend-dot red" /> Überschreitung</span><span><span className="legend-dot green" /> Innerhalb Kalkulation</span></div>
      <div className="panel table-panel">
        <table className="data-table orders-table">
          <thead><tr><th>Auftrag</th><th>Abschluss</th><th className="num">Soll / Ist Zeit</th><th className="num">Zeitabweichung</th><th className="num">Kostenabweichung</th><th /></tr></thead>
          <tbody>
            {filtered.map((order) => {
              const m = orderMetrics(order)
              return <tr key={order.id} onClick={() => navigate(`/auftraege/${order.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/auftraege/${order.id}`)}>
                <td><div className="order-identity"><span className="order-number">{order.number}</span><div><strong>{order.title}</strong><small>{order.customer} · {order.category}</small></div></div></td>
                <td><strong>{date.format(new Date(order.completedAt))}</strong><small>{order.location}</small></td>
                <td className="num"><strong>{number.format(m.plannedHours)} / {number.format(m.actualHours)} h</strong><small>kalkuliert / tatsächlich</small></td>
                <td className="num"><Delta value={m.hourDelta} kind="hours" percent={m.hourDeltaPercent} /></td>
                <td className="num"><Delta value={m.costDelta} percent={m.costDeltaPercent} /></td>
                <td><span className="row-action"><ChevronRight size={18} /></span></td>
              </tr>
            })}
          </tbody>
        </table>
        {!filtered.length && <div className="empty-state"><Search /><h3>Keine Aufträge gefunden</h3><p>Passen Sie Suche oder Filter an.</p></div>}
      </div>
      {modal && <NewOrderModal onClose={() => setModal(false)} />}
    </div>
  )
}

function WorkstationDrawer({ station, onClose }: { station: ReturnType<typeof workstationSummaries>[number]; onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return createPortal(
    <div className="drawer-backdrop" onMouseDown={(e) => e.currentTarget === e.target && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="drawer-header">
          <div><span className="section-label">Arbeitsplatzanalyse</span><h2 id="drawer-title">{station.name}</h2></div>
          <button className="drawer-close" onClick={onClose} aria-label="Detailfenster schließen"><X /></button>
        </header>
        <div className="drawer-content">
        <p className="drawer-intro">Abweichungen über alle ausgewerteten Aufträge.</p>
        <div className="drawer-kpis"><div><span>Kostenabweichung</span><strong className={deltaClass(station.costDelta)}>{fmtDeltaEuro(station.costDelta)}</strong><small>{fmtPercent(station.costDeltaPercent)}</small></div><div><span>Zeitabweichung</span><strong className={deltaClass(station.hourDelta)}>{fmtDeltaHours(station.hourDelta)}</strong><small>{fmtPercent(station.hourDeltaPercent)}</small></div></div>
        <h3>Aufschlüsselung nach Auftrag</h3>
        <div className="drawer-orders">
          {station.orders.map(({ order, metrics: m }) => <button key={order.id} onClick={() => window.location.assign(`/auftraege/${order.id}`)}><div><strong>{order.title}</strong><small>{order.number} · Soll {number.format(m.plannedHours)} h · Ist {number.format(m.actualHours)} h</small></div><Delta value={m.costDelta} percent={m.costDeltaPercent} /><ChevronRight size={17} /></button>)}
        </div>
        <div className="context-note"><CircleAlert size={19} /><p><strong>Abweichung ist kein Schuldnachweis</strong>Die Analyse zeigt, wo Mehrzeit erfasst wurde. Die Ursache wird erst im Projektkontext bewertet.</p></div>
        </div>
      </aside>
    </div>,
    document.body,
  )
}

function WorkstationsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const stations = workstationSummaries()
  const queryStation = new URLSearchParams(location.search).get('station') as WorkstationName | null
  const [selected, setSelected] = useState(queryStation ? stations.find((s) => s.name === queryStation) ?? null : null)
  const chartData = stations.map((s) => ({ name: s.name, Sollstunden: s.plannedHours, Iststunden: s.actualHours, delta: s.hourDelta }))
  const highest = [...stations].sort((a, b) => b.costDelta - a.costDelta)[0]
  return (
    <div className="page">
      <PageIntro eyebrow="Auftragsübergreifende Analyse" title="Wo entstehen Abweichungen?" copy="Arbeitsplätze im Vergleich zeigen wiederkehrende Muster – als Ausgangspunkt für bessere Kalkulation und gezielte Prozessanalyse." />
      <div className="analysis-banner"><div className="analysis-icon"><Activity /></div><div><span>Stärkstes Signal</span><strong>{highest.name}</strong><p>{highest.exceededOrders} von 3 Aufträgen über Plan · {fmtDeltaEuro(highest.costDelta)} kalkulatorische Mehrkosten</p></div><button className="button secondary dark" onClick={() => setSelected(highest)}>Analyse öffnen</button></div>
      <section className="content-grid two-thirds workplace-top">
        <div className="panel chart-panel"><div className="panel-heading"><div><span className="section-label">Gesamtstunden</span><h3>Soll-Ist-Vergleich nach Arbeitsplatz</h3></div></div><div className="chart-wrap large"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} barGap={7}><CartesianGrid stroke="#e9e3dd" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: brown }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><Tooltip content={<ChartTooltip />} cursor={{ fill: '#f7f3ef' }} /><Legend iconType="square" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} /><Bar dataKey="Sollstunden" fill="#c8beb5" radius={[4, 4, 0, 0]} maxBarSize={36} /><Bar dataKey="Iststunden" fill={orange} radius={[4, 4, 0, 0]} maxBarSize={36} /></BarChart></ResponsiveContainer></div></div>
        <div className="panel pattern-panel"><div className="panel-heading"><div><span className="section-label">Verteilung</span><h3>Überschreitungen</h3></div></div>{stations.slice().sort((a, b) => b.exceededOrders - a.exceededOrders).map((s) => <button key={s.name} onClick={() => setSelected(s)}><div><strong>{s.name}</strong><small>{s.exceededOrders} von 3 Aufträgen</small></div><div className="mini-track"><span style={{ width: `${(s.exceededOrders / 3) * 100}%` }} /></div><Delta value={s.costDelta} /></button>)}</div>
      </section>
      <div className="panel table-panel workplace-table">
        <div className="panel-heading table-title"><div><span className="section-label">Detailübersicht</span><h3>Alle Arbeitsplätze</h3></div><span className="hint"><Info size={14} /> Zeile anklicken für Auftragsdetails</span></div>
        <table className="data-table"><thead><tr><th>Arbeitsplatz</th><th className="num">Soll / Ist Stunden</th><th className="num">Zeitabweichung</th><th className="num">Soll / Ist Kosten</th><th className="num">Kostenabweichung</th><th className="num">Aufträge über Plan</th><th /></tr></thead><tbody>{stations.map((s) => <tr key={s.name} onClick={() => setSelected(s)}><td><strong>{s.name}</strong><small>{euro.format(s.hourlyRate)} / Stunde</small></td><td className="num"><strong>{number.format(s.plannedHours)} / {number.format(s.actualHours)} h</strong></td><td className="num"><Delta value={s.hourDelta} kind="hours" percent={s.hourDeltaPercent} /></td><td className="num"><strong>{euro.format(s.plannedCost)} / {euro.format(s.actualCost)}</strong></td><td className="num"><Delta value={s.costDelta} percent={s.costDeltaPercent} /></td><td className="num"><span className={`count-pill ${s.exceededOrders >= 2 ? 'warning' : ''}`}>{s.exceededOrders} / 3</span></td><td><ChevronRight size={18} /></td></tr>)}</tbody></table>
      </div>
      <div className="method-note"><Info size={18} /><p><strong>So wird gerechnet:</strong> Prozentuale Abweichungen basieren auf den summierten Soll- und Istwerten. Bei 0 Soll-Stunden wird keine Prozentabweichung ausgewiesen.</p></div>
      {selected && <WorkstationDrawer station={selected} onClose={() => { setSelected(null); navigate('/arbeitsplaetze', { replace: true }) }} />}
    </div>
  )
}

function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const order = orders.find((item) => item.id === id)
  const [activeStation, setActiveStation] = useState<WorkstationName>('Montage')
  const [insights, setInsights] = useState(existingInsights)
  const [cause, setCause] = useState<Cause>(existingInsights[`${id}:Montage`]?.cause ?? 'Ursache unbekannt')
  const [note, setNote] = useState(existingInsights[`${id}:Montage`]?.note ?? '')
  const [saved, setSaved] = useState(false)
  if (!order) return <div className="page"><div className="empty-state"><h2>Auftrag nicht gefunden</h2><button className="button primary" onClick={() => navigate('/auftraege')}>Zurück zu den Aufträgen</button></div></div>
  const total = orderMetrics(order)
  const chart = order.workstations.map((entry) => ({ name: entry.name, Sollstunden: entry.plannedHours, Iststunden: entry.actualHours }))

  const selectStation = (name: WorkstationName) => {
    const savedInsight = insights[`${order.id}:${name}`]
    setActiveStation(name)
    setCause(savedInsight?.cause ?? 'Ursache unbekannt')
    setNote(savedInsight?.note ?? '')
    setSaved(false)
  }
  const save = () => {
    setInsights((current) => ({ ...current, [`${order.id}:${activeStation}`]: { cause, note } }))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2600)
  }

  return (
    <div className="page detail-page">
      <button className="back-link" onClick={() => navigate('/auftraege')}><ArrowLeft size={17} /> Meine Aufträge</button>
      <div className="detail-head"><div><div className="detail-tags"><span>{order.number}</span><span>{order.category}</span><span>Abgeschlossen</span></div><h1>{order.title}</h1><p>{order.customer} · {order.location} · Abschluss {date.format(new Date(order.completedAt))}</p></div><div className="completion"><Check size={17} /> Auswertung vollständig</div></div>
      <section className="detail-kpis">
        <div><span>Kalkulierte Kosten</span><strong>{euro.format(total.plannedCost)}</strong><small>{number.format(total.plannedHours)} Stunden</small></div>
        <div><span>Tatsächliche Kosten</span><strong>{euro.format(total.actualCost)}</strong><small>{number.format(total.actualHours)} Stunden</small></div>
        <div className={deltaClass(total.costDelta)}><span>Kostenabweichung</span><strong>{fmtDeltaEuro(total.costDelta)}</strong><small>{fmtPercent(total.costDeltaPercent)}</small></div>
        <div className={deltaClass(total.hourDelta)}><span>Zeitabweichung</span><strong>{fmtDeltaHours(total.hourDelta)}</strong><small>{fmtPercent(total.hourDeltaPercent)}</small></div>
      </section>
      <section className="content-grid half detail-analysis">
        <div className="panel chart-panel"><div className="panel-heading"><div><span className="section-label">Stundenvergleich</span><h3>Soll und Ist nach Arbeitsplatz</h3></div></div><div className="chart-wrap medium"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{ left: 0, right: 12 }}><CartesianGrid stroke="#e9e3dd" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><Tooltip content={<ChartTooltip />} /><Legend iconType="line" wrapperStyle={{ fontSize: 12 }} /><Line type="monotone" dataKey="Sollstunden" stroke="#a89d95" strokeWidth={2} dot={{ r: 4 }} /><Line type="monotone" dataKey="Iststunden" stroke={orange} strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></div>
        <div className="panel contribution-panel"><div className="panel-heading"><div><span className="section-label">Kostentreiber</span><h3>Beitrag zur Abweichung</h3></div></div>{order.workstations.slice().sort((a, b) => metrics([b]).costDelta - metrics([a]).costDelta).map((entry) => { const m = metrics([entry]); const max = Math.max(...order.workstations.map((item) => Math.abs(metrics([item]).costDelta))); return <button key={entry.name} onClick={() => selectStation(entry.name)}><div><strong>{entry.name}</strong><Delta value={m.costDelta} /></div><div className="contribution-track"><span className={deltaClass(m.costDelta)} style={{ width: `${Math.max(3, Math.abs(m.costDelta) / max * 100)}%` }} /></div></button>})}</div>
      </section>
      <div className="panel table-panel detail-table"><div className="panel-heading table-title"><div><span className="section-label">Nachkalkulation</span><h3>Soll-Ist-Gegenüberstellung</h3></div><span className="hint"><Info size={14} /> Zeile anklicken, um Ursache zu dokumentieren</span></div><table className="data-table"><thead><tr><th>Arbeitsplatz</th><th className="num">Soll</th><th className="num">Ist</th><th className="num">Abweichung</th><th className="num">Stundensatz</th><th className="num">Soll-Kosten</th><th className="num">Ist-Kosten</th><th className="num">Kostenabweichung</th><th /></tr></thead><tbody>{order.workstations.map((entry) => { const m = metrics([entry]); const insight = insights[`${order.id}:${entry.name}`]; return <tr key={entry.name} className={activeStation === entry.name ? 'selected' : ''} onClick={() => selectStation(entry.name)}><td><strong>{entry.name}</strong>{insight && <small className="documented"><Check size={12} /> Erkenntnis dokumentiert</small>}</td><td className="num">{number.format(entry.plannedHours)} h</td><td className="num"><strong>{number.format(entry.actualHours)} h</strong></td><td className="num"><Delta value={m.hourDelta} kind="hours" percent={m.hourDeltaPercent} /></td><td className="num">{euro.format(entry.hourlyRate)}</td><td className="num">{euro.format(m.plannedCost)}</td><td className="num"><strong>{euro.format(m.actualCost)}</strong></td><td className="num"><Delta value={m.costDelta} /></td><td><ChevronRight size={17} /></td></tr>})}</tbody><tfoot><tr><td>Gesamter Auftrag</td><td className="num">{number.format(total.plannedHours)} h</td><td className="num">{number.format(total.actualHours)} h</td><td className="num">{fmtDeltaHours(total.hourDelta)}</td><td /><td className="num">{euro.format(total.plannedCost)}</td><td className="num">{euro.format(total.actualCost)}</td><td className={`num ${deltaClass(total.costDelta)}`}>{fmtDeltaEuro(total.costDelta)}</td><td /></tr></tfoot></table></div>
      <section className="insight-editor">
        <div className="insight-copy"><span className="section-label">Lernen aus Abweichungen</span><h2>Ursache & Erkenntnis dokumentieren</h2><p>Die Einordnung schafft die Grundlage für belastbarere Kalkulationen. Sie bewertet den Projektkontext, nicht einzelne Personen.</p><div className="active-workstation"><Gauge /><div><span>Ausgewählter Arbeitsplatz</span><strong>{activeStation}</strong></div></div></div>
        <div className="editor-form"><label className="field-label">Wahrscheinliche Ursache<div className="select-field full"><select value={cause} onChange={(e) => setCause(e.target.value as Cause)}>{causes.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown /></div></label><label className="field-label">Bemerkung<textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Was hat zur Abweichung beigetragen? Was sollte beim nächsten Auftrag anders kalkuliert oder organisiert werden?" /></label><div className="editor-actions"><span><Info size={15} /> Lokal im Prototyp gespeichert</span><button className="button primary" onClick={save}><Check size={17} /> Erkenntnis speichern</button></div>{saved && <div className="save-toast"><Check /> Erkenntnis für {activeStation} gespeichert</div>}</div>
      </section>
      <p className="cost-disclaimer"><Info size={14} /> Kalkulatorische Arbeitszeitkosten; keine vollständige Gewinn- oder Verlustrechnung.</p>
    </div>
  )
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/auftraege" element={<OrdersPage />} />
        <Route path="/auftraege/:id" element={<OrderDetail />} />
        <Route path="/arbeitsplaetze" element={<WorkstationsPage />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Shell>
  )
}
