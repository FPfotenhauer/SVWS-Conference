import type { Notenkuerzel } from '../types/enm'

type LupeTone = (note: Notenkuerzel | null) => { frame: string, note: string, label: string, text: string }
type NumericGrade = (note: Notenkuerzel | null) => number | null
type ReadLerngruppeId = (entry: unknown) => number | null
type FormatTimer = (seconds: number) => string

export function buildConferenceDerivedData(params: {
  store: any
  klasse: any
  selectedKlasseId: number | null
  selectedSchuelerId: number | null
  notenAnzeigeMode: 'noten' | 'punkte'
  noteCycleMode: 'halbjahr' | 'quartal'
  lupeFehlstundenMode: 'gesamt' | 'fach'
  lupeColumnWidths: Record<'fach' | 'kursart' | 'lehrer' | 'fs' | 'fsu' | 'note', number>
  timerRunning: boolean
  timerRemainingSeconds: number
  timerTotalSeconds: number
  timerFinishedFlash: boolean
  lupeTone: LupeTone
  numericGrade: NumericGrade
  readLerngruppeId: ReadLerngruppeId
  formatTimer: FormatTimer
}) {
  const {
    store,
    klasse,
    selectedKlasseId,
    selectedSchuelerId,
    notenAnzeigeMode,
    noteCycleMode,
    lupeFehlstundenMode,
    lupeColumnWidths,
    timerRunning,
    timerRemainingSeconds,
    timerTotalSeconds,
    timerFinishedFlash,
    lupeTone,
    numericGrade,
    readLerngruppeId,
    formatTimer,
  } = params

  const klasseById = new Map(store.availableKlassen.map((item: any) => [item.id, item]))
  const selectedKlasse = selectedKlasseId !== null ? klasseById.get(selectedKlasseId) : null

  const notenOptions = (store.enmExport?.noten ?? [])
    .slice()
    .sort((a: any, b: any) => b.notenpunkte - a.notenpunkte)

  const notenpunkteByKuerzel = new Map<Notenkuerzel, number>(
    notenOptions.map((item: any) => [item.kuerzel, item.notenpunkte])
  )

  const getNoteDisplay = (note: Notenkuerzel | null): string => {
    if (!note) return '–'
    if (notenAnzeigeMode === 'punkte') {
      const points = notenpunkteByKuerzel.get(note)
      return typeof points === 'number' && Number.isFinite(points) ? String(points) : note
    }
    return note
  }

  const selectedSchueler = klasse?.schueler.find((entry: any) => entry.schueler.id === selectedSchuelerId) ?? null
  const selectedSchuelerIndex = klasse && selectedSchuelerId
    ? klasse.schueler.findIndex((entry: any) => entry.schueler.id === selectedSchuelerId)
    : -1

  const lerngruppenIdsByFachId = new Map<number, number[]>()
  if (klasse) {
    for (const lg of klasse.lerngruppen) {
      const ids = lerngruppenIdsByFachId.get(lg.fachID)
      if (ids) ids.push(lg.id)
      else lerngruppenIdsByFachId.set(lg.fachID, [lg.id])
    }
  }

  const selectedSchuelerLerngruppenByFachId = new Map<number, number>()
  if (selectedSchueler && klasse) {
    const schuelerLerngruppeIds = new Set<number>(
      selectedSchueler.schueler.leistungsdaten
        .map(readLerngruppeId)
        .filter((id: number | null): id is number => id !== null)
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
      if (numeric !== null) values.push(numeric)
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

  const lehrerKuerzelById = new Map<number, string>((store.enmExport?.lehrer ?? []).map((item: any) => [item.id, item.kuerzel]))
  const klasseLerngruppeById = new Map<number, any>((klasse?.lerngruppen ?? []).map((item: any) => [item.id, item]))

  const lupeSubjects = selectedSchueler && klasse
    ? klasse.faecher.flatMap((fach: any) => {
      const lgId = selectedSchuelerLerngruppenByFachId.get(fach.id)
      if (!lgId) return []

      const note = noteCycleMode === 'quartal'
        ? store.getOriginalNoteQuartal(selectedSchueler.schueler.id, lgId)
        : store.getNote(selectedSchueler.schueler.id, lgId)
      if (note === 'NE') return []

      const tone = lupeTone(note)
      const lerngruppe = klasseLerngruppeById.get(lgId)
      const lehrerKuerzel = lerngruppe
        ? (lerngruppe.lehrerID ?? lerngruppe.idsLehrer ?? [])
          .map((id: number) => lehrerKuerzelById.get(id))
          .filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
        : []
      const fachKuerzel = fach.kuerzelAnzeige || fach.kuerzel

      const leistung = selectedSchueler.schueler.leistungsdaten.find((ld: any) => ld.lerngruppenID === lgId)
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
        teilleistungen: leistung?.teilleistungen ?? [],
      }]
    })
    : []

  const timerLabel = formatTimer(timerRemainingSeconds)
  const showTimerChip = timerRunning || timerRemainingSeconds !== timerTotalSeconds || timerFinishedFlash

  const lupeTableMinWidth = lupeColumnWidths.fach
    + lupeColumnWidths.kursart
    + lupeColumnWidths.lehrer
    + (lupeFehlstundenMode === 'fach' ? lupeColumnWidths.fs + lupeColumnWidths.fsu : 0)
    + lupeColumnWidths.note
    + 260

  return {
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
    lupeSubjects,
    timerLabel,
    showTimerChip,
    lupeTableMinWidth,
  }
}
