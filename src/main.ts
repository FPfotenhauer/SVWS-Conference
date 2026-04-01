import { createApp, defineComponent, h, ref } from 'vue'
import { createPinia } from 'pinia'
import { useConferenceStore } from './stores/conferenceStore'
import type { KonferenzSchueler, Notenkuerzel } from './types/enm'
import './style.css'

type SvwsDefaults = {
  host: string
  port: string
  schema: string
  user: string
  password: string
}

declare const __SVWS_DEFAULTS__: Partial<SvwsDefaults> | undefined

function readSvwsDefaults(): Partial<SvwsDefaults> {
  if (typeof __SVWS_DEFAULTS__ === 'undefined') {
    return {}
  }
  return __SVWS_DEFAULTS__
}

function buildDefaultBaseUrl(host: string, port: string): string {
  const trimmedHost = host.trim()
  const trimmedPort = port.trim()
  if (!trimmedHost) return ''

  if (/^https?:\/\//i.test(trimmedHost)) {
    return trimmedHost
  }

  return trimmedPort
    ? `https://${trimmedHost}:${trimmedPort}`
    : `https://${trimmedHost}`
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

function gradeClass(note: Notenkuerzel | null): string {
  if (!note) return 'badge ns'
  const numeric = Number.parseInt(note, 10)
  if (Number.isNaN(numeric)) return 'badge ns'
  return `badge n${Math.max(1, Math.min(6, numeric))}`
}

function numericGrade(note: Notenkuerzel | null): number | null {
  if (!note) return null
  const value = Number.parseInt(note, 10)
  if (Number.isNaN(value)) return null
  return value
}

function lupeTone(note: Notenkuerzel | null): { frame: string, note: string, label: string, text: string } {
  if (!note) {
    return { frame: '', note: 'nc-sonder', label: 'lc-none', text: 'nicht erteilt' }
  }
  const value = Number.parseInt(note, 10)
  if (Number.isNaN(value)) {
    return { frame: '', note: 'nc-sonder', label: 'lc-none', text: note }
  }
  if (value <= 2) return { frame: 'nf-gut', note: 'nc-gut', label: 'lc-gut', text: value === 1 ? 'sehr gut' : 'gut' }
  if (value <= 3) return { frame: 'nf-ok', note: 'nc-ok', label: 'lc-ok', text: 'befriedigend' }
  if (value <= 4) return { frame: 'nf-warn', note: 'nc-warn', label: 'lc-warn', text: 'ausreichend' }
  return { frame: 'nf-bad', note: 'nc-bad', label: 'lc-bad', text: value === 5 ? 'mangelhaft' : 'ungenuegend' }
}

const App = defineComponent({
  setup() {
    const store = useConferenceStore()
    const fileInput = ref<HTMLInputElement | null>(null)
    const defaults = readSvwsDefaults()
    const serverUrl = ref(buildDefaultBaseUrl(defaults.host ?? '', defaults.port ?? ''))
    const serverSchema = ref(defaults.schema ?? '')
    const username = ref(defaults.user ?? '')
    const password = ref(defaults.password ?? '')
    const trustSelfSigned = ref(false)
    const status = ref('Noch keine Daten geladen.')
    const selectedSchuelerId = ref<number | null>(null)
    const activeMode = ref<'klasse' | 'lerngruppe'>('klasse')
    const lupeOpen = ref(false)
    const editingCell = ref<string | null>(null)
    const tableScale = ref<'kompakt' | 'gross'>('kompakt')
    const hideNotTaughtInLupe = ref(true)

    async function connectToServer() {
      if (!serverUrl.value.trim() || !serverSchema.value.trim() || !username.value.trim()) {
        status.value = 'Bitte Server-URL, Schema und Benutzername angeben.'
        return
      }

      await store.loadFromServer({
        baseUrl: serverUrl.value.trim(),
        schema: serverSchema.value.trim(),
        username: username.value.trim(),
        password: password.value,
        trustSelfSigned: trustSelfSigned.value,
      })

      if (store.currentKlasse?.schueler[0]) {
        selectedSchuelerId.value = store.currentKlasse.schueler[0].schueler.id
      }

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
      if (store.currentKlasse?.schueler[0]) {
        selectedSchuelerId.value = store.currentKlasse.schueler[0].schueler.id
      }
      status.value = store.error
        ? `Fehler: ${store.error}`
        : `Datei geladen: ${file.name}`

      target.value = ''
    }

    function selectSchueler(schuelerId: number) {
      selectedSchuelerId.value = schuelerId
    }

    function navigateSchueler(direction: -1 | 1) {
      const klasse = store.currentKlasse
      if (!klasse || !selectedSchuelerId.value) return
      const currentIndex = klasse.schueler.findIndex(entry => entry.schueler.id === selectedSchuelerId.value)
      if (currentIndex < 0) return
      const nextIndex = Math.max(0, Math.min(klasse.schueler.length - 1, currentIndex + direction))
      selectedSchuelerId.value = klasse.schueler[nextIndex].schueler.id
    }

    function startEditingCell(schuelerId: number, lerngruppeId: number) {
      editingCell.value = `${schuelerId}:${lerngruppeId}`
    }

    function saveNote(schuelerId: number, lerngruppeId: number, value: string) {
      const note = value ? value as Notenkuerzel : null
      store.updateNote(schuelerId, lerngruppeId, note)
      editingCell.value = null
    }

    function logout() {
      store.reset()
      selectedSchuelerId.value = null
      activeMode.value = 'klasse'
      lupeOpen.value = false
      editingCell.value = null
      status.value = 'Abgemeldet. Noch keine Daten geladen.'
    }

    return () => {
      const klasse = store.currentKlasse
      const inConference = !!store.enmExport

      const klasseById = new Map(store.availableKlassen.map(item => [item.id, item]))
      const selectedKlasse = store.selectedKlasseId !== null ? klasseById.get(store.selectedKlasseId) : null

      const notenOptions = (store.enmExport?.noten ?? [])
        .slice()
        .sort((a, b) => b.notenpunkte - a.notenpunkte)

      if (klasse?.schueler.length && !klasse.schueler.some(entry => entry.schueler.id === selectedSchuelerId.value)) {
        selectedSchuelerId.value = klasse.schueler[0].schueler.id
      }

      const selectedSchueler = klasse?.schueler.find(entry => entry.schueler.id === selectedSchuelerId.value) ?? null
      const selectedSchuelerIndex = klasse && selectedSchuelerId.value
        ? klasse.schueler.findIndex(entry => entry.schueler.id === selectedSchuelerId.value)
        : -1

      const lerngruppenByFachId = new Map<number, number>()
      if (klasse) {
        for (const lg of klasse.lerngruppen) {
          if (!lerngruppenByFachId.has(lg.fachID)) {
            lerngruppenByFachId.set(lg.fachID, lg.id)
          }
        }
      }

      let avg = '–'
      let gradedCount = 0
      if (selectedSchueler && klasse) {
        const values = klasse.faecher
          .map(fach => {
            const lgId = lerngruppenByFachId.get(fach.id)
            if (!lgId) return null
            return numericGrade(store.getNote(selectedSchueler.schueler.id, lgId))
          })
          .filter((value): value is number => value !== null)

        gradedCount = values.length
        if (values.length > 0) {
          avg = (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
        }
      }

      const fehlstundenGesamt = selectedSchueler?.schueler.lernabschnitt.fehlstundenGesamt
      const fehlstundenUnentschuldigt = selectedSchueler?.schueler.lernabschnitt.fehlstundenGesamtUnentschuldigt
      const bemerkungen = selectedSchueler?.schueler.bemerkungen
      const remarkCards = [
        { label: 'Arbeits- und Sozialverhalten', value: bemerkungen?.ASV },
        { label: 'Ausserunterrichtliches Engagement', value: bemerkungen?.AUE },
        { label: 'Zeugnisbemerkungen', value: bemerkungen?.ZB },
      ]

      const lupeCards = selectedSchueler && klasse
        ? klasse.faecher.flatMap(fach => {
          const lgId = lerngruppenByFachId.get(fach.id)
          const note = lgId ? store.getNote(selectedSchueler.schueler.id, lgId) : null
          const isNotTaught = note === null || note === 'NE'
          if (hideNotTaughtInLupe.value && isNotTaught) {
            return []
          }
          const tone = lupeTone(note)
          return [h('div', { class: `lupe-fach ${tone.frame}` }, [
            h('div', { class: 'lupe-fach-k' }, fach.kuerzelAnzeige || fach.kuerzel),
            h('div', { class: 'lupe-fach-fn' }, fach.kuerzel),
            h('div', { class: `lupe-fach-note ${tone.note}` }, note ?? '–'),
            h('div', { class: `lupe-fach-label ${tone.label}` }, tone.text),
          ])]
        })
        : []

      return h('main', {
        class: inConference
          ? `app-shell conference-shell ${tableScale.value === 'gross' ? 'conference-shell-large' : ''}`
          : 'app-shell',
      }, [
        !inConference
          ? h('section', { class: 'hero' }, [
            h('p', { class: 'hero-kicker' }, 'Startbildschirm'),
            h('h1', 'SVWS Konferenzübersicht'),
            h('p', { class: 'hero-text' }, 'Wähle eine Datenquelle, um die Notenkonferenz zu starten.'),
          ])
          : null,

        !inConference
          ? h('section', { class: 'tile-grid' }, [
            h('article', { class: 'tile tile-server' }, [
              h('div', { class: 'tile-icon' }, [cloudIcon()]),
              h('h2', 'Verbindung zum SVWS-Server aufbauen'),
              h('p', 'Direkter Abruf des ENM-Exports per API mit URL, Schema und BasicAuth.'),
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
                  type: 'text',
                  placeholder: 'Schema (z. B. svwsdb)',
                  value: serverSchema.value,
                  onInput: (event: Event) => {
                    serverSchema.value = (event.target as HTMLInputElement).value
                  },
                }),
                h('input', {
                  class: 'tile-input',
                  type: 'text',
                  placeholder: 'Benutzername',
                  value: username.value,
                  autocomplete: 'username',
                  onInput: (event: Event) => {
                    username.value = (event.target as HTMLInputElement).value
                  },
                }),
                h('input', {
                  class: 'tile-input',
                  type: 'password',
                  placeholder: 'Passwort (optional)',
                  value: password.value,
                  autocomplete: 'current-password',
                  onInput: (event: Event) => {
                    password.value = (event.target as HTMLInputElement).value
                  },
                }),
              ]),
              h('label', { class: 'tile-checkbox' }, [
                h('input', {
                  type: 'checkbox',
                  checked: trustSelfSigned.value,
                  onChange: (event: Event) => {
                    trustSelfSigned.value = (event.target as HTMLInputElement).checked
                  },
                }),
                h('span', 'Zertifikat vertrauen (selbstsigniert)'),
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
          ])
          : null,

        inConference && klasse
          ? h('section', { class: tableScale.value === 'gross' ? 'conference-app conference-app-large' : 'conference-app' }, [
            h('header', { class: 'topbar' }, [
              h('span', { class: 'app-title' }, [
                'SVWS ',
                h('span', 'Konferenz'),
              ]),
              h('div', { class: 'sep' }),
              h('div', { class: 'field-group' }, [
                h('span', { class: 'field-label' }, 'Klasse'),
                h('select', {
                  value: store.selectedKlasseId ?? '',
                  onChange: (event: Event) => {
                    const nextId = Number((event.target as HTMLSelectElement).value)
                    store.selectKlasse(nextId)
                  },
                }, store.availableKlassen.map(item => h('option', { value: item.id }, item.kuerzelAnzeige || item.kuerzel))),
              ]),
              h('div', { class: 'sep' }),
              h('div', { class: 'mode-tabs' }, [
                h('button', {
                  class: activeMode.value === 'klasse' ? 'mode-tab active' : 'mode-tab',
                  onClick: () => {
                    activeMode.value = 'klasse'
                  },
                }, 'Klasse'),
                h('button', {
                  class: activeMode.value === 'lerngruppe' ? 'mode-tab active' : 'mode-tab',
                  onClick: () => {
                    activeMode.value = 'lerngruppe'
                  },
                }, 'Lerngruppe'),
              ]),
              h('div', { class: 'spacer' }),
              h('button', {
                class: lupeOpen.value ? 'icon-btn active' : 'icon-btn',
                onClick: () => {
                  lupeOpen.value = !lupeOpen.value
                },
              }, 'Schuelerlupe'),
              h('button', {
                class: 'icon-btn',
                onClick: () => {
                  tableScale.value = tableScale.value === 'kompakt' ? 'gross' : 'kompakt'
                },
              }, `Ansicht: ${tableScale.value === 'kompakt' ? 'Kompakt' : 'Gross'}`),
              h('button', {
                class: 'icon-btn',
                onClick: () => {
                  store.clearNoteChanges()
                },
                disabled: !store.hasNoteChanges,
              }, `Aenderungen verwerfen (${store.noteChangeCount})`),
              h('button', {
                class: 'icon-btn icon-btn-logout',
                onClick: logout,
                disabled: store.loading,
              }, 'Logout'),
            ]),
            h('div', { class: 'infobar' }, [
              h('div', ['Klasse: ', h('b', selectedKlasse?.kuerzelAnzeige ?? selectedKlasse?.kuerzel ?? '–')]),
              h('div', ['Schueler: ', h('b', String(klasse.schueler.length))]),
              h('div', ['Faecher: ', h('b', String(klasse.faecher.length))]),
              h('div', [`${store.schulInfo?.schuljahr ?? '–'} / Abschnitt ${store.schulInfo?.abschnitt ?? '–'}`]),
            ]),
            activeMode.value === 'klasse'
              ? h('div', { class: 'table-wrap' }, [
                h('table', [
                  h('thead', [
                    h('tr', [
                      h('th', { class: 'col-nr' }, 'Nr.'),
                      h('th', { class: 'col-name' }, 'Name'),
                      ...klasse.faecher.map(fach =>
                        h('th', { class: 'col-fach' }, fach.kuerzelAnzeige || fach.kuerzel)
                      ),
                    ]),
                  ]),
                  h('tbody', klasse.schueler.map((entry: KonferenzSchueler, index) =>
                    h('tr', {
                      class: entry.schueler.id === selectedSchuelerId.value ? 'selected' : '',
                      onClick: () => {
                        selectSchueler(entry.schueler.id)
                      },
                    }, [
                      h('td', { class: 'col-nr' }, String(index + 1)),
                      h('td', { class: 'col-name' }, `${entry.schueler.nachname}, ${entry.schueler.vorname}`),
                      ...klasse.faecher.map(fach => {
                        const lgId = lerngruppenByFachId.get(fach.id)
                        if (!lgId) {
                          return h('td', [h('span', { class: 'nl' }, '–')])
                        }
                        const note = store.getNote(entry.schueler.id, lgId)
                        const isEditing = editingCell.value === `${entry.schueler.id}:${lgId}`

                        if (isEditing) {
                          return h('td', [
                            h('select', {
                              class: 'note-select',
                              value: note ?? '',
                              autofocus: true,
                              onClick: (event: Event) => event.stopPropagation(),
                              onBlur: () => {
                                editingCell.value = null
                              },
                              onChange: (event: Event) => {
                                saveNote(entry.schueler.id, lgId, (event.target as HTMLSelectElement).value)
                              },
                            }, [
                              h('option', { value: '' }, '–'),
                              ...notenOptions.map(item => h('option', { value: item.kuerzel }, item.kuerzel)),
                            ]),
                          ])
                        }

                        return h('td', {
                          class: store.isNoteChanged(entry.schueler.id, lgId) ? 'changed' : '',
                          onClick: (event: Event) => {
                            event.stopPropagation()
                            startEditingCell(entry.schueler.id, lgId)
                          },
                        }, [
                          h('span', { class: gradeClass(note) }, note ?? '–'),
                        ])
                      }),
                    ])
                  )),
                ]),
              ])
              : h('div', { class: 'placeholder-panel' }, 'Lerngruppenansicht folgt als naechster Ausbauschritt.'),
            lupeOpen.value
              ? h('div', {
                class: 'lupe-modal-bg open',
                onClick: (event: MouseEvent) => {
                  if (event.target === event.currentTarget) {
                    lupeOpen.value = false
                  }
                },
              }, [
                h('section', { class: 'lupe-modal' }, [
                  h('div', { class: 'lupe-header-bar' }, [
                    h('div', { class: 'lupe-avatar' }, selectedSchueler ? `${selectedSchueler.schueler.vorname[0]}${selectedSchueler.schueler.nachname[0]}` : '–'),
                    h('div', [
                      h('div', { class: 'lupe-name' }, selectedSchueler ? `${selectedSchueler.schueler.nachname}, ${selectedSchueler.schueler.vorname}` : 'Kein Schueler gewaehlt'),
                      h('div', { class: 'lupe-meta' }, klasse && selectedSchuelerIndex >= 0 ? `${selectedKlasse?.kuerzelAnzeige ?? selectedKlasse?.kuerzel ?? '–'} · Schueler ${selectedSchuelerIndex + 1} von ${klasse.schueler.length}` : ''),
                    ]),
                    h('div', { class: 'lupe-nav' }, [
                      h('button', {
                        class: hideNotTaughtInLupe.value ? 'lupe-filter-btn active' : 'lupe-filter-btn',
                        onClick: () => {
                          hideNotTaughtInLupe.value = !hideNotTaughtInLupe.value
                        },
                      }, hideNotTaughtInLupe.value ? 'Nicht erteilt: aus' : 'Nicht erteilt: an'),
                      h('button', {
                        class: 'lupe-nav-btn',
                        disabled: !klasse || selectedSchuelerIndex <= 0,
                        onClick: () => navigateSchueler(-1),
                      }, '↑'),
                      h('button', {
                        class: 'lupe-nav-btn',
                        disabled: !klasse || selectedSchuelerIndex < 0 || selectedSchuelerIndex >= klasse.schueler.length - 1,
                        onClick: () => navigateSchueler(1),
                      }, '↓'),
                      h('button', {
                        class: 'lupe-nav-btn lupe-close-btn',
                        onClick: () => {
                          lupeOpen.value = false
                        },
                      }, '×'),
                    ]),
                  ]),
                  h('div', { class: 'lupe-stats-row' }, [
                    h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Ø Note'), h('div', { class: 'lupe-stat-val' }, avg)]),
                    h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Bewertet'), h('div', { class: 'lupe-stat-val' }, `${gradedCount} / ${klasse?.faecher.length ?? 0}`)]),
                    h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Fehlstunden gesamt'), h('div', { class: 'lupe-stat-val' }, String(fehlstundenGesamt ?? '–'))]),
                    h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Fehlstunden unentsch.'), h('div', { class: 'lupe-stat-val' }, String(fehlstundenUnentschuldigt ?? '–'))]),
                    h('div', { class: 'lupe-stat-box' }, [h('div', { class: 'lupe-stat-label' }, 'Geaendert'), h('div', { class: 'lupe-stat-val' }, String(store.noteChangeCount))]),
                  ]),
                  h('div', { class: 'lupe-remarks-wrap' }, [
                    ...remarkCards.map(card => h('article', { class: 'lupe-remark-card' }, [
                      h('h4', { class: 'lupe-remark-label' }, card.label),
                      h('p', { class: 'lupe-remark-text' }, card.value?.trim() ? card.value : '–'),
                    ])),
                  ]),
                  h('div', { class: 'lupe-grid-wrap' }, [
                    lupeCards.length
                      ? h('div', { class: 'lupe-grid' }, lupeCards)
                      : h('p', { class: 'lupe-empty' }, 'Keine erteilten Faecher in der aktuellen Auswahl.'),
                  ]),
                ]),
              ])
              : null,
          ])
          : null,

        h('p', { class: 'status-line', role: 'status' }, status.value),
      ])
    }
  },
})

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
