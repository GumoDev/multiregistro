import { LitElement, html } from "lit";

export class MyElement extends LitElement {
  static get properties() {
    return {

    }
  }

  constructor() {
    super()

  }

  createRenderRoot() {
    return this

  }

  render() {
      return html`<button class="btn">Multiregistro GD</button>`
  }

  //_onClick() {
    //this.count++
  //}
}

window.customElements.define('my-element', MyElement)
