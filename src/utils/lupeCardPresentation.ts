import { h } from 'vue'
import type { Notenkuerzel, EnmNote } from '../types/enm'

type LupeSubject = {
  fachKuerzel: string
  fachName: string
  lgId: number
  lehrerText: string
  note: Notenkuerzel | null
  tone: {
    frame: string
    note: string
    label: string
    text: string
  }
}

export function createLupeCardsVNodes(params: {
  selectedSchuelerId: number
  lupeSubjects: LupeSubject[]
  notenOptions: EnmNote[]
  getNoteDisplay: (note: Notenkuerzel | null) => string
  onUpdateNote: (schuelerId: number, lgId: number, note: Notenkuerzel | null) => void
}): any[] {
  const {
    selectedSchuelerId,
    lupeSubjects,
    notenOptions,
    getNoteDisplay,
    onUpdateNote,
  } = params

  return lupeSubjects.map(subject => h('div', { class: `lupe-fach ${subject.tone.frame}` }, [
    h('div', { class: 'lupe-fach-k' }, subject.fachKuerzel),
    h('div', { class: 'lupe-fach-fn' }, subject.fachName),
    h('select', {
      class: `lupe-fach-note-select ${subject.tone.note}`,
      value: subject.note ?? '',
      onChange: (event: Event) => {
        const newNote = (event.target as HTMLSelectElement).value as Notenkuerzel | ''
        onUpdateNote(selectedSchuelerId, subject.lgId, newNote || null)
      },
    }, [
      h('option', { value: '' }, '–'),
      ...notenOptions.map((item: EnmNote) => h('option', { value: item.kuerzel }, getNoteDisplay(item.kuerzel))),
    ]),
    h('div', { class: `lupe-fach-label ${subject.tone.label}` }, subject.tone.text),
    h('div', { class: 'lupe-fach-lehrer' }, subject.lehrerText),
  ]))
}
