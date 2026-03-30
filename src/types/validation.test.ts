/**
 * Unit-Tests: ENM-Validierung und Parser
 * Ausführen: npx vitest
 */

import { describe, it, expect } from 'vitest'
import { validateEnmExport, isEnmExport } from '../types/validation'
import type { EnmExport } from '../types/enm'

// ---------------------------------------------------------------------------
// Minimal-Fixture — entspricht der echten SVWS-Struktur
// ---------------------------------------------------------------------------

function makeMinimalExport(): EnmExport {
  return {
    enmRevision: 1,
    schulnummer: '123456',
    schuljahr: 2024,
    anzahlAbschnitte: 2,
    aktuellerAbschnitt: 1,
    publicKey: null,
    lehrerID: 42,
    fehlstundenEingabe: true,
    fehlstundenSIFachbezogen: false,
    fehlstundenSIIFachbezogen: false,
    schulform: 'GY',
    mailadresse: null,
    noten: [],
    foerderschwerpunkte: [],
    jahrgaenge: [],
    klassen: [
      { id: 1, kuerzel: '5a', kuerzelAnzeige: '5a', idJahrgang: 1, sortierung: 10, klassenlehrer: [] }
    ],
    floskelgruppen: [],
    lehrer: [],
    faecher: [
      { id: 1, kuerzel: 'D', kuerzelAnzeige: 'D', sortierung: 10, istFremdsprache: false }
    ],
    ankreuzkompetenzen: [],
    teilleistungsarten: [],
    lerngruppen: [
      { id: 1, kID: 100, fachID: 1, kursartID: 72, bezeichnung: 'D-GK1', kursartKuerzel: 'GK', bilingualeSprache: null, lehrerID: [], wochenstunden: 3 }
    ],
    schueler: [
      {
        id: 1,
        jahrgangID: 1,
        klasseID: 1,
        nachname: 'Mustermann',
        vorname: 'Max',
        geschlecht: 'm',
        bilingualeSprache: null,
        istZieldifferent: false,
        istDaZFoerderung: false,
        sprachenfolge: [],
        lernabschnitt: {
          id: 1,
          fehlstundenGesamt: 0,
          tsFehlstundenGesamt: '2024-01-01',
          fehlstundenGesamtUnentschuldigt: 0,
          tsFehlstundenGesamtUnentschuldigt: '2024-01-01',
          pruefungsordnung: 'APO',
          lernbereich1note: null,
          lernbereich2note: null,
          foerderschwerpunkt1: null,
          foerderschwerpunkt2: null,
        },
        leistungsdaten: [
          {
            id: 1,
            lerngruppenID: 1,
            note: '2',
            tsNote: '2024-01-01',
            noteQuartal: null,
            tsNoteQuartal: '2024-01-01',
            istSchriftlich: false,
            abiturfach: null,
            fehlstundenFach: 0,
            tsFehlstundenFach: '2024-01-01',
            fehlstundenUnentschuldigtFach: 0,
            tsFehlstundenUnentschuldigtFach: '2024-01-01',
            fachbezogeneBemerkungen: null,
            tsFachbezogeneBemerkungen: '2024-01-01',
            neueZuweisungKursart: null,
            istGemahnt: false,
            tsIstGemahnt: '2024-01-01',
            mahndatum: null,
            teilleistungen: [],
          }
        ],
        ankreuzkompetenzen: [],
        bemerkungen: {
          ASV: null, tsASV: '', AUE: null, tsAUE: '',
          ZB: null, tsZB: '', LELS: null, tsLELS: '',
          schulformEmpf: null, tsSchulformEmpf: '',
          individuelleVersetzungsbemerkungen: null,
          tsIndividuelleVersetzungsbemerkungen: '',
          foerderbemerkungen: null, tsFoerderbemerkungen: '',
        },
        zp10: null,
        bkabschluss: null,
      }
    ],
  }
}

// ---------------------------------------------------------------------------
// Tests: isEnmExport (Type Guard)
// ---------------------------------------------------------------------------

describe('isEnmExport', () => {
  it('gibt true für gültigen Export zurück', () => {
    expect(isEnmExport(makeMinimalExport())).toBe(true)
  })

  it('gibt false für null zurück', () => {
    expect(isEnmExport(null)).toBe(false)
  })

  it('gibt false für leeres Objekt zurück', () => {
    expect(isEnmExport({})).toBe(false)
  })

  it('gibt false zurück wenn schueler kein Array ist', () => {
    const data = { ...makeMinimalExport(), schueler: 'falsch' }
    expect(isEnmExport(data)).toBe(false)
  })

  it('gibt false zurück wenn schuljahr fehlt', () => {
    const { schuljahr: _, ...data } = makeMinimalExport()
    expect(isEnmExport(data)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Tests: validateEnmExport
// ---------------------------------------------------------------------------

describe('validateEnmExport', () => {
  it('gibt validen Export unverändert zurück', () => {
    const data = makeMinimalExport()
    const result = validateEnmExport(data)
    expect(result.schulnummer).toBe('123456')
    expect(result.schueler).toHaveLength(1)
    expect(result.schueler[0].nachname).toBe('Mustermann')
  })

  it('wirft TypeError wenn Input kein Objekt ist', () => {
    expect(() => validateEnmExport('kein objekt')).toThrow(TypeError)
    expect(() => validateEnmExport(null)).toThrow(TypeError)
    expect(() => validateEnmExport(42)).toThrow(TypeError)
  })

  it('wirft TypeError wenn schueler kein Array ist', () => {
    const data = { ...makeMinimalExport(), schueler: null }
    expect(() => validateEnmExport(data)).toThrow(TypeError)
    expect(() => validateEnmExport(data)).toThrow(/schueler/)
  })

  it('wirft TypeError wenn klassen fehlt', () => {
    const { klassen: _, ...data } = makeMinimalExport()
    expect(() => validateEnmExport(data)).toThrow(TypeError)
    expect(() => validateEnmExport(data)).toThrow(/klassen/)
  })

  it('wirft TypeError wenn schuljahr keine Zahl ist', () => {
    const data = { ...makeMinimalExport(), schuljahr: '2024' }
    expect(() => validateEnmExport(data)).toThrow(TypeError)
    expect(() => validateEnmExport(data)).toThrow(/schuljahr/)
  })

  it('wirft TypeError wenn Schüler kein lernabschnitt hat', () => {
    const data = makeMinimalExport()
    ;(data.schueler[0] as unknown as Record<string, unknown>)['lernabschnitt'] = null
    expect(() => validateEnmExport(data)).toThrow(TypeError)
    expect(() => validateEnmExport(data)).toThrow(/lernabschnitt/)
  })

  it('wirft TypeError wenn Schüler kein nachname hat', () => {
    const data = makeMinimalExport()
    ;(data.schueler[0] as unknown as Record<string, unknown>)['nachname'] = 123
    expect(() => validateEnmExport(data)).toThrow(TypeError)
    expect(() => validateEnmExport(data)).toThrow(/nachname/)
  })

  it('akzeptiert Export mit leeren Arrays', () => {
    const data = makeMinimalExport()
    data.schueler = []
    data.lerngruppen = []
    const result = validateEnmExport(data)
    expect(result.schueler).toHaveLength(0)
  })
})
