export type WorkstationName = string

export interface WorkstationEntry {
  name: WorkstationName
  plannedHours: number
  actualHours: number
  hourlyRate: number | null
  plannedHourlyRate: number | null
  actualCostFallback: number | null
  plannedCost: number
  actualCost: number
  rateBasis: string
  sourceWorkstation: string
  costCenterCodes: string[]
  unplanned: boolean
}

export interface Order {
  id: string
  number: string
  title: string
  customer: string
  location: string
  projectManager: string
  category: string | null
  completedAt: string | null
  reportDate: string
  reportedPlannedHours: number | null
  reportedActualHours: number | null
  workstations: WorkstationEntry[]
}

export interface Insight {
  cause: string
  note: string
}

interface ValidationTotal {
  plannedHours: number
  actualHours: number
  plannedCost: number
  actualCost: number
  costDelta: number
}

export interface ImportDataset {
  schemaVersion: number
  reportDate: string
  orders: Order[]
  existingInsights: Record<string, Insight>
  sourceFileName: string
  validationTotal: ValidationTotal | null
}

export interface Metrics {
  plannedHours: number
  actualHours: number
  hourDelta: number
  hourDeltaPercent: number | null
  plannedCost: number
  actualCost: number
  costDelta: number
  costDeltaPercent: number | null
  additionalCost: number
  savingsCost: number
}

export interface WorkstationSummary extends Metrics {
  name: WorkstationName
  hourlyRate: number | null
  hourlyRates: number[]
  exceededOrders: number
  unplannedOrders: number
  orders: Array<{ order: Order; entry: WorkstationEntry; metrics: Metrics }>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requiredString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Feld „${field}“ fehlt oder ist ungültig.`)
  return value.trim()
}

const nullableString = (value: unknown, field: string) => {
  if (value === null || value === undefined || value === '') return null
  return requiredString(value, field)
}

const requiredNumber = (value: unknown, field: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Feld „${field}“ fehlt oder ist ungültig.`)
  return value
}

const nullableNumber = (value: unknown, field: string) =>
  value === null || value === undefined ? null : requiredNumber(value, field)

const canonicalWorkstationName = (value: string) => {
  const name = value.trim().replace(/\s+/g, ' ')
  if (/^CNC\s+(BAZ|BMG)(\s*\/\s*(BAZ|BMG))?$/i.test(name)) return 'CNC BAZ / BMG'
  if (/^CNC\s+BHX$/i.test(name)) return 'CNC BHX'
  if (/^CNC[-\s]+Programmierung$/i.test(name)) return 'CNC-Programmierung'
  return name
}

const parseEntry = (value: unknown, orderNumber: string, index: number): WorkstationEntry => {
  if (!isRecord(value)) throw new Error(`Arbeitsplatz ${index + 1} in Auftrag ${orderNumber} ist ungültig.`)
  const rawName = requiredString(value.name, `orders[].workstations[${index}].name`)
  const plannedHours = requiredNumber(value.plannedHours, `${rawName}.plannedHours`)
  const actualHours = requiredNumber(value.actualHours, `${rawName}.actualHours`)
  const plannedCost = requiredNumber(value.plannedCost, `${rawName}.plannedCost`)
  const actualCost = requiredNumber(value.actualCost, `${rawName}.actualCost`)
  const rateBasis = typeof value.rateBasis === 'string' ? value.rateBasis : 'planned'
  const codes = Array.isArray(value.costCenterCodes)
    ? value.costCenterCodes.filter((code): code is string => typeof code === 'string')
    : []

  return {
    name: canonicalWorkstationName(rawName),
    plannedHours,
    actualHours,
    hourlyRate: nullableNumber(value.hourlyRate, `${rawName}.hourlyRate`),
    plannedHourlyRate: nullableNumber(value.plannedHourlyRate, `${rawName}.plannedHourlyRate`),
    actualCostFallback: nullableNumber(value.actualCostFallback, `${rawName}.actualCostFallback`),
    plannedCost,
    actualCost,
    rateBasis,
    sourceWorkstation: typeof value.sourceWorkstation === 'string' ? value.sourceWorkstation : rawName,
    costCenterCodes: codes,
    unplanned: plannedHours === 0 && plannedCost === 0 && (actualHours !== 0 || actualCost !== 0),
  }
}

const mergeEntries = (entries: WorkstationEntry[]): WorkstationEntry[] => {
  const grouped = new Map<string, WorkstationEntry[]>()
  entries.forEach((entry) => grouped.set(entry.name, [...(grouped.get(entry.name) ?? []), entry]))

  return [...grouped.entries()].map(([name, group]) => {
    if (group.length === 1) return group[0]
    const plannedHours = group.reduce((sum, entry) => sum + entry.plannedHours, 0)
    const actualHours = group.reduce((sum, entry) => sum + entry.actualHours, 0)
    const plannedCost = group.reduce((sum, entry) => sum + entry.plannedCost, 0)
    const actualCost = group.reduce((sum, entry) => sum + entry.actualCost, 0)
    const plannedHourlyRate = plannedHours > 0 ? plannedCost / plannedHours : null
    const hourlyRate = plannedHourlyRate ?? (actualHours > 0 ? actualCost / actualHours : null)
    return {
      name,
      plannedHours,
      actualHours,
      plannedCost,
      actualCost,
      plannedHourlyRate,
      hourlyRate,
      actualCostFallback: group.reduce((sum, entry) => sum + (entry.actualCostFallback ?? 0), 0) || null,
      rateBasis: group.some((entry) => entry.rateBasis === 'booked_actual') ? 'mixed' : 'planned',
      sourceWorkstation: [...new Set(group.map((entry) => entry.sourceWorkstation))].join(' / '),
      costCenterCodes: [...new Set(group.flatMap((entry) => entry.costCenterCodes))],
      unplanned: plannedHours === 0 && plannedCost === 0 && (actualHours !== 0 || actualCost !== 0),
    }
  })
}

const parseOrder = (value: unknown, index: number): Order => {
  if (!isRecord(value)) throw new Error(`Auftrag ${index + 1} ist ungültig.`)
  const number = requiredString(value.number, `orders[${index}].number`)
  if (!Array.isArray(value.workstations) || value.workstations.length === 0) {
    throw new Error(`Auftrag ${number} enthält keine Arbeitsplätze.`)
  }
  return {
    id: requiredString(value.id, `orders[${index}].id`),
    number,
    title: requiredString(value.title, `orders[${index}].title`),
    customer: requiredString(value.customer, `orders[${index}].customer`),
    location: requiredString(value.location, `orders[${index}].location`),
    projectManager: requiredString(value.projectManager, `orders[${index}].projectManager`),
    category: nullableString(value.category, `orders[${index}].category`),
    completedAt: nullableString(value.completedAt, `orders[${index}].completedAt`),
    reportDate: requiredString(value.reportDate, `orders[${index}].reportDate`),
    reportedPlannedHours: nullableNumber(value.reportedPlannedHours, `orders[${index}].reportedPlannedHours`),
    reportedActualHours: nullableNumber(value.reportedActualHours, `orders[${index}].reportedActualHours`),
    workstations: mergeEntries(value.workstations.map((entry, entryIndex) => parseEntry(entry, number, entryIndex))),
  }
}

const parseInsights = (value: unknown): Record<string, Insight> => {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, insight]) => {
      if (!isRecord(insight)) return []
      const cause = typeof insight.cause === 'string' ? insight.cause.trim() : ''
      const note = typeof insight.note === 'string' ? insight.note.trim() : ''
      return cause || note ? [[key, { cause, note }]] : []
    }),
  )
}

const parseValidationTotal = (value: unknown): ValidationTotal | null => {
  if (!isRecord(value) || !isRecord(value.total)) return null
  return {
    plannedHours: requiredNumber(value.total.plannedHours, 'validation.total.plannedHours'),
    actualHours: requiredNumber(value.total.actualHours, 'validation.total.actualHours'),
    plannedCost: requiredNumber(value.total.plannedCost, 'validation.total.plannedCost'),
    actualCost: requiredNumber(value.total.actualCost, 'validation.total.actualCost'),
    costDelta: requiredNumber(value.total.costDelta, 'validation.total.costDelta'),
  }
}

const assertClose = (label: string, actual: number, expected: number) => {
  if (Math.abs(actual - expected) > 0.02) {
    throw new Error(`Kontrollwert „${label}“ stimmt nicht: ${actual.toFixed(2)} statt ${expected.toFixed(2)}.`)
  }
}

export function parseImportFile(raw: string, sourceFileName: string): ImportDataset {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('Die ausgewählte Datei enthält kein gültiges JSON.')
  }
  if (!isRecord(value)) throw new Error('Die Importdatei besitzt kein gültiges Stammobjekt.')
  if (value.schemaVersion !== 1) throw new Error('Die Schema-Version der Importdatei wird nicht unterstützt.')
  if (!Array.isArray(value.orders) || value.orders.length === 0) throw new Error('Die Importdatei enthält keine Aufträge.')

  const orders = value.orders.map(parseOrder)
  if (new Set(orders.map((order) => order.id)).size !== orders.length) throw new Error('Auftrags-IDs müssen eindeutig sein.')
  const validationTotal = parseValidationTotal(value.validation)
  if (validationTotal) {
    const total = allMetrics(orders)
    assertClose('Sollzeit', total.plannedHours, validationTotal.plannedHours)
    assertClose('Istzeit', total.actualHours, validationTotal.actualHours)
    assertClose('Sollkosten', total.plannedCost, validationTotal.plannedCost)
    assertClose('Istkosten', total.actualCost, validationTotal.actualCost)
    assertClose('Nettokostenabweichung', total.costDelta, validationTotal.costDelta)
  }

  return {
    schemaVersion: 1,
    reportDate: requiredString(value.reportDate, 'reportDate'),
    orders,
    existingInsights: parseInsights(value.existingInsights),
    sourceFileName,
    validationTotal,
  }
}

export function metrics(entries: WorkstationEntry[]): Metrics {
  const plannedHours = entries.reduce((sum, entry) => sum + entry.plannedHours, 0)
  const actualHours = entries.reduce((sum, entry) => sum + entry.actualHours, 0)
  const plannedCost = entries.reduce((sum, entry) => sum + entry.plannedCost, 0)
  const actualCost = entries.reduce((sum, entry) => sum + entry.actualCost, 0)
  const deltas = entries.map((entry) => entry.actualCost - entry.plannedCost)
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
    additionalCost: deltas.filter((delta) => delta > 0).reduce((sum, delta) => sum + delta, 0),
    savingsCost: Math.abs(deltas.filter((delta) => delta < 0).reduce((sum, delta) => sum + delta, 0)),
  }
}

export const orderMetrics = (order: Order) => metrics(order.workstations)

export const allMetrics = (orders: Order[]) => metrics(orders.flatMap((order) => order.workstations))

export function workstationSummaries(orders: Order[]): WorkstationSummary[] {
  const names = [...new Set(orders.flatMap((order) => order.workstations.map((entry) => entry.name)))]
  return names.map((name) => {
    const perOrder = orders.flatMap((order) => {
      const entry = order.workstations.find((item) => item.name === name)
      return entry ? [{ order, entry, metrics: metrics([entry]) }] : []
    })
    const hourlyRates = [...new Set(perOrder.flatMap(({ entry }) => entry.hourlyRate === null ? [] : [entry.hourlyRate]))]
    return {
      name,
      hourlyRate: hourlyRates.length === 1 ? hourlyRates[0] : null,
      hourlyRates,
      exceededOrders: perOrder.filter(({ metrics: value }) => value.costDelta > 0).length,
      unplannedOrders: perOrder.filter(({ entry }) => entry.unplanned).length,
      orders: perOrder,
      ...metrics(perOrder.map(({ entry }) => entry)),
    }
  })
}
