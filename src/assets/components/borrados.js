import { LitElement, html } from "lit";

const renderRegistro = (title, description) => html`
  <section class="card bg-base-100 border border-base-300 shadow-sm"><div class="card-body">
    <div class="flex items-center justify-between gap-4"><div><h1 class="card-title text-2xl">${title}</h1><p class="text-base-content/60">${description}</p></div><button class="btn btn-primary" type="button">Nuevo registro</button></div>
    <div class="overflow-x-auto mt-4"><table class="table"><thead><tr><th>Fecha</th><th>Responsable</th><th>Equipo</th><th>Estado</th><th></th></tr></thead><tbody><tr><td colspan="5" class="py-10 text-center text-base-content/50">No hay registros disponibles</td></tr></tbody></table></div>
  </div></section>
`;

export class Borrados extends LitElement {
  createRenderRoot() { return this }
  render() { return renderRegistro("Borrados para baja", "Administra los equipos pendientes de baja.") }
}

window.customElements.define("borrados-element", Borrados);
