import { createApp, defineComponent, h, ref } from 'vue'
import { createPinia } from 'pinia'
import { useConferenceStore } from './stores/conferenceStore'
import './style.css'

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

const App = defineComponent({
  setup() {
    const store = useConferenceStore()
    const fileInput = ref<HTMLInputElement | null>(null)
    const serverUrl = ref('')
    const serverToken = ref('')
    const status = ref('Noch keine Daten geladen.')

    async function connectToServer() {
      if (!serverUrl.value.trim() || !serverToken.value.trim()) {
        status.value = 'Bitte Server-URL und Token angeben.'
        return
      }

      await store.loadFromUrl(serverUrl.value.trim(), serverToken.value.trim())
      status.value = store.error
        ? `Fehler: ${store.error}`
        : 'Verbindung erfolgreich. ENM-Daten wurden geladen.'
    }

    function triggerUpload() {
      fileInput.value?.click()
    }

    async function onFileSelected(event: Event) {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      await store.loadFromFile(file)
      status.value = store.error
        ? `Fehler: ${store.error}`
        : `Datei geladen: ${file.name}`

      target.value = ''
    }

    return () =>
      h('main', { class: 'app-shell' }, [
        h('section', { class: 'hero' }, [
          h('p', { class: 'hero-kicker' }, 'Startbildschirm'),
          h('h1', 'SVWS Konferenzübersicht'),
          h('p', { class: 'hero-text' }, 'Wähle eine Datenquelle, um die Notenkonferenz zu starten.'),
        ]),
        h('section', { class: 'tile-grid' }, [
          h('article', { class: 'tile tile-server' }, [
            h('div', { class: 'tile-icon' }, [cloudIcon()]),
            h('h2', 'Verbindung zum SVWS-Server aufbauen'),
            h('p', 'Direkter Abruf des ENM-Exports per API mit URL und Token.'),
            h('div', { class: 'tile-fields' }, [
              h('input', {
                class: 'tile-input',
                type: 'url',
                placeholder: 'https://svws.schule.de',
                value: serverUrl.value,
                onInput: (event: Event) => {
                  serverUrl.value = (event.target as HTMLInputElement).value
                },
              }),
              h('input', {
                class: 'tile-input',
                type: 'password',
                placeholder: 'Bearer Token',
                value: serverToken.value,
                onInput: (event: Event) => {
                  serverToken.value = (event.target as HTMLInputElement).value
                },
              }),
            ]),
            h(
              'button',
              {
                class: 'tile-button',
                onClick: () => void connectToServer(),
                disabled: store.loading,
              },
              store.loading ? 'Verbinde...' : 'Server verbinden'
            ),
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
              onChange: (event: Event) => {
                void onFileSelected(event)
              },
            }),
            h(
              'button',
              {
                class: 'tile-button',
                onClick: triggerUpload,
                disabled: store.loading,
              },
              'Datei auswählen'
            ),
          ]),
        ]),
        h('p', { class: 'status-line', role: 'status' }, status.value),
      ])
  },
})

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
