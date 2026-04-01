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
  Notenkuerzel,
} from '../types/enm'

type ServerConnectionParams = {
  baseUrl: string
  schema: string
  username: string
  password: string
  trustSelfSigned: boolean
}

type NoteChange = {
  schuelerId: number
  lerngruppeId: number
  originalNote: Notenkuerzel | null
  newNote: Notenkuerzel | null
}

function encodeBasicAuth(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function buildEnmCandidateUrls(baseUrl: string, schema: string): string[] {
  const normalized = /^https?:\/\//i.test(baseUrl)
    ? baseUrl.trim().replace(/\/+$/, '')
    : `https://${baseUrl.trim().replace(/\/+$/, '')}`
  const encodedSchema = encodeURIComponent(schema)
  return [
    `${normalized}/db/${encodedSchema}/enm/v1/alle/gzip`,
    `${normalized}/api/v1/schule/${encodedSchema}/export/enm`,
    `${normalized}/api/v1/schule/export/enm?schema=${encodedSchema}`,
    `${normalized}/api/v1/schule/export/enm`,
  ]
}

function buildAliveUrl(baseUrl: string): string {
  const normalized = /^https?:\/\//i.test(baseUrl)
    ? baseUrl.trim().replace(/\/+$/, '')
    : `https://${baseUrl.trim().replace(/\/+$/, '')}`
  return `${normalized}/status/alive`
}

async function readResponseError(response: Response): Promise<string> {
  const contentType = response.headers.get('Content-Type') ?? ''
  if (contentType.includes('application/json')) {
    const payload = await response.json() as { error?: string }
    return payload.error ?? ''
  }
  return await response.text()
}

async function checkServerAlive(baseUrl: string, trustSelfSigned: boolean): Promise<void> {
  let response: Response | null = null
  let useDirectFallback = false

  try {
    response = await fetch('/api/svws/alive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain, application/json;q=0.9, */*;q=0.8',
      },
      body: JSON.stringify({ baseUrl, trustSelfSigned }),
    })
  } catch {
    useDirectFallback = true
  }

  if (!useDirectFallback && response && (response.status === 404 || response.status === 405)) {
    useDirectFallback = true
  }

  if (useDirectFallback) {
    response = await fetch(buildAliveUrl(baseUrl), {
      headers: {
        'Accept': 'text/plain, application/json;q=0.9, */*;q=0.8',
      },
    })
  }

  if (!response || !response.ok) {
    const details = response ? await readResponseError(response) : ''
    const status = response ? `${response.status} ${response.statusText}` : 'keine Antwort'
    throw new Error(`SVWS-Server ist nicht erreichbar (/status/alive: ${status}${details ? ` - ${details}` : ''}).`)
  }
}

export const useConferenceStore = defineStore('conference', () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const enmExport = ref<EnmExport | null>(null)
  const selectedKlasseId = ref<number | null>(null)
  const selectedLerngruppeId = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const noteChanges = ref<Map<string, Notenkuerzel | null>>(new Map())

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

  const hasNoteChanges = computed(() => noteChanges.value.size > 0)
  const noteChangeCount = computed(() => noteChanges.value.size)

  function getChangeKey(schuelerId: number, lerngruppeId: number): string {
    return `${schuelerId}:${lerngruppeId}`
  }

  function getOriginalNote(schuelerId: number, lerngruppeId: number): Notenkuerzel | null {
    const schueler = enmExport.value?.schueler.find(s => s.id === schuelerId)
    if (!schueler) return null
    return schueler.leistungsdaten.find(ld => ld.lerngruppenID === lerngruppeId)?.note ?? null
  }

  function getNote(schuelerId: number, lerngruppeId: number): Notenkuerzel | null {
    const key = getChangeKey(schuelerId, lerngruppeId)
    if (noteChanges.value.has(key)) {
      return noteChanges.value.get(key) ?? null
    }
    return getOriginalNote(schuelerId, lerngruppeId)
  }

  function updateNote(schuelerId: number, lerngruppeId: number, note: Notenkuerzel | null): void {
    const key = getChangeKey(schuelerId, lerngruppeId)
    const original = getOriginalNote(schuelerId, lerngruppeId)

    if (original === note) {
      noteChanges.value.delete(key)
      return
    }

    noteChanges.value.set(key, note)
  }

  function isNoteChanged(schuelerId: number, lerngruppeId: number): boolean {
    return noteChanges.value.has(getChangeKey(schuelerId, lerngruppeId))
  }

  function clearNoteChanges(): void {
    noteChanges.value.clear()
  }

  function listNoteChanges(): NoteChange[] {
    const changes: NoteChange[] = []
    for (const [key, newNote] of noteChanges.value) {
      const [schueler, lerngruppe] = key.split(':')
      const schuelerId = Number(schueler)
      const lerngruppeId = Number(lerngruppe)
      changes.push({
        schuelerId,
        lerngruppeId,
        originalNote: getOriginalNote(schuelerId, lerngruppeId),
        newNote,
      })
    }
    return changes
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function loadFromFile(file: File): Promise<void> {
    loading.value = true
    error.value = null
    try {
      enmExport.value = await parseEnmGzip(file)
      noteChanges.value.clear()
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

  async function loadFromServer(params: ServerConnectionParams): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await checkServerAlive(params.baseUrl, params.trustSelfSigned)

      let response: Response | null = null
      let useDirectFallback = false

      try {
        response = await fetch('/api/svws/enm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/octet-stream, application/gzip;q=0.9',
          },
          body: JSON.stringify(params),
        })
      } catch {
        useDirectFallback = true
      }

      if (!useDirectFallback && response && !response.ok && (response.status === 404 || response.status === 405)) {
        useDirectFallback = true
      }

      if (useDirectFallback) {
        const candidateUrls = buildEnmCandidateUrls(params.baseUrl, params.schema)
        const authHeader = `Basic ${encodeBasicAuth(params.username, params.password)}`
        let fallbackResponse: Response | null = null

        for (const candidateUrl of candidateUrls) {
          const directResponse = await fetch(candidateUrl, {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/octet-stream, application/gzip;q=0.9',
            },
          })

          fallbackResponse = directResponse
          if (directResponse.ok || directResponse.status !== 404) {
            break
          }
        }

        if (!fallbackResponse) {
          throw new Error('SVWS-Server nicht erreichbar.')
        }

        response = fallbackResponse
      }

      if (!response) {
        throw new Error('Antwort vom Server konnte nicht gelesen werden.')
      }

      if (!response.ok) {
        const details = await readResponseError(response)
        throw new Error(
          `Server antwortete mit Status ${response.status}: ${response.statusText}.${details ? ` ${details}` : ''}`.trim()
        )
      }

      const buffer = await response.arrayBuffer()
      enmExport.value = await parseEnmGzip(buffer)
      noteChanges.value.clear()

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
    noteChanges.value.clear()
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
    hasNoteChanges,
    noteChangeCount,
    // Actions
    loadFromFile,
    loadFromServer,
    selectKlasse,
    selectLerngruppe,
    getNote,
    updateNote,
    isNoteChanged,
    clearNoteChanges,
    listNoteChanges,
    reset,
  }
})
