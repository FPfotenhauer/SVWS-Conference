<script lang="ts">
import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import { useTheme } from '../../composables/useTheme'

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
    noteCycleMode: { type: String as PropType<'halbjahr' | 'quartal'>, required: true },
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
    'setNoteCycleMode',
    'toggleLupe',
    'openTimer',
    'toggleTableScale',
    'openChanges',
    'requestLogout',
  ],
  setup(props, { emit }) {
    const { preference, setTheme } = useTheme()

    const themeOrder = ['system', 'light', 'dark'] as const

    function cycleTheme() {
      const next = themeOrder[(themeOrder.indexOf(preference.value) + 1) % themeOrder.length]
      setTheme(next)
    }

    const themeIcon = () => {
      if (preference.value === 'light') {
        return h('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: 'none', 'aria-hidden': 'true' }, [
          h('circle', { cx: '8', cy: '8', r: '3', stroke: 'currentColor', 'stroke-width': '1.5' }),
          h('path', { d: 'M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.42 1.42M11.18 11.18l1.42 1.42M12.6 3.4l-1.42 1.42M4.82 11.18l-1.42 1.42', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
        ])
      }
      if (preference.value === 'dark') {
        return h('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: 'none', 'aria-hidden': 'true' }, [
          h('path', { d: 'M12.5 10A6 6 0 0 1 6 3.5a6 6 0 1 0 6.5 6.5Z', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        ])
      }
      return h('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: 'none', 'aria-hidden': 'true' }, [
        h('rect', { x: '1', y: '2', width: '14', height: '10', rx: '1.5', stroke: 'currentColor', 'stroke-width': '1.5' }),
        h('path', { d: 'M5.5 14.5h5M8 12v2.5', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
      ])
    }

    const themeTitle = () => ({ system: 'System-Theme', light: 'Hell', dark: 'Dunkel' }[preference.value])

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
        h('div', { class: 'mode-tabs' }, [
          h('button', {
            class: props.noteCycleMode === 'halbjahr' ? 'mode-tab active' : 'mode-tab',
            onClick: () => emit('setNoteCycleMode', 'halbjahr'),
          }, 'Halbjahr'),
          h('button', {
            class: props.noteCycleMode === 'quartal' ? 'mode-tab active' : 'mode-tab',
            onClick: () => emit('setNoteCycleMode', 'quartal'),
          }, 'Quartal'),
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
        h('button', { class: 'theme-btn', title: themeTitle(), 'aria-label': themeTitle(), onClick: cycleTheme }, themeIcon()),
        h('button', {
          class: 'icon-btn icon-btn-logout',
          onClick: () => emit('requestLogout'),
          disabled: props.loading,
        }, 'Logout'),
      ]),
      h('div', { class: 'infobar' }, [
        h('div', ['Klasse: ', h('b', props.selectedKlasseLabel)]),
        h('div', ['Schüler: ', h('b', String(props.schuelerCount))]),
        h('div', ['Fächer: ', h('b', String(props.faecherCount))]),
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
