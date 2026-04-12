<script lang="ts">
import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'

type KlasseItem = {
  id: number
  kuerzel?: string
  kuerzelAnzeige?: string
}

export default defineComponent({
  name: 'ConferenceHeaderSection',
  props: {
    selectedKlasseId: { type: Number as PropType<number | null>, required: true },
    availableKlassen: { type: Array as PropType<KlasseItem[]>, required: true },
    activeMode: { type: String as PropType<'klasse' | 'lerngruppe'>, required: true },
    notenAnzeigeMode: { type: String as PropType<'noten' | 'punkte'>, required: true },
    lupeOpen: { type: Boolean, required: true },
    timerRunning: { type: Boolean, required: true },
    timerFinishedFlash: { type: Boolean, required: true },
    timerLabel: { type: String, required: true },
    showTimerChip: { type: Boolean, required: true },
    tableScale: { type: String as PropType<'kompakt' | 'gross'>, required: true },
    totalChangeCount: { type: Number, required: true },
    loading: { type: Boolean, required: true },
    selectedKlasseLabel: { type: String, required: true },
    schuelerCount: { type: Number, required: true },
    faecherCount: { type: Number, required: true },
    schuljahrAbschnittLabel: { type: String, required: true },
    savedIndicatorText: { type: String as PropType<string | null>, required: true },
  },
  emits: [
    'selectKlasse',
    'setActiveMode',
    'setNotenAnzeigeMode',
    'toggleLupe',
    'openTimer',
    'toggleTableScale',
    'openChanges',
    'requestLogout',
  ],
  setup(props, { emit }) {
    return () => [
      h('header', { class: 'topbar' }, [
        h('span', { class: 'app-title' }, [
          'SVWS ',
          h('span', 'Konferenz'),
        ]),
        h('div', { class: 'sep' }),
        h('div', { class: 'field-group' }, [
          h('span', { class: 'field-label' }, 'Klasse'),
          h('select', {
            value: props.selectedKlasseId ?? '',
            onChange: (event: Event) => {
              const nextId = Number((event.target as HTMLSelectElement).value)
              emit('selectKlasse', nextId)
            },
          }, props.availableKlassen.map(item => h('option', { value: item.id }, item.kuerzelAnzeige || item.kuerzel))),
        ]),
        h('div', { class: 'sep' }),
        h('div', { class: 'mode-tabs' }, [
          h('button', {
            class: props.activeMode === 'klasse' ? 'mode-tab active' : 'mode-tab',
            onClick: () => emit('setActiveMode', 'klasse'),
          }, 'Klasse'),
          h('button', {
            class: props.activeMode === 'lerngruppe' ? 'mode-tab active' : 'mode-tab',
            onClick: () => emit('setActiveMode', 'lerngruppe'),
          }, 'Lerngruppe'),
        ]),
        h('div', { class: 'mode-tabs' }, [
          h('button', {
            class: props.notenAnzeigeMode === 'noten' ? 'mode-tab active' : 'mode-tab',
            onClick: () => emit('setNotenAnzeigeMode', 'noten'),
          }, 'Noten'),
          h('button', {
            class: props.notenAnzeigeMode === 'punkte' ? 'mode-tab active' : 'mode-tab',
            onClick: () => emit('setNotenAnzeigeMode', 'punkte'),
          }, 'Punkte'),
        ]),
        h('div', { class: 'spacer' }),
        h('button', {
          class: props.lupeOpen ? 'icon-btn active' : 'icon-btn',
          onClick: () => emit('toggleLupe'),
        }, 'Schülerlupe'),
        h('button', {
          class: `icon-btn ${props.timerRunning ? 'timer-on' : ''} ${props.timerFinishedFlash ? 'timer-finished' : ''}`.trim(),
          onClick: () => emit('openTimer'),
        }, props.timerRunning || props.showTimerChip ? `Timer ${props.timerLabel}` : 'Timer'),
        h('button', {
          class: 'icon-btn',
          onClick: () => emit('toggleTableScale'),
        }, `Ansicht: ${props.tableScale === 'kompakt' ? 'Kompakt' : 'Gross'}`),
        h('button', {
          class: 'icon-btn',
          onClick: () => emit('openChanges'),
        }, `Änderungen (${props.totalChangeCount})`),
        h('button', {
          class: 'icon-btn icon-btn-logout',
          onClick: () => emit('requestLogout'),
          disabled: props.loading,
        }, 'Logout'),
      ]),
      h('div', { class: 'infobar' }, [
        h('div', ['Klasse: ', h('b', props.selectedKlasseLabel)]),
        h('div', ['Schueler: ', h('b', String(props.schuelerCount))]),
        h('div', ['Faecher: ', h('b', String(props.faecherCount))]),
        h('div', [props.schuljahrAbschnittLabel]),
        props.savedIndicatorText
          ? h('div', { class: 'saved-chip' }, props.savedIndicatorText)
          : null,
        h('div', { class: `timer-chip ${props.showTimerChip ? 'visible' : ''} ${props.timerFinishedFlash ? 'done' : ''}`.trim() }, props.timerLabel),
      ]),
    ]
  },
})
</script>
