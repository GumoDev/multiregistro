import { LitElement, html } from "lit";

export class Navegacion extends LitElement {
    static get properties() {
        return {
            activeComponent: { type: String }
        }
    }

    constructor() {
        super()
        this.activeComponent = 'bitacora'

    }

    showComponent(component) {
        this.activeComponent = component
        this.dispatchEvent(new CustomEvent('navigate', {
            detail: component,
            bubbles: true,
            composed: true
        }))
    }

    createRenderRoot() {
        return this

    }


    render() {
        return html`
            <nav class="navbar bg-base-100">
                <div class="flex-1">
                    <a class="btn btn-ghost text-xl">Multiregistro GD</a>
                </div>
                <div class="flex-none">
                    <ul class="menu menu-horizontal px-1">
                        <li class="${this.activeComponent === 'bitacora' ? 'menu-active' : ''}"><button @click="${() => this.showComponent('bitacora')}">Bitacora</button></li>
                        <li class="${this.activeComponent === 'borrados' ? 'menu-active' : ''}"><button @click="${() => this.showComponent('borrados')}">Borrados para baja</button></li>
                        <li class="${this.activeComponent === 'devoluciones' ? 'menu-active' : ''}"><button @click="${() => this.showComponent('devoluciones')}">Devoluciones</button></li>
                        <li class="${this.activeComponent === 'entregas' ? 'menu-active' : ''}"><button @click="${() => this.showComponent('entregas')}">Entregas</button></li>
                        <li class="${this.activeComponent === 'seguro-bm' ? 'menu-active' : ''}"><button @click="${() => this.showComponent('seguro-bm')}">Seguro BM</button></li>
                        <li class="${this.activeComponent === 'seguro-mbt' ? 'menu-active' : ''}"><button @click="${() => this.showComponent('seguro-mbt')}">Seguro MBT</button></li>
                    </ul>
                </div>
            </nav>
        `;
    }
}

window.customElements.define('navegacion-element', Navegacion);
