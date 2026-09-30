/*
 * =====================================================================
 *  Endpoints de TiDB Cloud Data Service - Papelería Costa Azul
 * =====================================================================
 *  Este archivo es la ÚNICA fuente de verdad de los endpoints:
 *    - dataservice/generar-config.js lo usa para crear los archivos de
 *      configuración de la Data App y la guía de endpoints.
 *    - server/app.js lo usa para validar que cada llamada envíe los
 *      parámetros correctos.
 *
 *  Convención de verbos (la que pidió el profesor):
 *    GET    -> Consultas de catálogos
 *    POST   -> Actualización de registros
 *    DELETE -> Eliminación de datos
 *    PUT    -> Creación de nuevos registros
 *
 *  Parámetros:  ${nombre}  se sustituye por Data Service.
 *  Los parámetros de texto opcionales se envían como '' (cadena vacía)
 *  y el SQL los convierte a NULL con NULLIF(${x}, '').
 * =====================================================================
 */

export const DB_NAME = 'papeleria_costa_azul';

const USE = `USE ${DB_NAME};`;

// Atajos para declarar parámetros
const str = (name, required = false) => ({ name, type: 'string', required });
const int = (name, required = true) => ({ name, type: 'integer', required });
const num = (name, required = true) => ({ name, type: 'number', required });
const pathInt = (name) => ({ name, type: 'integer', required: true, path: true });

export const endpoints = [
  // ===================================================================
  //  USUARIOS
  // ===================================================================
  {
    name: 'usuarios_login',
    tag: 'Usuarios',
    method: 'GET',
    path: '/usuarios/login',
    description: 'Busca un usuario por correo o nombre de usuario (para iniciar sesión).',
    params: [str('login', true)],
    sql: `${USE}
SELECT id, nombre, usuario, correo, contrasena, rol, activo
FROM usuarios
WHERE correo = \${login} OR usuario = \${login}
LIMIT 1;`,
  },
  {
    name: 'usuarios_por_id',
    tag: 'Usuarios',
    method: 'GET',
    path: '/usuarios/{id}',
    description: 'Consulta un usuario por su ID (sin contraseña).',
    params: [pathInt('id')],
    sql: `${USE}
SELECT id, nombre, usuario, correo, rol, activo, creado, actualizado
FROM usuarios
WHERE id = \${id};`,
  },
  {
    name: 'usuarios_listar',
    tag: 'Usuarios',
    method: 'GET',
    path: '/usuarios',
    description: 'Lista todos los usuarios (sin contraseña).',
    params: [],
    sql: `${USE}
SELECT id, nombre, usuario, correo, rol, activo, creado, actualizado
FROM usuarios
ORDER BY creado DESC, id DESC;`,
  },
  {
    name: 'usuarios_crear',
    tag: 'Usuarios',
    method: 'PUT',
    path: '/usuarios',
    description: 'Crea un usuario. La contraseña llega ya cifrada desde la API.',
    params: [str('nombre', true), str('usuario', true), str('correo', true), str('contrasena', true), str('rol', true)],
    sql: `${USE}
INSERT INTO usuarios (nombre, usuario, correo, contrasena, rol, activo)
VALUES (\${nombre}, \${usuario}, \${correo}, \${contrasena}, \${rol}, 1);
SELECT LAST_INSERT_ID() AS id;`,
  },
  {
    name: 'usuarios_actualizar',
    tag: 'Usuarios',
    method: 'POST',
    path: '/usuarios',
    description: 'Actualiza nombre, correo, rol y estado de un usuario.',
    params: [int('id'), str('nombre', true), str('correo', true), str('rol', true), int('activo')],
    sql: `${USE}
UPDATE usuarios
SET nombre = \${nombre},
    correo = \${correo},
    rol = \${rol},
    activo = \${activo}
WHERE id = \${id};
SELECT ROW_COUNT() AS afectados;`,
  },
  {
    name: 'usuarios_eliminar',
    tag: 'Usuarios',
    method: 'DELETE',
    path: '/usuarios/{id}',
    description: 'Elimina un usuario (falla si ya tiene ventas, compras o devoluciones).',
    params: [pathInt('id')],
    sql: `${USE}
DELETE FROM usuarios WHERE id = \${id};
SELECT ROW_COUNT() AS afectados;`,
  },

  // ===================================================================
  //  PROVEEDORES
  // ===================================================================
  {
    name: 'proveedores_listar',
    tag: 'Proveedores',
    method: 'GET',
    path: '/proveedores',
    description: 'Catálogo de proveedores.',
    params: [],
    sql: `${USE}
SELECT id, nombre, correo, rfc, direccion, telefono, activo, creado, actualizado
FROM proveedores
ORDER BY nombre ASC;`,
  },
  {
    name: 'proveedores_crear',
    tag: 'Proveedores',
    method: 'PUT',
    path: '/proveedores',
    description: 'Crea un proveedor.',
    params: [str('nombre', true), str('correo'), str('rfc'), str('direccion'), str('telefono')],
    sql: `${USE}
INSERT INTO proveedores (nombre, correo, rfc, direccion, telefono, activo)
VALUES (\${nombre}, NULLIF(\${correo}, ''), NULLIF(\${rfc}, ''), NULLIF(\${direccion}, ''), NULLIF(\${telefono}, ''), 1);
SELECT LAST_INSERT_ID() AS id;`,
  },
  {
    name: 'proveedores_actualizar',
    tag: 'Proveedores',
    method: 'POST',
    path: '/proveedores',
    description: 'Actualiza los datos de un proveedor.',
    params: [int('id'), str('nombre', true), str('correo'), str('rfc'), str('direccion'), str('telefono')],
    sql: `${USE}
UPDATE proveedores
SET nombre = \${nombre},
    correo = NULLIF(\${correo}, ''),
    rfc = NULLIF(\${rfc}, ''),
    direccion = NULLIF(\${direccion}, ''),
    telefono = NULLIF(\${telefono}, '')
WHERE id = \${id};
SELECT ROW_COUNT() AS afectados;`,
  },
  {
    name: 'proveedores_eliminar',
    tag: 'Proveedores',
    method: 'DELETE',
    path: '/proveedores/{id}',
    description: 'Elimina un proveedor (falla si tiene compras registradas).',
    params: [pathInt('id')],
    sql: `${USE}
DELETE FROM proveedores WHERE id = \${id};
SELECT ROW_COUNT() AS afectados;`,
  },

  // ===================================================================
  //  PRODUCTOS
  // ===================================================================
  {
    name: 'productos_listar',
    tag: 'Productos',
    method: 'GET',
    path: '/productos',
    description: 'Catálogo de productos con búsqueda (q), estado (activo/inactivo) y stock (todos/con/sin).',
    params: [str('q'), str('estado'), str('stock')],
    maxRows: 2000,
    sql: `${USE}
SELECT id, nombre, categoria, marca, presentacion, sku, codigo_barras, descripcion,
       unidad, precio_venta, costo_promedio, stock, stock_minimo, imagen, estado,
       creado, actualizado
FROM productos
WHERE (IFNULL(\${q}, '') = ''
       OR nombre LIKE CONCAT('%', \${q}, '%')
       OR sku LIKE CONCAT('%', \${q}, '%')
       OR codigo_barras LIKE CONCAT('%', \${q}, '%')
       OR categoria LIKE CONCAT('%', \${q}, '%')
       OR marca LIKE CONCAT('%', \${q}, '%')
       OR presentacion LIKE CONCAT('%', \${q}, '%'))
  AND (IFNULL(\${estado}, '') = '' OR estado = \${estado})
  AND (IFNULL(\${stock}, 'todos') = 'todos'
       OR (\${stock} = 'con' AND stock > 0)
       OR (\${stock} = 'sin' AND stock <= 0))
ORDER BY nombre ASC;`,
  },
  {
    name: 'productos_por_id',
    tag: 'Productos',
    method: 'GET',
    path: '/productos/{id}',
    description: 'Consulta un producto por su ID.',
    params: [pathInt('id')],
    sql: `${USE}
SELECT id, nombre, categoria, marca, presentacion, sku, codigo_barras, descripcion,
       unidad, precio_venta, costo_promedio, stock, stock_minimo, imagen, estado,
       creado, actualizado
FROM productos
WHERE id = \${id};`,
  },

  {
    name: 'productos_actualizar',
    tag: 'Productos',
    method: 'POST',
    path: '/productos',
    description: 'Actualiza un producto.',
    params: [
      int('id'), str('nombre', true), str('categoria'), str('marca'), str('presentacion'), str('sku'),
      str('codigo_barras'), str('descripcion'), str('unidad', true), num('precio_venta'),
      num('costo_promedio'), int('stock'), int('stock_minimo'), str('imagen'), str('estado', true),
    ],
    sql: `${USE}
UPDATE productos
SET nombre = \${nombre},
    categoria = NULLIF(\${categoria}, ''),
    marca = NULLIF(\${marca}, ''),
    presentacion = NULLIF(\${presentacion}, ''),
    sku = NULLIF(\${sku}, ''),
    codigo_barras = NULLIF(\${codigo_barras}, ''),
    descripcion = NULLIF(\${descripcion}, ''),
    unidad = \${unidad},
    precio_venta = \${precio_venta},
    costo_promedio = \${costo_promedio},
    stock = \${stock},
    stock_minimo = \${stock_minimo},
    imagen = NULLIF(\${imagen}, ''),
    estado = \${estado}
WHERE id = \${id};
SELECT ROW_COUNT() AS afectados;`,
  },
  {
    name: 'productos_eliminar',
    tag: 'Productos',
    method: 'DELETE',
    path: '/productos/{id}',
    description: 'Elimina un producto (falla si ya tiene ventas o movimientos).',
    params: [pathInt('id')],
    sql: `${USE}
DELETE FROM productos WHERE id = \${id};
SELECT ROW_COUNT() AS afectados;`,
  },

  // ===================================================================
  //  PRODUCTOS POR PROVEEDOR
  // ===================================================================
  {
    name: 'proveedor_productos_listar',
    tag: 'Compras',
    method: 'GET',
    path: '/proveedor_productos',
    description: 'Productos que surte cada proveedor. proveedor_id = 0 devuelve todos.',
    params: [int('proveedor_id', false)],
    maxRows: 2000,
    sql: `${USE}
SELECT pp.id, pp.proveedor_id, pp.producto_id, pp.codigo_proveedor, pp.costo_actual, pp.activo,
       pr.nombre AS proveedor_nombre,
       p.nombre AS producto_nombre,
       p.sku AS producto_sku,
       p.codigo_barras AS producto_codigo_barras,
       p.stock AS producto_stock,
       p.precio_venta AS producto_precio_venta,
       p.categoria, p.marca, p.presentacion, p.unidad
FROM proveedor_productos pp
INNER JOIN proveedores pr ON pr.id = pp.proveedor_id
INNER JOIN productos p ON p.id = pp.producto_id
WHERE (IFNULL(\${proveedor_id}, 0) = 0 OR pp.proveedor_id = \${proveedor_id})
ORDER BY pr.nombre ASC, p.nombre ASC;`,
  },

  {
    name: 'proveedor_productos_asignar',
    tag: 'Compras',
    method: 'PUT',
    path: '/proveedor_productos',
    description: 'Asigna un producto a un proveedor con su costo y código. Si la relación ya existía (inactiva), la reactiva con los datos nuevos.',
    params: [int('proveedor_id'), int('producto_id'), str('codigo_proveedor'), num('costo_actual')],
    sql: `${USE}
INSERT INTO proveedor_productos (proveedor_id, producto_id, codigo_proveedor, costo_actual, activo)
VALUES (\${proveedor_id}, \${producto_id}, NULLIF(\${codigo_proveedor}, ''), \${costo_actual}, 1)
ON DUPLICATE KEY UPDATE
  codigo_proveedor = VALUES(codigo_proveedor),
  costo_actual = VALUES(costo_actual),
  activo = 1;
SELECT id FROM proveedor_productos
WHERE proveedor_id = \${proveedor_id} AND producto_id = \${producto_id};`,
  },
  {
    name: 'proveedor_productos_actualizar',
    tag: 'Compras',
    method: 'POST',
    path: '/proveedor_productos',
    description: 'Actualiza el código, el costo o el estado (activo/inactivo) de un producto con un proveedor.',
    params: [int('id'), str('codigo_proveedor'), num('costo_actual'), int('activo')],
    sql: `${USE}
UPDATE proveedor_productos
SET codigo_proveedor = NULLIF(\${codigo_proveedor}, ''),
    costo_actual = \${costo_actual},
    activo = \${activo}
WHERE id = \${id};
SELECT ROW_COUNT() AS afectados;`,
  },
  {
    name: 'proveedor_productos_quitar',
    tag: 'Compras',
    method: 'DELETE',
    path: '/proveedor_productos/{id}',
    description: 'Quita un producto de un proveedor. Falla si ya hay compras con esa relación (la API la desactiva en su lugar).',
    params: [pathInt('id')],
    sql: `${USE}
DELETE FROM proveedor_productos WHERE id = \${id};
SELECT ROW_COUNT() AS afectados;`,
  },

  // ===================================================================
  //  COMPRAS  (reemplaza a registrar_compra_existente, registrar_compra_nueva
  //            y al trigger actualizar_compra)
  // ===================================================================
  {
    name: 'compras_listar',
    tag: 'Compras',
    method: 'GET',
    path: '/compras',
    description: 'Historial de compras con proveedor y usuario.',
    params: [],
    maxRows: 2000,
    sql: `${USE}
SELECT c.id, c.num_fact, c.proveedor_id, c.usuario_id, c.fecha, c.total, c.notas, c.creado,
       p.nombre AS proveedor_nombre,
       u.nombre AS usuario_nombre
FROM compras c
INNER JOIN proveedores p ON p.id = c.proveedor_id
INNER JOIN usuarios u ON u.id = c.usuario_id
ORDER BY c.fecha DESC, c.id DESC;`,
  },
  {
    name: 'compras_crear_existente',
    tag: 'Compras',
    method: 'PUT',
    path: '/compras/existente',
    description: 'Registra la compra de un producto que el proveedor ya surte: crea compra y detalle, sube stock, recalcula costo promedio y guarda el movimiento.',
    params: [
      int('proveedor_id'), int('usuario_id'), int('proveedor_producto_id'),
      int('cantidad'), num('costo'), str('fecha', true), str('notas'),
    ],
    sql: `${USE}
SET @num_fact = (SELECT IFNULL(MAX(num_fact), 0) + 1 FROM compras);
INSERT INTO compras (num_fact, proveedor_id, usuario_id, fecha, total, notas)
VALUES (@num_fact, \${proveedor_id}, \${usuario_id}, \${fecha}, ROUND(\${cantidad} * \${costo}, 2), NULLIF(\${notas}, ''));
SET @compra_id = LAST_INSERT_ID();
INSERT INTO detalle_compras (compra_id, proveedor_producto_id, cantidad, costo, subtotal)
VALUES (@compra_id, \${proveedor_producto_id}, \${cantidad}, \${costo}, ROUND(\${cantidad} * \${costo}, 2));
SET @producto_id = (SELECT producto_id FROM proveedor_productos WHERE id = \${proveedor_producto_id});
SET @stock_anterior = (SELECT stock FROM productos WHERE id = @producto_id);
SET @costo_anterior = (SELECT costo_promedio FROM productos WHERE id = @producto_id);
SET @stock_nuevo = @stock_anterior + \${cantidad};
SET @costo_nuevo = ROUND(IF(@stock_nuevo > 0,
    ((@stock_anterior * @costo_anterior) + (\${cantidad} * \${costo})) / @stock_nuevo,
    \${costo}), 2);
UPDATE productos SET stock = @stock_nuevo, costo_promedio = @costo_nuevo WHERE id = @producto_id;
UPDATE proveedor_productos SET costo_actual = \${costo} WHERE id = \${proveedor_producto_id};
INSERT INTO movimientos_inventario
  (producto_id, usuario_id, tipo, tabla_ref, id_ref, cantidad, stock_anterior, stock_nuevo, costo_anterior, costo_nuevo, fecha)
VALUES
  (@producto_id, \${usuario_id}, 'entrada_compra', 'compras', @compra_id, \${cantidad}, @stock_anterior, @stock_nuevo, @costo_anterior, @costo_nuevo, \${fecha});
SELECT @compra_id AS id, @num_fact AS num_fact, @stock_nuevo AS stock_nuevo, @costo_nuevo AS costo_promedio;`,
  },
  {
    name: 'compras_crear_nueva',
    tag: 'Compras',
    method: 'PUT',
    path: '/compras/nueva',
    description: 'Registra la compra de un producto nuevo: crea el producto, lo liga al proveedor, crea compra y detalle, sube stock y guarda el movimiento.',
    params: [
      int('proveedor_id'), int('usuario_id'), str('nombre_producto', true), str('categoria'),
      str('marca'), str('presentacion'), str('sku'), str('codigo_barras'), str('descripcion'),
      str('unidad', true), num('precio_venta'), int('stock_minimo'), int('cantidad'), num('costo'),
      str('fecha', true), str('notas'), str('codigo_proveedor'),
    ],
    sql: `${USE}
INSERT INTO productos (
  nombre, categoria, marca, presentacion, sku, codigo_barras, descripcion,
  unidad, precio_venta, costo_promedio, stock, stock_minimo, estado
) VALUES (
  \${nombre_producto}, NULLIF(\${categoria}, ''), NULLIF(\${marca}, ''), NULLIF(\${presentacion}, ''),
  NULLIF(\${sku}, ''), NULLIF(\${codigo_barras}, ''), NULLIF(\${descripcion}, ''),
  \${unidad}, \${precio_venta}, \${costo}, 0, \${stock_minimo}, 'activo'
);
SET @producto_id = LAST_INSERT_ID();
INSERT INTO proveedor_productos (proveedor_id, producto_id, codigo_proveedor, costo_actual, activo)
VALUES (\${proveedor_id}, @producto_id, NULLIF(\${codigo_proveedor}, ''), \${costo}, 1);
SET @proveedor_producto_id = LAST_INSERT_ID();
SET @num_fact = (SELECT IFNULL(MAX(num_fact), 0) + 1 FROM compras);
INSERT INTO compras (num_fact, proveedor_id, usuario_id, fecha, total, notas)
VALUES (@num_fact, \${proveedor_id}, \${usuario_id}, \${fecha}, ROUND(\${cantidad} * \${costo}, 2), NULLIF(\${notas}, ''));
SET @compra_id = LAST_INSERT_ID();
INSERT INTO detalle_compras (compra_id, proveedor_producto_id, cantidad, costo, subtotal)
VALUES (@compra_id, @proveedor_producto_id, \${cantidad}, \${costo}, ROUND(\${cantidad} * \${costo}, 2));
UPDATE productos SET stock = \${cantidad} WHERE id = @producto_id;
INSERT INTO movimientos_inventario
  (producto_id, usuario_id, tipo, tabla_ref, id_ref, cantidad, stock_anterior, stock_nuevo, costo_anterior, costo_nuevo, fecha)
VALUES
  (@producto_id, \${usuario_id}, 'entrada_compra', 'compras', @compra_id, \${cantidad}, 0, \${cantidad}, \${costo}, \${costo}, \${fecha});
SELECT @compra_id AS id, @num_fact AS num_fact, @producto_id AS producto_id;`,
  },

  // ===================================================================
  //  VENTAS  (reemplaza a los triggers validar_stock_venta y actualizar_venta)
  // ===================================================================
  {
    name: 'ventas_listar',
    tag: 'Ventas',
    method: 'GET',
    path: '/ventas',
    description: 'Ventas con filtro opcional de fechas (desde / hasta en formato AAAA-MM-DD).',
    params: [str('desde'), str('hasta')],
    maxRows: 2000,
    sql: `${USE}
SELECT v.id, v.usuario_id, v.cliente, v.pago, v.fecha, v.total, v.creado,
       u.nombre AS usuario_nombre,
       u.rol AS usuario_rol
FROM ventas v
INNER JOIN usuarios u ON u.id = v.usuario_id
WHERE (IFNULL(\${desde}, '') = '' OR DATE(v.fecha) >= \${desde})
  AND (IFNULL(\${hasta}, '') = '' OR DATE(v.fecha) <= \${hasta})
ORDER BY v.fecha DESC, v.id DESC;`,
  },
  {
    name: 'ventas_por_id',
    tag: 'Ventas',
    method: 'GET',
    path: '/ventas/{id}',
    description: 'Encabezado de una venta (folio).',
    params: [pathInt('id')],
    sql: `${USE}
SELECT v.id, v.usuario_id, v.cliente, v.pago, v.fecha, v.total, v.creado,
       u.nombre AS usuario_nombre,
       u.rol AS usuario_rol
FROM ventas v
LEFT JOIN usuarios u ON u.id = v.usuario_id
WHERE v.id = \${id};`,
  },
  {
    name: 'ventas_detalle',
    tag: 'Ventas',
    method: 'GET',
    path: '/ventas/{id}/detalle',
    description: 'Productos de una venta.',
    params: [pathInt('id')],
    sql: `${USE}
SELECT dv.id, dv.venta_id, dv.producto_id, dv.cantidad, dv.precio, dv.subtotal,
       p.nombre AS producto_nombre,
       p.precio_venta AS producto_precio_venta,
       p.stock AS producto_stock
FROM detalle_ventas dv
LEFT JOIN productos p ON p.id = dv.producto_id
WHERE dv.venta_id = \${id}
ORDER BY dv.id ASC;`,
  },
  {
    name: 'ventas_crear',
    tag: 'Ventas',
    method: 'PUT',
    path: '/ventas',
    description: 'Crea el encabezado de una venta y devuelve su folio.',
    params: [int('usuario_id'), str('cliente'), str('pago', true), str('fecha', true), num('total')],
    sql: `${USE}
INSERT INTO ventas (usuario_id, cliente, pago, fecha, total)
VALUES (\${usuario_id}, NULLIF(\${cliente}, ''), \${pago}, \${fecha}, \${total});
SELECT LAST_INSERT_ID() AS id;`,
  },
  {
    name: 'ventas_crear_detalle',
    tag: 'Ventas',
    method: 'PUT',
    path: '/ventas/detalle',
    description: 'Agrega un producto a la venta, descuenta el stock y guarda el movimiento de inventario.',
    params: [int('venta_id'), int('producto_id'), int('cantidad'), num('precio'), int('usuario_id'), str('fecha', true)],
    sql: `${USE}
SET @stock_anterior = (SELECT stock FROM productos WHERE id = \${producto_id});
SET @costo_actual = (SELECT costo_promedio FROM productos WHERE id = \${producto_id});
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio, subtotal)
VALUES (\${venta_id}, \${producto_id}, \${cantidad}, \${precio}, ROUND(\${cantidad} * \${precio}, 2));
UPDATE productos SET stock = stock - \${cantidad} WHERE id = \${producto_id};
INSERT INTO movimientos_inventario
  (producto_id, usuario_id, tipo, tabla_ref, id_ref, cantidad, stock_anterior, stock_nuevo, costo_anterior, costo_nuevo, fecha)
VALUES
  (\${producto_id}, \${usuario_id}, 'salida_venta', 'ventas', \${venta_id}, \${cantidad},
   @stock_anterior, @stock_anterior - \${cantidad}, @costo_actual, @costo_actual, \${fecha});
SELECT @stock_anterior - \${cantidad} AS stock_nuevo;`,
  },

  // ===================================================================
  //  DEVOLUCIONES
  // ===================================================================
  {
    name: 'devoluciones_listar',
    tag: 'Devoluciones',
    method: 'GET',
    path: '/devoluciones',
    description: 'Historial de devoluciones con producto, usuario y monto.',
    params: [],
    maxRows: 2000,
    sql: `${USE}
SELECT d.id, d.venta_id, d.producto_id, d.cantidad, d.motivo, d.fecha,
       u.nombre AS usuario_nombre,
       p.nombre AS producto_nombre,
       (SELECT MAX(dv.precio) FROM detalle_ventas dv
         WHERE dv.venta_id = d.venta_id AND dv.producto_id = d.producto_id) AS precio,
       d.cantidad * (SELECT MAX(dv.precio) FROM detalle_ventas dv
         WHERE dv.venta_id = d.venta_id AND dv.producto_id = d.producto_id) AS monto_devuelto
FROM devoluciones d
LEFT JOIN usuarios u ON u.id = d.usuario_id
LEFT JOIN productos p ON p.id = d.producto_id
ORDER BY d.fecha DESC, d.id DESC;`,
  },
  {
    name: 'devoluciones_por_venta',
    tag: 'Devoluciones',
    method: 'GET',
    path: '/devoluciones/venta/{venta_id}',
    description: 'Devoluciones ya hechas de una venta.',
    params: [pathInt('venta_id')],
    sql: `${USE}
SELECT id, venta_id, producto_id, cantidad, motivo, fecha
FROM devoluciones
WHERE venta_id = \${venta_id}
ORDER BY fecha DESC, id DESC;`,
  },
  {
    name: 'devoluciones_crear',
    tag: 'Devoluciones',
    method: 'PUT',
    path: '/devoluciones',
    description: 'Registra la devolución de un producto. Si regresa_inventario = 1 el stock vuelve a subir (no aplica para producto dañado).',
    params: [
      int('venta_id'), int('usuario_id'), int('producto_id'), int('cantidad'),
      str('motivo', true), int('regresa_inventario'), str('fecha', true),
    ],
    sql: `${USE}
SET @stock_anterior = (SELECT stock FROM productos WHERE id = \${producto_id});
SET @costo_actual = (SELECT costo_promedio FROM productos WHERE id = \${producto_id});
SET @stock_nuevo = @stock_anterior + (\${cantidad} * \${regresa_inventario});
INSERT INTO devoluciones (venta_id, usuario_id, producto_id, cantidad, motivo, fecha)
VALUES (\${venta_id}, \${usuario_id}, \${producto_id}, \${cantidad}, \${motivo}, \${fecha});
SET @devolucion_id = LAST_INSERT_ID();
UPDATE productos SET stock = @stock_nuevo WHERE id = \${producto_id};
INSERT INTO movimientos_inventario
  (producto_id, usuario_id, tipo, tabla_ref, id_ref, cantidad, stock_anterior, stock_nuevo, costo_anterior, costo_nuevo, fecha)
VALUES
  (\${producto_id}, \${usuario_id}, 'ajuste_manual', 'devoluciones', \${venta_id}, \${cantidad},
   @stock_anterior, @stock_nuevo, @costo_actual, @costo_actual, \${fecha});
SELECT @devolucion_id AS id, @stock_nuevo AS stock_nuevo;`,
  },
  // ===================================================================
  //  REPORTES
  // ===================================================================
  {
    name: 'reportes_ventas',
    tag: 'Reportes',
    method: 'GET',
    path: '/reportes/ventas',
    description: 'Un renglón por recibo del periodo: total vendido, lo devuelto de ese recibo y el neto. Las devoluciones se restan del recibo original; no se cuentan como otra venta.',
    params: [str('desde'), str('hasta')],
    maxRows: 2000,
    sql: `${USE}
SELECT v.id, v.fecha, v.pago, v.total,
       u.nombre AS usuario_nombre,
       IFNULL(d.piezas_devueltas, 0) AS piezas_devueltas,
       IFNULL(d.monto_devuelto, 0) AS monto_devuelto,
       ROUND(v.total - IFNULL(d.monto_devuelto, 0), 2) AS neto
FROM ventas v
INNER JOIN usuarios u ON u.id = v.usuario_id
LEFT JOIN (
    SELECT de.venta_id,
           SUM(de.cantidad) AS piezas_devueltas,
           ROUND(SUM(de.cantidad * pr.precio), 2) AS monto_devuelto
    FROM devoluciones de
    INNER JOIN (
        SELECT venta_id, producto_id, SUM(subtotal) / SUM(cantidad) AS precio
        FROM detalle_ventas
        GROUP BY venta_id, producto_id
    ) pr ON pr.venta_id = de.venta_id AND pr.producto_id = de.producto_id
    GROUP BY de.venta_id
) d ON d.venta_id = v.id
WHERE (IFNULL(\${desde}, '') = '' OR DATE(v.fecha) >= \${desde})
  AND (IFNULL(\${hasta}, '') = '' OR DATE(v.fecha) <= \${hasta})
ORDER BY v.fecha DESC, v.id DESC;`,
  },

  // ===================================================================
  //  FACTURAS
  // ===================================================================
  {
    name: 'facturas_por_venta',
    tag: 'Facturas',
    method: 'GET',
    path: '/facturas/venta/{venta_id}',
    description: 'Factura de una venta, si ya se generó.',
    params: [pathInt('venta_id')],
    sql: `${USE}
SELECT f.id, f.venta_id, f.rfc, f.razon_social, f.regimen_fiscal, f.codigo_postal, f.uso_cfdi,
       f.correo, f.subtotal, f.iva, f.total, f.fecha, u.nombre AS usuario_nombre
FROM facturas f
LEFT JOIN usuarios u ON u.id = f.usuario_id
WHERE f.venta_id = \${venta_id};`,
  },
  {
    name: 'facturas_crear',
    tag: 'Facturas',
    method: 'PUT',
    path: '/facturas',
    description: 'Genera la factura de una venta con los datos fiscales del cliente. Una venta solo puede facturarse una vez.',
    params: [
      int('venta_id'), str('rfc', true), str('razon_social', true), str('regimen_fiscal', true),
      str('codigo_postal', true), str('uso_cfdi', true), str('correo'),
      num('subtotal'), num('iva'), num('total'), int('usuario_id'), str('fecha', true),
    ],
    sql: `${USE}
INSERT INTO facturas (venta_id, rfc, razon_social, regimen_fiscal, codigo_postal, uso_cfdi, correo,
                      subtotal, iva, total, usuario_id, fecha)
VALUES (\${venta_id}, \${rfc}, \${razon_social}, \${regimen_fiscal}, \${codigo_postal}, \${uso_cfdi},
        NULLIF(\${correo}, ''), \${subtotal}, \${iva}, \${total}, \${usuario_id}, \${fecha});
SELECT LAST_INSERT_ID() AS id;`,
  },
];

/** Busca la definición de un endpoint por método y ruta (con {parametros}). */
export function findEndpoint(method, path) {
  return endpoints.find((e) => e.method === method && e.path === path) || null;
}
