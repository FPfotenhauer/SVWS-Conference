<script lang="ts">
import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import type { Notenkuerzel } from '../../types/enm'

type NotenOption = {
  kuerzel: Notenkuerzel
}

export default defineComponent({
  name: 'KlasseTableSection',
  props: {
    activeMode: { type: String as PropType<'klasse' | 'lerngruppe'>, required: true },
    klasse: { type: Object as PropType<any>, required: true },
    selectedSchuelerId: { type: Number as PropType<number | null>, required: true },
    lerngruppenIdsByFachId: { type: Object as PropType<Map<number, number[]>>, required: true },
    editingCell: { type: String as PropType<string | null>, required: true },
    notenOptions: { type: Array as PropType<NotenOption[]>, required: true },
    getNoteDisplay: { type: Function as PropType<(note: Notenkuerzel | null) => string>, required: true },
    getNote: { type: Function as PropType<(schuelerId: number, lgId: number) => Notenkuerzel | null>, required: true },
    isNoteChanged: { type: Function as PropType<(schuelerId: number, lgId: number) => boolean>, required: true },
    gradeClass: { type: Function as PropType<(note: Notenkuerzel | null) => string>, required: true },
    noteCycleMode: { type: String as PropType<'halbjahr' | 'quartal'>, required: true },
  },
  emits: ['selectSchueler', 'startEditingCell', 'saveNote', 'cancelEditing'],
  setup(props, { emit }) {
    return () => {
      if (props.activeMode !== 'klasse') {
        return h('div', { class: 'placeholder-panel' }, 'Lerngruppenansicht folgt als naechster Ausbauschritt.')
      }

      return h('div', { class: 'table-wrap', onClick: () => emit('cancelEditing') }, [
        h('table', [
          h('thead', [
            h('tr', [
              h('th', { class: 'col-nr' }, 'Nr.'),
              h('th', { class: 'col-name' }, 'Name'),
              ...props.klasse.faecher.map((fach: any) =>
                h('th', { class: 'col-fach' }, fach.kuerzelAnzeige || fach.kuerzel)
              ),
            ]),
          ]),
          h('tbody', props.klasse.schueler.map((entry: any, index: number) =>
            h('tr', {
              class: entry.schueler.id === props.selectedSchuelerId ? 'selected' : '',
              onClick: () => {
                emit('selectSchueler', entry.schueler.id)
              },
            }, [
              h('td', { class: 'col-nr' }, String(index + 1)),
              h('td', { class: 'col-name' }, `${entry.schueler.nachname}, ${entry.schueler.vorname}`),
              ...props.klasse.faecher.map((fach: any) => {
                const lgId = (props.lerngruppenIdsByFachId.get(fach.id) ?? [])
                  .find(id => entry.leistungenByLerngruppe.has(id))
                if (!lgId) {
                  return h('td', [h('span', { class: 'nl' }, '–')])
                }
                const note = props.getNote(entry.schueler.id, lgId)
                const isEditing = props.editingCell === `${entry.schueler.id}:${lgId}`

                if (isEditing) {
                  return h('td', { onClick: (event: Event) => event.stopPropagation() }, [
                    h('select', {
                      class: 'note-select',
                      value: note ?? '',
                      autofocus: true,
                      onClick: (event: Event) => event.stopPropagation(),
                      onBlur: () => {
                        emit('cancelEditing')
                      },
                      onChange: (event: Event) => {
                        emit('saveNote', entry.schueler.id, lgId, (event.target as HTMLSelectElement).value)
                      },
                    }, [
                      h('option', { value: '' }, '–'),
                      ...props.notenOptions.map(item => h('option', { value: item.kuerzel }, props.getNoteDisplay(item.kuerzel))),
                    ]),
                  ])
                }

                return h('td', {
                  class: props.isNoteChanged(entry.schueler.id, lgId) ? 'changed' : '',
                  onClick: (event: Event) => {
                    event.stopPropagation()
                    emit('startEditingCell', entry.schueler.id, lgId)
                  },
                }, [
                  h('span', { class: props.gradeClass(note) }, props.getNoteDisplay(note)),
                ])
              }),
            ])
          )),
        ]),
      ])
    }
  },
})
</script>
