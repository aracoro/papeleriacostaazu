/*
 * =====================================================================
 *  API de Papelería Costa Azul
 * =====================================================================
 *  Flujo:  React  ->  esta API (Express)  ->  TiDB Cloud Data Service  ->  TiDB
 *
 *  Esta API:
 *    1. Valida la sesión (token firmado) y el rol del usuario.
 *    2. Valida los datos (correo, stock, cantidades...).
 *    3. Llama al endpoint de Data Service que corresponde.
 *  Las llaves de Data Service nunca llegan al navegador.
 *
 *  Verbos (convención del profesor):
 *    GET = consultar · POST = actualizar · PUT = crear · DELETE = eliminar
 *
 *  Roles:
 *    auditor        -> solo lectura: consulta la información de la app
 *    capturista     -> lectura y escritura: realiza todas las transacciones
 *    administrador  -> lectura y escritura de usuarios, solo lectura de la app
 *                      y respaldo de la BD a un .sql local
 * =====================================================================
 */
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createDataService, DataServiceError } from './dataService.js';
import { DB_NAME } from './endpoints.js';
import { crearConexionRespaldo, generarRespaldo } from './respaldo.js';

// En Netlify el servidor corre como función (sin puerto y con disco de solo lectura)
const SERVERLESS = Boolean(
  process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL
);

// import.meta.url puede no existir cuando Netlify empaqueta la función
const __dirname = (() => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return path.join(process.cwd(), 'server');
  }
})();
const ROOT_DIR = path.join(__dirname, '..');

/* =========================
   CONFIGURACIÓN (.env)
========================= */

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT_DIR, '.env'));
loadEnvFile(path.join(ROOT_DIR, '.env.local'));

const PORT = Number(process.env.API_PORT || 4000);
// En Netlify solo se puede escribir en /tmp (las imágenes ahí no son permanentes)
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || (SERVERLESS ? path.join('/tmp', 'uploads') : path.join(ROOT_DIR, 'uploads'));
const BASE_URL = process.env.UPLOAD_BASE_URL || `http://localhost:${PORT}`;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'America/Mazatlan';
const SESSION_HOURS = Number(process.env.SESSION_HOURS || 8);
const SESSION_SECRET = process.env.SESSION_SECRET || '';

if (!SESSION_SECRET || SESSION_SECRET.length < 16) {
  console.warn('[Aviso] SESSION_SECRET no está definido o es muy corto en el .env. Usa una cadena larga y aleatoria.');
}
const SECRET = SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const ds = createDataService({
  baseUrl: process.env.DATASERVICE_URL,
  publicKey: process.env.DATASERVICE_PUBLIC_KEY,
  privateKey: process.env.DATASERVICE_PRIVATE_KEY,
  draft: String(process.env.DATASERVICE_DRAFT || '').toLowerCase() === 'true',
});

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || DB_NAME,
  ssl: String(process.env.DB_SSL ?? 'true').toLowerCase() !== 'false',
};

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (error) {
  console.warn('[Aviso] No se pudo crear la carpeta de imágenes:', error.message);
}

/* =========================
   ROLES Y PERMISOS
========================= */

export const ROLES = {
  ADMIN: 'administrador',
  CAPTURISTA: 'capturista',
  AUDITOR: 'auditor',
};
const ROLES_VALIDOS = Object.values(ROLES);
const TODOS = ROLES_VALIDOS; // consultar la información de la app

/* =========================
   UTILIDADES
========================= */

const round2 = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
const texto = (v) => (v === undefined || v === null ? '' : String(v).trim());
const CORREO_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

/** Fecha y hora local (zona de la papelería) en formato DATETIME: AAAA-MM-DD HH:MM:SS */
function fechaLocal(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')} ${hour}:${get('minute')}:${get('second')}`;
}

/** Combina una fecha AAAA-MM-DD elegida por el usuario con la hora actual. */
function fechaConHora(fecha) {
  const ahora = fechaLocal();
  const f = texto(fecha);
  if (!f) return ahora;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) throw httpError(400, 'Fecha inválida (usa AAAA-MM-DD)');
  return `${f} ${ahora.slice(11)}`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !String(stored).startsWith('scrypt$')) return false;
  const parts = String(stored).split('$');
  if (parts.length !== 3) return false;
  const [, salt, expectedHash] = parts;
  const actualHash = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(actualHash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    nombre: row.nombre,
    usuario: row.usuario,
    correo: row.correo,
    rol: row.rol,
    activo: Boolean(Number(row.activo)),
    creado: row.creado || null,
    actualizado: row.actualizado || null,
  };
}

/* =========================
   SESIÓN (token firmado HMAC)
========================= */

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function firmarToken(user) {
  const payload = {
    id: user.id,
    rol: user.rol,
    exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', SECRET).update(body).digest());
  return { token: `${body}.${sig}`, expiresAt: new Date(payload.exp).toISOString() };
}

function verificarToken(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function makeSession(user) {
  const { token, expiresAt } = firmarToken(user);
  return { token, expiresAt, userId: user.id, role: user.rol, loginAt: new Date().toISOString() };
}

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = verificarToken(token);
  if (!payload) return next(httpError(401, 'Sesión inválida o expirada. Inicia sesión de nuevo.'));
  req.user = { id: Number(payload.id), rol: payload.rol };
  next();
}

/** Middleware de permisos por rol */
function permitir(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(httpError(401, 'No autenticado'));
    if (!roles.includes(req.user.rol)) {
      return next(httpError(403, `Tu rol (${req.user.rol}) no tiene permiso para esta operación.`));
    }
    next();
  };
}

// Envuelve handlers async para mandar errores al middleware de errores
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* =========================
   APP
========================= */

const app = express();

app.use(
  cors({
    origin: FRONTEND_ORIGIN === '*' ? true : FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

/* =========================
   ESTADO
========================= */

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    dataService: ds.configured() ? 'configurado' : 'SIN CONFIGURAR',
    respaldo: DB_CONFIG.host && DB_CONFIG.user ? 'configurado' : 'SIN CONFIGURAR',
    horaLocal: fechaLocal(),
  });
});

/* =========================
   AUTENTICACIÓN
========================= */

app.post('/api/auth/login', h(async (req, res) => {
  const login = texto(req.body?.email).toLowerCase();
  const password = String(req.body?.password || '');

  if (!login || !password) throw httpError(400, 'Correo y contraseña son obligatorios');

  const [row] = await ds.call('GET', '/usuarios/login', { login });

  if (!row || !verifyPassword(password, row.contrasena)) {
    throw httpError(401, 'Usuario o contraseña incorrectos');
  }
  if (!Number(row.activo)) throw httpError(403, 'El usuario está inactivo');
  if (!ROLES_VALIDOS.includes(row.rol)) throw httpError(403, 'El usuario no tiene un rol válido');

  const user = mapUser(row);
  res.json({ session: makeSession(user), user });
}));

// Revalida la sesión guardada en el navegador
app.get('/api/auth/me', requireAuth, h(async (req, res) => {
  const [row] = await ds.call('GET', '/usuarios/{id}', { id: req.user.id });
  if (!row || !Number(row.activo)) throw httpError(401, 'El usuario ya no está activo');
  const user = mapUser(row);
  // Si el administrador le cambió el rol, se emite un token nuevo con el rol actual
  res.json({ session: makeSession(user), user });
}));

// Todo lo que sigue requiere sesión
app.use('/api', requireAuth);

/* =========================
   SUBIR IMAGEN (crear archivo)
========================= */

app.put('/api/upload', permitir(ROLES.CAPTURISTA), (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return next(httpError(400, err.message || 'Error al procesar archivo'));
    if (!req.file) return next(httpError(400, 'Archivo de imagen no recibido'));
    const relativePath = `/uploads/${req.file.filename}`;
    res.json({ url: `${BASE_URL}${relativePath}`, path: relativePath, filename: req.file.originalname });
  });
});

/* =========================
   USUARIOS  (solo administrador)
========================= */

app.get('/api/usuarios', permitir(ROLES.ADMIN), h(async (_req, res) => {
  const rows = await ds.call('GET', '/usuarios');
  res.json({ data: rows.map(mapUser) });
}));

app.put('/api/usuarios', permitir(ROLES.ADMIN), h(async (req, res) => {
  const nombre = texto(req.body?.nombre);
  const correo = texto(req.body?.correo).toLowerCase();
  const password = String(req.body?.password || '');
  const rol = texto(req.body?.rol).toLowerCase();

  if (!nombre || !correo || !password) throw httpError(400, 'Nombre, correo y contraseña son obligatorios');
  if (!CORREO_RE.test(correo)) throw httpError(400, 'Correo inválido');
  if (password.length < 4) throw httpError(400, 'La contraseña debe tener al menos 4 caracteres');
  if (!ROLES_VALIDOS.includes(rol)) throw httpError(400, 'Rol inválido');

  const usuario = correo.split('@')[0];
  const [created] = await ds.call('PUT', '/usuarios', {
    nombre,
    usuario,
    correo,
    contrasena: hashPassword(password),
    rol,
  });
  res.status(201).json({ data: mapUser({ id: created.id, nombre, usuario, correo, rol, activo: 1 }) });
}));

app.post('/api/usuarios/:id', permitir(ROLES.ADMIN), h(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw httpError(400, 'ID inválido');

  const [actual] = await ds.call('GET', '/usuarios/{id}', { id });
  if (!actual) throw httpError(404, 'Usuario no encontrado');

  const nombre = req.body?.nombre !== undefined ? texto(req.body.nombre) : actual.nombre;
  const correo = req.body?.correo !== undefined ? texto(req.body.correo).toLowerCase() : actual.correo;
  const rol = req.body?.rol !== undefined ? texto(req.body.rol).toLowerCase() : actual.rol;
  const activo = req.body?.activo !== undefined ? (req.body.activo ? 1 : 0) : Number(actual.activo);

  if (!nombre) throw httpError(400, 'El nombre es obligatorio');
  if (!CORREO_RE.test(correo)) throw httpError(400, 'Correo inválido');
  if (!ROLES_VALIDOS.includes(rol)) throw httpError(400, 'Rol inválido');
  if (id === req.user.id && (rol !== ROLES.ADMIN || !activo)) {
    throw httpError(400, 'No puedes quitarte el rol de administrador ni desactivarte a ti mismo');
  }

  await ds.call('POST', '/usuarios', { id, nombre, correo, rol, activo });
  res.json({ data: mapUser({ ...actual, nombre, correo, rol, activo }) });
}));

app.delete('/api/usuarios/:id', permitir(ROLES.ADMIN), h(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw httpError(400, 'ID inválido');
  if (id === req.user.id) throw httpError(400, 'No puedes eliminar tu propio usuario');

  try {
    const [r] = await ds.call('DELETE', '/usuarios/{id}', { id });
    if (!Number(r?.afectados)) throw httpError(404, 'Usuario no encontrado');
  } catch (error) {
    if (error.code === 1451) {
      throw httpError(409, 'Ese usuario ya tiene ventas, compras o devoluciones registradas. Mejor desactívalo.');
    }
    throw error;
  }
  res.json({ ok: true });
}));

/* =========================
   PROVEEDORES
========================= */

function proveedorBody(body) {
  const nombre = texto(body?.nombre);
  if (!nombre) throw httpError(400, 'El nombre del proveedor es obligatorio');
  const correo = texto(body?.correo);
  if (correo && !CORREO_RE.test(correo)) throw httpError(400, 'Correo del proveedor inválido');
  return {
    nombre,
    correo,
    rfc: texto(body?.rfc).toUpperCase(),
    direccion: texto(body?.direccion),
    telefono: texto(body?.telefono),
  };
}

app.get('/api/proveedores', permitir(...TODOS), h(async (_req, res) => {
  res.json({ data: await ds.call('GET', '/proveedores') });
}));

app.put('/api/proveedores', permitir(ROLES.CAPTURISTA), h(async (req, res) => {
  const [created] = await ds.call('PUT', '/proveedores', proveedorBody(req.body));
  res.status(201).json({ data: { id: created?.id } });
}));

app.post('/api/proveedores/:id', permitir(ROLES.CAPTURISTA), h(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw httpError(400, 'ID inválido');
  const [r] = await ds.call('POST', '/proveedores', { id, ...proveedorBody(req.body) });
  if (!Number(r?.afectados)) {
    const existe = (await ds.call('GET', '/proveedores')).some((p) => Number(p.id) === id);
    if (!existe) throw httpError(404, 'Proveedor no encontrado');
  }
  res.json({ ok: true });
}));

app.delete('/api/proveedores/:id', permitir(ROLES.CAPTURISTA), h(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw httpError(400, 'ID inválido');
  try {
    const [r] = await ds.call('DELETE', '/proveedores/{id}', { id });
    if (!Number(r?.afectados)) throw httpError(404, 'Proveedor no encontrado');
  } catch (error) {
    if (error.code === 1451) throw httpError(409, 'No se puede eliminar: el proveedor tiene compras registradas.');
    throw error;
  }
  res.json({ ok: true });
}));

/* =========================
   PRODUCTOS
========================= */

function productoBody(body) {
  const nombre = texto(body?.nombre);
  if (!nombre) throw httpError(400, 'El nombre del producto es obligatorio');
  const estado = texto(body?.estado).toLowerCase() || 'activo';
  if (!['activo', 'inactivo'].includes(estado)) throw httpError(400, 'Estado inválido');
  const precio = round2(body?.precio_venta);
  const costo = round2(body?.costo_promedio);
  const stock = Math.trunc(Number(body?.stock || 0));
  const stockMin = Math.trunc(Number(body?.stock_minimo || 0));
  if (precio < 0 || costo < 0 || stockMin < 0) throw httpError(400, 'Precio, costo y stock mínimo no pueden ser negativos');

  return {
    nombre,
    categoria: texto(body?.categoria),
    marca: texto(body?.marca),
    presentacion: texto(body?.presentacion),
    sku: texto(body?.sku),
    codigo_barras: texto(body?.codigo_barras),
    descripcion: texto(body?.descripcion),
    unidad: texto(body?.unidad) || 'pieza',
    precio_venta: precio,
    costo_promedio: costo,
    stock,
    stock_minimo: stockMin,
    imagen: texto(body?.imagen),
    estado,
  };
}

/** Agrupa las relaciones proveedor-producto por producto (solo activas). */
function proveedoresPorProducto(relaciones) {
  const mapa = new Map();
  for (const r of relaciones) {
    if (!Number(r.activo)) continue;
    const lista = mapa.get(Number(r.producto_id)) || [];
    lista.push({
      id: r.id,
      proveedor_id: r.proveedor_id,
      proveedor_nombre: r.proveedor_nombre,
      codigo_proveedor: r.codigo_proveedor,
      costo_actual: Number(r.costo_actual || 0),
    });
    mapa.set(Number(r.producto_id), lista);
  }
  return mapa;
}

app.get('/api/productos', permitir(...TODOS), h(async (req, res) => {
  // Productos y sus proveedores se piden al mismo tiempo
  const [productos, relaciones] = await Promise.all([
    ds.call('GET', '/productos', {
      q: texto(req.query.q),
      estado: texto(req.query.estado),
      stock: ['con', 'sin'].includes(req.query.stockFilter) ? req.query.stockFilter : 'todos',
    }),
    ds.call('GET', '/proveedor_productos', { proveedor_id: 0 }),
  ]);
  const porProducto = proveedoresPorProducto(relaciones);
  let rows = productos.map((p) => ({ ...p, proveedores: porProducto.get(Number(p.id)) || [] }));

  // Filtro opcional por proveedor (?proveedor_id=3)
  const filtroProveedor = Number(req.query.proveedor_id || 0);
  if (filtroProveedor) {
    rows = rows.filter((p) => p.proveedores.some((x) => Number(x.proveedor_id) === filtroProveedor));
  }

  // Paginación opcional (?page=1&pageSize=10)
  const page = Number(req.query.page || 0);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize || 10), 1), 200);
  if (page > 0) {
    const inicio = (page - 1) * pageSize;
    return res.json({ data: rows.slice(inicio, inicio + pageSize), total: rows.length });
  }
  res.json({ data: rows, total: rows.length });
}));

app.get('/api/productos/:id', permitir(...TODOS), h(async (req, res) => {
  const [row] = await ds.call('GET', '/productos/{id}', { id: Number(req.params.id) });
  if (!row) throw httpError(404, 'Producto no encontrado');
  res.json({ data: row });
}));

// Los productos nuevos solo se dan de alta desde Compras (PUT /api/compras, modo "nuevo"),
// porque todo producto llega con su proveedor, su costo y su stock inicial.

app.post('/api/productos/:id', permitir(ROLES.CAPTURISTA), h(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw httpError(400, 'ID inválido');
  const [actual] = await ds.call('GET', '/productos/{id}', { id });
  if (!actual) throw httpError(404, 'Producto no encontrado');

  // Los campos que no manda el formulario conservan su valor actual
  const datos = productoBody({ ...actual, ...req.body });
  await ds.call('POST', '/productos', { id, ...datos });
  res.json({ data: { ...actual, ...datos, id } });
}));

app.delete('/api/productos/:id', permitir(ROLES.CAPTURISTA), h(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw httpError(400, 'ID inválido');
  try {
    const [r] = await ds.call('DELETE', '/productos/{id}', { id });
    if (!Number(r?.afectados)) throw httpError(404, 'Producto no encontrado');
  } catch (error) {
    if (error.code === 1451) {
      throw httpError(409, 'No se puede eliminar: el producto ya tiene ventas, compras o movimientos. Puedes marcarlo como inactivo.');
    }
    throw error;
  }
  res.json({ ok: true });
}));

/* =========================
   PRODUCTOS POR PROVEEDOR
========================= */

app.get('/api/proveedor-productos', permitir(...TODOS), h(async (req, res) => {
  const rows = await ds.call('GET', '/proveedor_productos', {
    proveedor_id: Number(req.query.proveedor_id || 0),
  });
  res.json({ data: rows });
}));

// Asignar un producto a un proveedor (crear la relación)
app.put('/api/proveedor-productos', permitir(ROLES.CAPTURISTA), h(async (req, res) => {
  const proveedor_id = Number(req.body?.proveedor_id || 0);
  const producto_id = Number(req.body?.producto_id || 0);
  const costo_actual = round2(req.body?.costo_actual);
  if (!proveedor_id || !producto_id) throw httpError(400, 'Selecciona el proveedor y el producto');
  if (costo_actual <= 0) throw httpError(400, 'Captura el costo del producto con este proveedor');

  const [r] = await ds.call('PUT', '/proveedor_productos', {
    proveedor_id, producto_id, codigo_proveedor: texto(req.body?.codigo_proveedor), costo_actual,
  });
  res.status(201).json({ data: { id: r?.id } });
}));

// Actualizar código, costo o estado de la relación
app.post('/api/proveedor-productos/:id', permitir(ROLES.CAPTURISTA), h(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw httpError(400, 'ID inválido');
  const [actual] = (await ds.call('GET', '/proveedor_productos', { proveedor_id: 0 })).filter((r) => Number(r.id) === id);
  if (!actual) throw httpError(404, 'Ese producto ya no está asignado a este proveedor');

  const costo_actual = req.body?.costo_actual !== undefined ? round2(req.body.costo_actual) : Number(actual.costo_actual);
  if (costo_actual <= 0) throw httpError(400, 'El costo debe ser mayor a cero');
  await ds.call('POST', '/proveedor_productos', {
    id,
    codigo_proveedor: req.body?.codigo_proveedor !== undefined ? texto(req.body.codigo_proveedor) : texto(actual.codigo_proveedor),
    costo_actual,
    activo: req.body?.activo !== undefined ? (req.body.activo ? 1 : 0) : Number(actual.activo),
  });
  res.json({ ok: true });
}));

// Quitar un producto de un proveedor; si ya tiene compras, se desactiva
app.delete('/api/proveedor-productos/:id', permitir(ROLES.CAPTURISTA), h(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw httpError(400, 'ID inválido');
  try {
    const [r] = await ds.call('DELETE', '/proveedor_productos/{id}', { id });
    if (!Number(r?.afectados)) throw httpError(404, 'Ese producto ya no está asignado a este proveedor');
    return res.json({ ok: true, accion: 'eliminado' });
  } catch (error) {
    if (error.code !== 1451) throw error;
  }
  const [actual] = (await ds.call('GET', '/proveedor_productos', { proveedor_id: 0 })).filter((r) => Number(r.id) === id);
  await ds.call('POST', '/proveedor_productos', {
    id, codigo_proveedor: texto(actual?.codigo_proveedor), costo_actual: Number(actual?.costo_actual || 0), activo: 0,
  });
  res.json({ ok: true, accion: 'desactivado' });
}));

/* =========================
   COMPRAS
========================= */

app.get('/api/compras', permitir(...TODOS), h(async (_req, res) => {
  res.json({ data: await ds.call('GET', '/compras') });
}));

app.put('/api/compras', permitir(ROLES.CAPTURISTA), h(async (req, res) => {
  const modo = texto(req.body?.modo).toLowerCase();
  const proveedor_id = Number(req.body?.proveedor_id || 0);
  const cantidad = Math.trunc(Number(req.body?.cantidad || 0));
  const costo = round2(req.body?.costo ?? req.body?.costo_unit ?? 0);
  const fecha = fechaConHora(req.body?.fecha);
  const notas = texto(req.body?.notas);
  const usuario_id = req.user.id; // siempre el usuario de la sesión

  if (!proveedor_id || cantidad <= 0 || costo <= 0) {
    throw httpError(400, 'Datos de compra incompletos: proveedor, cantidad y costo son obligatorios');
  }

  if (modo === 'existente') {
    const proveedor_producto_id = Number(req.body?.proveedor_producto_id || 0);
    if (!proveedor_producto_id) throw httpError(400, 'Falta seleccionar el producto existente');

    // (antes lo validaba el procedimiento registrar_compra_existente)
    const catalogo = await ds.call('GET', '/proveedor_productos', { proveedor_id });
    const item = catalogo.find((r) => Number(r.id) === proveedor_producto_id);
    if (!item || !Number(item.activo)) {
      throw httpError(400, 'El producto no pertenece al proveedor seleccionado');
    }

    const [r] = await ds.call('PUT', '/compras/existente', {
      proveedor_id, usuario_id, proveedor_producto_id, cantidad, costo, fecha, notas,
    });
    return res.status(201).json({ ok: true, data: r, message: 'Compra registrada correctamente' });
  }

  if (modo === 'nuevo') {
    const nombre_producto = texto(req.body?.nombre_producto);
    if (!nombre_producto) throw httpError(400, 'Falta el nombre del producto nuevo');

    const [r] = await ds.call('PUT', '/compras/nueva', {
      proveedor_id,
      usuario_id,
      nombre_producto,
      categoria: texto(req.body?.categoria),
      marca: texto(req.body?.marca),
      presentacion: texto(req.body?.presentacion),
      sku: texto(req.body?.sku),
      codigo_barras: texto(req.body?.codigo_barras),
      descripcion: texto(req.body?.descripcion),
      unidad: texto(req.body?.unidad) || 'pieza',
      precio_venta: round2(req.body?.precio_venta),
      stock_minimo: Math.trunc(Number(req.body?.stock_minimo || 0)),
      cantidad,
      costo,
      fecha,
      notas,
      codigo_proveedor: texto(req.body?.codigo_proveedor),
    });
    return res.status(201).json({ ok: true, data: r, message: 'Compra nueva registrada correctamente' });
  }

  throw httpError(400, 'Modo de compra inválido');
}));

/* =========================
   VENTAS
========================= */

app.get('/api/ventas', permitir(...TODOS), h(async (req, res) => {
  const desde = texto(req.query.desde);
  const hasta = texto(req.query.hasta);
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if ((desde && !re.test(desde)) || (hasta && !re.test(hasta))) throw httpError(400, 'Fechas inválidas');
  res.json({ data: await ds.call('GET', '/ventas', { desde, hasta }) });
}));

app.get('/api/ventas/:id', permitir(...TODOS), h(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw httpError(400, 'Folio inválido');

  // Encabezado y detalle se piden al mismo tiempo
  const [[venta], detalleRows] = await Promise.all([
    ds.call('GET', '/ventas/{id}', { id }),
    ds.call('GET', '/ventas/{id}/detalle', { id }),
  ]);
  if (!venta) throw httpError(404, 'Venta no encontrada');

  res.json({
    data: {
      venta: {
        id: venta.id,
        usuario_id: venta.usuario_id,
        cliente: venta.cliente,
        pago: venta.pago,
        fecha: venta.fecha,
        total: Number(venta.total || 0),
        creado: venta.creado,
        usuario: venta.usuario_id
          ? { id: venta.usuario_id, nombre: venta.usuario_nombre, rol: venta.usuario_rol }
          : null,
      },
      detalle: detalleRows.map((row) => ({
        id: row.id,
        venta_id: row.venta_id,
        producto_id: row.producto_id,
        cantidad: Number(row.cantidad || 0),
        precio: Number(row.precio || 0),
        subtotal: Number(row.subtotal || 0),
        producto: row.producto_id
          ? {
              id: row.producto_id,
              nombre: row.producto_nombre,
              precio_venta: Number(row.producto_precio_venta || 0),
              stock: Number(row.producto_stock || 0),
            }
          : null,
      })),
    },
  });
}));

app.put('/api/ventas', permitir(ROLES.CAPTURISTA), h(async (req, res) => {
  const PAGOS = ['efectivo', 'tarjeta', 'transferencia', 'mixto'];
  const cliente = texto(req.body?.cliente);
  const pago = texto(req.body?.pago).toLowerCase() || 'efectivo';
  const lineas = Array.isArray(req.body?.lineas) ? req.body.lineas : [];
  const usuario_id = req.user.id;
  const fecha = fechaLocal();

  if (!lineas.length) throw httpError(400, 'La venta no tiene productos');
  if (!PAGOS.includes(pago)) throw httpError(400, 'Forma de pago inválida');

  // 1) Normalizar líneas y juntar cantidades del mismo producto
  const normalizadas = lineas.map((item) => {
    const producto_id = Number(item?.producto_id || item?.producto?.id || 0);
    const cantidad = Math.trunc(Number(item?.cantidad || 0));
    const precio = round2(item?.precio ?? item?.precio_unitario ?? 0);
    if (!producto_id || cantidad <= 0 || precio <= 0) throw httpError(400, 'Línea de venta inválida');
    return { producto_id, cantidad, precio, subtotal: round2(cantidad * precio) };
  });

  const porProducto = new Map();
  normalizadas.forEach((l) => porProducto.set(l.producto_id, (porProducto.get(l.producto_id) || 0) + l.cantidad));

  // 2) Validar stock ANTES de crear nada (antes lo hacía el trigger validar_stock_venta)
  //    (todas las consultas de stock se hacen al mismo tiempo)
  const entradas = [...porProducto.entries()];
  const productos = await Promise.all(
    entradas.map(([producto_id]) => ds.call('GET', '/productos/{id}', { id: producto_id }).then((r) => r[0]))
  );
  entradas.forEach(([producto_id, cantidadTotal], i) => {
    const producto = productos[i];
    if (!producto) throw httpError(400, `Producto ${producto_id} no encontrado`);
    if (Number(producto.stock || 0) < cantidadTotal) {
      throw httpError(400, `Stock insuficiente para ${producto.nombre} (disponible: ${producto.stock})`);
    }
  });

  // 3) Crear encabezado y luego cada producto (descuenta stock + movimiento)
  const total = round2(normalizadas.reduce((acc, l) => acc + l.subtotal, 0));
  const [venta] = await ds.call('PUT', '/ventas', { usuario_id, cliente, pago, fecha, total });
  const venta_id = Number(venta.id);

  //    Productos distintos se registran al mismo tiempo; si un producto
  //    aparece en varias líneas, esas líneas van una tras otra para que
  //    el stock y el movimiento de inventario queden bien calculados.
  const grupos = new Map();
  normalizadas.forEach((l) => grupos.set(l.producto_id, [...(grupos.get(l.producto_id) || []), l]));

  await Promise.all(
    [...grupos.values()].map(async (lineasProducto) => {
      for (const l of lineasProducto) {
        try {
          await ds.call('PUT', '/ventas/detalle', {
            venta_id, producto_id: l.producto_id, cantidad: l.cantidad, precio: l.precio, usuario_id, fecha,
          });
        } catch (error) {
          throw httpError(500, `La venta ${venta_id} quedó incompleta al registrar el producto ${l.producto_id}: ${error.message}`);
        }
      }
    })
  );

  res.status(201).json({ data: { id: venta_id, total } });
}));

/* =========================
   DEVOLUCIONES
========================= */

app.get('/api/devoluciones', permitir(...TODOS), h(async (_req, res) => {
  res.json({ data: await ds.call('GET', '/devoluciones') });
}));

app.get('/api/devoluciones/venta/:ventaId', permitir(...TODOS), h(async (req, res) => {
  const venta_id = Number(req.params.ventaId);
  if (!venta_id) throw httpError(400, 'Venta inválida');
  res.json({ data: await ds.call('GET', '/devoluciones/venta/{venta_id}', { venta_id }) });
}));

const sinAcentos = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

app.put('/api/devoluciones', permitir(ROLES.CAPTURISTA), h(async (req, res) => {
  const venta_id = Number(req.body?.venta_id || 0);
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const usuario_id = req.user.id;
  const fecha = fechaLocal();

  if (!venta_id) throw httpError(400, 'La venta es obligatoria');
  if (!items.length) throw httpError(400, 'No hay productos para devolver');

  // Venta, detalle y devoluciones previas se piden al mismo tiempo
  const [[venta], detalle, previas] = await Promise.all([
    ds.call('GET', '/ventas/{id}', { id: venta_id }),
    ds.call('GET', '/ventas/{id}/detalle', { id: venta_id }),
    ds.call('GET', '/devoluciones/venta/{venta_id}', { venta_id }),
  ]);
  if (!venta) throw httpError(404, 'La venta original no existe');

  // Validar todo antes de registrar
  const pendientes = [];
  const enEstaSolicitud = new Map();
  for (const item of items) {
    const producto_id = Number(item?.producto_id || item?.producto?.id || 0);
    const cantidad = Math.trunc(Number(item?.cantidad || 0));
    const motivo = texto(item?.motivo);

    if (!producto_id || cantidad <= 0) throw httpError(400, 'Producto o cantidad de devolución inválidos');
    if (!motivo) throw httpError(400, 'Debes indicar el motivo de la devolución');

    const vendido = detalle
      .filter((d) => Number(d.producto_id) === producto_id)
      .reduce((acc, d) => acc + Number(d.cantidad || 0), 0);
    if (vendido <= 0) throw httpError(400, `Ese producto no existe en la venta ${venta_id}`);

    const yaDevuelto = previas
      .filter((d) => Number(d.producto_id) === producto_id)
      .reduce((acc, d) => acc + Number(d.cantidad || 0), 0);
    const solicitado = (enEstaSolicitud.get(producto_id) || 0) + cantidad;
    enEstaSolicitud.set(producto_id, solicitado);

    if (solicitado > vendido - yaDevuelto) {
      throw httpError(400, `La cantidad a devolver excede lo vendido (quedan ${vendido - yaDevuelto})`);
    }

    const precio = Number(detalle.find((d) => Number(d.producto_id) === producto_id)?.precio || 0);
    // Un producto dañado no regresa al inventario
    const regresa_inventario = sinAcentos(motivo) === 'danado' ? 0 : 1;
    pendientes.push({ producto_id, cantidad, motivo, precio, regresa_inventario });
  }

  let total = 0;
  for (const p of pendientes) {
    await ds.call('PUT', '/devoluciones', {
      venta_id, usuario_id, producto_id: p.producto_id, cantidad: p.cantidad,
      motivo: p.motivo, regresa_inventario: p.regresa_inventario, fecha,
    });
    total += p.precio * p.cantidad;
  }

  res.status(201).json({ data: { ok: true, total: round2(total) } });
}));

/* =========================
   REPORTES  (auditor y administrador; el capturista no tiene acceso)
========================= */

app.get('/api/reportes/ventas', permitir(ROLES.AUDITOR, ROLES.ADMIN), h(async (req, res) => {
  const desde = texto(req.query.desde);
  const hasta = texto(req.query.hasta);
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if ((desde && !re.test(desde)) || (hasta && !re.test(hasta))) throw httpError(400, 'Fechas inválidas');

  // Un renglón por recibo: la devolución se resta de su venta original (no se duplica)
  const recibos = (await ds.call('GET', '/reportes/ventas', { desde, hasta })).map((r) => {
    const total = round2(r.total);
    const devuelto = round2(r.monto_devuelto);
    return {
      ...r,
      total,
      monto_devuelto: devuelto,
      neto: round2(total - devuelto),
      estado: devuelto <= 0 ? 'completa' : devuelto >= total ? 'devuelta' : 'devolucion_parcial',
    };
  });

  const bruto = round2(recibos.reduce((a, r) => a + r.total, 0));
  const devuelto = round2(recibos.reduce((a, r) => a + r.monto_devuelto, 0));
  res.json({
    data: recibos,
    resumen: {
      recibos: recibos.length,
      recibos_con_devolucion: recibos.filter((r) => r.monto_devuelto > 0).length,
      ventas_brutas: bruto,
      devoluciones: devuelto,
      ventas_netas: round2(bruto - devuelto),
      ticket_promedio: recibos.length ? round2((bruto - devuelto) / recibos.length) : 0,
    },
  });
}));

/* =========================
   FACTURAS
========================= */

/** Importe devuelto de una venta: piezas devueltas × precio promedio de ese producto en la venta */
function montoDevuelto(detalle, devoluciones) {
  const precios = {};
  detalle.forEach((d) => {
    const k = Number(d.producto_id);
    precios[k] = precios[k] || { piezas: 0, importe: 0 };
    precios[k].piezas += Number(d.cantidad || 0);
    precios[k].importe += Number(d.subtotal ?? Number(d.cantidad) * Number(d.precio));
  });
  return round2(devoluciones.reduce((acc, dv) => {
    const p = precios[Number(dv.producto_id)];
    return acc + (p && p.piezas ? Number(dv.cantidad || 0) * (p.importe / p.piezas) : 0);
  }, 0));
}

const REGIMENES = ['601', '603', '605', '606', '607', '608', '610', '611', '612', '614', '615', '616', '620', '621', '622', '623', '624', '625', '626'];
const USOS_CFDI = ['G01', 'G02', 'G03', 'I01', 'I02', 'I03', 'I04', 'I08', 'D10', 'S01', 'CP01'];
const RFC_RE = /^([A-ZÑ&]{3,4})(\d{6})([A-Z0-9]{3})$/;

app.get('/api/facturas/venta/:ventaId', permitir(...TODOS), h(async (req, res) => {
  const venta_id = Number(req.params.ventaId);
  if (!venta_id) throw httpError(400, 'Folio inválido');
  const [factura] = await ds.call('GET', '/facturas/venta/{venta_id}', { venta_id });
  res.json({ data: factura || null });
}));

app.put('/api/facturas', permitir(ROLES.CAPTURISTA), h(async (req, res) => {
  const venta_id = Number(req.body?.venta_id || 0);
  const rfc = texto(req.body?.rfc).toUpperCase().replace(/\s|-/g, '');
  const razon_social = texto(req.body?.razon_social).toUpperCase();
  const regimen_fiscal = texto(req.body?.regimen_fiscal);
  const codigo_postal = texto(req.body?.codigo_postal);
  const uso_cfdi = texto(req.body?.uso_cfdi).toUpperCase();
  const correo = texto(req.body?.correo).toLowerCase();

  if (!venta_id) throw httpError(400, 'Falta el folio de la venta');
  if (!RFC_RE.test(rfc)) throw httpError(400, 'RFC inválido (12 caracteres persona moral, 13 persona física)');
  if (!razon_social) throw httpError(400, 'Captura el nombre o razón social');
  if (!REGIMENES.includes(regimen_fiscal)) throw httpError(400, 'Régimen fiscal inválido');
  if (!/^\d{5}$/.test(codigo_postal)) throw httpError(400, 'El código postal debe tener 5 dígitos');
  if (!USOS_CFDI.includes(uso_cfdi)) throw httpError(400, 'Uso de CFDI inválido');
  if (correo && !CORREO_RE.test(correo)) throw httpError(400, 'Correo inválido');

  // Importe a facturar: total de la venta menos lo ya devuelto (se consulta en el servidor, no se confía en el navegador)
  const [[venta], [yaFacturada], detalle, devoluciones] = await Promise.all([
    ds.call('GET', '/ventas/{id}', { id: venta_id }),
    ds.call('GET', '/facturas/venta/{venta_id}', { venta_id }),
    ds.call('GET', '/ventas/{id}/detalle', { id: venta_id }),
    ds.call('GET', '/devoluciones/venta/{venta_id}', { venta_id }),
  ]);
  if (!venta) throw httpError(404, 'La venta no existe');
  if (yaFacturada) throw httpError(409, `Esta venta ya tiene la factura ${yaFacturada.id}`);

  const total = round2(Number(venta.total) - montoDevuelto(detalle, devoluciones));
  if (total <= 0) throw httpError(400, 'La venta se devolvió completa; no hay importe que facturar');
  const subtotal = round2(total / 1.16);
  const iva = round2(total - subtotal);

  try {
    const [r] = await ds.call('PUT', '/facturas', {
      venta_id, rfc, razon_social, regimen_fiscal, codigo_postal, uso_cfdi, correo,
      subtotal, iva, total, usuario_id: req.user.id, fecha: fechaLocal(),
    });
    const [factura] = await ds.call('GET', '/facturas/venta/{venta_id}', { venta_id });
    res.status(201).json({ data: factura || { id: r?.id, venta_id, rfc, razon_social, subtotal, iva, total } });
  } catch (error) {
    if (error.code === 1062) throw httpError(409, 'Esta venta ya tiene factura');
    throw error;
  }
}));

/* =========================
   RESPALDO DE LA BD (solo administrador)
========================= */

app.get('/api/respaldo', permitir(ROLES.ADMIN), h(async (req, res) => {
  if (!DB_CONFIG.host || !DB_CONFIG.user) {
    throw httpError(500, 'Faltan DB_HOST / DB_USER / DB_PASSWORD en el .env para generar el respaldo');
  }

  let conn;
  try {
    conn = await crearConexionRespaldo(DB_CONFIG);
  } catch (error) {
    throw httpError(502, `No se pudo conectar a TiDB para el respaldo: ${error.message}`);
  }

  try {
    const resultado = await generarRespaldo(conn, DB_CONFIG.database, {
      generadoPor: `usuario #${req.user.id} (${req.user.rol})`,
    });
    const stamp = fechaLocal().replace(/[-: ]/g, '').slice(0, 12);
    const archivo = `respaldo_${DB_CONFIG.database}_${stamp}.sql`;

    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${archivo}"`);
    res.setHeader('X-Respaldo-Tablas', String(resultado.tablas));
    res.setHeader('X-Respaldo-Filas', String(resultado.filas));
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Respaldo-Tablas, X-Respaldo-Filas');
    res.send(resultado.sql);
  } finally {
    await conn.end().catch(() => {});
  }
}));

/* =========================
   FRONTEND COMPILADO (opcional: npm run build)
========================= */

const DIST_DIR = path.join(ROOT_DIR, 'dist');
if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  app.use(express.static(DIST_DIR));
  app.get(/^\/(?!api|uploads).*/, (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

/* =========================
   ERRORES
========================= */

app.use('/api', (_req, _res, next) => next(httpError(404, 'Ruta no encontrada')));

app.use((error, _req, res, _next) => {
  const status = error.status || (error instanceof DataServiceError ? 502 : 500);
  if (status >= 500) console.error('[API ERROR]', error);
  res.status(status).json({ error: error.message || 'Error interno del servidor' });
});

// En Netlify no se abre puerto: la función netlify/functions/api.mjs usa la app directamente
if (process.env.NODE_ENV !== 'test' && !SERVERLESS) {
  app.listen(PORT, () => {
    console.log(`API Papelería Costa Azul en http://localhost:${PORT}`);
    console.log(`Data Service: ${ds.configured() ? process.env.DATASERVICE_URL : 'SIN CONFIGURAR (revisa el .env)'}`);
    console.log(`Respaldo: ${DB_CONFIG.user || '?'}@${DB_CONFIG.host || '?'}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  });
}

export default app;
