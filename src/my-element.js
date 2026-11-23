import { LitElement, html } from "lit";
import './assets/components/navegacion.js'
import './assets/components/bitacora.js'
import './assets/components/borrados.js'
import './assets/components/devoluciones.js'
import './assets/components/entregas.js'
import './assets/components/seguro-bm.js'
import './assets/components/seguro-mbt.js'

export class MyElement extends LitElement {
  static get properties() {
    return {
      activeComponent: { type: String }
    }
  }

  constructor() {
    super()
    this.activeComponent = 'bitacora'
  }

  createRenderRoot() {
    return this

  }

  render() {
      return html`
        <navegacion-element
          @navigate="${(event) => this.activeComponent = event.detail}">
        </navegacion-element>

        <main class="container mx-auto px-4 py-6">
          ${this.renderComponent()}
        </main>
      `
  }

  renderComponent() {
    switch (this.activeComponent) {
      case 'borrados': return html`<borrados-element></borrados-element>`
      case 'devoluciones': return html`<devoluciones-element></devoluciones-element>`
      case 'entregas': return html`<entregas-element></entregas-element>`
      case 'seguro-bm': return html`<seguro-bm-element></seguro-bm-element>`
      case 'seguro-mbt': return html`<seguro-mbt-element></seguro-mbt-element>`
      default: return html`<bitacora-element></bitacora-element>`
    }
  }
}

window.customElements.define('my-element', MyElement)
