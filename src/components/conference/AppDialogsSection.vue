<script lang="ts">
import { defineComponent, h, ref, watch } from 'vue'
import type { PropType } from 'vue'

export default defineComponent({
  name: 'AppDialogsSection',
  props: {
    timerModalOpen: { type: Boolean, required: true },
    changesModalOpen: { type: Boolean, required: true },
    exportConfirmOpen: { type: Boolean, required: true },
    logoutConfirmOpen: { type: Boolean, required: true },
    timerRunning: { type: Boolean, required: true },
    timerFinishedFlash: { type: Boolean, required: true },
    timerLabel: { type: String, required: true },
    timerPresets: { type: Array as PropType<number[]>, required: true },
    timerTotalSeconds: { type: Number, required: true },
    timerRemainingSeconds: { type: Number, required: true },
    timerSoundMuted: { type: Boolean, required: true },
    timerRepeatEnabled: { type: Boolean, required: true },
    allChanges: { type: Array as PropType<Array<Record<string, string>>>, required: true },
    printableLogLines: { type: Array as PropType<string[]>, required: true },
    exportRunning: { type: Boolean, required: true },
    exportTargetLabel: { type: String, required: true },
    store: { type: Object as PropType<any>, required: true },
  },
  emits: [
    'closeTimer',
    'setTimerPreset',
    'toggleTimerSound',
    'toggleTimerRepeat',
    'resetTimer',
    'toggleTimer',
    'closeChanges',
    'printChangeLog',
    'requestExport',
    'closeExportConfirm',
    'exportChanges',
    'closeLogoutConfirm',
    'logout',
  ],
  setup(props, { emit }) {
    const customMinutes = ref(Math.max(1, Math.floor(props.timerTotalSeconds / 60)))

    watch(
      () => props.timerTotalSeconds,
      (seconds) => {
        customMinutes.value = Math.max(1, Math.floor(seconds / 60))
      }
    )

    function applyCustomMinutes() {
      const minutes = Number.isFinite(customMinutes.value)
        ? Math.max(1, Math.min(999, Math.floor(customMinutes.value)))
        : 1
      customMinutes.value = minutes
      emit('setTimerPreset', minutes * 60)
    }

    return () => [
      props.timerModalOpen
        ? h('div', {
          class: 'timer-modal-bg open',
          onClick: (event: MouseEvent) => {
            if (event.target === event.currentTarget) emit('closeTimer')
          },
        }, [
          h('section', { class: 'timer-modal' }, [
            h('button', { class: 'timer-modal-close', onClick: () => emit('closeTimer') }, '×'),
            h('div', { class: 'timer-modal-label' }, 'Konferenztimer'),
            h('div', { class: `timer-big ${props.timerRunning ? 'running' : ''} ${props.timerFinishedFlash ? 'done' : ''}`.trim() }, props.timerLabel),
            h('div', { class: 'timer-presets' }, props.timerPresets.map(seconds =>
              h('button', {
                class: `timer-preset ${props.timerTotalSeconds === seconds ? 'active' : ''}`.trim(),
                onClick: () => emit('setTimerPreset', seconds),
              }, `${Math.floor(seconds / 60)} min`)
            )),
            h('div', { class: 'timer-custom' }, [
              h('input', {
                class: 'timer-custom-input',
                type: 'number',
                min: 1,
                max: 999,
                step: 1,
                value: customMinutes.value,
                onInput: (event: Event) => {
                  const value = Number.parseInt((event.target as HTMLInputElement).value, 10)
                  customMinutes.value = Number.isFinite(value) ? value : 1
                },
                onKeydown: (event: KeyboardEvent) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    applyCustomMinutes()
                  }
                },
              }),
              h('span', { class: 'timer-custom-unit' }, 'min'),
              h('button', { class: 'timer-preset', onClick: applyCustomMinutes }, 'Setzen'),
            ]),
            h('div', { class: 'timer-options' }, [
              h('button', { class: `timer-option ${props.timerSoundMuted ? 'active' : ''}`.trim(), onClick: () => emit('toggleTimerSound') }, props.timerSoundMuted ? 'Ton: aus' : 'Ton: an'),
              h('button', { class: `timer-option ${props.timerRepeatEnabled ? 'active' : ''}`.trim(), onClick: () => emit('toggleTimerRepeat') }, props.timerRepeatEnabled ? 'Repeat: an' : 'Repeat: aus'),
            ]),
            h('div', { class: 'timer-modal-btns' }, [
              h('button', { class: 'timer-btn', onClick: () => emit('resetTimer') }, 'Zurücksetzen'),
              h('button', { class: `timer-btn primary ${props.timerRunning ? 'stop' : ''}`.trim(), onClick: () => emit('toggleTimer') }, props.timerRunning ? 'Pause' : (props.timerRemainingSeconds < props.timerTotalSeconds ? 'Weiter' : 'Starten')),
            ]),
          ]),
        ])
        : null,
      props.changesModalOpen
        ? h('div', {
          class: 'changes-modal-bg open',
          onClick: (event: MouseEvent) => {
            if (event.target === event.currentTarget) emit('closeChanges')
          },
        }, [
          h('section', { class: 'changes-modal' }, [
            h('button', { class: 'timer-modal-close', onClick: () => emit('closeChanges') }, '×'),
            h('h3', { class: 'changes-modal-title' }, `Änderungen (${props.allChanges.length})`),
            props.allChanges.length
              ? h('div', { class: 'changes-list-wrap' }, [
                h('table', { class: 'changes-table' }, [
                  h('thead', [h('tr', [h('th', 'Typ'), h('th', 'Schueler'), h('th', 'Feld'), h('th', 'Alt'), h('th', 'Neu')])]),
                  h('tbody', props.allChanges.map(item => h('tr', [h('td', item.typ), h('td', item.schuelerName), h('td', item.feld), h('td', item.alt), h('td', item.neu)]))),
                ]),
              ])
              : h('p', { class: 'changes-empty' }, 'Noch keine Änderungen vorhanden.'),
            h('div', { class: 'changes-modal-actions' }, [
              h('button', { class: 'icon-btn', onClick: () => emit('printChangeLog', props.printableLogLines), disabled: props.allChanges.length === 0 }, 'Log drucken'),
              h('button', { class: 'icon-btn', onClick: () => emit('requestExport'), disabled: props.exportRunning }, props.exportRunning ? 'Exportiere...' : 'Export'),
              h('button', { class: 'icon-btn icon-btn-danger', onClick: () => props.store.clearAllChanges(), disabled: props.allChanges.length === 0 }, 'Änderungen verwerfen'),
              h('button', { class: 'icon-btn', onClick: () => emit('closeChanges') }, 'Schließen'),
            ]),
          ]),
        ])
        : null,
      props.exportConfirmOpen
        ? h('div', {
          class: 'export-modal-bg open',
          onClick: (event: MouseEvent) => {
            if (event.target === event.currentTarget) emit('closeExportConfirm')
          },
        }, [
          h('section', { class: 'export-modal' }, [
            h('button', { class: 'timer-modal-close', onClick: () => emit('closeExportConfirm') }, '×'),
            h('h3', { class: 'export-modal-title' }, 'Export bestätigen'),
            h('p', { class: 'export-modal-text' }, `Die Änderungen werden exportiert: ${props.exportTargetLabel}.`),
            h('p', { class: 'export-modal-text' }, 'Möchten Sie den Export jetzt wirklich starten?'),
            h('div', { class: 'export-modal-actions' }, [
              h('button', { class: 'icon-btn', onClick: () => emit('closeExportConfirm') }, 'Abbrechen'),
              h('button', { class: 'icon-btn', onClick: () => emit('exportChanges') }, 'Export starten'),
            ]),
          ]),
        ])
        : null,
      props.logoutConfirmOpen
        ? h('div', {
          class: 'logout-modal-bg open',
          onClick: (event: MouseEvent) => {
            if (event.target === event.currentTarget) emit('closeLogoutConfirm')
          },
        }, [
          h('section', { class: 'logout-modal' }, [
            h('button', { class: 'timer-modal-close', onClick: () => emit('closeLogoutConfirm') }, '×'),
            h('h3', { class: 'logout-modal-title' }, 'Änderungen vorhanden'),
            h('p', { class: 'logout-modal-text' }, 'Es gibt noch nicht gesicherte Änderungen. Möchten Sie sich wirklich abmelden und diese Änderungen verwerfen?'),
            h('div', { class: 'logout-modal-actions' }, [
              h('button', { class: 'icon-btn', onClick: () => emit('closeLogoutConfirm') }, 'Abbrechen'),
              h('button', { class: 'icon-btn icon-btn-logout', onClick: () => emit('logout') }, 'Trotzdem abmelden'),
            ]),
          ]),
        ])
        : null,
    ]
  },
})
</script>
