export type WorkstationName =
  | 'Arbeitsvorbereitung'
  | 'Säge'
  | 'Kante'
  | 'CNC'
  | 'Bankraum'
  | 'Montage'

export type Cause =
  | 'Kalkulationsfehler'
  | 'Planungsfehler'
  | 'Fertigungsprobleme'
  | 'Materialprobleme'
  | 'Kundenänderungen'
  | 'Sonstiges'
  | 'Ursache unbekannt'

export interface WorkstationEntry {
  name: WorkstationName
  plannedHours: number
  actualHours: number
  hourlyRate: number
}

export interface Order {
  id: string
  number: string
  title: string
  category: 'Hotelinnenausbau' | 'Büroeinrichtung' | 'Ladenbau'
  customer: string
  completedAt: string
  projectManager: string
  location: string
  workstations: WorkstationEntry[]
}

export const workstationRates: Record<WorkstationName, number> = {
  Arbeitsvorbereitung: 72,
  Säge: 58,
  Kante: 62,
  CNC: 78,
  Bankraum: 65,
  Montage: 68,
}

const row = (name: WorkstationName, plannedHours: number, actualHours: number): WorkstationEntry => ({
  name,
  plannedHours,
  actualHours,
  hourlyRate: workstationRates[name],
})

export const orders: Order[] = [
  {
    id: 'hotel-lindenhof',
    number: '24087',
    title: 'Hotel Lindenhof – Zimmer & Lobby',
    category: 'Hotelinnenausbau',
    customer: 'Hotel Lindenhof GmbH',
    completedAt: '2026-10-28',
    projectManager: 'Timo',
    location: 'Triberg',
    workstations: [
      row('Arbeitsvorbereitung', 82, 101),
      row('Säge', 46, 49),
      row('Kante', 58, 74),
      row('CNC', 86, 107),
      row('Bankraum', 132, 164),
      row('Montage', 168, 203),
    ],
  },
  {
    id: 'neotech-office',
    number: '24103',
    title: 'NeoTech – Neue Arbeitswelten',
    category: 'Büroeinrichtung',
    customer: 'NeoTech Systems AG',
    completedAt: '2026-11-07',
    projectManager: 'Timo',
    location: 'Villingen-Schwenningen',
    workstations: [
      row('Arbeitsvorbereitung', 64, 59),
      row('Säge', 32, 29),
      row('Kante', 44, 41),
      row('CNC', 62, 60),
      row('Bankraum', 98, 92),
      row('Montage', 124, 116),
    ],
  },
  {
    id: 'gruenpunkt-store',
    number: '24121',
    title: 'Grünpunkt – Flagship Store',
    category: 'Ladenbau',
    customer: 'Grünpunkt Handels GmbH',
    completedAt: '2026-11-18',
    projectManager: 'Timo',
    location: 'Freiburg',
    workstations: [
      row('Arbeitsvorbereitung', 48, 57),
      row('Säge', 0, 4),
      row('Kante', 38, 47),
      row('CNC', 52, 63),
      row('Bankraum', 76, 83),
      row('Montage', 102, 118),
    ],
  },
]

export interface Metrics {
  plannedHours: number
  actualHours: number
  hourDelta: number
  hourDeltaPercent: number | null
  plannedCost: number
  actualCost: number
  costDelta: number
  costDeltaPercent: number | null
}

export function metrics(entries: WorkstationEntry[]): Metrics {
  const plannedHours = entries.reduce((sum, entry) => sum + entry.plannedHours, 0)
  const actualHours = entries.reduce((sum, entry) => sum + entry.actualHours, 0)
  const plannedCost = entries.reduce((sum, entry) => sum + entry.plannedHours * entry.hourlyRate, 0)
  const actualCost = entries.reduce((sum, entry) => sum + entry.actualHours * entry.hourlyRate, 0)
  const hourDelta = actualHours - plannedHours
  const costDelta = actualCost - plannedCost
  return {
    plannedHours,
    actualHours,
    hourDelta,
    hourDeltaPercent: plannedHours === 0 ? null : (hourDelta / plannedHours) * 100,
    plannedCost,
    actualCost,
    costDelta,
    costDeltaPercent: plannedCost === 0 ? null : (costDelta / plannedCost) * 100,
  }
}

export const orderMetrics = (order: Order) => metrics(order.workstations)

export const allMetrics = () => metrics(orders.flatMap((order) => order.workstations))

export interface WorkstationSummary extends Metrics {
  name: WorkstationName
  hourlyRate: number
  exceededOrders: number
  orders: Array<{ order: Order; entry: WorkstationEntry; metrics: Metrics }>
}

export function workstationSummaries(): WorkstationSummary[] {
  return (Object.keys(workstationRates) as WorkstationName[]).map((name) => {
    const perOrder = orders.map((order) => {
      const entry = order.workstations.find((item) => item.name === name)!
      return { order, entry, metrics: metrics([entry]) }
    })
    return {
      name,
      hourlyRate: workstationRates[name],
      exceededOrders: perOrder.filter(({ metrics: value }) => value.hourDelta > 0).length,
      orders: perOrder,
      ...metrics(perOrder.map(({ entry }) => entry)),
    }
  })
}

export const causes: Cause[] = [
  'Kalkulationsfehler',
  'Planungsfehler',
  'Fertigungsprobleme',
  'Materialprobleme',
  'Kundenänderungen',
  'Sonstiges',
  'Ursache unbekannt',
]

export const existingInsights: Partial<Record<string, { cause: Cause; note: string }>> = {
  'hotel-lindenhof:Montage': {
    cause: 'Kundenänderungen',
    note: 'Zusätzliche Einbaumöbel im zweiten Obergeschoss und erschwerte Anlieferung. Für Folgeprojekte einen separaten Logistikpuffer vorsehen.',
  },
  'hotel-lindenhof:CNC': {
    cause: 'Planungsfehler',
    note: 'Mehrere Programme mussten nach Freigabeänderungen neu erstellt werden.',
  },
  'gruenpunkt-store:Kante': {
    cause: 'Materialprobleme',
    note: 'Nacharbeit durch abweichende Dekorcharge. Wareneingang künftig vor Produktionsfreigabe prüfen.',
  },
}
