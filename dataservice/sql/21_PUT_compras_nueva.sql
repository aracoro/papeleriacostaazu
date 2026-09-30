-- PUT /compras/nueva
-- Registra la compra de un producto nuevo: crea el producto, lo liga al proveedor, crea compra y detalle, sube stock y guarda el movimiento.
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
