-- PUT /compras/existente
-- Registra la compra de un producto que el proveedor ya surte: crea compra y detalle, sube stock, recalcula costo promedio y guarda el movimiento.
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
