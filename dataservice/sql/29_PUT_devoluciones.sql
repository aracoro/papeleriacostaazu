-- PUT /devoluciones
-- Registra la devolución de un producto. Si regresa_inventario = 1 el stock vuelve a subir (no aplica para producto dañado).
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
