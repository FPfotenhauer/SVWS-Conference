<script lang="ts">
import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import type { Notenkuerzel, EnmNote } from '../../types/enm'

export default defineComponent({
  name: 'LupeModalSection',
  props: {
    open: { type: Boolean, required: true },
    store: { type: Object as PropType<any>, required: true },
    klasse: { type: Object as PropType<any>, required: false, default: null },
    selectedSchueler: { type: Object as PropType<any>, required: false, default: null },
    selectedSchuelerIndex: { type: Number, required: true },
    selectedKlasseLabel: { type: String, required: true },
    lupeViewMode: { type: String as PropType<'kachel' | 'tabelle'>, required: true },
    lupeFehlstundenMode: { type: String as PropType<'gesamt' | 'fach'>, required: true },
    notenAnzeigeMode: { type: String as PropType<'noten' | 'punkte'>, required: true },
    noteCycleMode: { type: String as PropType<'halbjahr' | 'quartal'>, required: true },
    lupeRemarksCollapsed: { type: Boolean, required: true },
    avg: { type: String, required: true },
    gradedCount: { type: Number, required: true },
    relevantSubjectCount: { type: Number, required: true },
    fehlstundenGesamt: { type: Number as PropType<number | undefined>, required: false, default: undefined },
    fehlstundenUnentschuldigt: { type: Number as PropType<number | undefined>, required: false, default: undefined },
    lupeSubjects: { type: Array as PropType<any[]>, required: true },
    lupeCards: { type: Array as PropType<any[]>, required: true },
    lupeTableMinWidth: { type: Number, required: true },
    lupeColumnWidths: { type: Object as PropType<Record<string, number>>, required: true },
    notenOptions: { type: Array as PropType<EnmNote[]>, required: true },
    getNoteDisplay: { type: Function as PropType<(note: Notenkuerzel | null) => string>, required: true },
  },
  emits: [
    'close',
    'navigateSchueler',
    'setLupeViewMode',
    'setLupeFehlstundenMode',
    'setNotenAnzeigeMode',
    'setNoteCycleMode',
    'toggleLupeRemarksCollapsed',
    'startLupeColumnResize',
  ],
  setup(props, { emit }) {
    return () => props.open
      ? h('div', {
        class: 'lupe-modal-bg open',
        onClick: (event: MouseEvent) => {
          if (event.target === event.currentTarget) {
            emit('close')
          }
        },
      }, [
        h('section', { class: 'lupe-modal' }, [
          h('div', { class: 'lupe-header-bar' }, [
            h('div', { class: 'lupe-avatar' }, props.selectedSchueler ? `${props.selectedSchueler.schueler.vorname[0]}${props.selectedSchueler.schueler.nachname[0]}` : '–'),
            h('div', [
              h('div', { class: 'lupe-name' }, props.selectedSchueler ? `${props.selectedSchueler.schueler.nachname}, ${props.selectedSchueler.schueler.vorname}` : 'Kein Schueler gewaehlt'),
              h('div', { class: 'lupe-meta' }, props.klasse && props.selectedSchuelerIndex >= 0 ? `${props.selectedKlasseLabel} · Schueler ${props.selectedSchuelerIndex + 1} von ${props.klasse.schueler.length}` : ''),
            ]),
            h('div', { class: 'lupe-controls' }, [
              h('div', { class: 'lupe-view-toggle' }, [
                h('button', {
                  class: props.lupeViewMode === 'kachel' ? 'lupe-view-btn active' : 'lupe-view-btn',
                  onClick: () => emit('setLupeViewMode', 'kachel'),
                }, 'Kacheln'),
                h('button', {
                  class: props.lupeViewMode === 'tabelle' ? 'lupe-view-btn active' : 'lupe-view-btn',
                  onClick: () => emit('setLupeViewMode', 'tabelle'),
                }, 'Tabelle'),
              ]),
              h('div', { class: 'lupe-view-toggle' }, [
                h('button', {
                  class: props.lupeFehlstundenMode === 'gesamt' ? 'lupe-view-btn active' : 'lupe-view-btn',
                  onClick: () => emit('setLupeFehlstundenMode', 'gesamt'),
                }, 'FSG'),
                h('button', {
                  class: props.lupeFehlstundenMode === 'fach' ? 'lupe-view-btn active' : 'lupe-view-btn',
                  onClick: () => emit('setLupeFehlstundenMode', 'fach'),
                }, 'FSF'),
              ]),
              h('div', { class: 'lupe-view-toggle' }, [
                h('button', {
                  class: props.notenAnzeigeMode === 'noten' ? 'lupe-view-btn active' : 'lupe-view-btn',
                  onClick: () => emit('setNotenAnzeigeMode', 'noten'),
                }, 'Noten'),
                h('button', {
                  class: props.notenAnzeigeMode === 'punkte' ? 'lupe-view-btn active' : 'lupe-view-btn',
                  onClick: () => emit('setNotenAnzeigeMode', 'punkte'),
                }, 'Punkte'),
              ]),
              h('div', { class: 'lupe-view-toggle' }, [
                h('button', {
                  class: props.noteCycleMode === 'halbjahr' ? 'lupe-view-btn active' : 'lupe-view-btn',
                  onClick: () => emit('setNoteCycleMode', 'halbjahr'),
                }, 'Halbjahr'),
                h('button', {
                  class: props.noteCycleMode === 'quartal' ? 'lupe-view-btn active' : 'lupe-view-btn',
                  onClick: () => emit('setNoteCycleMode', 'quartal'),
                }, 'Quartal'),
              ]),
            ]),
            h('div', { class: 'lupe-nav' }, [
              h('button', {
                class: 'lupe-nav-btn',
                disabled: !props.klasse || props.selectedSchuelerIndex <= 0,
                onClick: () => emit('navigateSchueler', -1),
              }, '↑'),
              h('button', {
                class: 'lupe-nav-btn',
                disabled: !props.klasse || props.selectedSchuelerIndex < 0 || props.selectedSchuelerIndex >= props.klasse.schueler.length - 1,
                onClick: () => emit('navigateSchueler', 1),
              }, '↓'),
              h('button', {
                class: 'lupe-nav-btn lupe-close-btn',
                onClick: () => emit('close'),
              }, '×'),
            ]),
          ]),
          h('div', { class: 'lupe-stats-row' }, [
            h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Ø Note'), h('div', { class: 'lupe-stat-val' }, props.avg)]),
            h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Bewertet'), h('div', { class: 'lupe-stat-val' }, `${props.gradedCount} / ${props.relevantSubjectCount}`)]),
            props.selectedSchueler
              ? h('div', { class: 'lupe-stat-box lupe-stat-editable' }, [
                h('div', { class: 'lupe-stat-label' }, 'Fehlstunden gesamt'),
                h('input', {
                  type: 'number',
                  class: 'lupe-stat-input',
                  value: props.fehlstundenGesamt ?? 0,
                  min: '0',
                  onInput: (event: Event) => {
                    const value = Number((event.target as HTMLInputElement).value)
                    props.store.updateFehlstundenValue(props.selectedSchueler.schueler.id, 'fehlstundenGesamt', value)
                  },
                }),
              ])
              : h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Fehlstunden gesamt'), h('div', { class: 'lupe-stat-val' }, '–')]),
            props.selectedSchueler
              ? h('div', { class: 'lupe-stat-box lupe-stat-editable' }, [
                h('div', { class: 'lupe-stat-label' }, 'Fehlstunden unentsch.'),
                h('input', {
                  type: 'number',
                  class: 'lupe-stat-input',
                  value: props.fehlstundenUnentschuldigt ?? 0,
                  min: '0',
                  onInput: (event: Event) => {
                    const value = Number((event.target as HTMLInputElement).value)
                    props.store.updateFehlstundenValue(props.selectedSchueler.schueler.id, 'fehlstundenGesamtUnentschuldigt', value)
                  },
                }),
              ])
              : h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Fehlstunden unentsch.'), h('div', { class: 'lupe-stat-val' }, '–')]),
            h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Geaendert'), h('div', { class: 'lupe-stat-val' }, String(props.store.totalChangeCount))]),
          ]),
          h('div', { class: props.lupeViewMode === 'tabelle' ? 'lupe-grid-wrap lupe-grid-wrap-table' : 'lupe-grid-wrap' }, [
            props.lupeSubjects.length
              ? props.lupeViewMode === 'kachel'
                ? h('div', { class: 'lupe-grid' }, props.lupeCards)
                : h('div', { class: 'lupe-table-wrap' }, [
                  h('table', { class: 'lupe-table', style: { minWidth: `${props.lupeTableMinWidth}px` } }, [
                    h('thead', [
                      h('tr', [
                        h('th', { class: 'lupe-col-fach lupe-resizable-col', style: { width: `${props.lupeColumnWidths.fach}px` } }, [
                          h('span', { class: 'lupe-th-label' }, 'Fachkürzel'),
                          h('span', { class: 'lupe-col-resizer', onMousedown: (event: MouseEvent) => emit('startLupeColumnResize', 'fach', event) }),
                        ]),
                        h('th', { class: 'lupe-col-kursart lupe-resizable-col', style: { width: `${props.lupeColumnWidths.kursart}px` } }, [
                          h('span', { class: 'lupe-th-label' }, 'Kursart'),
                          h('span', { class: 'lupe-col-resizer', onMousedown: (event: MouseEvent) => emit('startLupeColumnResize', 'kursart', event) }),
                        ]),
                        h('th', { class: 'lupe-col-lehrer lupe-resizable-col', style: { width: `${props.lupeColumnWidths.lehrer}px` } }, [
                          h('span', { class: 'lupe-th-label' }, 'Lehrerkürzel'),
                          h('span', { class: 'lupe-col-resizer', onMousedown: (event: MouseEvent) => emit('startLupeColumnResize', 'lehrer', event) }),
                        ]),
                        ...(props.lupeFehlstundenMode === 'fach'
                          ? [
                            h('th', { class: 'lupe-col-fs lupe-resizable-col', style: { width: `${props.lupeColumnWidths.fs}px` } }, [
                              h('span', { class: 'lupe-th-label' }, 'FS'),
                              h('span', { class: 'lupe-col-resizer', onMousedown: (event: MouseEvent) => emit('startLupeColumnResize', 'fs', event) }),
                            ]),
                            h('th', { class: 'lupe-col-fsu lupe-resizable-col', style: { width: `${props.lupeColumnWidths.fsu}px` } }, [
                              h('span', { class: 'lupe-th-label' }, 'FSU'),
                              h('span', { class: 'lupe-col-resizer', onMousedown: (event: MouseEvent) => emit('startLupeColumnResize', 'fsu', event) }),
                            ]),
                          ]
                          : []),
                        h('th', { class: 'lupe-col-note lupe-resizable-col', style: { width: `${props.lupeColumnWidths.note}px` } }, [
                          h('span', { class: 'lupe-th-label' }, props.notenAnzeigeMode === 'punkte' ? 'Punkte' : 'Notenkürzel'),
                          h('span', { class: 'lupe-col-resizer', onMousedown: (event: MouseEvent) => emit('startLupeColumnResize', 'note', event) }),
                        ]),
                        h('th', { class: 'lupe-col-remark' }, 'Fachbezogene Bemerkungen'),
                      ]),
                    ]),
                    h('tbody', props.lupeSubjects.map(subject => h('tr', [
                      h('td', { class: 'lupe-table-fach lupe-col-fach', style: { width: `${props.lupeColumnWidths.fach}px` } }, subject.fachKuerzel),
                      h('td', { class: `${subject.kursart === 'LK' ? 'lupe-table-kursart is-lk' : 'lupe-table-kursart'} lupe-col-kursart`.trim(), style: { width: `${props.lupeColumnWidths.kursart}px` } }, subject.kursart),
                      h('td', { class: 'lupe-col-lehrer', style: { width: `${props.lupeColumnWidths.lehrer}px` } }, subject.lehrerText),
                      ...(props.lupeFehlstundenMode === 'fach'
                        ? [
                          h('td', { class: `lupe-col-fs lupe-table-number-cell ${props.selectedSchueler && props.store.isFachbezogeneFehlstundenChanged(props.selectedSchueler.schueler.id, subject.lgId, 'fehlstundenFach') ? 'changed' : ''}`.trim(), style: { width: `${props.lupeColumnWidths.fs}px` } }, [
                            h('input', {
                              type: 'number', min: '0', step: '1', inputmode: 'numeric', class: 'lupe-table-number-input', value: subject.fehlstundenFach,
                              onInput: (event: Event) => {
                                if (!props.selectedSchueler) return
                                const value = Number((event.target as HTMLInputElement).value)
                                props.store.updateFachbezogeneFehlstundenValue(props.selectedSchueler.schueler.id, subject.lgId, 'fehlstundenFach', value)
                              },
                            }),
                          ]),
                          h('td', { class: `lupe-col-fsu lupe-table-number-cell ${props.selectedSchueler && props.store.isFachbezogeneFehlstundenChanged(props.selectedSchueler.schueler.id, subject.lgId, 'fehlstundenUnentschuldigtFach') ? 'changed' : ''}`.trim(), style: { width: `${props.lupeColumnWidths.fsu}px` } }, [
                            h('input', {
                              type: 'number', min: '0', max: String(subject.fehlstundenFach), step: '1', inputmode: 'numeric', class: 'lupe-table-number-input', value: subject.fehlstundenUnentschuldigtFach,
                              onInput: (event: Event) => {
                                if (!props.selectedSchueler) return
                                const value = Number((event.target as HTMLInputElement).value)
                                props.store.updateFachbezogeneFehlstundenValue(props.selectedSchueler.schueler.id, subject.lgId, 'fehlstundenUnentschuldigtFach', value)
                              },
                            }),
                          ]),
                        ]
                        : []),
                      h('td', { class: `lupe-table-note-cell ${subject.tone.label} lupe-col-note`.trim(), style: { width: `${props.lupeColumnWidths.note}px` } }, [
                        h('select', {
                          class: `lupe-table-note-select ${subject.tone.note}`,
                          value: subject.note ?? '',
                          onChange: (event: Event) => {
                            if (!props.selectedSchueler) return
                            const newNote = (event.target as HTMLSelectElement).value as Notenkuerzel | ''
                            props.store.updateNote(props.selectedSchueler.schueler.id, subject.lgId, newNote || null)
                          },
                        }, [
                          h('option', { value: '' }, '–'),
                          ...props.notenOptions.map((n: EnmNote) => h('option', { value: n.kuerzel }, props.getNoteDisplay(n.kuerzel))),
                        ]),
                      ]),
                      h('td', { class: 'lupe-col-remark' }, [
                        h('input', {
                          type: 'text',
                          class: `lupe-table-remark-input ${props.selectedSchueler && props.store.isFachbezogeneBemerkungChanged(props.selectedSchueler.schueler.id, subject.lgId) ? 'changed' : ''}`.trim(),
                          value: subject.fachbezogeneBemerkung?.trim() ?? '',
                          placeholder: 'Keine fachbezogene Bemerkung',
                          onInput: (event: Event) => {
                            if (!props.selectedSchueler) return
                            const value = (event.target as HTMLInputElement).value.trim()
                            props.store.updateFachbezogeneBemerkungValue(props.selectedSchueler.schueler.id, subject.lgId, value || null)
                          },
                        }),
                      ]),
                    ]))),
                  ]),
                ])
              : h('p', { class: 'lupe-empty' }, 'Keine erteilten Faecher in der aktuellen Auswahl.'),
          ]),
          h('div', { class: `lupe-remarks-wrap ${props.lupeRemarksCollapsed ? 'collapsed' : ''}`.trim() }, [
            ...(props.selectedSchueler
              ? [
                { label: 'Arbeits- und Sozialverhalten', field: 'ASV' as const, value: props.store.getBemerkungenValue(props.selectedSchueler.schueler.id, 'ASV') },
                { label: 'Ausserunterrichtliches Engagement', field: 'AUE' as const, value: props.store.getBemerkungenValue(props.selectedSchueler.schueler.id, 'AUE') },
                { label: 'Zeugnisbemerkungen', field: 'ZB' as const, value: props.store.getBemerkungenValue(props.selectedSchueler.schueler.id, 'ZB') },
              ]
              : []
            ).map(card => h('article', { class: 'lupe-remark-card' }, [
              h('div', { class: 'lupe-remark-header' }, [
                h('h4', { class: 'lupe-remark-label' }, card.label),
                h('button', {
                  class: 'lupe-remark-collapse-btn',
                  title: props.lupeRemarksCollapsed ? 'Ausfahren' : 'Einfahren',
                  onClick: () => emit('toggleLupeRemarksCollapsed'),
                }, props.lupeRemarksCollapsed ? '▶' : '▼'),
              ]),
              h('textarea', {
                class: 'lupe-remark-textarea',
                value: card.value?.trim() ?? '',
                placeholder: '(Leer lassen für keine Bemerkung)',
                onInput: (event: Event) => {
                  if (!props.selectedSchueler) return
                  const value = (event.target as HTMLTextAreaElement).value.trim()
                  props.store.updateBemerkungenValue(props.selectedSchueler.schueler.id, card.field, value || null)
                },
              }),
            ])),
          ]),
        ]),
      ])
      : null
  },
})
</script>
