/**
 * Pinia Store: Konferenzdaten
 *
 * Verwaltet den gesamten ENM-Export und leitet daraus
 * aufbereitete View-Modelle für Klassen und Lerngruppen ab.
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { parseEnmGzip } from '../parser/enmParser'
import type {
  EnmExport,
  EnmKlasse,
  EnmFach,
  EnmLehrer,
  EnmLerngruppe,
  KonferenzKlasse,
  KonferenzLerngruppe,
  KonferenzSchueler,
} from '../types/enm'

export const useConferenceStore = defineStore('conference', () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const enmExport = ref<EnmExport | null>(null)
  const selectedKlasseId = ref<number | null>(null)
  const selectedLerngruppeId = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ---------------------------------------------------------------------------
  // Lookup-Maps (intern, aus dem Export aufgebaut)
  // ---------------------------------------------------------------------------

  const klasseById = computed<Map<number, EnmKlasse>>(() => {
    if (!enmExport.value) return new Map()
    return new Map(enmExport.value.klassen.map(k => [k.id, k]))
  })

  const fachById = computed<Map<number, EnmFach>>(() => {
    if (!enmExport.value) return new Map()
    return new Map(enmExport.value.faecher.map(f => [f.id, f]))
  })

  const lehrerById = computed<Map<number, EnmLehrer>>(() => {
    if (!enmExport.value) return new Map()
    return new Map(enmExport.value.lehrer.map(l => [l.id, l]))
  })

  const lerngruppeById = computed<Map<number, EnmLerngruppe>>(() => {
    if (!enmExport.value) return new Map()
    return new Map(enmExport.value.lerngruppen.map(lg => [lg.id, lg]))
  })

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  const availableKlassen = computed<EnmKlasse[]>(() => {
    if (!enmExport.value) return []
    return [...enmExport.value.klassen].sort((a, b) => a.sortierung - b.sortierung)
  })

  const availableLerngruppen = computed<EnmLerngruppe[]>(() => {
    if (!enmExport.value) return []
    return [...enmExport.value.lerngruppen].sort((a, b) =>
      a.bezeichnung.localeCompare(b.bezeichnung, 'de')
    )
  })

  /**
   * Aufbereitetes View-Modell für die ausgewählte Klasse.
   * Löst alle IDs auf und strukturiert Schüler + Noten für die Tabelle.
   */
  const currentKlasse = computed<KonferenzKlasse | null>(() => {
    if (!enmExport.value || selectedKlasseId.value === null) return null

    const klasse = klasseById.value.get(selectedKlasseId.value)
    if (!klasse) return null

    const jahrgang = enmExport.value.jahrgaenge.find(j => j.id === klasse.idJahrgang)
    if (!jahrgang) return null

    // Schüler dieser Klasse
    const schuelerDerKlasse = enmExport.value.schueler.filter(
      s => s.klasseID === klasse.id
    )

    // Alle belegten Lerngruppen-IDs sammeln
    const lerngruppenIds = new Set<number>()
    for (const s of schuelerDerKlasse) {
      for (const ld of s.leistungsdaten) {
        lerngruppenIds.add(ld.lerngruppenID)
      }
    }

    // Lerngruppen auflösen
    const lerngruppen = [...lerngruppenIds]
      .map(id => lerngruppeById.value.get(id))
      .filter((lg): lg is EnmLerngruppe => lg !== undefined)

    // Fächer aus den Lerngruppen ableiten (dedupliziert, sortiert)
    const faecherMap = new Map<number, EnmFach>()
    for (const lg of lerngruppen) {
      const fach = fachById.value.get(lg.fachID)
      if (fach && !faecherMap.has(fach.id)) {
        faecherMap.set(fach.id, fach)
      }
    }
    const faecher = [...faecherMap.values()].sort((a, b) => a.sortierung - b.sortierung)

    // Schüler aufbereiten
    const konferenzSchueler: KonferenzSchueler[] = schuelerDerKlasse
      .map(s => ({
        schueler: s,
        leistungenByLerngruppe: new Map(
          s.leistungsdaten.map(ld => [ld.lerngruppenID, ld])
        ),
      }))
      .sort((a, b) =>
        a.schueler.nachname.localeCompare(b.schueler.nachname, 'de') ||
        a.schueler.vorname.localeCompare(b.schueler.vorname, 'de')
      )

    return {
      klasse,
      jahrgang,
      klassenlehrer: klasse.klassenlehrer
        .map(id => lehrerById.value.get(id))
        .filter((l): l is EnmLehrer => l !== undefined),
      schueler: konferenzSchueler,
      lerngruppen,
      faecher,
    }
  })

  /**
   * Aufbereitetes View-Modell für eine ausgewählte Lerngruppe.
   */
  const currentLerngruppe = computed<KonferenzLerngruppe | null>(() => {
    if (!enmExport.value || selectedLerngruppeId.value === null) return null

    const lg = lerngruppeById.value.get(selectedLerngruppeId.value)
    if (!lg) return null

    const fach = fachById.value.get(lg.fachID)
    if (!fach) return null

    const schuelerDerLerngruppe = enmExport.value.schueler
      .filter(s => s.leistungsdaten.some(ld => ld.lerngruppenID === lg.id))
      .map(s => ({
        schueler: s,
        leistungenByLerngruppe: new Map(
          s.leistungsdaten.map(ld => [ld.lerngruppenID, ld])
        ),
      }))
      .sort((a, b) =>
        a.schueler.nachname.localeCompare(b.schueler.nachname, 'de') ||
        a.schueler.vorname.localeCompare(b.schueler.vorname, 'de')
      )

    return {
      lerngruppe: lg,
      fach,
      lehrer: lg.lehrerID
        .map(id => lehrerById.value.get(id))
        .filter((l): l is EnmLehrer => l !== undefined),
      schueler: schuelerDerLerngruppe,
    }
  })

  const schulInfo = computed(() => {
    if (!enmExport.value) return null
    return {
      schulnummer: enmExport.value.schulnummer,
      schulform: enmExport.value.schulform,
      schuljahr: enmExport.value.schuljahr,
      abschnitt: enmExport.value.aktuellerAbschnitt,
      anzahlAbschnitte: enmExport.value.anzahlAbschnitte,
    }
  })

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function loadFromFile(file: File): Promise<void> {
    loading.value = true
    error.value = null
    try {
      enmExport.value = await parseEnmGzip(file)
      // Erste Klasse vorauswählen
      if (enmExport.value.klassen.length > 0) {
        selectedKlasseId.value = availableKlassen.value[0]?.id ?? null
      }
    } catch (err) {
      error.value = err instanceof Error
        ? err.message
        : 'Unbekannter Fehler beim Laden der Datei.'
      enmExport.value = null
    } finally {
      loading.value = false
    }
  }

  async function loadFromUrl(baseUrl: string, token: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const url = `${baseUrl.replace(/\/$/, '')}/api/v1/schule/export/enm`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/gzip',
        },
      })

      if (!response.ok) {
        throw new Error(
          `Server antwortete mit Status ${response.status}: ${response.statusText}`
        )
      }

      const buffer = await response.arrayBuffer()
      enmExport.value = await parseEnmGzip(buffer)

      if (enmExport.value.klassen.length > 0) {
        selectedKlasseId.value = availableKlassen.value[0]?.id ?? null
      }
    } catch (err) {
      error.value = err instanceof Error
        ? err.message
        : 'Verbindung zum SVWS-Server fehlgeschlagen.'
      enmExport.value = null
    } finally {
      loading.value = false
    }
  }

  function selectKlasse(id: number): void {
    selectedKlasseId.value = id
    selectedLerngruppeId.value = null
  }

  function selectLerngruppe(id: number): void {
    selectedLerngruppeId.value = id
    selectedKlasseId.value = null
  }

  function reset(): void {
    enmExport.value = null
    selectedKlasseId.value = null
    selectedLerngruppeId.value = null
    error.value = null
    loading.value = false
  }

  // ---------------------------------------------------------------------------
  // Expose
  // ---------------------------------------------------------------------------

  return {
    // State (readonly von außen)
    enmExport,
    selectedKlasseId,
    selectedLerngruppeId,
    loading,
    error,
    // Getters
    availableKlassen,
    availableLerngruppen,
    currentKlasse,
    currentLerngruppe,
    schulInfo,
    // Actions
    loadFromFile,
    loadFromUrl,
    selectKlasse,
    selectLerngruppe,
    reset,
  }
})
