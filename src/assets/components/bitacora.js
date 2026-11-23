import { LitElement, html } from "lit";

const SHEET_NAME = "Bitacora";
const DATABASE_NAME = "multiregistro";
const STORE_NAME = "file-handles";
const HANDLE_KEY = "bitacora";
const COLUMNS = [
  { key: "ingeniero", label: "Ingeniero" },
  { key: "fecha", label: "Fecha" },
  { key: "solicitud", label: "Solicitud" },
  { key: "estatus", label: "Estatus" },
  { key: "descripcionSolicitud", label: "Descripción de solicitud" },
  { key: "actividadRealizada", label: "Actividad realizada" }
];
const EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
let excelJsPromise;

function loadExcelJS() {
  if (!excelJsPromise) {
    excelJsPromise = import("exceljs").then((module) => module.default);
  }
  return excelJsPromise;
}

function openHandleDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeFileHandle(handle) {
  const database = await openHandleDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

async function getStoredFileHandle() {
  const database = await openHandleDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(HANDLE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

function cellToText(cell) {
  if (cell.value instanceof Date) {
    return cell.value.toISOString().slice(0, 10);
  }
  return cell.text || "";
}

export class Bitacora extends LitElement {
  static properties = {
    registros: { state: true },
    estadoExcel: { state: true },
    nombreExcel: { state: true },
    tieneArchivoVinculado: { state: true }
  };

  constructor() {
    super();
    this.registros = [];
    this.estadoExcel = "Crea o abre un archivo Excel para comenzar.";
    this.nombreExcel = "";
    this.tieneArchivoVinculado = false;
    this.workbook = null;
    this.fileHandle = null;
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.restoreLinkedWorkbook();
  }

  async restoreLinkedWorkbook() {
    try {
      this.fileHandle = await getStoredFileHandle();
      if (!this.fileHandle) return;

      this.tieneArchivoVinculado = true;
      this.nombreExcel = this.fileHandle.name;
      const permission = await this.fileHandle.queryPermission({ mode: "readwrite" });

      if (permission === "granted") {
        await this.loadWorkbookFile(await this.fileHandle.getFile());
      } else {
        this.estadoExcel =
          "Hay un Excel vinculado. Cárgalo para volver a autorizar el acceso.";
      }
    } catch (error) {
      this.estadoExcel = `No se pudo recuperar el Excel vinculado: ${error.message}`;
    }
  }

  async createExcel() {
    try {
      let handle = null;
      if (window.showSaveFilePicker) {
        handle = await window.showSaveFilePicker({
          suggestedName: "bitacora.xlsx",
          types: [{
            description: "Libro de Excel",
            accept: { [EXCEL_MIME]: [".xlsx"] }
          }]
        });
      }

      const ExcelJS = await loadExcelJS();
      this.workbook = new ExcelJS.Workbook();
      this.setUpWorksheet();

      if (handle) {
        this.fileHandle = handle;
        await storeFileHandle(this.fileHandle);
        this.tieneArchivoVinculado = true;
        this.nombreExcel = this.fileHandle.name;
        await this.writeWorkbook();
        this.estadoExcel = `Excel creado y listo: ${this.nombreExcel}`;
      } else {
        this.fileHandle = null;
        this.tieneArchivoVinculado = false;
        this.nombreExcel = "bitacora.xlsx";
        await this.downloadWorkbook();
        this.estadoExcel =
          "Se descargó la plantilla. Para guardar cambios en el navegador, importa el archivo actualizado.";
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        this.estadoExcel = `No se pudo crear el Excel: ${error.message}`;
      }
    }
  }

  async openExcel() {
    if (this.fileHandle && window.showOpenFilePicker) {
      await this.loadLinkedWorkbook();
      return;
    }

    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [{
            description: "Libro de Excel",
            accept: { [EXCEL_MIME]: [".xlsx"] }
          }]
        });
        await this.loadWorkbookFile(await handle.getFile());
        this.fileHandle = handle;
        await storeFileHandle(handle);
        this.tieneArchivoVinculado = true;
        this.nombreExcel = handle.name;
        this.estadoExcel = `Excel cargado: ${this.nombreExcel}`;
      } catch (error) {
        if (error.name !== "AbortError") {
          this.estadoExcel = `No se pudo abrir el Excel: ${error.message}`;
        }
      }
      return;
    }

    this.querySelector("#excel-file-input").click();
  }

  async loadLinkedWorkbook() {
    try {
      const permission = await this.fileHandle.requestPermission({ mode: "readwrite" });
      if (permission !== "granted") {
        this.estadoExcel = "No se concedió permiso para leer y guardar el Excel.";
        return;
      }

      await this.loadWorkbookFile(await this.fileHandle.getFile());
      this.estadoExcel = `Excel cargado: ${this.nombreExcel}`;
    } catch (error) {
      this.estadoExcel = `No se pudo cargar el Excel vinculado: ${error.message}`;
    }
  }

  async loadSelectedFile(event) {
    const input = event.currentTarget;
    const file = input.files[0];
    if (!file) return;

    try {
      await this.loadWorkbookFile(file);
      this.fileHandle = null;
      this.tieneArchivoVinculado = false;
      this.nombreExcel = file.name;
      this.estadoExcel =
        `Excel cargado: ${file.name}. Los cambios se guardarán como una nueva descarga.`;
    } catch (error) {
      this.estadoExcel = `No se pudo leer el Excel: ${error.message}`;
    } finally {
      input.value = "";
    }
  }

  async loadWorkbookFile(file) {
    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    this.workbook = workbook;

    const worksheet = workbook.getWorksheet(SHEET_NAME);
    this.registros = [];
    if (worksheet) {
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const values = COLUMNS.map((_, index) => cellToText(row.getCell(index + 1)));
        if (values.some((value) => value !== "")) {
          this.registros = [
            ...this.registros,
            Object.fromEntries(COLUMNS.map((column, index) => [column.key, values[index]]))
          ];
        }
      });
    }
  }

  setUpWorksheet() {
    let worksheet = this.workbook.getWorksheet(SHEET_NAME);
    if (!worksheet) {
      worksheet = this.workbook.addWorksheet(SHEET_NAME);
    } else if (worksheet.rowCount > 0) {
      worksheet.spliceRows(1, worksheet.rowCount);
    }

    worksheet.addRow(COLUMNS.map((column) => column.label));
    worksheet.getRow(1).font = { bold: true };
    this.registros.forEach((registro) => {
      worksheet.addRow(COLUMNS.map((column) => registro[column.key]));
    });
  }

  async writeWorkbook() {
    this.setUpWorksheet();
    if (!this.fileHandle) {
      await this.downloadWorkbook();
      return;
    }

    const writable = await this.fileHandle.createWritable();
    await writable.write(await this.workbook.xlsx.writeBuffer());
    await writable.close();
  }

  async downloadWorkbook() {
    const buffer = await this.workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: EXCEL_MIME }));
    const link = document.createElement("a");
    link.href = url;
    link.download = this.nombreExcel || "bitacora.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  openModal() {
    this.querySelector("#bitacora-modal").showModal();
  }

  async submitRegistro(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const registro = Object.fromEntries(
      COLUMNS.map((column) => [column.key, formData.get(column.key)])
    );

    if (!this.workbook) {
      this.estadoExcel = "Primero crea o abre un archivo Excel.";
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      this.registros = [...this.registros, registro];
      await this.writeWorkbook();
      console.log("Nuevo registro de bitácora:", registro);
      this.estadoExcel = this.fileHandle
        ? `Registro guardado en ${this.nombreExcel}`
        : "Registro agregado. Se descargó el Excel actualizado.";
      form.reset();
      this.querySelector("#bitacora-modal").close();
    } catch (error) {
      this.registros = this.registros.slice(0, -1);
      this.estadoExcel = `No se pudo guardar el registro en Excel: ${error.message}`;
    } finally {
      submitButton.disabled = false;
    }
  }

  render() {
    return html`
      <section class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 class="card-title text-2xl">Bitácora</h1>
              <p class="text-base-content/60">Consulta y administra los movimientos registrados.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="btn btn-outline" type="button" @click="${this.openExcel}">
                ${this.tieneArchivoVinculado ? "Cargar Excel vinculado" : "Abrir Excel"}
              </button>
              <button class="btn btn-outline" type="button" @click="${this.createExcel}">
                Crear Excel
              </button>
              <button class="btn btn-primary" type="button" @click="${this.openModal}">
                Nuevo registro
              </button>
            </div>
          </div>

          <p class="text-sm text-base-content/70" role="status">${this.estadoExcel}</p>

          <div class="overflow-x-auto mt-2">
            <table class="table">
              <thead>
                <tr>${COLUMNS.map((column) => html`<th>${column.label}</th>`)}</tr>
              </thead>
              <tbody>
                ${this.registros.length
                  ? this.registros.map((registro) => html`
                    <tr>${COLUMNS.map((column) => html`<td>${registro[column.key]}</td>`)}</tr>
                  `)
                  : html`<tr>
                    <td colspan="6" class="py-10 text-center text-base-content/50">
                      ${this.nombreExcel
                        ? "El archivo no contiene registros de bitácora."
                        : "Abre o crea un Excel para mostrar los registros."}
                    </td>
                  </tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <input
        id="excel-file-input"
        class="hidden"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        @change="${this.loadSelectedFile}"
      />

      <dialog id="bitacora-modal" class="modal">
        <div class="modal-box max-w-2xl">
          <h3 class="text-lg font-bold mb-4">Nuevo registro de bitácora</h3>
          <form @submit="${this.submitRegistro}" class="grid gap-4">
            <label class="form-control">
              <span class="label-text mb-2">Ingeniero</span>
              <input class="input input-bordered" name="ingeniero" type="text" required />
            </label>
            <label class="form-control">
              <span class="label-text mb-2">Fecha</span>
              <input class="input input-bordered" name="fecha" type="date" required />
            </label>
            <label class="form-control">
              <span class="label-text mb-2">Solicitud</span>
              <input class="input input-bordered" name="solicitud" type="text" required />
            </label>
            <label class="form-control">
              <span class="label-text mb-2">Estatus</span>
              <select class="select select-bordered" name="estatus" required>
                <option value="" disabled selected>Selecciona un estatus</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En proceso">En proceso</option>
                <option value="Completada">Completada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </label>
            <label class="form-control">
              <span class="label-text mb-2">Descripción de solicitud</span>
              <textarea class="textarea textarea-bordered" name="descripcionSolicitud" required></textarea>
            </label>
            <label class="form-control">
              <span class="label-text mb-2">Actividad realizada</span>
              <textarea class="textarea textarea-bordered" name="actividadRealizada" required></textarea>
            </label>
            <div class="modal-action mt-2">
              <button
                class="btn"
                type="button"
                @click="${() => this.querySelector("#bitacora-modal").close()}"
              >
                Cancelar
              </button>
              <button class="btn btn-primary" type="submit">Guardar</button>
            </div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button>cerrar</button>
        </form>
      </dialog>
    `;
  }
}

window.customElements.define("bitacora-element", Bitacora);
