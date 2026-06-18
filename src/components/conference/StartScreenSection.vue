<script lang="ts">
import { defineComponent, h, ref } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useTheme } from '../../composables/useTheme'
import datenschutzRawMd from '../../../docs/datenschutz.md?raw'

export default defineComponent({
  name: 'StartScreenSection',
  props: {
    loading: { type: Boolean, required: true },
    serverUrl: { type: String, required: true },
    serverSchema: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    trustSelfSigned: { type: Boolean, required: true },
  },
  emits: [
    'updateServerUrl',
    'updateServerSchema',
    'updateUsername',
    'updatePassword',
    'updateTrustSelfSigned',
    'connectToServer',
    'fileSelected',
  ],
  setup(props, { emit }) {
    const { preference, setTheme } = useTheme()

    function sunIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: '24', height: '24', fill: 'none', 'aria-hidden': 'true' }, [
        h('circle', { cx: '8', cy: '8', r: '3', stroke: 'currentColor', 'stroke-width': '1.5' }),
        h('path', { d: 'M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.42 1.42M11.18 11.18l1.42 1.42M12.6 3.4l-1.42 1.42M4.82 11.18l-1.42 1.42', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
      ])
    }

    function monitorIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: '24', height: '24', fill: 'none', 'aria-hidden': 'true' }, [
        h('rect', { x: '1', y: '2', width: '14', height: '10', rx: '1.5', stroke: 'currentColor', 'stroke-width': '1.5' }),
        h('path', { d: 'M5.5 14.5h5M8 12v2.5', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
      ])
    }

    function moonIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: '24', height: '24', fill: 'none', 'aria-hidden': 'true' }, [
        h('path', { d: 'M12.5 10A6 6 0 0 1 6 3.5a6 6 0 1 0 6.5 6.5Z', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      ])
    }

    type ImpressumWindow = Window & { __IMPRESSUM_MARKDOWN__?: string }

    const fileInput = ref<HTMLInputElement | null>(null)
    const impressumOpen = ref(false)
    const impressumLoading = ref(false)
    const impressumContent = ref('')
    const impressumHtml = ref('')
    const impressumError = ref('')

    const datenschutzOpen = ref(false)
    const datenschutzHtml = DOMPurify.sanitize(marked.parse(datenschutzRawMd, { async: false }))

    async function loadImpressumScript() {
      const existing = (window as ImpressumWindow).__IMPRESSUM_MARKDOWN__
      if (existing != null) {
        return existing
      }

      await new Promise<void>((resolve, reject) => {
        function loadScript(src: string, onError: () => void) {
          const script = document.createElement('script')
          script.src = src
          script.async = true
          script.onload = () => resolve()
          script.onerror = onError
          document.head.appendChild(script)
        }

        const primary = new URL('impressum.js', window.location.href).toString()
        const fallback = new URL('impressum.example.js', window.location.href).toString()

        loadScript(primary, () => {
          loadScript(fallback, () => {
            reject(new Error(
              'Weder "impressum.js" noch "impressum.example.js" wurden gefunden. ' +
              'Bitte benennen Sie "impressum.example.js" in "impressum.js" um und tragen Sie dort Ihre Schuldaten ein.'
            ))
          })
        })
      })

      const loaded = (window as ImpressumWindow).__IMPRESSUM_MARKDOWN__
      if (loaded == null) {
        throw new Error('Die Datei "impressum.js" enthält keinen Impressumstext.')
      }

      return loaded
    }

    async function openImpressumModal() {
      impressumOpen.value = true
      if (impressumLoading.value || impressumContent.value) {
        return
      }

      impressumLoading.value = true
      impressumError.value = ''

      try {
        if (import.meta.env.DEV) {
          const targetUrl = new URL('impressum.md', window.location.href).toString()
          const response = await fetch(targetUrl, { cache: 'no-store' })
          if (!response.ok) {
            throw new Error(`Datei konnte nicht geladen werden (${response.status}).`)
          }
          impressumContent.value = await response.text()
        } else {
          impressumContent.value = await loadImpressumScript()
        }
        const rawHtml = marked.parse(impressumContent.value, { async: false })
        impressumHtml.value = DOMPurify.sanitize(rawHtml)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
        impressumError.value = `Impressum konnte nicht geladen werden: ${message}`
      } finally {
        impressumLoading.value = false
      }
    }

    function closeImpressumModal() {
      impressumOpen.value = false
    }

    return () => [
      h('div', { class: 'start-topbar' }, [
        h('div', { class: 'theme-tabs theme-tabs-start', role: 'group', 'aria-label': 'Farbschema wählen' }, [
          h('button', { class: preference.value === 'light' ? 'theme-tab active' : 'theme-tab', onClick: () => setTheme('light'), title: 'Helles Design', 'aria-label': 'Helles Design' }, sunIcon()),
          h('button', { class: preference.value === 'system' ? 'theme-tab active' : 'theme-tab', onClick: () => setTheme('system'), title: 'System-Design', 'aria-label': 'System-Design' }, monitorIcon()),
          h('button', { class: preference.value === 'dark' ? 'theme-tab active' : 'theme-tab', onClick: () => setTheme('dark'), title: 'Dunkles Design', 'aria-label': 'Dunkles Design' }, moonIcon()),
        ]),
      ]),
      h('section', { class: 'hero' }, [
        h('p', { class: 'hero-kicker' }, 'Startbildschirm'),
        h('h1', [
          'SVWS Konferenzübersicht',
          h('span', { class: 'hero-version' }, `v${__APP_VERSION__}`),
        ]),
        h('p', { class: 'hero-text' }, 'Wähle eine Datenquelle, um die Notenkonferenz zu starten.'),
      ]),
      h('section', { class: 'tile-grid' }, [
        h('article', { class: 'tile tile-server' }, [
          h('h2', 'Verbindung zum SVWS-Server aufbauen'),
          h('div', { class: 'tile-fields' }, [
            h('input', {
              class: 'tile-input',
              type: 'url',
              placeholder: 'https://svws.schule.de',
              value: props.serverUrl,
              onInput: (event: Event) => emit('updateServerUrl', (event.target as HTMLInputElement).value),
            }),
            h('input', {
              class: 'tile-input',
              type: 'text',
              placeholder: 'Schema (z. B. svwsdb)',
              value: props.serverSchema,
              onInput: (event: Event) => emit('updateServerSchema', (event.target as HTMLInputElement).value),
            }),
            h('input', {
              class: 'tile-input',
              type: 'text',
              placeholder: 'Benutzername',
              value: props.username,
              autocomplete: 'username',
              onInput: (event: Event) => emit('updateUsername', (event.target as HTMLInputElement).value),
            }),
            h('input', {
              class: 'tile-input',
              type: 'password',
              placeholder: 'Passwort (wird nicht gespeichert)',
              value: props.password,
              autocomplete: 'current-password',
              onInput: (event: Event) => emit('updatePassword', (event.target as HTMLInputElement).value),
            }),
          ]),
          h('label', { class: 'tile-checkbox' }, [
            h('input', {
              type: 'checkbox',
              checked: props.trustSelfSigned,
              onChange: (event: Event) => emit('updateTrustSelfSigned', (event.target as HTMLInputElement).checked),
            }),
            h('span', 'Zertifikat vertrauen (selbstsigniert)'),
          ]),
          h('button', {
            class: 'tile-button',
            onClick: () => emit('connectToServer'),
            disabled: props.loading,
          }, props.loading ? 'Verbinde...' : 'Server verbinden'),
        ]),
        h('article', { class: 'tile tile-upload' }, [
          h('h2', 'Upload der Notendatei'),
          h('p', 'Lade eine lokale Datei im Format enm.json.gz direkt in den Browser.'),
          h('input', {
            ref: fileInput,
            class: 'hidden-file-input',
            type: 'file',
            accept: '.gz,.json.gz,application/gzip',
            onChange: (event: Event) => emit('fileSelected', event),
          }),
          h('button', {
            class: 'tile-button',
            onClick: () => {
              fileInput.value?.click()
            },
            disabled: props.loading,
          }, 'Datei auswählen'),
        ]),
      ]),
      h('section', { class: 'impressum-section' }, [
        h('a', {
          class: 'impressum-link',
          href: 'https://doku.svws-nrw.de/svws_module/svws_konferenzuebersicht/',
          target: '_blank',
          rel: 'noopener noreferrer',
        }, 'Hilfe'),
        h('button', {
          class: 'impressum-link',
          type: 'button',
          onClick: () => { void openImpressumModal() },
        }, 'Impressum'),
        h('button', {
          class: 'impressum-link',
          type: 'button',
          onClick: () => { datenschutzOpen.value = true },
        }, 'Datenschutzhinweise'),
      ]),
      datenschutzOpen.value
        ? h('div', {
          class: 'impressum-modal-bg open',
          role: 'presentation',
          onClick: (event: MouseEvent) => {
            if (event.target === event.currentTarget) {
              datenschutzOpen.value = false
            }
          },
        }, [
          h('section', {
            class: 'impressum-modal datenschutz-modal',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'datenschutz-modal-title',
          }, [
            h('div', { class: 'impressum-modal-head' }, [
              h('h2', { id: 'datenschutz-modal-title', class: 'impressum-modal-title' }, 'Datenschutzhinweise'),
              h('button', {
                class: 'impressum-modal-close',
                type: 'button',
                onClick: () => { datenschutzOpen.value = false },
                'aria-label': 'Datenschutzhinweise schließen',
              }, 'Schließen'),
            ]),
            h('div', {
              class: 'impressum-modal-content',
              innerHTML: datenschutzHtml,
            }),
          ]),
        ])
        : null,
      impressumOpen.value
        ? h('div', {
          class: 'impressum-modal-bg open',
          role: 'presentation',
          onClick: (event: MouseEvent) => {
            if (event.target === event.currentTarget) {
              closeImpressumModal()
            }
          },
        }, [
          h('section', {
            class: 'impressum-modal',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'impressum-modal-title',
          }, [
            h('div', { class: 'impressum-modal-head' }, [
              h('h2', { id: 'impressum-modal-title', class: 'impressum-modal-title' }, 'Impressum'),
              h('button', {
                class: 'impressum-modal-close',
                type: 'button',
                onClick: () => closeImpressumModal(),
                'aria-label': 'Impressum schließen',
              }, 'Schließen'),
            ]),
            impressumLoading.value
              ? h('p', { class: 'impressum-modal-status' }, 'Impressum wird geladen...')
              : impressumError.value
                ? h('p', { class: 'impressum-modal-error' }, impressumError.value)
                : h('div', {
                  class: 'impressum-modal-content',
                  innerHTML: impressumHtml.value,
                }),
          ]),
        ])
        : null,
    ]
  },
})
</script>
