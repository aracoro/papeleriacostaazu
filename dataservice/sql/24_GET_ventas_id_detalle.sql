-- GET /ventas/{id}/detalle
-- Productos de una venta.
USE papeleria_costa_azul;
SELECT dv.id, dv.venta_id, dv.producto_id, dv.cantidad, dv.precio, dv.subtotal,
       p.nombre AS producto_nombre,
       p.precio_venta AS producto_precio_venta,
       p.stock AS producto_stock
FROM detalle_ventas dv
LEFT JOIN productos p ON p.id = dv.producto_id
WHERE dv.venta_id = ${id}
ORDER BY dv.id ASC;
