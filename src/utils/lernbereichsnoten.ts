/**
 * Lernbereichsnoten (EESA) je Schulform.
 *
 * Die Bedeutung der Felder `lernbereich1note` / `lernbereich2note` im ENM-Export ist nicht
 * fest codiert, sondern hängt von der Schulform der exportierenden Schule ab, siehe data/lbn.md.
 * Für die Sekundarschule (Kürzel "SK") wird vorerst nur das integrierte Modell
 * (§ 20 Abs. 5, 6 und 8 Nr. 2 — ein Lernbereich: Naturwissenschaften) unterstützt, nicht die
 * gesonderten Bildungsgänge nach § 20 Abs. 8 Nr. 1.
 *
 * Zusätzlich sind Lernbereichsnoten nur in bestimmten Jahrgängen relevant: An Gesamtschule,
 * Sekundarschule und dem Schulversuch PRIMUS (PS) in den Jahrgängen 8-10, an den übrigen
 * Schulformen nur im Jahrgang 10 (EESA-Abschluss).
 */

export type LernbereichFeld = 'lernbereich1note' | 'lernbereich2note'

export interface LernbereichDefinition {
  feld: LernbereichFeld
  label: string
}

// Soft-Hyphen (­) an sinnvollen Trennstellen, damit die langen Fachbegriffe in den
// schmalen Lupe-Stat-Boxen umbrechen können, ohne im flachgedruckten Fall sichtbar zu sein.
const NATURWISSENSCHAFTEN = 'Natur­wissenschaften'
const GESELLSCHAFTSLEHRE = 'Gesellschafts­lehre'

const SCHULFORM_LERNBEREICHE: Record<string, LernbereichDefinition[]> = {
  // Hauptschule
  H: [
    { feld: 'lernbereich1note', label: NATURWISSENSCHAFTEN },
    { feld: 'lernbereich2note', label: 'Wirtschaft und Arbeitswelt' },
  ],
  // Realschule
  R: [
    { feld: 'lernbereich1note', label: NATURWISSENSCHAFTEN },
    { feld: 'lernbereich2note', label: GESELLSCHAFTSLEHRE },
  ],
  // Gymnasium (G9)
  GY: [
    { feld: 'lernbereich1note', label: NATURWISSENSCHAFTEN },
    { feld: 'lernbereich2note', label: GESELLSCHAFTSLEHRE },
  ],
  // Gesamtschule
  GE: [
    { feld: 'lernbereich1note', label: NATURWISSENSCHAFTEN },
  ],
  // Sekundarschule — vorerst nur integriertes Modell
  SK: [
    { feld: 'lernbereich1note', label: NATURWISSENSCHAFTEN },
  ],
  // Schulversuch PRIMUS — verhält sich wie Gesamtschule/Sekundarschule
  PS: [
    { feld: 'lernbereich1note', label: NATURWISSENSCHAFTEN },
  ],
}

// Jahrgänge (als Zahl geparst aus dem Jahrgangs-Kürzel, z.B. "08" -> 8), in denen die
// Lernbereichsnoten je Schulform erhoben werden.
const GESAMT_UND_SEKUNDARSCHULE_JAHRGAENGE = [8, 9, 10]
const UEBRIGE_SCHULFORMEN_JAHRGAENGE = [10]

function getRelevanteJahrgaenge(schulform: string): number[] {
  if (schulform === 'GE' || schulform === 'SK' || schulform === 'PS') return GESAMT_UND_SEKUNDARSCHULE_JAHRGAENGE
  return UEBRIGE_SCHULFORMEN_JAHRGAENGE
}

function parseJahrgangsstufe(jahrgangKuerzel: string | null | undefined): number | null {
  if (!jahrgangKuerzel) return null
  const parsed = Number.parseInt(jahrgangKuerzel, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function getLernbereichsnotenFelder(
  schulform: string | null | undefined,
  jahrgangKuerzel: string | null | undefined
): LernbereichDefinition[] {
  if (!schulform) return []
  const felder = SCHULFORM_LERNBEREICHE[schulform]
  if (!felder) return []

  const jahrgangsstufe = parseJahrgangsstufe(jahrgangKuerzel)
  if (jahrgangsstufe === null) return []
  if (!getRelevanteJahrgaenge(schulform).includes(jahrgangsstufe)) return []

  return felder
}
