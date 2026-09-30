-- PUT /ventas/detalle
-- Agrega un producto a la venta, descuenta el stock y guarda el movimiento de inventario.
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
