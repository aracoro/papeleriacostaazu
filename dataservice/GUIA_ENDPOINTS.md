# Guía de endpoints de TiDB Cloud Data Service

Archivo generado automáticamente desde `server/endpoints.js` (no lo edites a mano).

Convención de verbos: **GET** consultar · **POST** actualizar · **DELETE** eliminar · **PUT** crear.

Total: **32 endpoints**.

## Cómo crear cada endpoint en la consola

1. En tu Data App da clic en **+** → **Create Endpoint**.
2. En **Properties**: escribe el **Path** y elige el **Request Method** exactamente como aparecen abajo. Si el endpoint indica *Max Rows*, cámbialo.
3. Pega el SQL en el editor (también está en `dataservice/sql/`).
4. En **Params**, revisa que cada parámetro tenga el **Type** indicado y marca **Required** donde diga "sí". Los parámetros de la ruta (`{id}`) se crean solos.
5. Pon valores de prueba en **Test Values**, da clic en **Test** y verifica que `result.code` sea `200`.
6. Da clic en **Deploy**.

> Crea primero los GET: son de solo lectura y no modifican datos al probarlos.

## Resumen

| # | Método | Acción | Path | Módulo |
|---|--------|--------|------|--------|
| 1 | `GET` | Consultar | `/usuarios/login` | Usuarios |
| 2 | `GET` | Consultar | `/usuarios/{id}` | Usuarios |
| 3 | `GET` | Consultar | `/usuarios` | Usuarios |
| 4 | `PUT` | Crear | `/usuarios` | Usuarios |
| 5 | `POST` | Actualizar | `/usuarios` | Usuarios |
| 6 | `DELETE` | Eliminar | `/usuarios/{id}` | Usuarios |
| 7 | `GET` | Consultar | `/proveedores` | Proveedores |
| 8 | `PUT` | Crear | `/proveedores` | Proveedores |
| 9 | `POST` | Actualizar | `/proveedores` | Proveedores |
| 10 | `DELETE` | Eliminar | `/proveedores/{id}` | Proveedores |
| 11 | `GET` | Consultar | `/productos` | Productos |
| 12 | `GET` | Consultar | `/productos/{id}` | Productos |
| 13 | `POST` | Actualizar | `/productos` | Productos |
| 14 | `DELETE` | Eliminar | `/productos/{id}` | Productos |
| 15 | `GET` | Consultar | `/proveedor_productos` | Compras |
| 16 | `PUT` | Crear | `/proveedor_productos` | Compras |
| 17 | `POST` | Actualizar | `/proveedor_productos` | Compras |
| 18 | `DELETE` | Eliminar | `/proveedor_productos/{id}` | Compras |
| 19 | `GET` | Consultar | `/compras` | Compras |
| 20 | `PUT` | Crear | `/compras/existente` | Compras |
| 21 | `PUT` | Crear | `/compras/nueva` | Compras |
| 22 | `GET` | Consultar | `/ventas` | Ventas |
| 23 | `GET` | Consultar | `/ventas/{id}` | Ventas |
| 24 | `GET` | Consultar | `/ventas/{id}/detalle` | Ventas |
| 25 | `PUT` | Crear | `/ventas` | Ventas |
| 26 | `PUT` | Crear | `/ventas/detalle` | Ventas |
| 27 | `GET` | Consultar | `/devoluciones` | Devoluciones |
| 28 | `GET` | Consultar | `/devoluciones/venta/{venta_id}` | Devoluciones |
| 29 | `PUT` | Crear | `/devoluciones` | Devoluciones |
| 30 | `GET` | Consultar | `/reportes/ventas` | Reportes |
| 31 | `GET` | Consultar | `/facturas/venta/{venta_id}` | Facturas |
| 32 | `PUT` | Crear | `/facturas` | Facturas |

## 1. GET /usuarios/login

Busca un usuario por correo o nombre de usuario (para iniciar sesión).

- **Método:** `GET` (Consultar)
- **Path:** `/usuarios/login`
- **Archivo SQL:** `dataservice/sql/01_GET_usuarios_login.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `login` | STRING | sí | Query |

```sql
USE papeleria_costa_azul;
SELECT id, nombre, usuario, correo, contrasena, rol, activo
FROM usuarios
WHERE correo = ${login} OR usuario = ${login}
LIMIT 1;
```

## 2. GET /usuarios/{id}

Consulta un usuario por su ID (sin contraseña).

- **Método:** `GET` (Consultar)
- **Path:** `/usuarios/{id}`
- **Archivo SQL:** `dataservice/sql/02_GET_usuarios_id.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `id` | INTEGER | sí | Path |

```sql
USE papeleria_costa_azul;
SELECT id, nombre, usuario, correo, rol, activo, creado, actualizado
FROM usuarios
WHERE id = ${id};
```

## 3. GET /usuarios

Lista todos los usuarios (sin contraseña).

- **Método:** `GET` (Consultar)
- **Path:** `/usuarios`
- **Archivo SQL:** `dataservice/sql/03_GET_usuarios.sql`

Sin parámetros.

```sql
USE papeleria_costa_azul;
SELECT id, nombre, usuario, correo, rol, activo, creado, actualizado
FROM usuarios
ORDER BY creado DESC, id DESC;
```

## 4. PUT /usuarios

Crea un usuario. La contraseña llega ya cifrada desde la API.

- **Método:** `PUT` (Crear)
- **Path:** `/usuarios`
- **Archivo SQL:** `dataservice/sql/04_PUT_usuarios.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `nombre` | STRING | sí | Body |
| `usuario` | STRING | sí | Body |
| `correo` | STRING | sí | Body |
| `contrasena` | STRING | sí | Body |
| `rol` | STRING | sí | Body |

```sql
USE papeleria_costa_azul;
INSERT INTO usuarios (nombre, usuario, correo, contrasena, rol, activo)
VALUES (${nombre}, ${usuario}, ${correo}, ${contrasena}, ${rol}, 1);
SELECT LAST_INSERT_ID() AS id;
```

## 5. POST /usuarios

Actualiza nombre, correo, rol y estado de un usuario.

- **Método:** `POST` (Actualizar)
- **Path:** `/usuarios`
- **Archivo SQL:** `dataservice/sql/05_POST_usuarios.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `id` | INTEGER | sí | Body |
| `nombre` | STRING | sí | Body |
| `correo` | STRING | sí | Body |
| `rol` | STRING | sí | Body |
| `activo` | INTEGER | sí | Body |

```sql
USE papeleria_costa_azul;
UPDATE usuarios
SET nombre = ${nombre},
    correo = ${correo},
    rol = ${rol},
    activo = ${activo}
WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
```

## 6. DELETE /usuarios/{id}

Elimina un usuario (falla si ya tiene ventas, compras o devoluciones).

- **Método:** `DELETE` (Eliminar)
- **Path:** `/usuarios/{id}`
- **Archivo SQL:** `dataservice/sql/06_DELETE_usuarios_id.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `id` | INTEGER | sí | Path |

```sql
USE papeleria_costa_azul;
DELETE FROM usuarios WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
```

## 7. GET /proveedores

Catálogo de proveedores.

- **Método:** `GET` (Consultar)
- **Path:** `/proveedores`
- **Archivo SQL:** `dataservice/sql/07_GET_proveedores.sql`

Sin parámetros.

```sql
USE papeleria_costa_azul;
SELECT id, nombre, correo, rfc, direccion, telefono, activo, creado, actualizado
FROM proveedores
ORDER BY nombre ASC;
```

## 8. PUT /proveedores

Crea un proveedor.

- **Método:** `PUT` (Crear)
- **Path:** `/proveedores`
- **Archivo SQL:** `dataservice/sql/08_PUT_proveedores.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `nombre` | STRING | sí | Body |
| `correo` | STRING | no | Body |
| `rfc` | STRING | no | Body |
| `direccion` | STRING | no | Body |
| `telefono` | STRING | no | Body |

```sql
USE papeleria_costa_azul;
INSERT INTO proveedores (nombre, correo, rfc, direccion, telefono, activo)
VALUES (${nombre}, NULLIF(${correo}, ''), NULLIF(${rfc}, ''), NULLIF(${direccion}, ''), NULLIF(${telefono}, ''), 1);
SELECT LAST_INSERT_ID() AS id;
```

## 9. POST /proveedores

Actualiza los datos de un proveedor.

- **Método:** `POST` (Actualizar)
- **Path:** `/proveedores`
- **Archivo SQL:** `dataservice/sql/09_POST_proveedores.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `id` | INTEGER | sí | Body |
| `nombre` | STRING | sí | Body |
| `correo` | STRING | no | Body |
| `rfc` | STRING | no | Body |
| `direccion` | STRING | no | Body |
| `telefono` | STRING | no | Body |

```sql
USE papeleria_costa_azul;
UPDATE proveedores
SET nombre = ${nombre},
    correo = NULLIF(${correo}, ''),
    rfc = NULLIF(${rfc}, ''),
    direccion = NULLIF(${direccion}, ''),
    telefono = NULLIF(${telefono}, '')
WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
```

## 10. DELETE /proveedores/{id}

Elimina un proveedor (falla si tiene compras registradas).

- **Método:** `DELETE` (Eliminar)
- **Path:** `/proveedores/{id}`
- **Archivo SQL:** `dataservice/sql/10_DELETE_proveedores_id.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `id` | INTEGER | sí | Path |

```sql
USE papeleria_costa_azul;
DELETE FROM proveedores WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
```

## 11. GET /productos

Catálogo de productos con búsqueda (q), estado (activo/inactivo) y stock (todos/con/sin).

- **Método:** `GET` (Consultar)
- **Path:** `/productos`
- **Max Rows:** 2000
- **Archivo SQL:** `dataservice/sql/11_GET_productos.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `q` | STRING | no | Query |
| `estado` | STRING | no | Query |
| `stock` | STRING | no | Query |

```sql
USE papeleria_costa_azul;
SELECT id, nombre, categoria, marca, presentacion, sku, codigo_barras, descripcion,
       unidad, precio_venta, costo_promedio, stock, stock_minimo, imagen, estado,
       creado, actualizado
FROM productos
WHERE (IFNULL(${q}, '') = ''
       OR nombre LIKE CONCAT('%', ${q}, '%')
       OR sku LIKE CONCAT('%', ${q}, '%')
       OR codigo_barras LIKE CONCAT('%', ${q}, '%')
       OR categoria LIKE CONCAT('%', ${q}, '%')
       OR marca LIKE CONCAT('%', ${q}, '%')
       OR presentacion LIKE CONCAT('%', ${q}, '%'))
  AND (IFNULL(${estado}, '') = '' OR estado = ${estado})
  AND (IFNULL(${stock}, 'todos') = 'todos'
       OR (${stock} = 'con' AND stock > 0)
       OR (${stock} = 'sin' AND stock <= 0))
ORDER BY nombre ASC;
```

## 12. GET /productos/{id}

Consulta un producto por su ID.

- **Método:** `GET` (Consultar)
- **Path:** `/productos/{id}`
- **Archivo SQL:** `dataservice/sql/12_GET_productos_id.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `id` | INTEGER | sí | Path |

```sql
USE papeleria_costa_azul;
SELECT id, nombre, categoria, marca, presentacion, sku, codigo_barras, descripcion,
       unidad, precio_venta, costo_promedio, stock, stock_minimo, imagen, estado,
       creado, actualizado
FROM productos
WHERE id = ${id};
```

## 13. POST /productos

Actualiza un producto.

- **Método:** `POST` (Actualizar)
- **Path:** `/productos`
- **Archivo SQL:** `dataservice/sql/13_POST_productos.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `id` | INTEGER | sí | Body |
| `nombre` | STRING | sí | Body |
| `categoria` | STRING | no | Body |
| `marca` | STRING | no | Body |
| `presentacion` | STRING | no | Body |
| `sku` | STRING | no | Body |
| `codigo_barras` | STRING | no | Body |
| `descripcion` | STRING | no | Body |
| `unidad` | STRING | sí | Body |
| `precio_venta` | NUMBER | sí | Body |
| `costo_promedio` | NUMBER | sí | Body |
| `stock` | INTEGER | sí | Body |
| `stock_minimo` | INTEGER | sí | Body |
| `imagen` | STRING | no | Body |
| `estado` | STRING | sí | Body |

```sql
USE papeleria_costa_azul;
UPDATE productos
SET nombre = ${nombre},
    categoria = NULLIF(${categoria}, ''),
    marca = NULLIF(${marca}, ''),
    presentacion = NULLIF(${presentacion}, ''),
    sku = NULLIF(${sku}, ''),
    codigo_barras = NULLIF(${codigo_barras}, ''),
    descripcion = NULLIF(${descripcion}, ''),
    unidad = ${unidad},
    precio_venta = ${precio_venta},
    costo_promedio = ${costo_promedio},
    stock = ${stock},
    stock_minimo = ${stock_minimo},
    imagen = NULLIF(${imagen}, ''),
    estado = ${estado}
WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
```

## 14. DELETE /productos/{id}

Elimina un producto (falla si ya tiene ventas o movimientos).

- **Método:** `DELETE` (Eliminar)
- **Path:** `/productos/{id}`
- **Archivo SQL:** `dataservice/sql/14_DELETE_productos_id.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `id` | INTEGER | sí | Path |

```sql
USE papeleria_costa_azul;
DELETE FROM productos WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
```

## 15. GET /proveedor_productos

Productos que surte cada proveedor. proveedor_id = 0 devuelve todos.

- **Método:** `GET` (Consultar)
- **Path:** `/proveedor_productos`
- **Max Rows:** 2000
- **Archivo SQL:** `dataservice/sql/15_GET_proveedor_productos.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `proveedor_id` | INTEGER | no | Query |

```sql
USE papeleria_costa_azul;
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
WHERE (IFNULL(${proveedor_id}, 0) = 0 OR pp.proveedor_id = ${proveedor_id})
ORDER BY pr.nombre ASC, p.nombre ASC;
```

## 16. PUT /proveedor_productos

Asigna un producto a un proveedor con su costo y código. Si la relación ya existía (inactiva), la reactiva con los datos nuevos.

- **Método:** `PUT` (Crear)
- **Path:** `/proveedor_productos`
- **Archivo SQL:** `dataservice/sql/16_PUT_proveedor_productos.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `proveedor_id` | INTEGER | sí | Body |
| `producto_id` | INTEGER | sí | Body |
| `codigo_proveedor` | STRING | no | Body |
| `costo_actual` | NUMBER | sí | Body |

```sql
USE papeleria_costa_azul;
INSERT INTO proveedor_productos (proveedor_id, producto_id, codigo_proveedor, costo_actual, activo)
VALUES (${proveedor_id}, ${producto_id}, NULLIF(${codigo_proveedor}, ''), ${costo_actual}, 1)
ON DUPLICATE KEY UPDATE
  codigo_proveedor = VALUES(codigo_proveedor),
  costo_actual = VALUES(costo_actual),
  activo = 1;
SELECT id FROM proveedor_productos
WHERE proveedor_id = ${proveedor_id} AND producto_id = ${producto_id};
```

## 17. POST /proveedor_productos

Actualiza el código, el costo o el estado (activo/inactivo) de un producto con un proveedor.

- **Método:** `POST` (Actualizar)
- **Path:** `/proveedor_productos`
- **Archivo SQL:** `dataservice/sql/17_POST_proveedor_productos.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `id` | INTEGER | sí | Body |
| `codigo_proveedor` | STRING | no | Body |
| `costo_actual` | NUMBER | sí | Body |
| `activo` | INTEGER | sí | Body |

```sql
USE papeleria_costa_azul;
UPDATE proveedor_productos
SET codigo_proveedor = NULLIF(${codigo_proveedor}, ''),
    costo_actual = ${costo_actual},
    activo = ${activo}
WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
```

## 18. DELETE /proveedor_productos/{id}

Quita un producto de un proveedor. Falla si ya hay compras con esa relación (la API la desactiva en su lugar).

- **Método:** `DELETE` (Eliminar)
- **Path:** `/proveedor_productos/{id}`
- **Archivo SQL:** `dataservice/sql/18_DELETE_proveedor_productos_id.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `id` | INTEGER | sí | Path |

```sql
USE papeleria_costa_azul;
DELETE FROM proveedor_productos WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
```

## 19. GET /compras

Historial de compras con proveedor y usuario.

- **Método:** `GET` (Consultar)
- **Path:** `/compras`
- **Max Rows:** 2000
- **Archivo SQL:** `dataservice/sql/19_GET_compras.sql`

Sin parámetros.

```sql
USE papeleria_costa_azul;
SELECT c.id, c.num_fact, c.proveedor_id, c.usuario_id, c.fecha, c.total, c.notas, c.creado,
       p.nombre AS proveedor_nombre,
       u.nombre AS usuario_nombre
FROM compras c
INNER JOIN proveedores p ON p.id = c.proveedor_id
INNER JOIN usuarios u ON u.id = c.usuario_id
ORDER BY c.fecha DESC, c.id DESC;
```

## 20. PUT /compras/existente

Registra la compra de un producto que el proveedor ya surte: crea compra y detalle, sube stock, recalcula costo promedio y guarda el movimiento.

- **Método:** `PUT` (Crear)
- **Path:** `/compras/existente`
- **Archivo SQL:** `dataservice/sql/20_PUT_compras_existente.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `proveedor_id` | INTEGER | sí | Body |
| `usuario_id` | INTEGER | sí | Body |
| `proveedor_producto_id` | INTEGER | sí | Body |
| `cantidad` | INTEGER | sí | Body |
| `costo` | NUMBER | sí | Body |
| `fecha` | STRING | sí | Body |
| `notas` | STRING | no | Body |

```sql
USE papeleria_costa_azul;
SET @num_fact = (SELECT IFNULL(MAX(num_fact), 0) + 1 FROM compras);
INSERT INTO compras (num_fact, proveedor_id, usuario_id, fecha, total, notas)
VALUES (@num_fact, ${proveedor_id}, ${usuario_id}, ${fecha}, ROUND(${cantidad} * ${costo}, 2), NULLIF(${notas}, ''));
SET @compra_id = LAST_INSERT_ID();
INSERT INTO detalle_compras (compra_id, proveedor_producto_id, cantidad, costo, subtotal)
VALUES (@compra_id, ${proveedor_producto_id}, ${cantidad}, ${costo}, ROUND(${cantidad} * ${costo}, 2));
SET @producto_id = (SELECT producto_id FROM proveedor_productos WHERE id = ${proveedor_producto_id});
SET @stock_anterior = (SELECT stock FROM productos WHERE id = @producto_id);
SET @costo_anterior = (SELECT costo_promedio FROM productos WHERE id = @producto_id);
SET @stock_nuevo = @stock_anterior + ${cantidad};
SET @costo_nuevo = ROUND(IF(@stock_nuevo > 0,
    ((@stock_anterior * @costo_anterior) + (${cantidad} * ${costo})) / @stock_nuevo,
    ${costo}), 2);
UPDATE productos SET stock = @stock_nuevo, costo_promedio = @costo_nuevo WHERE id = @producto_id;
UPDATE proveedor_productos SET costo_actual = ${costo} WHERE id = ${proveedor_producto_id};
INSERT INTO movimientos_inventario
  (producto_id, usuario_id, tipo, tabla_ref, id_ref, cantidad, stock_anterior, stock_nuevo, costo_anterior, costo_nuevo, fecha)
VALUES
  (@producto_id, ${usuario_id}, 'entrada_compra', 'compras', @compra_id, ${cantidad}, @stock_anterior, @stock_nuevo, @costo_anterior, @costo_nuevo, ${fecha});
SELECT @compra_id AS id, @num_fact AS num_fact, @stock_nuevo AS stock_nuevo, @costo_nuevo AS costo_promedio;
```

## 21. PUT /compras/nueva

Registra la compra de un producto nuevo: crea el producto, lo liga al proveedor, crea compra y detalle, sube stock y guarda el movimiento.

- **Método:** `PUT` (Crear)
- **Path:** `/compras/nueva`
- **Archivo SQL:** `dataservice/sql/21_PUT_compras_nueva.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `proveedor_id` | INTEGER | sí | Body |
| `usuario_id` | INTEGER | sí | Body |
| `nombre_producto` | STRING | sí | Body |
| `categoria` | STRING | no | Body |
| `marca` | STRING | no | Body |
| `presentacion` | STRING | no | Body |
| `sku` | STRING | no | Body |
| `codigo_barras` | STRING | no | Body |
| `descripcion` | STRING | no | Body |
| `unidad` | STRING | sí | Body |
| `precio_venta` | NUMBER | sí | Body |
| `stock_minimo` | INTEGER | sí | Body |
| `cantidad` | INTEGER | sí | Body |
| `costo` | NUMBER | sí | Body |
| `fecha` | STRING | sí | Body |
| `notas` | STRING | no | Body |
| `codigo_proveedor` | STRING | no | Body |

```sql
USE papeleria_costa_azul;
INSERT INTO productos (
  nombre, categoria, marca, presentacion, sku, codigo_barras, descripcion,
  unidad, precio_venta, costo_promedio, stock, stock_minimo, estado
) VALUES (
  ${nombre_producto}, NULLIF(${categoria}, ''), NULLIF(${marca}, ''), NULLIF(${presentacion}, ''),
  NULLIF(${sku}, ''), NULLIF(${codigo_barras}, ''), NULLIF(${descripcion}, ''),
  ${unidad}, ${precio_venta}, ${costo}, 0, ${stock_minimo}, 'activo'
);
SET @producto_id = LAST_INSERT_ID();
INSERT INTO proveedor_productos (proveedor_id, producto_id, codigo_proveedor, costo_actual, activo)
VALUES (${proveedor_id}, @producto_id, NULLIF(${codigo_proveedor}, ''), ${costo}, 1);
SET @proveedor_producto_id = LAST_INSERT_ID();
SET @num_fact = (SELECT IFNULL(MAX(num_fact), 0) + 1 FROM compras);
INSERT INTO compras (num_fact, proveedor_id, usuario_id, fecha, total, notas)
VALUES (@num_fact, ${proveedor_id}, ${usuario_id}, ${fecha}, ROUND(${cantidad} * ${costo}, 2), NULLIF(${notas}, ''));
SET @compra_id = LAST_INSERT_ID();
INSERT INTO detalle_compras (compra_id, proveedor_producto_id, cantidad, costo, subtotal)
VALUES (@compra_id, @proveedor_producto_id, ${cantidad}, ${costo}, ROUND(${cantidad} * ${costo}, 2));
UPDATE productos SET stock = ${cantidad} WHERE id = @producto_id;
INSERT INTO movimientos_inventario
  (producto_id, usuario_id, tipo, tabla_ref, id_ref, cantidad, stock_anterior, stock_nuevo, costo_anterior, costo_nuevo, fecha)
VALUES
  (@producto_id, ${usuario_id}, 'entrada_compra', 'compras', @compra_id, ${cantidad}, 0, ${cantidad}, ${costo}, ${costo}, ${fecha});
SELECT @compra_id AS id, @num_fact AS num_fact, @producto_id AS producto_id;
```

## 22. GET /ventas

Ventas con filtro opcional de fechas (desde / hasta en formato AAAA-MM-DD).

- **Método:** `GET` (Consultar)
- **Path:** `/ventas`
- **Max Rows:** 2000
- **Archivo SQL:** `dataservice/sql/22_GET_ventas.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `desde` | STRING | no | Query |
| `hasta` | STRING | no | Query |

```sql
USE papeleria_costa_azul;
SELECT v.id, v.usuario_id, v.cliente, v.pago, v.fecha, v.total, v.creado,
       u.nombre AS usuario_nombre,
       u.rol AS usuario_rol
FROM ventas v
INNER JOIN usuarios u ON u.id = v.usuario_id
WHERE (IFNULL(${desde}, '') = '' OR DATE(v.fecha) >= ${desde})
  AND (IFNULL(${hasta}, '') = '' OR DATE(v.fecha) <= ${hasta})
ORDER BY v.fecha DESC, v.id DESC;
```

## 23. GET /ventas/{id}

Encabezado de una venta (folio).

- **Método:** `GET` (Consultar)
- **Path:** `/ventas/{id}`
- **Archivo SQL:** `dataservice/sql/23_GET_ventas_id.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `id` | INTEGER | sí | Path |

```sql
USE papeleria_costa_azul;
SELECT v.id, v.usuario_id, v.cliente, v.pago, v.fecha, v.total, v.creado,
       u.nombre AS usuario_nombre,
       u.rol AS usuario_rol
FROM ventas v
LEFT JOIN usuarios u ON u.id = v.usuario_id
WHERE v.id = ${id};
```

## 24. GET /ventas/{id}/detalle

Productos de una venta.

- **Método:** `GET` (Consultar)
- **Path:** `/ventas/{id}/detalle`
- **Archivo SQL:** `dataservice/sql/24_GET_ventas_id_detalle.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `id` | INTEGER | sí | Path |

```sql
USE papeleria_costa_azul;
SELECT dv.id, dv.venta_id, dv.producto_id, dv.cantidad, dv.precio, dv.subtotal,
       p.nombre AS producto_nombre,
       p.precio_venta AS producto_precio_venta,
       p.stock AS producto_stock
FROM detalle_ventas dv
LEFT JOIN productos p ON p.id = dv.producto_id
WHERE dv.venta_id = ${id}
ORDER BY dv.id ASC;
```

## 25. PUT /ventas

Crea el encabezado de una venta y devuelve su folio.

- **Método:** `PUT` (Crear)
- **Path:** `/ventas`
- **Archivo SQL:** `dataservice/sql/25_PUT_ventas.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `usuario_id` | INTEGER | sí | Body |
| `cliente` | STRING | no | Body |
| `pago` | STRING | sí | Body |
| `fecha` | STRING | sí | Body |
| `total` | NUMBER | sí | Body |

```sql
USE papeleria_costa_azul;
INSERT INTO ventas (usuario_id, cliente, pago, fecha, total)
VALUES (${usuario_id}, NULLIF(${cliente}, ''), ${pago}, ${fecha}, ${total});
SELECT LAST_INSERT_ID() AS id;
```

## 26. PUT /ventas/detalle

Agrega un producto a la venta, descuenta el stock y guarda el movimiento de inventario.

- **Método:** `PUT` (Crear)
- **Path:** `/ventas/detalle`
- **Archivo SQL:** `dataservice/sql/26_PUT_ventas_detalle.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `venta_id` | INTEGER | sí | Body |
| `producto_id` | INTEGER | sí | Body |
| `cantidad` | INTEGER | sí | Body |
| `precio` | NUMBER | sí | Body |
| `usuario_id` | INTEGER | sí | Body |
| `fecha` | STRING | sí | Body |

```sql
USE papeleria_costa_azul;
SET @stock_anterior = (SELECT stock FROM productos WHERE id = ${producto_id});
SET @costo_actual = (SELECT costo_promedio FROM productos WHERE id = ${producto_id});
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio, subtotal)
VALUES (${venta_id}, ${producto_id}, ${cantidad}, ${precio}, ROUND(${cantidad} * ${precio}, 2));
UPDATE productos SET stock = stock - ${cantidad} WHERE id = ${producto_id};
INSERT INTO movimientos_inventario
  (producto_id, usuario_id, tipo, tabla_ref, id_ref, cantidad, stock_anterior, stock_nuevo, costo_anterior, costo_nuevo, fecha)
VALUES
  (${producto_id}, ${usuario_id}, 'salida_venta', 'ventas', ${venta_id}, ${cantidad},
   @stock_anterior, @stock_anterior - ${cantidad}, @costo_actual, @costo_actual, ${fecha});
SELECT @stock_anterior - ${cantidad} AS stock_nuevo;
```

## 27. GET /devoluciones

Historial de devoluciones con producto, usuario y monto.

- **Método:** `GET` (Consultar)
- **Path:** `/devoluciones`
- **Max Rows:** 2000
- **Archivo SQL:** `dataservice/sql/27_GET_devoluciones.sql`

Sin parámetros.

```sql
USE papeleria_costa_azul;
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
ORDER BY d.fecha DESC, d.id DESC;
```

## 28. GET /devoluciones/venta/{venta_id}

Devoluciones ya hechas de una venta.

- **Método:** `GET` (Consultar)
- **Path:** `/devoluciones/venta/{venta_id}`
- **Archivo SQL:** `dataservice/sql/28_GET_devoluciones_venta_venta_id.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `venta_id` | INTEGER | sí | Path |

```sql
USE papeleria_costa_azul;
SELECT id, venta_id, producto_id, cantidad, motivo, fecha
FROM devoluciones
WHERE venta_id = ${venta_id}
ORDER BY fecha DESC, id DESC;
```

## 29. PUT /devoluciones

Registra la devolución de un producto. Si regresa_inventario = 1 el stock vuelve a subir (no aplica para producto dañado).

- **Método:** `PUT` (Crear)
- **Path:** `/devoluciones`
- **Archivo SQL:** `dataservice/sql/29_PUT_devoluciones.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `venta_id` | INTEGER | sí | Body |
| `usuario_id` | INTEGER | sí | Body |
| `producto_id` | INTEGER | sí | Body |
| `cantidad` | INTEGER | sí | Body |
| `motivo` | STRING | sí | Body |
| `regresa_inventario` | INTEGER | sí | Body |
| `fecha` | STRING | sí | Body |

```sql
USE papeleria_costa_azul;
SET @stock_anterior = (SELECT stock FROM productos WHERE id = ${producto_id});
SET @costo_actual = (SELECT costo_promedio FROM productos WHERE id = ${producto_id});
SET @stock_nuevo = @stock_anterior + (${cantidad} * ${regresa_inventario});
INSERT INTO devoluciones (venta_id, usuario_id, producto_id, cantidad, motivo, fecha)
VALUES (${venta_id}, ${usuario_id}, ${producto_id}, ${cantidad}, ${motivo}, ${fecha});
SET @devolucion_id = LAST_INSERT_ID();
UPDATE productos SET stock = @stock_nuevo WHERE id = ${producto_id};
INSERT INTO movimientos_inventario
  (producto_id, usuario_id, tipo, tabla_ref, id_ref, cantidad, stock_anterior, stock_nuevo, costo_anterior, costo_nuevo, fecha)
VALUES
  (${producto_id}, ${usuario_id}, 'ajuste_manual', 'devoluciones', ${venta_id}, ${cantidad},
   @stock_anterior, @stock_nuevo, @costo_actual, @costo_actual, ${fecha});
SELECT @devolucion_id AS id, @stock_nuevo AS stock_nuevo;
```

## 30. GET /reportes/ventas

Un renglón por recibo del periodo: total vendido, lo devuelto de ese recibo y el neto. Las devoluciones se restan del recibo original; no se cuentan como otra venta.

- **Método:** `GET` (Consultar)
- **Path:** `/reportes/ventas`
- **Max Rows:** 2000
- **Archivo SQL:** `dataservice/sql/30_GET_reportes_ventas.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `desde` | STRING | no | Query |
| `hasta` | STRING | no | Query |

```sql
USE papeleria_costa_azul;
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
WHERE (IFNULL(${desde}, '') = '' OR DATE(v.fecha) >= ${desde})
  AND (IFNULL(${hasta}, '') = '' OR DATE(v.fecha) <= ${hasta})
ORDER BY v.fecha DESC, v.id DESC;
```

## 31. GET /facturas/venta/{venta_id}

Factura de una venta, si ya se generó.

- **Método:** `GET` (Consultar)
- **Path:** `/facturas/venta/{venta_id}`
- **Archivo SQL:** `dataservice/sql/31_GET_facturas_venta_venta_id.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `venta_id` | INTEGER | sí | Path |

```sql
USE papeleria_costa_azul;
SELECT f.id, f.venta_id, f.rfc, f.razon_social, f.regimen_fiscal, f.codigo_postal, f.uso_cfdi,
       f.correo, f.subtotal, f.iva, f.total, f.fecha, u.nombre AS usuario_nombre
FROM facturas f
LEFT JOIN usuarios u ON u.id = f.usuario_id
WHERE f.venta_id = ${venta_id};
```

## 32. PUT /facturas

Genera la factura de una venta con los datos fiscales del cliente. Una venta solo puede facturarse una vez.

- **Método:** `PUT` (Crear)
- **Path:** `/facturas`
- **Archivo SQL:** `dataservice/sql/32_PUT_facturas.sql`

| Parámetro | Type | Required | Ubicación |
|-----------|------|----------|-----------|
| `venta_id` | INTEGER | sí | Body |
| `rfc` | STRING | sí | Body |
| `razon_social` | STRING | sí | Body |
| `regimen_fiscal` | STRING | sí | Body |
| `codigo_postal` | STRING | sí | Body |
| `uso_cfdi` | STRING | sí | Body |
| `correo` | STRING | no | Body |
| `subtotal` | NUMBER | sí | Body |
| `iva` | NUMBER | sí | Body |
| `total` | NUMBER | sí | Body |
| `usuario_id` | INTEGER | sí | Body |
| `fecha` | STRING | sí | Body |

```sql
USE papeleria_costa_azul;
INSERT INTO facturas (venta_id, rfc, razon_social, regimen_fiscal, codigo_postal, uso_cfdi, correo,
                      subtotal, iva, total, usuario_id, fecha)
VALUES (${venta_id}, ${rfc}, ${razon_social}, ${regimen_fiscal}, ${codigo_postal}, ${uso_cfdi},
        NULLIF(${correo}, ''), ${subtotal}, ${iva}, ${total}, ${usuario_id}, ${fecha});
SELECT LAST_INSERT_ID() AS id;
```
