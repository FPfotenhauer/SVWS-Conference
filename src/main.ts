import { createApp, defineComponent, h, onUnmounted, ref } from 'vue'
import { createPinia } from 'pinia'
import { jsPDF } from 'jspdf'
import { useConferenceStore } from './stores/conferenceStore'
import type { KonferenzSchueler, Notenkuerzel, EnmNote } from './types/enm'
import './style.css'

type SvwsDefaults = {
  host: string
  port: string
  schema: string
  user: string
  password: string
}

type RuntimeSvwsConfig = {
  baseUrl: string
  schema: string
  username: string
  password: string
  trustSelfSigned: boolean
}

type LupeColumnKey = 'fach' | 'kursart' | 'lehrer' | 'fs' | 'fsu' | 'note'

const RUNTIME_CONFIG_STORAGE_KEY = 'svws-conference.runtime-config'

declare const __SVWS_DEFAULTS__: Partial<SvwsDefaults> | undefined

function readSvwsDefaults(): Partial<SvwsDefaults> {
  if (typeof __SVWS_DEFAULTS__ === 'undefined') {
    return {}
  }
  return __SVWS_DEFAULTS__
}

function buildDefaultBaseUrl(host: string, port: string): string {
  const trimmedHost = host.trim()
  const trimmedPort = port.trim()
  if (!trimmedHost) return ''

  if (/^https?:\/\//i.test(trimmedHost)) {
    return trimmedHost
  }

  return trimmedPort
    ? `https://${trimmedHost}:${trimmedPort}`
    : `https://${trimmedHost}`
}

function parseBooleanFlag(value: string | undefined): boolean | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  if (!normalized) return undefined
  return ['1', 'true', 'yes', 'on', 'ja'].includes(normalized)
}

function parseEnvLikeText(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const cleaned = line.startsWith('export ') ? line.slice(7).trim() : line
    const separatorIndex = cleaned.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = cleaned.slice(0, separatorIndex).trim()
    let value = cleaned.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

function readStoredRuntimeConfig(): Partial<RuntimeSvwsConfig> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(RUNTIME_CONFIG_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<RuntimeSvwsConfig>
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function cloudIcon() {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
      'aria-hidden': 'true',
    },
    [
      h('path', {
        d: 'M7.5 18a4.5 4.5 0 0 1-.8-8.93A6 6 0 0 1 18 11h.5a3.5 3.5 0 1 1 0 7H7.5Z',
        stroke: 'currentColor',
        'stroke-width': '1.7',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
      h('path', {
        d: 'M12 9.75v6.5m0-6.5 2.5 2.5M12 9.75l-2.5 2.5',
        stroke: 'currentColor',
        'stroke-width': '1.7',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
    ]
  )
}

function uploadIcon() {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
      'aria-hidden': 'true',
    },
    [
      h('path', {
        d: 'M9 3.75h7.5L21 8.25V18.5A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5v-12A2.5 2.5 0 0 1 5.5 4H9Z',
        stroke: 'currentColor',
        'stroke-width': '1.7',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
      h('path', {
        d: 'M16.5 3.75V8.5H21',
        stroke: 'currentColor',
        'stroke-width': '1.7',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
      h('path', {
        d: 'M12 16.75V10.5m0 0 2.25 2.25M12 10.5l-2.25 2.25M8.5 18.5h7',
        stroke: 'currentColor',
        'stroke-width': '1.7',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
    ]
  )
}

function gradeClass(note: Notenkuerzel | null): string {
  if (!note) return 'badge ns'
  const numeric = Number.parseInt(note, 10)
  if (Number.isNaN(numeric)) return 'badge ns'
  return `badge n${Math.max(1, Math.min(6, numeric))}`
}

function numericGrade(note: Notenkuerzel | null): number | null {
  if (!note) return null
  const value = Number.parseInt(note, 10)
  if (Number.isNaN(value)) return null
  return value
}

function readLerngruppeId(entry: unknown): number | null {
  if (!entry || typeof entry !== 'object') return null
  const raw = entry as Record<string, unknown>
  const candidate = raw['lerngruppenID'] ?? raw['lerngruppeID']
  if (typeof candidate === 'number') return candidate
  if (typeof candidate === 'string') {
    const parsed = Number(candidate)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function lupeTone(note: Notenkuerzel | null): { frame: string, note: string, label: string, text: string } {
  if (!note) {
    return { frame: '', note: 'nc-sonder', label: 'lc-none', text: 'nicht benotet' }
  }
  const value = Number.parseInt(note, 10)
  if (Number.isNaN(value)) {
    return { frame: '', note: 'nc-sonder', label: 'lc-none', text: note }
  }
  if (value <= 2) return { frame: 'nf-gut', note: 'nc-gut', label: 'lc-gut', text: value === 1 ? 'sehr gut' : 'gut' }
  if (value <= 3) return { frame: 'nf-ok', note: 'nc-ok', label: 'lc-ok', text: 'befriedigend' }
  if (value <= 4) return { frame: 'nf-warn', note: 'nc-warn', label: 'lc-warn', text: 'ausreichend' }
  return { frame: 'nf-bad', note: 'nc-bad', label: 'lc-bad', text: value === 5 ? 'mangelhaft' : 'ungenuegend' }
}

function formatTimer(seconds: number): string {
  const safe = Math.max(0, seconds)
  const mins = Math.floor(safe / 60).toString().padStart(2, '0')
  const secs = (safe % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

const App = defineComponent({
  setup() {
    const store = useConferenceStore()
    const fileInput = ref<HTMLInputElement | null>(null)
    const configInput = ref<HTMLInputElement | null>(null)
    const defaults = readSvwsDefaults()
    const storedConfig = readStoredRuntimeConfig()
    const serverUrl = ref(storedConfig.baseUrl ?? buildDefaultBaseUrl(defaults.host ?? '', defaults.port ?? ''))
    const serverSchema = ref(storedConfig.schema ?? defaults.schema ?? '')
    const username = ref(storedConfig.username ?? defaults.user ?? '')
    const password = ref(storedConfig.password ?? defaults.password ?? '')
    const trustSelfSigned = ref(storedConfig.trustSelfSigned ?? false)
    const status = ref('Noch keine Daten geladen.')
    const selectedSchuelerId = ref<number | null>(null)
    const activeMode = ref<'klasse' | 'lerngruppe'>('klasse')
    const lupeOpen = ref(false)
    const lupeViewMode = ref<'kachel' | 'tabelle'>('kachel')
    const lupeFehlstundenMode = ref<'gesamt' | 'fach'>('gesamt')
    const notenAnzeigeMode = ref<'noten' | 'punkte'>('noten')
    const lupeColumnWidths = ref<Record<LupeColumnKey, number>>({
      fach: 96,
      kursart: 78,
      lehrer: 128,
      fs: 66,
      fsu: 66,
      note: 108,
    })
    const lupeMinColumnWidths: Record<LupeColumnKey, number> = {
      fach: 56,
      kursart: 52,
      lehrer: 84,
      fs: 48,
      fsu: 48,
      note: 78,
    }
    const editingCell = ref<string | null>(null)
    const tableScale = ref<'kompakt' | 'gross'>('kompakt')
    const timerModalOpen = ref(false)
    const changesModalOpen = ref(false)
    const logoutConfirmOpen = ref(false)
    const exportConfirmOpen = ref(false)
    const exportRunning = ref(false)
    const timerTotalSeconds = ref(300)
    const timerRemainingSeconds = ref(300)
    const timerRunning = ref(false)
    const timerFinishedFlash = ref(false)
    const timerSoundMuted = ref(false)
    const timerRepeatEnabled = ref(false)
    const timerPresets = [180, 300, 600, 900]
    let timerIntervalId: number | null = null
    let timerFlashTimeoutId: number | null = null
    let lupeResizeCleanup: (() => void) | null = null

    function persistRuntimeConfig() {
      if (typeof window === 'undefined') return
      const payload: RuntimeSvwsConfig = {
        baseUrl: serverUrl.value,
        schema: serverSchema.value,
        username: username.value,
        password: password.value,
        trustSelfSigned: trustSelfSigned.value,
      }
      try {
        window.localStorage.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(payload))
      } catch {
        // Ignore storage errors (e.g. strict browser privacy mode)
      }
    }

    function clearTimerInterval() {
      if (timerIntervalId !== null) {
        window.clearInterval(timerIntervalId)
        timerIntervalId = null
      }
    }

    function clearTimerFeedbackTimeout() {
      if (timerFlashTimeoutId !== null) {
        window.clearTimeout(timerFlashTimeoutId)
        timerFlashTimeoutId = null
      }
    }

    function playTimerDoneSound() {
      if (timerSoundMuted.value) return
      if (typeof window === 'undefined') return
      const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextCtor) return

      try {
        const ctx = new AudioContextCtor()
        const start = ctx.currentTime + 0.02
        const pattern = [0, 0.18]

        for (const offset of pattern) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.value = 880
          gain.gain.value = 0.0001
          osc.connect(gain)
          gain.connect(ctx.destination)

          const at = start + offset
          gain.gain.exponentialRampToValueAtTime(0.04, at + 0.01)
          gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.12)
          osc.start(at)
          osc.stop(at + 0.13)
        }

        window.setTimeout(() => {
          void ctx.close()
        }, 500)
      } catch {
        // Ignore audio feedback errors (browser policy/device restrictions)
      }
    }

    function finishTimer() {
      timerRunning.value = false
      clearTimerInterval()
      timerFinishedFlash.value = true
      clearTimerFeedbackTimeout()
      timerFlashTimeoutId = window.setTimeout(() => {
        timerFinishedFlash.value = false
      }, 2600)
      playTimerDoneSound()
    }

    function tickTimer() {
      if (!timerRunning.value) return
      timerRemainingSeconds.value = Math.max(0, timerRemainingSeconds.value - 1)
      if (timerRemainingSeconds.value === 0) {
        finishTimer()
      }
    }

    function setTimerPreset(seconds: number) {
      timerTotalSeconds.value = seconds
      timerRemainingSeconds.value = seconds
      timerRunning.value = false
      timerFinishedFlash.value = false
      clearTimerInterval()
      clearTimerFeedbackTimeout()
    }

    function startTimerFromCurrentPreset() {
      timerRemainingSeconds.value = timerTotalSeconds.value
      timerFinishedFlash.value = false
      clearTimerFeedbackTimeout()
      timerRunning.value = true
      clearTimerInterval()
      timerIntervalId = window.setInterval(tickTimer, 1000)
    }

    function toggleTimer() {
      if (timerRunning.value) {
        timerRunning.value = false
        clearTimerInterval()
        return
      }

      if (timerRemainingSeconds.value <= 0) {
        timerRemainingSeconds.value = timerTotalSeconds.value
      }

      timerFinishedFlash.value = false
      clearTimerFeedbackTimeout()
      timerRunning.value = true
      clearTimerInterval()
      timerIntervalId = window.setInterval(tickTimer, 1000)
    }

    function resetTimer() {
      timerRunning.value = false
      clearTimerInterval()
      clearTimerFeedbackTimeout()
      timerFinishedFlash.value = false
      timerRemainingSeconds.value = timerTotalSeconds.value
    }

    function applyTimerRepeatOnStudentChange(newSchuelerId: number) {
      if (!timerRepeatEnabled.value) return
      if (activeMode.value !== 'klasse') return
      if (!store.currentKlasse) return
      if (selectedSchuelerId.value === newSchuelerId) return
      startTimerFromCurrentPreset()
    }

    function startLupeColumnResize(column: LupeColumnKey, event: MouseEvent) {
      event.preventDefault()
      event.stopPropagation()
      if (event.button !== 0) return

      if (lupeResizeCleanup) {
        lupeResizeCleanup()
        lupeResizeCleanup = null
      }

      const startX = event.clientX
      const startWidth = lupeColumnWidths.value[column]
      const minWidth = lupeMinColumnWidths[column]

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX
        lupeColumnWidths.value[column] = Math.max(minWidth, Math.round(startWidth + delta))
      }

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        lupeResizeCleanup = null
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      lupeResizeCleanup = onMouseUp
    }

    onUnmounted(() => {
      clearTimerInterval()
      clearTimerFeedbackTimeout()
      if (lupeResizeCleanup) {
        lupeResizeCleanup()
      }
    })

    async function connectToServer() {
      if (!serverUrl.value.trim() || !serverSchema.value.trim() || !username.value.trim()) {
        status.value = 'Bitte Server-URL, Schema und Benutzername angeben.'
        return
      }

      await store.loadFromServer({
        baseUrl: serverUrl.value.trim(),
        schema: serverSchema.value.trim(),
        username: username.value.trim(),
        password: password.value,
        trustSelfSigned: trustSelfSigned.value,
      })

      if (store.currentKlasse?.schueler[0]) {
        selectedSchuelerId.value = store.currentKlasse.schueler[0].schueler.id
      }

      status.value = store.error
        ? `Fehler: ${store.error}`
        : 'Verbindung erfolgreich. ENM-Daten wurden geladen.'
      if (!store.error) {
        persistRuntimeConfig()
      }
    }

    function triggerConfigUpload() {
      configInput.value?.click()
    }

    async function onConfigFileSelected(event: Event) {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      try {
        const content = await file.text()
        const env = parseEnvLikeText(content)

        const host = env['SVWSSERVER_HOST'] ?? env['VITE_SVWSSERVER_HOST']
        const port = env['SVWSSERVER_PORT'] ?? env['VITE_SVWSSERVER_PORT'] ?? ''
        const baseUrl = env['SVWS_BASE_URL'] ?? env['VITE_SVWS_BASE_URL']
        const schema = env['SVWSSERVER_SCHEMA'] ?? env['VITE_SVWSSERVER_SCHEMA']
        const user = env['SVWSSERVER_USER'] ?? env['VITE_SVWSSERVER_USER']
        const pass = env['SVWSSERVER_PASSWORD'] ?? env['VITE_SVWSSERVER_PASSWORD']
        const trustFlag =
          parseBooleanFlag(env['SVWSSERVER_TRUST_SELF_SIGNED'])
          ?? parseBooleanFlag(env['VITE_SVWSSERVER_TRUST_SELF_SIGNED'])

        if (typeof baseUrl === 'string' && baseUrl.trim()) {
          serverUrl.value = baseUrl.trim()
        } else if (typeof host === 'string' && host.trim()) {
          serverUrl.value = buildDefaultBaseUrl(host, port)
        }
        if (typeof schema === 'string') serverSchema.value = schema
        if (typeof user === 'string') username.value = user
        if (typeof pass === 'string') password.value = pass
        if (typeof trustFlag === 'boolean') trustSelfSigned.value = trustFlag

        persistRuntimeConfig()
        status.value = `Konfiguration geladen: ${file.name}`
      } catch (error) {
        status.value = error instanceof Error
          ? `Konfigurationsdatei konnte nicht gelesen werden: ${error.message}`
          : 'Konfigurationsdatei konnte nicht gelesen werden.'
      } finally {
        target.value = ''
      }
    }

    function triggerUpload() {
      fileInput.value?.click()
    }

    async function onFileSelected(event: Event) {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      await store.loadFromFile(file)
      if (store.currentKlasse?.schueler[0]) {
        selectedSchuelerId.value = store.currentKlasse.schueler[0].schueler.id
      }
      status.value = store.error
        ? `Fehler: ${store.error}`
        : `Datei geladen: ${file.name}`

      target.value = ''
    }

    function selectSchueler(schuelerId: number) {
      applyTimerRepeatOnStudentChange(schuelerId)
      selectedSchuelerId.value = schuelerId
    }

    function navigateSchueler(direction: -1 | 1) {
      const klasse = store.currentKlasse
      if (!klasse || !selectedSchuelerId.value) return
      const currentIndex = klasse.schueler.findIndex(entry => entry.schueler.id === selectedSchuelerId.value)
      if (currentIndex < 0) return
      const nextIndex = Math.max(0, Math.min(klasse.schueler.length - 1, currentIndex + direction))
      selectSchueler(klasse.schueler[nextIndex].schueler.id)
    }

    function startEditingCell(schuelerId: number, lerngruppeId: number) {
      editingCell.value = `${schuelerId}:${lerngruppeId}`
    }

    function saveNote(schuelerId: number, lerngruppeId: number, value: string) {
      const note = value ? value as Notenkuerzel : null
      store.updateNote(schuelerId, lerngruppeId, note)
      editingCell.value = null
    }

    function logout() {
      store.reset()
      selectedSchuelerId.value = null
      activeMode.value = 'klasse'
      lupeOpen.value = false
      changesModalOpen.value = false
      logoutConfirmOpen.value = false
      exportConfirmOpen.value = false
      editingCell.value = null
      status.value = 'Abgemeldet. Noch keine Daten geladen.'
    }

    function requestLogout() {
      if (store.hasAnyChanges) {
        logoutConfirmOpen.value = true
        return
      }
      logout()
    }

    function printChangeLog(logLines: string[]) {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageHeight = doc.internal.pageSize.getHeight()
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 15
      const maxLineWidth = pageWidth - margin * 2
      const lineHeight = 5.5
      let y = margin

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Aenderungslog', margin, y)
      y += 8

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)

      for (const rawLine of logLines) {
        const wrappedLines = doc.splitTextToSize(rawLine, maxLineWidth) as string[]
        for (const line of wrappedLines) {
          if (y > pageHeight - margin) {
            doc.addPage()
            y = margin
          }
          doc.text(line, margin, y)
          y += lineHeight
        }
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      doc.save(`aenderungslog-${stamp}.pdf`)
    }

    function requestExport() {
      if (!store.hasAnyChanges) {
        status.value = 'Es sind keine Änderungen zum Export vorhanden.'
        return
      }

      exportConfirmOpen.value = true
    }

    async function exportChanges() {
      exportConfirmOpen.value = false

      exportRunning.value = true
      try {
        const sourceLabel = store.dataSource === 'server'
          ? 'Server'
          : store.dataSource === 'file'
            ? 'Datei-Upload'
            : 'unbekannt'
        status.value = `Export gestartet (Quelle: ${sourceLabel})...`

        if (store.dataSource === 'server') {
          const hasRuntimeServerConfig = !!serverUrl.value.trim() && !!serverSchema.value.trim() && !!username.value.trim()
          await store.importPatchedExportToServer(
            hasRuntimeServerConfig
              ? {
                baseUrl: serverUrl.value.trim(),
                schema: serverSchema.value.trim(),
                username: username.value.trim(),
                password: password.value,
                trustSelfSigned: trustSelfSigned.value,
              }
              : undefined,
          )
          status.value = 'Änderungen wurden an den SVWS-Server übertragen.'
          return
        }

        if (store.dataSource === 'file') {
          const blob = await store.createPatchedExportGzip()
          if (blob.size === 0) {
            throw new Error('Die erzeugte Exportdatei ist leer.')
          }
          const file = new File([blob], 'enm.json.gz', { type: 'application/gzip' })
          const url = URL.createObjectURL(file)
          const a = document.createElement('a')
          a.href = url
          a.download = file.name
          a.rel = 'noopener'
          a.style.display = 'none'
          document.body.appendChild(a)

          // Primary path: native anchor download
          a.click()

          window.setTimeout(() => {
            URL.revokeObjectURL(url)
            a.remove()
          }, 10000)
          status.value = `Geänderte enm.json.gz wurde zum Download bereitgestellt (${blob.size} Bytes).`
          return
        }

        throw new Error('Datenquelle unbekannt. Bitte ENM-Daten erneut laden.')
      } catch (error) {
        status.value = error instanceof Error
          ? `Export fehlgeschlagen: ${error.message}`
          : 'Export fehlgeschlagen.'
      } finally {
        exportRunning.value = false
      }
    }

    return () => {
      const klasse = store.currentKlasse
      const inConference = !!store.enmExport

      const klasseById = new Map(store.availableKlassen.map(item => [item.id, item]))
      const selectedKlasse = store.selectedKlasseId !== null ? klasseById.get(store.selectedKlasseId) : null

      const notenOptions = (store.enmExport?.noten ?? [])
        .slice()
        .sort((a, b) => b.notenpunkte - a.notenpunkte)
      const notenpunkteByKuerzel = new Map<Notenkuerzel, number>(notenOptions.map(item => [item.kuerzel, item.notenpunkte]))

      function getNoteDisplay(note: Notenkuerzel | null): string {
        if (!note) return '–'
        if (notenAnzeigeMode.value === 'punkte') {
          const points = notenpunkteByKuerzel.get(note)
          return typeof points === 'number' && Number.isFinite(points) ? String(points) : note
        }
        return note
      }

      if (klasse?.schueler.length && !klasse.schueler.some(entry => entry.schueler.id === selectedSchuelerId.value)) {
        selectedSchuelerId.value = klasse.schueler[0].schueler.id
      }

      const selectedSchueler = klasse?.schueler.find(entry => entry.schueler.id === selectedSchuelerId.value) ?? null
      const selectedSchuelerIndex = klasse && selectedSchuelerId.value
        ? klasse.schueler.findIndex(entry => entry.schueler.id === selectedSchuelerId.value)
        : -1

      const lerngruppenByFachId = new Map<number, number>()
      if (klasse) {
        for (const lg of klasse.lerngruppen) {
          if (!lerngruppenByFachId.has(lg.fachID)) {
            lerngruppenByFachId.set(lg.fachID, lg.id)
          }
        }
      }

      const lerngruppenIdsByFachId = new Map<number, number[]>()
      if (klasse) {
        for (const lg of klasse.lerngruppen) {
          const ids = lerngruppenIdsByFachId.get(lg.fachID)
          if (ids) {
            ids.push(lg.id)
          } else {
            lerngruppenIdsByFachId.set(lg.fachID, [lg.id])
          }
        }
      }

      const selectedSchuelerLerngruppenByFachId = new Map<number, number>()
      if (selectedSchueler && klasse) {
        const schuelerLerngruppeIds = new Set<number>(
          selectedSchueler.schueler.leistungsdaten
            .map(readLerngruppeId)
            .filter((id): id is number => id !== null)
        )

        for (const lg of klasse.lerngruppen) {
          if (!schuelerLerngruppeIds.has(lg.id)) continue
          if (!selectedSchuelerLerngruppenByFachId.has(lg.fachID)) {
            selectedSchuelerLerngruppenByFachId.set(lg.fachID, lg.id)
          }
        }
      }

      let avg = '–'
      let gradedCount = 0
      let relevantSubjectCount = 0
      if (selectedSchueler && klasse) {
        const values: number[] = []
        for (const fach of klasse.faecher) {
          const lgId = selectedSchuelerLerngruppenByFachId.get(fach.id)
          if (!lgId) continue

          const note = store.getNote(selectedSchueler.schueler.id, lgId)
          if (note === 'NE') continue

          relevantSubjectCount += 1
          const numeric = numericGrade(note)
          if (numeric !== null) {
            values.push(numeric)
          }
        }

        gradedCount = values.length
        if (values.length > 0) {
          avg = (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
        }
      }

      const fehlstundenGesamt = selectedSchueler
        ? store.getFehlstundenValue(selectedSchueler.schueler.id, 'fehlstundenGesamt')
        : undefined
      const fehlstundenUnentschuldigt = selectedSchueler
        ? store.getFehlstundenValue(selectedSchueler.schueler.id, 'fehlstundenGesamtUnentschuldigt')
        : undefined
      const remarkCards = selectedSchueler
        ? [
          { label: 'Arbeits- und Sozialverhalten', field: 'ASV' as const, value: store.getBemerkungenValue(selectedSchueler.schueler.id, 'ASV') },
          { label: 'Ausserunterrichtliches Engagement', field: 'AUE' as const, value: store.getBemerkungenValue(selectedSchueler.schueler.id, 'AUE') },
          { label: 'Zeugnisbemerkungen', field: 'ZB' as const, value: store.getBemerkungenValue(selectedSchueler.schueler.id, 'ZB') },
        ]
        : []

      const lehrerKuerzelById = new Map((store.enmExport?.lehrer ?? []).map(item => [item.id, item.kuerzel]))
      const klasseLerngruppeById = new Map((klasse?.lerngruppen ?? []).map(item => [item.id, item]))

      const lupeSubjects = selectedSchueler && klasse
        ? klasse.faecher.flatMap(fach => {
          const lgId = selectedSchuelerLerngruppenByFachId.get(fach.id)
          // Fach wird vom Schüler nicht belegt -> nicht erteilt -> nicht anzeigen.
          if (!lgId) {
            return []
          }

          const note = store.getNote(selectedSchueler.schueler.id, lgId)
          const isNotTaught = note === 'NE'

          // Nicht erteilte Fächer sollen in der Schülerlupe nicht auftauchen.
          if (isNotTaught) {
            return []
          }

          const tone = lupeTone(note)
          const lerngruppe = klasseLerngruppeById.get(lgId)
          const lehrerKuerzel = lerngruppe
            ? (lerngruppe.lehrerID ?? lerngruppe.idsLehrer ?? [])
              .map(id => lehrerKuerzelById.get(id))
              .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
            : []
          const fachKuerzel = fach.kuerzelAnzeige || fach.kuerzel
          return [{
            fachId: fach.id,
            fachKuerzel,
            fachName: fach.bezeichnung?.trim() || fachKuerzel,
            kursart: lerngruppe?.kursartKuerzel ?? '–',
            lehrerText: lehrerKuerzel.length ? lehrerKuerzel.join(', ') : '–',
            lgId,
            note,
            tone,
            fehlstundenFach: store.getFachbezogeneFehlstundenValue(selectedSchueler.schueler.id, lgId, 'fehlstundenFach'),
            fehlstundenUnentschuldigtFach: store.getFachbezogeneFehlstundenValue(selectedSchueler.schueler.id, lgId, 'fehlstundenUnentschuldigtFach'),
            fachbezogeneBemerkung: store.getFachbezogeneBemerkungValue(selectedSchueler.schueler.id, lgId),
          }]
        })
        : []

      const lupeCards = selectedSchueler
        ? lupeSubjects.map(subject => h('div', { class: `lupe-fach ${subject.tone.frame}` }, [
          h('div', { class: 'lupe-fach-k' }, subject.fachKuerzel),
          h('div', { class: 'lupe-fach-fn' }, subject.fachName),
          h('select', {
            class: `lupe-fach-note-select ${subject.tone.note}`,
            value: subject.note ?? '',
            onChange: (event: Event) => {
              const newNote = (event.target as HTMLSelectElement).value as Notenkuerzel | ''
              store.updateNote(selectedSchueler.schueler.id, subject.lgId, newNote || null)
            },
          }, [
            h('option', { value: '' }, '–'),
            ...notenOptions.map((n: EnmNote) => h('option', { value: n.kuerzel }, getNoteDisplay(n.kuerzel))),
          ]),
          h('div', { class: `lupe-fach-label ${subject.tone.label}` }, subject.tone.text),
          h('div', { class: 'lupe-fach-lehrer' }, subject.lehrerText),
        ]))
        : []

      const timerLabel = formatTimer(timerRemainingSeconds.value)
      const showTimerChip = timerRunning.value || timerRemainingSeconds.value !== timerTotalSeconds.value || timerFinishedFlash.value
      const lupeTableMinWidth = lupeColumnWidths.value.fach
        + lupeColumnWidths.value.kursart
        + lupeColumnWidths.value.lehrer
        + (lupeFehlstundenMode.value === 'fach' ? lupeColumnWidths.value.fs + lupeColumnWidths.value.fsu : 0)
        + lupeColumnWidths.value.note
        + 260

      const schuelerById = new Map((store.enmExport?.schueler ?? []).map(item => [item.id, item]))
      const lerngruppeById = new Map((store.enmExport?.lerngruppen ?? []).map(item => [item.id, item]))
      const fachById = new Map((store.enmExport?.faecher ?? []).map(item => [item.id, item]))

      const noteChanges = store.listNoteChanges().map(change => {
        const schueler = schuelerById.get(change.schuelerId)
        const lerngruppe = lerngruppeById.get(change.lerngruppeId)
        const fach = lerngruppe ? fachById.get(lerngruppe.fachID) : null
        return {
          typ: 'Note',
          schuelerName: schueler ? `${schueler.nachname}, ${schueler.vorname}` : `ID ${change.schuelerId}`,
          feld: fach?.kuerzelAnzeige || fach?.kuerzel || `Lerngruppe ${change.lerngruppeId}`,
          alt: change.originalNote ?? '–',
          neu: change.newNote ?? '–',
        }
      })

      const bemerkungLabels = {
        ASV: 'Arbeits- und Sozialverhalten',
        AUE: 'Ausserunterrichtliches Engagement',
        ZB: 'Zeugnisbemerkungen',
      } as const

      const bemerkungChanges = store.listBemerkungChanges().map(change => {
        const schueler = schuelerById.get(change.schuelerId)
        return {
          typ: 'Bemerkung',
          schuelerName: schueler ? `${schueler.nachname}, ${schueler.vorname}` : `ID ${change.schuelerId}`,
          feld: bemerkungLabels[change.field],
          alt: change.originalValue?.trim() || '–',
          neu: change.newValue?.trim() || '–',
        }
      })

      const fachbezogeneBemerkungChanges = store.listFachbezogeneBemerkungChanges().map(change => {
        const schueler = schuelerById.get(change.schuelerId)
        const lerngruppe = lerngruppeById.get(change.lerngruppeId)
        const fach = lerngruppe ? fachById.get(lerngruppe.fachID) : null
        return {
          typ: 'Fachbemerkung',
          schuelerName: schueler ? `${schueler.nachname}, ${schueler.vorname}` : `ID ${change.schuelerId}`,
          feld: fach?.kuerzelAnzeige || fach?.kuerzel || `Lerngruppe ${change.lerngruppeId}`,
          alt: change.originalValue?.trim() || '–',
          neu: change.newValue?.trim() || '–',
        }
      })

      const fehlstundenLabels = {
        fehlstundenGesamt: 'Fehlstunden gesamt',
        fehlstundenGesamtUnentschuldigt: 'Fehlstunden unentschuldigt',
      } as const

      const fehlstundenChanges = store.listFehlstundenChanges().map(change => {
        const schueler = schuelerById.get(change.schuelerId)
        return {
          typ: 'Fehlstunden',
          schuelerName: schueler ? `${schueler.nachname}, ${schueler.vorname}` : `ID ${change.schuelerId}`,
          feld: fehlstundenLabels[change.field],
          alt: String(change.originalValue),
          neu: String(change.newValue),
        }
      })

      const fachbezogeneFehlstundenLabels = {
        fehlstundenFach: 'FS',
        fehlstundenUnentschuldigtFach: 'FSU',
      } as const

      const fachbezogeneFehlstundenChanges = store.listFachbezogeneFehlstundenChanges().map(change => {
        const schueler = schuelerById.get(change.schuelerId)
        const lerngruppe = lerngruppeById.get(change.lerngruppeId)
        const fach = lerngruppe ? fachById.get(lerngruppe.fachID) : null
        return {
          typ: 'Fachfehlstunden',
          schuelerName: schueler ? `${schueler.nachname}, ${schueler.vorname}` : `ID ${change.schuelerId}`,
          feld: `${fach?.kuerzelAnzeige || fach?.kuerzel || `Lerngruppe ${change.lerngruppeId}`} ${fachbezogeneFehlstundenLabels[change.field]}`,
          alt: String(change.originalValue),
          neu: String(change.newValue),
        }
      })

      const allChanges = [...noteChanges, ...fehlstundenChanges, ...fachbezogeneFehlstundenChanges, ...bemerkungChanges, ...fachbezogeneBemerkungChanges]
      const exportTargetLabel = store.dataSource === 'server'
        ? 'SVWS-Server (Import v2)'
        : store.dataSource === 'file'
          ? 'Download als enm.changed.json.gz'
          : 'Unbekannte Datenquelle'
      const printableLogLines = [
        `Aenderungslog vom ${new Date().toLocaleString('de-DE')}`,
        `Gesamt: ${allChanges.length} Aenderungen`,
        '',
        ...allChanges.map((item, index) => `${index + 1}. [${item.typ}] ${item.schuelerName} | ${item.feld} | Alt: ${item.alt} | Neu: ${item.neu}`),
      ]

      return h('main', {
        class: inConference
          ? `app-shell conference-shell ${tableScale.value === 'gross' ? 'conference-shell-large' : ''}`
          : 'app-shell',
      }, [
        !inConference
          ? h('section', { class: 'hero' }, [
            h('p', { class: 'hero-kicker' }, 'Startbildschirm'),
            h('h1', 'SVWS Konferenzübersicht'),
            h('p', { class: 'hero-text' }, 'Wähle eine Datenquelle, um die Notenkonferenz zu starten.'),
          ])
          : null,

        !inConference
          ? h('section', { class: 'tile-grid' }, [
            h('article', { class: 'tile tile-server' }, [
              h('div', { class: 'tile-icon' }, [cloudIcon()]),
              h('h2', 'Verbindung zum SVWS-Server aufbauen'),
              h('p', 'Direkter Abruf des ENM-Exports per API mit URL, Schema und BasicAuth.'),
              h('div', { class: 'tile-fields' }, [
                h('input', {
                  class: 'tile-input',
                  type: 'url',
                  placeholder: 'https://svws.schule.de',
                  value: serverUrl.value,
                  onInput: (event: Event) => {
                    serverUrl.value = (event.target as HTMLInputElement).value
                    persistRuntimeConfig()
                  },
                }),
                h('input', {
                  class: 'tile-input',
                  type: 'text',
                  placeholder: 'Schema (z. B. svwsdb)',
                  value: serverSchema.value,
                  onInput: (event: Event) => {
                    serverSchema.value = (event.target as HTMLInputElement).value
                    persistRuntimeConfig()
                  },
                }),
                h('input', {
                  class: 'tile-input',
                  type: 'text',
                  placeholder: 'Benutzername',
                  value: username.value,
                  autocomplete: 'username',
                  onInput: (event: Event) => {
                    username.value = (event.target as HTMLInputElement).value
                    persistRuntimeConfig()
                  },
                }),
                h('input', {
                  class: 'tile-input',
                  type: 'password',
                  placeholder: 'Passwort',
                  value: password.value,
                  autocomplete: 'current-password',
                  onInput: (event: Event) => {
                    password.value = (event.target as HTMLInputElement).value
                    persistRuntimeConfig()
                  },
                }),
              ]),
              h('label', { class: 'tile-checkbox' }, [
                h('input', {
                  type: 'checkbox',
                  checked: trustSelfSigned.value,
                  onChange: (event: Event) => {
                    trustSelfSigned.value = (event.target as HTMLInputElement).checked
                    persistRuntimeConfig()
                  },
                }),
                h('span', 'Zertifikat vertrauen (selbstsigniert)'),
              ]),
              h('input', {
                ref: configInput,
                class: 'hidden-file-input',
                type: 'file',
                accept: '.env,.txt,text/plain',
                onChange: (event: Event) => {
                  void onConfigFileSelected(event)
                },
              }),
              h(
                'button',
                {
                  class: 'tile-button tile-button-secondary',
                  onClick: triggerConfigUpload,
                  disabled: store.loading,
                },
                'Konfiguration laden (.env)'
              ),
              h(
                'button',
                {
                  class: 'tile-button',
                  onClick: () => void connectToServer(),
                  disabled: store.loading,
                },
                store.loading ? 'Verbinde...' : 'Server verbinden'
              ),
            ]),
            h('article', { class: 'tile tile-upload' }, [
              h('div', { class: 'tile-icon' }, [uploadIcon()]),
              h('h2', 'Upload der Notendatei'),
              h('p', 'Lade eine lokale Datei im Format enm.json.gz direkt in den Browser.'),
              h('input', {
                ref: fileInput,
                class: 'hidden-file-input',
                type: 'file',
                accept: '.gz,.json.gz,application/gzip',
                onChange: (event: Event) => {
                  void onFileSelected(event)
                },
              }),
              h(
                'button',
                {
                  class: 'tile-button',
                  onClick: triggerUpload,
                  disabled: store.loading,
                },
                'Datei auswählen'
              ),
            ]),
          ])
          : null,

        inConference && klasse
          ? h('section', { class: tableScale.value === 'gross' ? 'conference-app conference-app-large' : 'conference-app' }, [
            h('header', { class: 'topbar' }, [
              h('span', { class: 'app-title' }, [
                'SVWS ',
                h('span', 'Konferenz'),
              ]),
              h('div', { class: 'sep' }),
              h('div', { class: 'field-group' }, [
                h('span', { class: 'field-label' }, 'Klasse'),
                h('select', {
                  value: store.selectedKlasseId ?? '',
                  onChange: (event: Event) => {
                    const nextId = Number((event.target as HTMLSelectElement).value)
                    store.selectKlasse(nextId)
                  },
                }, store.availableKlassen.map(item => h('option', { value: item.id }, item.kuerzelAnzeige || item.kuerzel))),
              ]),
              h('div', { class: 'sep' }),
              h('div', { class: 'mode-tabs' }, [
                h('button', {
                  class: activeMode.value === 'klasse' ? 'mode-tab active' : 'mode-tab',
                  onClick: () => {
                    activeMode.value = 'klasse'
                  },
                }, 'Klasse'),
                h('button', {
                  class: activeMode.value === 'lerngruppe' ? 'mode-tab active' : 'mode-tab',
                  onClick: () => {
                    activeMode.value = 'lerngruppe'
                  },
                }, 'Lerngruppe'),
              ]),
              h('div', { class: 'spacer' }),
              h('div', { class: 'mode-tabs' }, [
                h('button', {
                  class: notenAnzeigeMode.value === 'noten' ? 'mode-tab active' : 'mode-tab',
                  onClick: () => {
                    notenAnzeigeMode.value = 'noten'
                  },
                }, 'Noten'),
                h('button', {
                  class: notenAnzeigeMode.value === 'punkte' ? 'mode-tab active' : 'mode-tab',
                  onClick: () => {
                    notenAnzeigeMode.value = 'punkte'
                  },
                }, 'Punkte'),
              ]),
              h('button', {
                class: lupeOpen.value ? 'icon-btn active' : 'icon-btn',
                onClick: () => {
                  lupeOpen.value = !lupeOpen.value
                },
              }, 'Schülerlupe'),
              h('button', {
                class: `icon-btn ${timerRunning.value ? 'timer-on' : ''} ${timerFinishedFlash.value ? 'timer-finished' : ''}`.trim(),
                onClick: () => {
                  timerModalOpen.value = true
                },
              }, timerRunning.value || showTimerChip ? `Timer ${timerLabel}` : 'Timer'),
              h('button', {
                class: 'icon-btn',
                onClick: () => {
                  tableScale.value = tableScale.value === 'kompakt' ? 'gross' : 'kompakt'
                },
              }, `Ansicht: ${tableScale.value === 'kompakt' ? 'Kompakt' : 'Gross'}`),
              h('button', {
                class: 'icon-btn',
                onClick: () => {
                  changesModalOpen.value = true
                },
              }, `Änderungen (${store.totalChangeCount})`),
              h('button', {
                class: 'icon-btn icon-btn-logout',
                onClick: requestLogout,
                disabled: store.loading,
              }, 'Logout'),
            ]),
            h('div', { class: 'infobar' }, [
              h('div', ['Klasse: ', h('b', selectedKlasse?.kuerzelAnzeige ?? selectedKlasse?.kuerzel ?? '–')]),
              h('div', ['Schueler: ', h('b', String(klasse.schueler.length))]),
              h('div', ['Faecher: ', h('b', String(klasse.faecher.length))]),
              h('div', [`${store.schulInfo?.schuljahr ?? '–'} / Abschnitt ${store.schulInfo?.abschnitt ?? '–'}`]),
              h('div', { class: `timer-chip ${showTimerChip ? 'visible' : ''} ${timerFinishedFlash.value ? 'done' : ''}`.trim() }, timerLabel),
            ]),
            activeMode.value === 'klasse'
              ? h('div', { class: 'table-wrap' }, [
                h('table', [
                  h('thead', [
                    h('tr', [
                      h('th', { class: 'col-nr' }, 'Nr.'),
                      h('th', { class: 'col-name' }, 'Name'),
                      ...klasse.faecher.map(fach =>
                        h('th', { class: 'col-fach' }, fach.kuerzelAnzeige || fach.kuerzel)
                      ),
                    ]),
                  ]),
                  h('tbody', klasse.schueler.map((entry: KonferenzSchueler, index) =>
                    h('tr', {
                      class: entry.schueler.id === selectedSchuelerId.value ? 'selected' : '',
                      onClick: () => {
                        selectSchueler(entry.schueler.id)
                      },
                    }, [
                      h('td', { class: 'col-nr' }, String(index + 1)),
                      h('td', { class: 'col-name' }, `${entry.schueler.nachname}, ${entry.schueler.vorname}`),
                      ...klasse.faecher.map(fach => {
                        const lgId = (lerngruppenIdsByFachId.get(fach.id) ?? [])
                          .find(id => entry.leistungenByLerngruppe.has(id))
                        if (!lgId) {
                          return h('td', [h('span', { class: 'nl' }, '–')])
                        }
                        const note = store.getNote(entry.schueler.id, lgId)
                        const isEditing = editingCell.value === `${entry.schueler.id}:${lgId}`

                        if (isEditing) {
                          return h('td', [
                            h('select', {
                              class: 'note-select',
                              value: note ?? '',
                              autofocus: true,
                              onClick: (event: Event) => event.stopPropagation(),
                              onBlur: () => {
                                editingCell.value = null
                              },
                              onChange: (event: Event) => {
                                saveNote(entry.schueler.id, lgId, (event.target as HTMLSelectElement).value)
                              },
                            }, [
                              h('option', { value: '' }, '–'),
                              ...notenOptions.map(item => h('option', { value: item.kuerzel }, getNoteDisplay(item.kuerzel))),
                            ]),
                          ])
                        }

                        return h('td', {
                          class: store.isNoteChanged(entry.schueler.id, lgId) ? 'changed' : '',
                          onClick: (event: Event) => {
                            event.stopPropagation()
                            startEditingCell(entry.schueler.id, lgId)
                          },
                        }, [
                          h('span', { class: gradeClass(note) }, getNoteDisplay(note)),
                        ])
                      }),
                    ])
                  )),
                ]),
              ])
              : h('div', { class: 'placeholder-panel' }, 'Lerngruppenansicht folgt als naechster Ausbauschritt.'),
            lupeOpen.value
              ? h('div', {
                class: 'lupe-modal-bg open',
                onClick: (event: MouseEvent) => {
                  if (event.target === event.currentTarget) {
                    lupeOpen.value = false
                  }
                },
              }, [
                h('section', { class: 'lupe-modal' }, [
                  h('div', { class: 'lupe-header-bar' }, [
                    h('div', { class: 'lupe-avatar' }, selectedSchueler ? `${selectedSchueler.schueler.vorname[0]}${selectedSchueler.schueler.nachname[0]}` : '–'),
                    h('div', [
                      h('div', { class: 'lupe-name' }, selectedSchueler ? `${selectedSchueler.schueler.nachname}, ${selectedSchueler.schueler.vorname}` : 'Kein Schueler gewaehlt'),
                      h('div', { class: 'lupe-meta' }, klasse && selectedSchuelerIndex >= 0 ? `${selectedKlasse?.kuerzelAnzeige ?? selectedKlasse?.kuerzel ?? '–'} · Schueler ${selectedSchuelerIndex + 1} von ${klasse.schueler.length}` : ''),
                    ]),
                    h('div', { class: 'lupe-controls' }, [
                      h('div', { class: 'lupe-view-toggle' }, [
                        h('button', {
                          class: lupeViewMode.value === 'kachel' ? 'lupe-view-btn active' : 'lupe-view-btn',
                          onClick: () => {
                            lupeViewMode.value = 'kachel'
                          },
                        }, 'Kacheln'),
                        h('button', {
                          class: lupeViewMode.value === 'tabelle' ? 'lupe-view-btn active' : 'lupe-view-btn',
                          onClick: () => {
                            lupeViewMode.value = 'tabelle'
                          },
                        }, 'Tabelle'),
                      ]),
                      h('div', { class: 'lupe-view-toggle' }, [
                        h('button', {
                          class: lupeFehlstundenMode.value === 'gesamt' ? 'lupe-view-btn active' : 'lupe-view-btn',
                          onClick: () => {
                            lupeFehlstundenMode.value = 'gesamt'
                          },
                        }, 'FSG'),
                        h('button', {
                          class: lupeFehlstundenMode.value === 'fach' ? 'lupe-view-btn active' : 'lupe-view-btn',
                          onClick: () => {
                            lupeFehlstundenMode.value = 'fach'
                          },
                        }, 'FSF'),
                      ]),
                      h('div', { class: 'lupe-view-toggle' }, [
                        h('button', {
                          class: notenAnzeigeMode.value === 'noten' ? 'lupe-view-btn active' : 'lupe-view-btn',
                          onClick: () => {
                            notenAnzeigeMode.value = 'noten'
                          },
                        }, 'Noten'),
                        h('button', {
                          class: notenAnzeigeMode.value === 'punkte' ? 'lupe-view-btn active' : 'lupe-view-btn',
                          onClick: () => {
                            notenAnzeigeMode.value = 'punkte'
                          },
                        }, 'Punkte'),
                      ]),
                    ]),
                    h('div', { class: 'lupe-nav' }, [
                      h('button', {
                        class: 'lupe-nav-btn',
                        disabled: !klasse || selectedSchuelerIndex <= 0,
                        onClick: () => navigateSchueler(-1),
                      }, '↑'),
                      h('button', {
                        class: 'lupe-nav-btn',
                        disabled: !klasse || selectedSchuelerIndex < 0 || selectedSchuelerIndex >= klasse.schueler.length - 1,
                        onClick: () => navigateSchueler(1),
                      }, '↓'),
                      h('button', {
                        class: 'lupe-nav-btn lupe-close-btn',
                        onClick: () => {
                          lupeOpen.value = false
                        },
                      }, '×'),
                    ]),
                  ]),
                  h('div', { class: 'lupe-stats-row' }, [
                    h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Ø Note'), h('div', { class: 'lupe-stat-val' }, avg)]),
                    h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Bewertet'), h('div', { class: 'lupe-stat-val' }, `${gradedCount} / ${relevantSubjectCount}`)]),
                    selectedSchueler
                      ? h('div', { class: 'lupe-stat-box lupe-stat-editable' }, [
                        h('div', { class: 'lupe-stat-label' }, 'Fehlstunden gesamt'),
                        h('input', {
                          type: 'number',
                          class: 'lupe-stat-input',
                          value: fehlstundenGesamt ?? 0,
                          min: '0',
                          onInput: (event: Event) => {
                            const value = Number((event.target as HTMLInputElement).value)
                            store.updateFehlstundenValue(selectedSchueler.schueler.id, 'fehlstundenGesamt', value)
                          },
                        }),
                      ])
                      : h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Fehlstunden gesamt'), h('div', { class: 'lupe-stat-val' }, '–')]),
                    selectedSchueler
                      ? h('div', { class: 'lupe-stat-box lupe-stat-editable' }, [
                        h('div', { class: 'lupe-stat-label' }, 'Fehlstunden unentsch.'),
                        h('input', {
                          type: 'number',
                          class: 'lupe-stat-input',
                          value: fehlstundenUnentschuldigt ?? 0,
                          min: '0',
                          onInput: (event: Event) => {
                            const value = Number((event.target as HTMLInputElement).value)
                            store.updateFehlstundenValue(selectedSchueler.schueler.id, 'fehlstundenGesamtUnentschuldigt', value)
                          },
                        }),
                      ])
                      : h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Fehlstunden unentsch.'), h('div', { class: 'lupe-stat-val' }, '–')]),
                    h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Geaendert'), h('div', { class: 'lupe-stat-val' }, String(store.totalChangeCount))]),
                  ]),
                  h('div', { class: 'lupe-remarks-wrap' }, [
                    ...remarkCards.map(card => h('article', { class: 'lupe-remark-card' }, [
                      h('h4', { class: 'lupe-remark-label' }, card.label),
                      selectedSchueler
                        ? h('textarea', {
                          class: 'lupe-remark-textarea',
                          value: card.value?.trim() ?? '',
                          placeholder: '(Leer lassen für keine Bemerkung)',
                          onInput: (event: Event) => {
                            const value = (event.target as HTMLTextAreaElement).value.trim()
                            store.updateBemerkungenValue(selectedSchueler.schueler.id, card.field, value || null)
                          },
                        })
                        : h('p', { class: 'lupe-remark-text' }, card.value?.trim() ? card.value : '–'),
                    ])),
                  ]),
                  h('div', { class: lupeViewMode.value === 'tabelle' ? 'lupe-grid-wrap lupe-grid-wrap-table' : 'lupe-grid-wrap' }, [
                    lupeSubjects.length
                      ? lupeViewMode.value === 'kachel'
                        ? h('div', { class: 'lupe-grid' }, lupeCards)
                        : h('div', { class: 'lupe-table-wrap' }, [
                          h('table', { class: 'lupe-table', style: { minWidth: `${lupeTableMinWidth}px` } }, [
                            h('thead', [
                              h('tr', [
                                h('th', { class: 'lupe-col-fach lupe-resizable-col', style: { width: `${lupeColumnWidths.value.fach}px` } }, [
                                  h('span', { class: 'lupe-th-label' }, 'Fachkürzel'),
                                  h('span', { class: 'lupe-col-resizer', onMousedown: (event: MouseEvent) => startLupeColumnResize('fach', event) }),
                                ]),
                                h('th', { class: 'lupe-col-kursart lupe-resizable-col', style: { width: `${lupeColumnWidths.value.kursart}px` } }, [
                                  h('span', { class: 'lupe-th-label' }, 'Kursart'),
                                  h('span', { class: 'lupe-col-resizer', onMousedown: (event: MouseEvent) => startLupeColumnResize('kursart', event) }),
                                ]),
                                h('th', { class: 'lupe-col-lehrer lupe-resizable-col', style: { width: `${lupeColumnWidths.value.lehrer}px` } }, [
                                  h('span', { class: 'lupe-th-label' }, 'Lehrerkürzel'),
                                  h('span', { class: 'lupe-col-resizer', onMousedown: (event: MouseEvent) => startLupeColumnResize('lehrer', event) }),
                                ]),
                                ...(lupeFehlstundenMode.value === 'fach'
                                  ? [
                                    h('th', { class: 'lupe-col-fs lupe-resizable-col', style: { width: `${lupeColumnWidths.value.fs}px` } }, [
                                      h('span', { class: 'lupe-th-label' }, 'FS'),
                                      h('span', { class: 'lupe-col-resizer', onMousedown: (event: MouseEvent) => startLupeColumnResize('fs', event) }),
                                    ]),
                                    h('th', { class: 'lupe-col-fsu lupe-resizable-col', style: { width: `${lupeColumnWidths.value.fsu}px` } }, [
                                      h('span', { class: 'lupe-th-label' }, 'FSU'),
                                      h('span', { class: 'lupe-col-resizer', onMousedown: (event: MouseEvent) => startLupeColumnResize('fsu', event) }),
                                    ]),
                                  ]
                                  : []),
                                h('th', { class: 'lupe-col-note lupe-resizable-col', style: { width: `${lupeColumnWidths.value.note}px` } }, [
                                  h('span', { class: 'lupe-th-label' }, notenAnzeigeMode.value === 'punkte' ? 'Punkte' : 'Notenkürzel'),
                                  h('span', { class: 'lupe-col-resizer', onMousedown: (event: MouseEvent) => startLupeColumnResize('note', event) }),
                                ]),
                                h('th', { class: 'lupe-col-remark' }, 'Fachbezogene Bemerkungen'),
                              ]),
                            ]),
                            h('tbody', lupeSubjects.map(subject => h('tr', [
                              h('td', { class: 'lupe-table-fach lupe-col-fach', style: { width: `${lupeColumnWidths.value.fach}px` } }, subject.fachKuerzel),
                              h('td', { class: `${subject.kursart === 'LK' ? 'lupe-table-kursart is-lk' : 'lupe-table-kursart'} lupe-col-kursart`.trim(), style: { width: `${lupeColumnWidths.value.kursart}px` } }, subject.kursart),
                              h('td', { class: 'lupe-col-lehrer', style: { width: `${lupeColumnWidths.value.lehrer}px` } }, subject.lehrerText),
                              ...(lupeFehlstundenMode.value === 'fach'
                                ? [
                                  h('td', { class: `lupe-col-fs lupe-table-number-cell ${selectedSchueler && store.isFachbezogeneFehlstundenChanged(selectedSchueler.schueler.id, subject.lgId, 'fehlstundenFach') ? 'changed' : ''}`.trim(), style: { width: `${lupeColumnWidths.value.fs}px` } }, [
                                    h('input', {
                                      type: 'number',
                                      min: '0',
                                      step: '1',
                                      inputmode: 'numeric',
                                      class: 'lupe-table-number-input',
                                      value: subject.fehlstundenFach,
                                      onInput: (event: Event) => {
                                        if (!selectedSchueler) return
                                        const value = Number((event.target as HTMLInputElement).value)
                                        store.updateFachbezogeneFehlstundenValue(selectedSchueler.schueler.id, subject.lgId, 'fehlstundenFach', value)
                                      },
                                    }),
                                  ]),
                                  h('td', { class: `lupe-col-fsu lupe-table-number-cell ${selectedSchueler && store.isFachbezogeneFehlstundenChanged(selectedSchueler.schueler.id, subject.lgId, 'fehlstundenUnentschuldigtFach') ? 'changed' : ''}`.trim(), style: { width: `${lupeColumnWidths.value.fsu}px` } }, [
                                    h('input', {
                                      type: 'number',
                                      min: '0',
                                      max: String(subject.fehlstundenFach),
                                      step: '1',
                                      inputmode: 'numeric',
                                      class: 'lupe-table-number-input',
                                      value: subject.fehlstundenUnentschuldigtFach,
                                      onInput: (event: Event) => {
                                        if (!selectedSchueler) return
                                        const value = Number((event.target as HTMLInputElement).value)
                                        store.updateFachbezogeneFehlstundenValue(selectedSchueler.schueler.id, subject.lgId, 'fehlstundenUnentschuldigtFach', value)
                                      },
                                    }),
                                  ]),
                                ]
                                : []),
                              h('td', { class: `lupe-table-note-cell ${subject.tone.label} lupe-col-note`.trim(), style: { width: `${lupeColumnWidths.value.note}px` } }, [
                                h('select', {
                                  class: `lupe-table-note-select ${subject.tone.note}`,
                                  value: subject.note ?? '',
                                  onChange: (event: Event) => {
                                    if (!selectedSchueler) return
                                    const newNote = (event.target as HTMLSelectElement).value as Notenkuerzel | ''
                                    store.updateNote(selectedSchueler.schueler.id, subject.lgId, newNote || null)
                                  },
                                }, [
                                  h('option', { value: '' }, '–'),
                                  ...notenOptions.map((n: EnmNote) => h('option', { value: n.kuerzel }, getNoteDisplay(n.kuerzel))),
                                ]),
                              ]),
                              h('td', { class: 'lupe-col-remark' }, [
                                h('input', {
                                  type: 'text',
                                  class: `lupe-table-remark-input ${selectedSchueler && store.isFachbezogeneBemerkungChanged(selectedSchueler.schueler.id, subject.lgId) ? 'changed' : ''}`.trim(),
                                  value: subject.fachbezogeneBemerkung?.trim() ?? '',
                                  placeholder: 'Keine fachbezogene Bemerkung',
                                  onInput: (event: Event) => {
                                    if (!selectedSchueler) return
                                    const value = (event.target as HTMLInputElement).value.trim()
                                    store.updateFachbezogeneBemerkungValue(selectedSchueler.schueler.id, subject.lgId, value || null)
                                  },
                                }),
                              ]),
                            ]))),
                          ]),
                        ])
                      : h('p', { class: 'lupe-empty' }, 'Keine erteilten Faecher in der aktuellen Auswahl.'),
                  ]),
                ]),
              ])
              : null,
            timerModalOpen.value
              ? h('div', {
                class: 'timer-modal-bg open',
                onClick: (event: MouseEvent) => {
                  if (event.target === event.currentTarget) {
                    timerModalOpen.value = false
                  }
                },
              }, [
                h('section', { class: 'timer-modal' }, [
                  h('button', {
                    class: 'timer-modal-close',
                    onClick: () => {
                      timerModalOpen.value = false
                    },
                  }, '×'),
                  h('div', { class: 'timer-modal-label' }, 'Konferenztimer'),
                  h('div', { class: `timer-big ${timerRunning.value ? 'running' : ''} ${timerFinishedFlash.value ? 'done' : ''}`.trim() }, timerLabel),
                  h('div', { class: 'timer-presets' }, timerPresets.map(seconds =>
                    h('button', {
                      class: `timer-preset ${timerTotalSeconds.value === seconds ? 'active' : ''}`.trim(),
                      onClick: () => {
                        setTimerPreset(seconds)
                      },
                    }, `${Math.floor(seconds / 60)} min`)
                  )),
                  h('div', { class: 'timer-options' }, [
                    h('button', {
                      class: `timer-option ${timerSoundMuted.value ? 'active' : ''}`.trim(),
                      onClick: () => {
                        timerSoundMuted.value = !timerSoundMuted.value
                      },
                    }, timerSoundMuted.value ? 'Ton: aus' : 'Ton: an'),
                    h('button', {
                      class: `timer-option ${timerRepeatEnabled.value ? 'active' : ''}`.trim(),
                      onClick: () => {
                        timerRepeatEnabled.value = !timerRepeatEnabled.value
                      },
                    }, timerRepeatEnabled.value ? 'Repeat: an' : 'Repeat: aus'),
                  ]),
                  h('div', { class: 'timer-modal-btns' }, [
                    h('button', {
                      class: 'timer-btn',
                      onClick: resetTimer,
                    }, 'Zuruecksetzen'),
                    h('button', {
                      class: `timer-btn primary ${timerRunning.value ? 'stop' : ''}`.trim(),
                      onClick: toggleTimer,
                    }, timerRunning.value ? 'Pause' : (timerRemainingSeconds.value < timerTotalSeconds.value ? 'Weiter' : 'Starten')),
                  ]),
                ]),
              ])
              : null,
            changesModalOpen.value
              ? h('div', {
                class: 'changes-modal-bg open',
                onClick: (event: MouseEvent) => {
                  if (event.target === event.currentTarget) {
                    changesModalOpen.value = false
                  }
                },
              }, [
                h('section', { class: 'changes-modal' }, [
                  h('button', {
                    class: 'timer-modal-close',
                    onClick: () => {
                      changesModalOpen.value = false
                    },
                  }, '×'),
                  h('h3', { class: 'changes-modal-title' }, `Änderungen (${allChanges.length})`),
                  allChanges.length
                    ? h('div', { class: 'changes-list-wrap' }, [
                      h('table', { class: 'changes-table' }, [
                        h('thead', [
                          h('tr', [
                            h('th', 'Typ'),
                            h('th', 'Schueler'),
                            h('th', 'Feld'),
                            h('th', 'Alt'),
                            h('th', 'Neu'),
                          ]),
                        ]),
                        h('tbody', allChanges.map(item => h('tr', [
                          h('td', item.typ),
                          h('td', item.schuelerName),
                          h('td', item.feld),
                          h('td', item.alt),
                          h('td', item.neu),
                        ]))),
                      ]),
                    ])
                    : h('p', { class: 'changes-empty' }, 'Noch keine Änderungen vorhanden.'),
                  h('div', { class: 'changes-modal-actions' }, [
                    h('button', {
                      class: 'icon-btn',
                      onClick: () => {
                        printChangeLog(printableLogLines)
                      },
                      disabled: allChanges.length === 0,
                    }, 'Log drucken'),
                    h('button', {
                      class: 'icon-btn',
                      onClick: () => {
                        requestExport()
                      },
                      disabled: exportRunning.value,
                    }, exportRunning.value ? 'Exportiere...' : 'Export'),
                    h('button', {
                      class: 'icon-btn',
                      onClick: () => {
                        store.clearAllChanges()
                      },
                      disabled: allChanges.length === 0,
                    }, 'Änderungen verwerfen'),
                  ]),
                ]),
              ])
              : null,
            exportConfirmOpen.value
              ? h('div', {
                class: 'export-modal-bg open',
                onClick: (event: MouseEvent) => {
                  if (event.target === event.currentTarget) {
                    exportConfirmOpen.value = false
                  }
                },
              }, [
                h('section', { class: 'export-modal' }, [
                  h('button', {
                    class: 'timer-modal-close',
                    onClick: () => {
                      exportConfirmOpen.value = false
                    },
                  }, '×'),
                  h('h3', { class: 'export-modal-title' }, 'Export bestätigen'),
                  h('p', { class: 'export-modal-text' }, `Die Änderungen werden exportiert: ${exportTargetLabel}.`),
                  h('p', { class: 'export-modal-text' }, 'Möchten Sie den Export jetzt wirklich starten?'),
                  h('div', { class: 'export-modal-actions' }, [
                    h('button', {
                      class: 'icon-btn',
                      onClick: () => {
                        exportConfirmOpen.value = false
                      },
                    }, 'Abbrechen'),
                    h('button', {
                      class: 'icon-btn',
                      onClick: () => {
                        void exportChanges()
                      },
                    }, 'Export starten'),
                  ]),
                ]),
              ])
              : null,
            logoutConfirmOpen.value
              ? h('div', {
                class: 'logout-modal-bg open',
                onClick: (event: MouseEvent) => {
                  if (event.target === event.currentTarget) {
                    logoutConfirmOpen.value = false
                  }
                },
              }, [
                h('section', { class: 'logout-modal' }, [
                  h('button', {
                    class: 'timer-modal-close',
                    onClick: () => {
                      logoutConfirmOpen.value = false
                    },
                  }, '×'),
                  h('h3', { class: 'logout-modal-title' }, 'Änderungen vorhanden'),
                  h('p', { class: 'logout-modal-text' }, 'Es gibt noch nicht gesicherte Änderungen. Möchten Sie sich wirklich abmelden und diese Änderungen verwerfen?'),
                  h('div', { class: 'logout-modal-actions' }, [
                    h('button', {
                      class: 'icon-btn',
                      onClick: () => {
                        logoutConfirmOpen.value = false
                      },
                    }, 'Abbrechen'),
                    h('button', {
                      class: 'icon-btn icon-btn-logout',
                      onClick: () => {
                        logout()
                      },
                    }, 'Trotzdem abmelden'),
                  ]),
                ]),
              ])
              : null,
          ])
          : null,

        h('p', { class: 'status-line', role: 'status' }, status.value),
      ])
    }
  },
})

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
