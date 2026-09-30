# Papelería Costa Azul — Examen App Primer Corte

App de punto de venta conectada a una **base de datos en la nube TiDB** que hace todas sus transacciones mediante **endpoints de TiDB Cloud Data Service**, con **gestión de usuarios por roles**.

## Cómo cumple cada punto del examen

| Lo que pide el profesor | Cómo se cumple |
|---|---|
| Conexión a BD en la nube TiDB | La base `papeleria_costa_azul` vive en TiDB Cloud (`database/01_tidb_schema.sql`). |
| Consultas de catálogos → **GET** | Endpoints GET de productos, proveedores, usuarios, compras, ventas y devoluciones. |
| Actualización de registros → **POST** | Endpoints POST de productos, proveedores y usuarios. |
| Eliminación de datos → **DELETE** | Endpoints DELETE de productos, proveedores y usuarios. |
| Creación de nuevos registros → **PUT** | Endpoints PUT de productos, proveedores, usuarios, compras, ventas y devoluciones. |
| Data Service en TiDB — Endpoints | 27 endpoints en una Data App (`dataservice/GUIA_ENDPOINTS.md`). |
| **Auditor**: solo lectura | Ve todas las pantallas de consulta; no tiene botones de escritura y la API le responde 403 si intenta escribir. |
| **Capturista**: lectura y escritura | Único rol que registra ventas, compras, devoluciones, productos y proveedores. |
| **Administrador**: usuarios + solo lectura de la app | Crea, edita, activa/desactiva y elimina usuarios; consulta la app sin modificarla. |
| **Administrador**: respaldo local `.sql` | Pantalla **Respaldo BD** → descarga un `.sql` con estructura y datos de toda la base. |

## Arquitectura

```
Navegador (React)
      │  token de sesión
      ▼
API Express (server/app.js)  ── valida sesión, rol y datos
      │  HTTPS + API key de la Data App
      ▼
TiDB Cloud Data Service (27 endpoints)
      │
      ▼
Base de datos TiDB Cloud
```

¿Por qué hay una API Express en medio? Si el navegador llamara directo a Data Service, las llaves de la Data App quedarían visibles para cualquiera con F12 y cualquiera podría saltarse los roles. Express guarda las llaves en el servidor y revisa el rol **antes** de llamar al endpoint.

La única conexión directa a TiDB (usuario y contraseña, por SSL) es la del **respaldo**, porque Data Service solo ejecuta el SQL de cada endpoint y no puede leer la estructura completa de la base.

### Qué pasó con los triggers y procedimientos

TiDB no soporta triggers, procedimientos almacenados ni funciones. Su lógica se movió así:

| En MySQL | Ahora |
|---|---|
| `validar_correo_usuario` (trigger) | Validación de correo en la API |
| `validar_stock_venta` (trigger) | La API revisa el stock de todos los productos antes de crear la venta |
| `actualizar_venta` (trigger) | Endpoint `PUT /ventas/detalle`: descuenta stock y guarda el movimiento |
| `registrar_compra_existente` + `actualizar_compra` | Endpoint `PUT /compras/existente`: compra, detalle, stock, costo promedio ponderado y movimiento |
| `registrar_compra_nueva` + `actualizar_compra` | Endpoint `PUT /compras/nueva`: crea producto, lo liga al proveedor y registra la compra |
| `valor_inventario()` (función) | Cálculo directo `stock * costo_promedio` en la vista |
| Roles y usuarios de MySQL | Roles de la aplicación: administrador, capturista, auditor |

---

## Instalación paso a paso

### 1. Crear la base de datos en TiDB

1. En TiDB Cloud entra a tu cluster → **Connect** → en *Connect With* elige **MySQL Workbench**. Anota host, puerto (4000) y usuario (tiene prefijo, p. ej. `4Xyz.root`). Genera la contraseña si no tienes.
2. En MySQL Workbench crea una conexión con esos datos. En la pestaña **SSL** pon *Use SSL* = **Require**.
3. Abre `database/01_tidb_schema.sql` y ejecútalo completo (rayo).
4. (Opcional, recomendado para el examen) ejecuta `database/02_datos_demo.sql` para tener proveedores y productos.

> ⚠️ `01_tidb_schema.sql` empieza con `DROP DATABASE`. Si lo vuelves a ejecutar, borra todo.

### 1.1 Crear los usuarios de la base de datos (permisos solo en la papelería)

1. Abre `database/03_usuarios_bd.sql` y cambia las 3 contraseñas (busca `CAMBIA_`).
2. Ejecútalo completo en el **SQL Editor** de TiDB (conectado como `root`).
3. Crea los usuarios `...auditor`, `...capturista` y `...administrador` con permisos **solo** sobre `papeleria_costa_azul`:

| Usuario de BD | Permisos |
|---|---|
| auditor | `SELECT` en tablas y vistas de la papelería (sin `usuarios`) |
| capturista | `SELECT, INSERT, UPDATE, DELETE` en las tablas de la papelería (sin `usuarios`) |
| administrador | `SELECT, SHOW VIEW` en toda la papelería + `INSERT, UPDATE, DELETE` en `usuarios` |

4. Usa el administrador para los respaldos: en `.env` (y en Netlify) pon `DB_USER=<prefijo>.administrador` y su contraseña.

Para comprobar, conéctate en Workbench con cualquiera de ellos y ejecuta `SHOW DATABASES;`: solo aparece `papeleria_costa_azul` (más las bases de sistema).

### 2. Crear la Data App y la API key

1. En TiDB Cloud → **Data Service** → **Create Data App**. Ponle nombre (ej. `papeleria_costa_azul`) y liga tu cluster.
2. Dentro de la Data App → **Authentication** → **Create API Key** → rol **ReadAndWrite**. Guarda la *Public Key* y la *Private Key*; la privada solo se muestra una vez.

> Data Service solo está disponible en clusters **TiDB Cloud Starter en AWS**.

### 3. Crear los 27 endpoints

Sigue `dataservice/GUIA_ENDPOINTS.md`. Para cada endpoint:

1. **+** → **Create Endpoint**.
2. Escribe el **Path** y elige el **Request Method** exactamente como en la guía.
3. Pega el SQL (también está en `dataservice/sql/`).
4. En **Params** revisa el *Type* de cada parámetro.
5. **Test** → que `result.code` sea `200`.
6. **Deploy**.

**Prueba primero estos dos**, porque son los más delicados (usan variables `@...` entre varias sentencias):

- `PUT /compras/existente` con valores de prueba de un producto del proveedor 1. Debe devolver `id` y `num_fact`, y en la tabla `productos` debe subir el stock.
- `PUT /ventas/detalle`. Antes crea una venta con `PUT /ventas` para tener un `venta_id`.

Si alguno falla, avísame con el mensaje de error.

### 4. Configurar el `.env`

Abre `.env` (ya trae un `SESSION_SECRET` generado) y llena:

```
DATASERVICE_URL=https://<region>.data.tidbcloud.com/api/v1beta/app/<App ID>/endpoint
DATASERVICE_PUBLIC_KEY=...
DATASERVICE_PRIVATE_KEY=...

DB_HOST=gateway01....tidbcloud.com
DB_USER=xxxx.root
DB_PASSWORD=...
```

La `DATASERVICE_URL` sale de la URL de cualquier endpoint (en **Properties → Endpoint URL**) quitándole la ruta final. Por ejemplo, si el endpoint es `https://us-east-1.data.tidbcloud.com/api/v1beta/app/dataapp-AbC12/endpoint/productos`, la URL base es `https://us-east-1.data.tidbcloud.com/api/v1beta/app/dataapp-AbC12/endpoint`.

### 5. Ejecutar

Necesitas Node.js 18 o superior.

```bash
npm install
npm run server      # terminal 1: API en http://localhost:4000
npm run dev         # terminal 2: app en http://localhost:5173
```

Para verificar la configuración abre http://localhost:4000/api/health. Debe decir `"dataService": "configurado"`.

### 6. Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@papeleria.com | admin |
| Capturista | capturista@papeleria.com | capturista |
| Auditor | auditor@papeleria.com | auditor |

---

## Publicar en Netlify

El proyecto ya incluye `netlify.toml` y `netlify/functions/api.mjs`: Netlify publica el frontend y ejecuta la API Express como función.

1. Ejecuta `npm install` en tu computadora y sube a GitHub también `package-lock.json` (incluye `serverless-http`). **No subas `.env`.**
2. En Netlify → **Site configuration → Environment variables → Import from a .env file**, pega las variables de tu `.env` (sin `API_PORT`, `FRONTEND_ORIGIN` ni `VITE_API_URL`) y agrega `UPLOAD_BASE_URL=https://TU-SITIO.netlify.app`.
3. **Deploys → Trigger deploy**. Verifica en `https://TU-SITIO.netlify.app/api/health`.

En Netlify las imágenes subidas a productos no son permanentes; todos los datos se guardan en TiDB.

## Sesión

La sesión vive solo en memoria: al refrescar (F5), cerrar la pestaña o escribir una URL directamente, la app regresa al login.

## Demostración sugerida para el examen

1. **Auditor**: entra, muestra productos, compras, devoluciones y reportes. No hay botones para crear, editar ni eliminar, y no aparecen *Ventas*, *Usuarios* ni *Respaldo*.
2. **Capturista**:
   - Crea un producto (**PUT**), edítalo (**POST**) y elimínalo (**DELETE**).
   - Registra una venta y observa cómo baja el stock.
   - Registra una compra y observa cómo sube el stock y se recalcula el costo promedio.
   - Haz una devolución.
3. **Administrador**:
   - Crea un usuario, cámbiale el rol y desactívalo.
   - Muestra que en productos solo puede consultar.
   - Ve a **Respaldo BD** y descarga el `.sql`.
4. En TiDB Cloud → Data Service, muestra la lista de endpoints con sus métodos.

## Problemas comunes

| Mensaje | Causa |
|---|---|
| `Data Service no está configurado` | Faltan `DATASERVICE_URL` o las llaves en el `.env` (reinicia `npm run server` después de editarlo). |
| `Data Service rechazó las llaves de acceso` | Llave pública/privada incorrecta o API key con rol ReadOnly. |
| `El endpoint ... no existe o no está desplegado` | Falta crear ese endpoint, el Path/Method no coincide o no le diste **Deploy**. |
| `Falta el parámetro ...` / `param check failed` | Un parámetro del endpoint tiene otro nombre o tipo que el de la guía. |
| `No se pudo conectar a TiDB para el respaldo` | Revisa `DB_HOST`, `DB_USER`, `DB_PASSWORD` y que `DB_SSL=true`. |
| La sesión se cierra sola | El token dura 8 horas (`SESSION_HOURS`), o cambiaste `SESSION_SECRET`. |

## Estructura

```
database/
  01_tidb_schema.sql        esquema para TiDB (sin triggers/procedimientos)
  02_datos_demo.sql         datos de prueba opcionales
  03_usuarios_bd.sql        usuarios de BD con permisos solo en la papelería
netlify.toml                configuración de Netlify
netlify/functions/api.mjs   la API Express como función de Netlify
dataservice/
  GUIA_ENDPOINTS.md         los 27 endpoints: método, path, parámetros y SQL
  sql/                      el SQL de cada endpoint para copiar/pegar
  generar-guia.js           regenera la guía desde server/endpoints.js
server/
  app.js                    API Express: sesión, roles y validaciones
  endpoints.js              definición de los endpoints (fuente única)
  dataService.js            cliente HTTPS de Data Service
  respaldo.js               generación del respaldo .sql
src/
  api.js                    cliente de la API (con token)
  roles.js                  roles y permisos en pantalla
  pages/RespaldoPage.jsx    pantalla de respaldo (administrador)
```
# papeleriacostaazu
