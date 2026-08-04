<script lang="ts">
import { defineComponent, h, onUnmounted, ref } from 'vue'
import { jsPDF } from 'jspdf'
import StartScreenSection from './conference/StartScreenSection.vue'
import ConferenceHeaderSection from './conference/ConferenceHeaderSection.vue'
import KlasseTableSection from './conference/KlasseTableSection.vue'
import LupeModalSection from './conference/LupeModalSection.vue'
import AppDialogsSection from './conference/AppDialogsSection.vue'
import { buildConferenceDerivedData } from '../composables/useConferenceDerivedData'
import { buildChangeLogData } from '../utils/changeLogMapping'
import { createLupeCardsVNodes } from '../utils/lupeCardPresentation'
import { useConferenceStore } from '../stores/conferenceStore'
import type { Notenkuerzel } from '../types/enm'

// Runtime defaults that may be injected by the build system or by the hosting environment.
// These values are only used as initial fallbacks for the server connection form.
type SvwsDefaults = {
  host: string
  port: string
  schema: string
  user: string
  password: string
}

// Runtime config that is persisted to localStorage.
// Password is intentionally excluded from persisted storage.
type RuntimeSvwsConfig = {
  baseUrl: string
  schema: string
  username: string
  trustSelfSigned: boolean
}

// The keys of the Lupe detail table columns. Used for resize state and rendering.
type LupeColumnKey = 'fach' | 'kursart' | 'lehrer' | 'fs' | 'fsu' | 'note'

const RUNTIME_CONFIG_STORAGE_KEY = 'svws-conference.runtime-config'

// Build-time injected defaults from the app shell or Vite environment.
declare const __SVWS_DEFAULTS__: Partial<SvwsDefaults> | undefined

function readSvwsDefaults(): Partial<SvwsDefaults> {
  if (typeof __SVWS_DEFAULTS__ === 'undefined') {
    return {}
  }
  return __SVWS_DEFAULTS__
}

// Build a default server URL from host and port values.
// If the host already contains a protocol, it is returned unchanged.
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


// Load persisted connection config from localStorage, omitting any stored password.
function readStoredRuntimeConfig(): Partial<RuntimeSvwsConfig> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(RUNTIME_CONFIG_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<RuntimeSvwsConfig>
    if (typeof parsed !== 'object' || parsed === null) return {}

    if ('password' in parsed) {
      delete (parsed as Partial<RuntimeSvwsConfig> & { password?: string }).password
      window.localStorage.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(parsed))
    }

    return parsed
  } catch {
    return {}
  }
}

// Resolve the CSS class for a grade badge.
function gradeClass(note: Notenkuerzel | null): string {
  if (!note) return 'badge ns'
  const numeric = Number.parseInt(note, 10)
  if (Number.isNaN(numeric)) return 'badge ns'
  return `badge n${Math.max(1, Math.min(6, numeric))}`
}

// Convert a grade token into a numeric value if available.
function numericGrade(note: Notenkuerzel | null): number | null {
  if (!note) return null
  const value = Number.parseInt(note, 10)
  if (Number.isNaN(value)) return null
  return value
}

// Normalize heterogenous lerngruppen ID fields from ENM payloads.
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

// Map a grade to visual tone classes and localized text for the Lupe detail cards.
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

// Format seconds into MM:SS for the timer display.
function formatTimer(seconds: number): string {
  const safe = Math.max(0, seconds)
  const mins = Math.floor(safe / 60).toString().padStart(2, '0')
  const secs = (safe % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

const App = defineComponent({
  setup() {
    // Central store for ENM data, class selection and change tracking.
    const store = useConferenceStore()

    // Static defaults may come from injected global values or from build-time values.
    const defaults = readSvwsDefaults()
    const storedConfig = readStoredRuntimeConfig()

    // Connection form state; persisted runtime config is preferred over defaults.
    const serverUrl = ref(storedConfig.baseUrl ?? buildDefaultBaseUrl(defaults.host ?? '', defaults.port ?? ''))
    const serverSchema = ref(storedConfig.schema ?? defaults.schema ?? '')
    const username = ref(storedConfig.username ?? defaults.user ?? '')
    const password = ref('')
    const trustSelfSigned = ref(storedConfig.trustSelfSigned ?? false)

    // UI status and selection state.
    const status = ref('Noch keine Daten geladen.')
    const selectedSchuelerId = ref<number | null>(null)
    const activeMode = ref<'klasse' | 'lerngruppe'>('klasse')

    // Lupe detail modal state.
    const lupeOpen = ref(false)
    const lupeViewMode = ref<'kachel' | 'tabelle'>('tabelle')
    const lupeFehlstundenMode = ref<'gesamt' | 'fach'>('gesamt')
    const notenAnzeigeMode = ref<'noten' | 'punkte'>('noten')
    const lupeRemarksCollapsed = ref(false)
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

    // Editing and layout state for the table.
    const editingCell = ref<string | null>(null)
    const tableScale = ref<'kompakt' | 'gross'>('kompakt')
    const noteCycleMode = ref<'halbjahr' | 'quartal'>('halbjahr')
    const lupeTableDetailMode = ref<'bemerkungen' | 'teilleistungen'>('bemerkungen')

    // Dialog visibility state.
    const timerModalOpen = ref(false)
    const changesModalOpen = ref(false)
    const logoutConfirmOpen = ref(false)
    const exportConfirmOpen = ref(false)
    const exportRunning = ref(false)

    // Timer state and controls.
    const timerTotalSeconds = ref(2700)
    const timerRemainingSeconds = ref(2700)
    const timerRunning = ref(false)
    const timerFinishedFlash = ref(false)
    const timerSoundMuted = ref(false)
    const timerRepeatEnabled = ref(false)
    const lastSavedAt = ref<Date | null>(null)
    const timerPresets = [180, 300, 600, 900]
    let timerIntervalId: number | null = null
    let timerFlashTimeoutId: number | null = null

    // Cleanup function for the Lupe column resize mouse listeners.
    let lupeResizeCleanup: (() => void) | null = null

    // Persist the current runtime server configuration to localStorage.
    // Passwords are intentionally omitted to avoid storing secrets.
    function persistRuntimeConfig() {
      if (typeof window === 'undefined') return
      const payload: RuntimeSvwsConfig = {
        baseUrl: serverUrl.value,
        schema: serverSchema.value,
        username: username.value,
        trustSelfSigned: trustSelfSigned.value,
      }
      try {
        window.localStorage.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(payload))
      } catch {
        // Ignore storage errors (e.g. strict browser privacy mode)
      }
    }

    // Stop the interval driving the countdown timer.
    function clearTimerInterval() {
      if (timerIntervalId !== null) {
        window.clearInterval(timerIntervalId)
        timerIntervalId = null
      }
    }

    // Clear the flash feedback timeout used when the timer finishes.
    function clearTimerFeedbackTimeout() {
      if (timerFlashTimeoutId !== null) {
        window.clearTimeout(timerFlashTimeoutId)
        timerFlashTimeoutId = null
      }
    }

    // Play a short completion tone when the timer expires.
    // Uses the Web Audio API if available and not muted.
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

    // Stop the timer and show a brief flash when time has expired.
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

    // Decrement the countdown each second while the timer is active.
    function tickTimer() {
      if (!timerRunning.value) return
      timerRemainingSeconds.value = Math.max(0, timerRemainingSeconds.value - 1)
      if (timerRemainingSeconds.value === 0) {
        finishTimer()
      }
    }

    // Choose a new timer preset and reset the countdown.
    function setTimerPreset(seconds: number) {
      timerTotalSeconds.value = seconds
      timerRemainingSeconds.value = seconds
      timerRunning.value = false
      timerFinishedFlash.value = false
      clearTimerInterval()
      clearTimerFeedbackTimeout()
    }

    // Start the timer using the currently selected preset length.
    function startTimerFromCurrentPreset() {
      timerRemainingSeconds.value = timerTotalSeconds.value
      timerFinishedFlash.value = false
      clearTimerFeedbackTimeout()
      timerRunning.value = true
      clearTimerInterval()
      timerIntervalId = window.setInterval(tickTimer, 1000)
    }

    // Toggle between running and paused timer state.
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

    // Reset timer state to the chosen preset without starting it.
    function resetTimer() {
      timerRunning.value = false
      clearTimerInterval()
      clearTimerFeedbackTimeout()
      timerFinishedFlash.value = false
      timerRemainingSeconds.value = timerTotalSeconds.value
    }

    // If the user has enabled timer repeat, restarting the timer when the selected student changes.
    function applyTimerRepeatOnStudentChange(newSchuelerId: number) {
      if (!timerRepeatEnabled.value) return
      if (activeMode.value !== 'klasse') return
      if (!store.currentKlasse) return
      if (selectedSchuelerId.value === newSchuelerId) return
      startTimerFromCurrentPreset()
    }

    // Handle the drag-to-resize interaction in the Lupe table.
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

  // Return a small saved-state label if the current dataset has been exported successfully.
  function getSavedIndicatorText(): string | null {
    if (!lastSavedAt.value || store.hasAnyChanges) return null
    const time = lastSavedAt.value.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `Gespeichert um ${time}`
  }

  onUnmounted(() => {
    clearTimerInterval()
    clearTimerFeedbackTimeout()
    if (lupeResizeCleanup) {
      lupeResizeCleanup()
    }
  })

  // Establish a connection to the SVWS server and load ENM data.
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
      lastSavedAt.value = null

      status.value = store.error
        ? `Fehler: ${store.error}`
        : 'Verbindung erfolgreich. ENM-Daten wurden geladen.'
      if (!store.error) {
        persistRuntimeConfig()
      }
    }

    // Load ENM data from a selected file instead of from the server.
    async function onFileSelected(event: Event) {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      await store.loadFromFile(file)
      if (store.currentKlasse?.schueler[0]) {
        selectedSchuelerId.value = store.currentKlasse.schueler[0].schueler.id
      }
      lastSavedAt.value = null
      status.value = store.error
        ? `Fehler: ${store.error}`
        : `Datei geladen: ${file.name}`

      target.value = ''
    }

    // Select a student and optionally restart the timer if repeat mode is active.
    function selectSchueler(schuelerId: number) {
      applyTimerRepeatOnStudentChange(schuelerId)
      selectedSchuelerId.value = schuelerId
    }

    // Navigate through students in the current class.
    function navigateSchueler(direction: -1 | 1) {
      const klasse = store.currentKlasse
      if (!klasse || !selectedSchuelerId.value) return
      const currentIndex = klasse.schueler.findIndex(entry => entry.schueler.id === selectedSchuelerId.value)
      if (currentIndex < 0) return
      const nextIndex = Math.max(0, Math.min(klasse.schueler.length - 1, currentIndex + direction))
      selectSchueler(klasse.schueler[nextIndex].schueler.id)
    }

    // Mark a specific cell as currently edited.
    function startEditingCell(schuelerId: number, lerngruppeId: number) {
      editingCell.value = `${schuelerId}:${lerngruppeId}`
    }

    // Save a changed grade value into the store.
    function saveNote(schuelerId: number, lerngruppeId: number, value: string) {
      const note = value ? value as Notenkuerzel : null
      if (noteCycleMode.value === 'quartal') {
        store.updateNoteQuartal(schuelerId, lerngruppeId, note)
      } else {
        store.updateNote(schuelerId, lerngruppeId, note)
      }
      editingCell.value = null
    }

    // Reset session-specific UI state when logging out.
    function logout() {
      password.value = ''
      store.reset()
      selectedSchuelerId.value = null
      activeMode.value = 'klasse'
      lupeOpen.value = false
      changesModalOpen.value = false
      logoutConfirmOpen.value = false
      exportConfirmOpen.value = false
      editingCell.value = null
      lastSavedAt.value = null
      status.value = 'Abgemeldet. Noch keine Daten geladen.'
    }

    // Ask for confirmation before logout if there are unsaved changes.
    function requestLogout() {
      if (store.hasAnyChanges) {
        logoutConfirmOpen.value = true
        return
      }
      logout()
    }

    // Generate a PDF of the current change log for printing or archiving.
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

    // Open the export confirmation dialog if there are changes to save.
    function requestExport() {
      if (!store.hasAnyChanges) {
        status.value = 'Es sind keine Änderungen zum Export vorhanden.'
        return
      }

      exportConfirmOpen.value = true
    }

    // Export the current changes either back to the server or as a local gzipped file.
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
          lastSavedAt.value = new Date()
          status.value = 'Änderungen wurden an den SVWS-Server übertragen.'
          return
        }

        if (store.dataSource === 'file') {
          const blob = await store.createPatchedExportGzip()
          if (blob.size === 0) {
            throw new Error('Die erzeugte Exportdatei ist leer.')
          }
          const file = new File([blob], 'enm.changed.json.gz', { type: 'application/gzip' })
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
          store.applyPatchedChangesLocally()
          lastSavedAt.value = new Date()
          status.value = `Geänderte enm.changed.json.gz wurde zum Download bereitgestellt (${blob.size} Bytes).`
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

      if (klasse?.schueler.length && !klasse.schueler.some(entry => entry.schueler.id === selectedSchuelerId.value)) {
        selectedSchuelerId.value = klasse.schueler[0].schueler.id
      }

      // Derive helper data for the current conference view from the store and component state.
      const {
        selectedKlasse,
        notenOptions,
        getNoteDisplay,
        selectedSchueler,
        selectedSchuelerIndex,
        lerngruppenIdsByFachId,
        avg,
        gradedCount,
        relevantSubjectCount,
        fehlstundenGesamt,
        fehlstundenUnentschuldigt,
        lernbereichsnoten,
        lupeSubjects,
        timerLabel,
        showTimerChip,
        lupeTableMinWidth,
      } = buildConferenceDerivedData({
        store,
        klasse,
        selectedKlasseId: store.selectedKlasseId,
        selectedSchuelerId: selectedSchuelerId.value,
        notenAnzeigeMode: notenAnzeigeMode.value,
        noteCycleMode: noteCycleMode.value,
        lupeFehlstundenMode: lupeFehlstundenMode.value,
        lupeColumnWidths: lupeColumnWidths.value,
        timerRunning: timerRunning.value,
        timerRemainingSeconds: timerRemainingSeconds.value,
        timerTotalSeconds: timerTotalSeconds.value,
        timerFinishedFlash: timerFinishedFlash.value,
        lupeTone,
        numericGrade,
        readLerngruppeId,
        formatTimer,
      })

      const lupeCards = selectedSchueler
        ? createLupeCardsVNodes({
          selectedSchuelerId: selectedSchueler.schueler.id,
          lupeSubjects,
          notenOptions,
          getNoteDisplay,
          onUpdateNote: (schuelerId: number, lgId: number, note: Notenkuerzel | null) => {
            store.updateNote(schuelerId, lgId, note)
          },
        })
        : []

      const selectedKlasseLabel = (selectedKlasse as any)?.kuerzelAnzeige ?? (selectedKlasse as any)?.kuerzel ?? '–'

      const {
        allChanges,
        exportTargetLabel,
        printableLogLines,
      } = buildChangeLogData(store)

      const savedIndicatorText = getSavedIndicatorText()

      // The root render function returns either the start screen or the conference UI.
      return h('main', {
        class: inConference
          ? `app-shell conference-shell ${tableScale.value === 'gross' ? 'conference-shell-large' : ''}`
          : 'app-shell',
      }, [
        !inConference
          ? h(StartScreenSection, {
            loading: store.loading,
            serverUrl: serverUrl.value,
            serverSchema: serverSchema.value,
            username: username.value,
            password: password.value,
            trustSelfSigned: trustSelfSigned.value,
            onUpdateServerUrl: (value: string) => {
              serverUrl.value = value
              persistRuntimeConfig()
            },
            onUpdateServerSchema: (value: string) => {
              serverSchema.value = value
              persistRuntimeConfig()
            },
            onUpdateUsername: (value: string) => {
              username.value = value
              persistRuntimeConfig()
            },
            onUpdatePassword: (value: string) => {
              password.value = value
            },
            onUpdateTrustSelfSigned: (value: boolean) => {
              trustSelfSigned.value = value
              persistRuntimeConfig()
            },
            onConnectToServer: () => {
              void connectToServer()
            },
            onFileSelected: (event: Event) => {
              void onFileSelected(event)
            },
          })
          : null,

        inConference && klasse
          ? h('section', { class: tableScale.value === 'gross' ? 'conference-app conference-app-large' : 'conference-app' }, [
            h(ConferenceHeaderSection, {
              selectedKlasseId: store.selectedKlasseId,
              availableKlassen: store.availableKlassen,
              activeMode: activeMode.value,
              notenAnzeigeMode: notenAnzeigeMode.value,
              noteCycleMode: noteCycleMode.value,
              lupeOpen: lupeOpen.value,
              timerRunning: timerRunning.value,
              timerFinishedFlash: timerFinishedFlash.value,
              timerLabel,
              showTimerChip,
              tableScale: tableScale.value,
              totalChangeCount: store.totalChangeCount,
              loading: store.loading,
              selectedKlasseLabel,
              schuelerCount: klasse.schueler.length,
              faecherCount: klasse.faecher.length,
              schuljahrAbschnittLabel: `${store.schulInfo?.schuljahr ?? '–'} / Abschnitt ${store.schulInfo?.abschnitt ?? '–'}`,
              savedIndicatorText,
              onSelectKlasse: (nextId: number) => {
                store.selectKlasse(nextId)
              },
              onSetActiveMode: (mode: 'klasse' | 'lerngruppe') => {
                activeMode.value = mode
              },
              onSetNotenAnzeigeMode: (mode: 'noten' | 'punkte') => {
                notenAnzeigeMode.value = mode
              },
              onSetNoteCycleMode: (mode: 'halbjahr' | 'quartal') => {
                noteCycleMode.value = mode
              },
              onToggleLupe: () => {
                lupeOpen.value = !lupeOpen.value
              },
              onOpenTimer: () => {
                timerModalOpen.value = true
              },
              onToggleTableScale: () => {
                tableScale.value = tableScale.value === 'kompakt' ? 'gross' : 'kompakt'
              },
              onOpenChanges: () => {
                changesModalOpen.value = true
              },
              onRequestLogout: requestLogout,
            }),
            h(KlasseTableSection, {
              activeMode: activeMode.value,
              klasse,
              selectedSchuelerId: selectedSchuelerId.value,
              lerngruppenIdsByFachId,
              editingCell: editingCell.value,
              notenOptions,
              getNoteDisplay,
              getNote: (schuelerId: number, lgId: number) => {
                if (noteCycleMode.value === 'quartal') {
                  return store.getNoteQuartal(schuelerId, lgId)
                }
                return store.getNote(schuelerId, lgId)
              },
              isNoteChanged: (schuelerId: number, lgId: number) => {
                if (noteCycleMode.value === 'quartal') {
                  return store.isNoteQuartalChanged(schuelerId, lgId)
                }
                return store.isNoteChanged(schuelerId, lgId)
              },
              gradeClass,
              noteCycleMode: noteCycleMode.value,
              onSelectSchueler: (schuelerId: number) => {
                selectSchueler(schuelerId)
              },
              onStartEditingCell: (schuelerId: number, lgId: number) => {
                startEditingCell(schuelerId, lgId)
              },
              onSaveNote: (schuelerId: number, lgId: number, value: string) => {
                saveNote(schuelerId, lgId, value)
              },
              onCancelEditing: () => {
                editingCell.value = null
              },
            }),
            h(LupeModalSection, {
              open: lupeOpen.value,
              store,
              klasse,
              selectedSchueler,
              selectedSchuelerIndex,
              selectedKlasseLabel,
              lupeViewMode: lupeViewMode.value,
              lupeFehlstundenMode: lupeFehlstundenMode.value,
              notenAnzeigeMode: notenAnzeigeMode.value,
              noteCycleMode: noteCycleMode.value,
              lupeTableDetailMode: lupeTableDetailMode.value,
              lupeRemarksCollapsed: lupeRemarksCollapsed.value,
              avg,
              gradedCount,
              relevantSubjectCount,
              fehlstundenGesamt,
              fehlstundenUnentschuldigt,
              lernbereichsnoten,
              lupeSubjects,
              lupeCards,
              lupeTableMinWidth,
              lupeColumnWidths: lupeColumnWidths.value,
              notenOptions,
              getNoteDisplay,
              timerRunning: timerRunning.value,
              timerFinishedFlash: timerFinishedFlash.value,
              timerLabel,
              showTimerChip,
              onClose: () => {
                lupeOpen.value = false
              },
              onOpenTimer: () => {
                timerModalOpen.value = true
              },
              onNavigateSchueler: (direction: -1 | 1) => {
                navigateSchueler(direction)
              },
              onSetLupeViewMode: (mode: 'kachel' | 'tabelle') => {
                lupeViewMode.value = mode
              },
              onSetLupeFehlstundenMode: (mode: 'gesamt' | 'fach') => {
                lupeFehlstundenMode.value = mode
              },
              onSetNotenAnzeigeMode: (mode: 'noten' | 'punkte') => {
                notenAnzeigeMode.value = mode
              },
              onSetNoteCycleMode: (mode: 'halbjahr' | 'quartal') => {
                noteCycleMode.value = mode
              },
              onSetLupeTableDetailMode: (mode: 'bemerkungen' | 'teilleistungen') => {
                lupeTableDetailMode.value = mode
              },
              onToggleLupeRemarksCollapsed: () => {
                lupeRemarksCollapsed.value = !lupeRemarksCollapsed.value
              },
              onStartLupeColumnResize: (column: LupeColumnKey, event: MouseEvent) => {
                startLupeColumnResize(column, event)
              },
            }),
            h(AppDialogsSection, {
              timerModalOpen: timerModalOpen.value,
              changesModalOpen: changesModalOpen.value,
              exportConfirmOpen: exportConfirmOpen.value,
              logoutConfirmOpen: logoutConfirmOpen.value,
              timerRunning: timerRunning.value,
              timerFinishedFlash: timerFinishedFlash.value,
              timerLabel,
              timerPresets,
              timerTotalSeconds: timerTotalSeconds.value,
              timerRemainingSeconds: timerRemainingSeconds.value,
              timerSoundMuted: timerSoundMuted.value,
              timerRepeatEnabled: timerRepeatEnabled.value,
              allChanges,
              printableLogLines,
              exportRunning: exportRunning.value,
              exportTargetLabel,
              store,
              onCloseTimer: () => {
                timerModalOpen.value = false
              },
              onSetTimerPreset: (seconds: number) => {
                setTimerPreset(seconds)
              },
              onToggleTimerSound: () => {
                timerSoundMuted.value = !timerSoundMuted.value
              },
              onToggleTimerRepeat: () => {
                timerRepeatEnabled.value = !timerRepeatEnabled.value
              },
              onResetTimer: resetTimer,
              onToggleTimer: toggleTimer,
              onCloseChanges: () => {
                changesModalOpen.value = false
              },
              onPrintChangeLog: (lines: string[]) => {
                printChangeLog(lines)
              },
              onRequestExport: requestExport,
              onCloseExportConfirm: () => {
                exportConfirmOpen.value = false
              },
              onExportChanges: () => {
                void exportChanges()
              },
              onCloseLogoutConfirm: () => {
                logoutConfirmOpen.value = false
              },
              onLogout: logout,
            }),
          ])
          : null,

        h('p', { class: 'status-line', role: 'status' }, status.value),
      ])
    }
  },
})


export default App
</script>
