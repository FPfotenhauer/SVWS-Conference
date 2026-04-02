/**
 * Type Guards und Validierungsfunktionen für den SVWS ENM-Export
 */

import type { EnmExport, EnmSchueler, EnmKlasse, EnmLerngruppe, EnmFach } from './enm'

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function requireArray(obj: Record<string, unknown>, key: string, context: string): void {
  if (!Array.isArray(obj[key])) {
    throw new TypeError(`${context}: Feld "${key}" muss ein Array sein, ist aber: ${typeof obj[key]}`)
  }
}

function requireNumber(obj: Record<string, unknown>, key: string, context: string): void {
  if (typeof obj[key] !== 'number') {
    throw new TypeError(`${context}: Feld "${key}" muss eine Zahl sein, ist aber: ${typeof obj[key]}`)
  }
}

function requireString(obj: Record<string, unknown>, key: string, context: string): void {
  if (typeof obj[key] !== 'string') {
    throw new TypeError(`${context}: Feld "${key}" muss ein String sein, ist aber: ${typeof obj[key]}`)
  }
}

function requireStringOrNumber(obj: Record<string, unknown>, key: string, context: string): void {
  const valueType = typeof obj[key]
  if (valueType !== 'string' && valueType !== 'number') {
    throw new TypeError(`${context}: Feld "${key}" muss ein String oder eine Zahl sein, ist aber: ${valueType}`)
  }
}

// ---------------------------------------------------------------------------
// Type Guard
// ---------------------------------------------------------------------------

export function isEnmExport(obj: unknown): obj is EnmExport {
  if (!isObject(obj)) return false

  const requiredArrays = ['noten', 'jahrgaenge', 'klassen', 'lehrer', 'faecher', 'lerngruppen', 'schueler']
  for (const key of requiredArrays) {
    if (!Array.isArray(obj[key])) return false
  }

  const requiredNumbers = ['enmRevision', 'schuljahr', 'anzahlAbschnitte', 'aktuellerAbschnitt']
  for (const key of requiredNumbers) {
    if (typeof obj[key] !== 'number') return false
  }

  const schulnummerType = typeof obj['schulnummer']
  if (schulnummerType !== 'string' && schulnummerType !== 'number') return false
  return typeof obj['schulform'] === 'string'
}

// ---------------------------------------------------------------------------
// Validierung mit sprechenden Fehlermeldungen
// ---------------------------------------------------------------------------

export function validateEnmExport(raw: unknown): EnmExport {
  if (!isObject(raw)) {
    throw new TypeError(
      `Ungültiges ENM-Format: Erwartet ein JSON-Objekt, erhalten: ${typeof raw}`
    )
  }

  // Pflicht-Arrays
  const requiredArrays: Array<keyof EnmExport> = [
    'noten', 'jahrgaenge', 'klassen', 'lehrer', 'faecher', 'lerngruppen', 'schueler'
  ]
  for (const key of requiredArrays) {
    requireArray(raw, key as string, 'ENM-Root')
  }

  // Pflicht-Zahlen
  const requiredNumbers: Array<keyof EnmExport> = [
    'enmRevision', 'schuljahr', 'anzahlAbschnitte', 'aktuellerAbschnitt'
  ]
  for (const key of requiredNumbers) {
    requireNumber(raw, key as string, 'ENM-Root')
  }

  // Pflicht-Strings (schulnummer kann serverseitig auch numerisch geliefert werden)
  requireStringOrNumber(raw, 'schulnummer', 'ENM-Root')
  if (typeof raw['schulnummer'] === 'number') {
    raw['schulnummer'] = String(raw['schulnummer'])
  }
  requireString(raw, 'schulform', 'ENM-Root')

  // Schüler-Validierung (Stichprobe der ersten 3)
  const schueler = raw['schueler'] as unknown[]
  for (let i = 0; i < Math.min(schueler.length, 3); i++) {
    validateSchueler(schueler[i], i)
  }

  // Klassen-Validierung
  const klassen = raw['klassen'] as unknown[]
  for (let i = 0; i < klassen.length; i++) {
    validateKlasse(klassen[i], i)
  }

  // Lerngruppen-Validierung
  const lerngruppen = raw['lerngruppen'] as unknown[]
  for (let i = 0; i < Math.min(lerngruppen.length, 5); i++) {
    validateLerngruppe(lerngruppen[i], i)
  }

  // Fächer-Validierung
  const faecher = raw['faecher'] as unknown[]
  for (let i = 0; i < faecher.length; i++) {
    validateFach(faecher[i], i)
  }

  return raw as unknown as EnmExport
}

function validateSchueler(raw: unknown, index: number): asserts raw is EnmSchueler {
  const ctx = `schueler[${index}]`
  if (!isObject(raw)) throw new TypeError(`${ctx}: kein Objekt`)

  requireNumber(raw, 'id', ctx)
  requireNumber(raw, 'klasseID', ctx)
  requireString(raw, 'nachname', ctx)
  requireString(raw, 'vorname', ctx)
  requireArray(raw, 'leistungsdaten', ctx)

  if (!isObject(raw['lernabschnitt'])) {
    throw new TypeError(`${ctx}: Feld "lernabschnitt" fehlt oder ist kein Objekt`)
  }
  if (!isObject(raw['bemerkungen'])) {
    throw new TypeError(`${ctx}: Feld "bemerkungen" fehlt oder ist kein Objekt`)
  }
}

function validateKlasse(raw: unknown, index: number): asserts raw is EnmKlasse {
  const ctx = `klassen[${index}]`
  if (!isObject(raw)) throw new TypeError(`${ctx}: kein Objekt`)
  requireNumber(raw, 'id', ctx)
  requireString(raw, 'kuerzel', ctx)
  requireArray(raw, 'klassenlehrer', ctx)
}

function validateLerngruppe(raw: unknown, index: number): asserts raw is EnmLerngruppe {
  const ctx = `lerngruppen[${index}]`
  if (!isObject(raw)) throw new TypeError(`${ctx}: kein Objekt`)
  requireNumber(raw, 'id', ctx)
  requireNumber(raw, 'fachID', ctx)
  requireString(raw, 'bezeichnung', ctx)
  if (Array.isArray(raw['lehrerID'])) {
    return
  }

  if (Array.isArray(raw['idsLehrer'])) {
    raw['lehrerID'] = raw['idsLehrer']
    return
  }

  throw new TypeError(`${ctx}: Feld "lehrerID" muss ein Array sein, ist aber: ${typeof raw['lehrerID']}`)
}

function validateFach(raw: unknown, index: number): asserts raw is EnmFach {
  const ctx = `faecher[${index}]`
  if (!isObject(raw)) throw new TypeError(`${ctx}: kein Objekt`)
  requireNumber(raw, 'id', ctx)
  requireString(raw, 'kuerzel', ctx)
}
