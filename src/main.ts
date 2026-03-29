import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import './style.css'

const App = {
  render: () =>
    h('main', { class: 'app' }, [
      h('h1', 'SVWS Konferenzübersicht'),
      h(
        'p',
        'Die Basis ist eingerichtet. Als nächstes kann die konkrete UI für Upload, Server-Abruf und Tabellenansicht ergänzt werden.'
      ),
    ]),
}

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
