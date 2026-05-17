import { ref } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'svws-theme'

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* ignore */ }
  return 'system'
}

const preference = ref<ThemePreference>(readStored())

let mql: MediaQueryList | null = null
let listening = false

function onSystemChange(e: MediaQueryListEvent) {
  document.documentElement.classList.toggle('dark', e.matches)
}

function startListening() {
  if (listening) return
  if (!mql) mql = window.matchMedia('(prefers-color-scheme: dark)')
  mql.addEventListener('change', onSystemChange)
  listening = true
}

function stopListening() {
  if (!listening || !mql) return
  mql.removeEventListener('change', onSystemChange)
  listening = false
}

function apply(pref: ThemePreference) {
  if (pref === 'dark') {
    stopListening()
    document.documentElement.classList.add('dark')
  } else if (pref === 'light') {
    stopListening()
    document.documentElement.classList.remove('dark')
  } else {
    if (!mql) mql = window.matchMedia('(prefers-color-scheme: dark)')
    document.documentElement.classList.toggle('dark', mql.matches)
    startListening()
  }
}

export function initTheme() {
  apply(preference.value)
}

export function setTheme(pref: ThemePreference) {
  preference.value = pref
  try { localStorage.setItem(STORAGE_KEY, pref) } catch { /* ignore */ }
  apply(pref)
}

export function useTheme() {
  return { preference, setTheme }
}
