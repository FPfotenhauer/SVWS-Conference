<script lang="ts">
import { defineComponent, h, ref } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useTheme } from '../../composables/useTheme'

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
    'configFileSelected',
    'fileSelected',
  ],
  setup(props, { emit }) {
    const { preference, setTheme } = useTheme()

    function sunIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: 'none', 'aria-hidden': 'true' }, [
        h('circle', { cx: '8', cy: '8', r: '3', stroke: 'currentColor', 'stroke-width': '1.5' }),
        h('path', { d: 'M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.42 1.42M11.18 11.18l1.42 1.42M12.6 3.4l-1.42 1.42M4.82 11.18l-1.42 1.42', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
      ])
    }

    function monitorIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: 'none', 'aria-hidden': 'true' }, [
        h('rect', { x: '1', y: '2', width: '14', height: '10', rx: '1.5', stroke: 'currentColor', 'stroke-width': '1.5' }),
        h('path', { d: 'M5.5 14.5h5M8 12v2.5', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
      ])
    }

    function moonIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: '14', height: '14', fill: 'none', 'aria-hidden': 'true' }, [
        h('path', { d: 'M12.5 10A6 6 0 0 1 6 3.5a6 6 0 1 0 6.5 6.5Z', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      ])
    }

    type ImpressumWindow = Window & { __IMPRESSUM_MARKDOWN__?: string }

    const fileInput = ref<HTMLInputElement | null>(null)
    const configInput = ref<HTMLInputElement | null>(null)
    const impressumOpen = ref(false)
    const impressumLoading = ref(false)
    const impressumContent = ref('')
    const impressumHtml = ref('')
    const impressumError = ref('')

    async function loadImpressumScript() {
      const existing = (window as ImpressumWindow).__IMPRESSUM_MARKDOWN__
      if (existing != null) {
        return existing
      }

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = new URL('impressum.js', window.location.href).toString()
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => {
          reject(
            new Error(
              'Die Datei "impressum.js" wurde nicht gefunden. ' +
              'Bitte benennen Sie "impressum.example.js" in "impressum.js" um und tragen Sie dort Ihre Schuldaten ein.'
            )
          )
        }
        document.head.appendChild(script)
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
          h('div', { class: 'tile-icon' }, [cloudIcon()]),
          h('h2', 'Verbindung zum SVWS-Server aufbauen'),
          h('p', 'Direkter Abruf des ENM-Exports per API mit URL, Schema und BasicAuth.'),
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
          h('input', {
            ref: configInput,
            class: 'hidden-file-input',
            type: 'file',
            accept: '.env,.txt,text/plain',
            onChange: (event: Event) => emit('configFileSelected', event),
          }),
          h('button', {
            class: 'tile-button tile-button-secondary',
            onClick: () => {
              configInput.value?.click()
            },
            disabled: props.loading,
          }, 'Konfiguration laden (.env)'),
          h('button', {
            class: 'tile-button',
            onClick: () => emit('connectToServer'),
            disabled: props.loading,
          }, props.loading ? 'Verbinde...' : 'Server verbinden'),
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
        h('button', {
          class: 'impressum-link',
          type: 'button',
          onClick: () => { void openImpressumModal() },
        }, 'Impressum'),
      ]),
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
