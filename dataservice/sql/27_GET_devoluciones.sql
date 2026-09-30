-- GET /devoluciones
-- Historial de devoluciones con producto, usuario y monto.
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
