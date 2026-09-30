/*
 * Cliente de TiDB Cloud Data Service.
 *
 * Express NO se conecta directo a la base para las transacciones:
 * cada operación llama a un endpoint HTTPS de la Data App.
 * Las llaves (public/private key) solo viven en el servidor (.env),
 * nunca en el navegador.
 */
import { findEndpoint } from './endpoints.js';

const NUMERIC_TYPE = /INT|DECIMAL|NUMERIC|DOUBLE|FLOAT|REAL|BIT/i;

// Errores de MySQL/TiDB más comunes traducidos para el usuario
const MYSQL_ERRORS = {
  1062: { status: 409, message: 'Ya existe un registro con ese dato (correo, usuario, SKU o código de barras duplicado).' },
  1451: { status: 409, message: 'No se puede eliminar porque tiene registros relacionados (ventas, compras o movimientos).' },
  1452: { status: 400, message: 'El registro relacionado no existe (proveedor, producto o usuario inválido).' },
  1048: { status: 400, message: 'Falta un dato obligatorio.' },
  1265: { status: 400, message: 'Uno de los valores no es válido para ese campo.' },
};

export class DataServiceError extends Error {
  constructor(message, status = 502, code = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function createDataService({ baseUrl, publicKey, privateKey, draft = false, fetchImpl = fetch }) {
  const base = String(baseUrl || '').replace(/\/+$/, '');
  const auth = 'Basic ' + Buffer.from(`${publicKey}:${privateKey}`).toString('base64');

  function configured() {
    return Boolean(base && publicKey && privateKey);
  }

  /**
   * Llama a un endpoint.
   * @param {string} method  GET | POST | PUT | DELETE
   * @param {string} path    ruta tal como está definida, p. ej. '/productos/{id}'
   * @param {object} params  parámetros (los de la ruta se sustituyen en el path)
   * @returns {Promise<object[]>} filas del último SELECT del endpoint
   */
  async function call(method, path, params = {}) {
    if (!configured()) {
      throw new DataServiceError(
        'Data Service no está configurado. Revisa DATASERVICE_URL, DATASERVICE_PUBLIC_KEY y DATASERVICE_PRIVATE_KEY en el .env',
        500
      );
    }

    const def = findEndpoint(method, path);
    if (!def) throw new DataServiceError(`Endpoint no definido: ${method} ${path}`, 500);

    // Validar que se manden exactamente los parámetros declarados
    const values = {};
    for (const p of def.params) {
      let value = params[p.name];
      if (value === undefined || value === null) {
        if (p.required) throw new DataServiceError(`Falta el parámetro "${p.name}" para ${method} ${path}`, 500);
        value = p.type === 'string' ? '' : 0;
      }
      if (p.type === 'integer') value = Math.trunc(Number(value) || 0);
      else if (p.type === 'number') value = Number(value) || 0;
      else value = String(value);
      values[p.name] = value;
    }

    // Parámetros de ruta: /productos/{id} -> /productos/7
    let finalPath = path;
    const rest = {};
    for (const p of def.params) {
      if (p.path) finalPath = finalPath.replace(`{${p.name}}`, encodeURIComponent(values[p.name]));
      else rest[p.name] = values[p.name];
    }

    let url = `${base}${finalPath}`;
    const init = {
      method,
      headers: {
        Authorization: auth,
        Accept: 'application/json',
        ...(draft ? { 'endpoint-type': 'draft' } : {}),
      },
    };

    if (method === 'GET' || method === 'DELETE') {
      const qs = new URLSearchParams();
      Object.entries(rest).forEach(([k, v]) => qs.set(k, String(v)));
      const s = qs.toString();
      if (s) url += `?${s}`;
    } else {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(rest);
    }

    let response;
    try {
      response = await fetchImpl(url, init);
    } catch (error) {
      throw new DataServiceError(`No se pudo conectar con TiDB Data Service: ${error.message}`, 502);
    }

    let json = null;
    try {
      json = await response.json();
    } catch {
      throw new DataServiceError(`Respuesta inválida de Data Service (HTTP ${response.status})`, 502);
    }

    const result = json?.data?.result || {};
    const code = Number(result.code ?? response.status);

    if (!response.ok || code !== 200) {
      if (response.status === 401 || response.status === 403) {
        throw new DataServiceError('Data Service rechazó las llaves de acceso (revisa la API key y su rol ReadAndWrite).', 502, code);
      }
      if (response.status === 404) {
        throw new DataServiceError(`El endpoint ${method} ${path} no existe o no está desplegado en la Data App.`, 502, code);
      }
      const known = MYSQL_ERRORS[code];
      if (known) throw new DataServiceError(known.message, known.status, code);
      throw new DataServiceError(result.message || json?.message || `Error de Data Service (${code})`, 502, code);
    }

    return normalizeRows(json.data.columns || [], json.data.rows || []);
  }

  return { call, configured };
}

/** Data Service devuelve todo como texto: convertimos las columnas numéricas a número. */
function normalizeRows(columns, rows) {
  const numeric = new Set(
    columns.filter((c) => NUMERIC_TYPE.test(String(c.data_type || c.type || ''))).map((c) => c.col || c.name)
  );

  return rows.map((row) => {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined || value === '') {
        out[key] = value === '' && !numeric.has(key) ? '' : null;
      } else if (numeric.has(key) && !Number.isNaN(Number(value))) {
        out[key] = Number(value);
      } else {
        out[key] = value;
      }
    }
    return out;
  });
}
