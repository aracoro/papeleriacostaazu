-- GET /ventas/{id}
-- Encabezado de una venta (folio).
USE papeleria_costa_azul;
SELECT v.id, v.usuario_id, v.cliente, v.pago, v.fecha, v.total, v.creado,
       u.nombre AS usuario_nombre,
       u.rol AS usuario_rol
FROM ventas v
LEFT JOIN usuarios u ON u.id = v.usuario_id
WHERE v.id = ${id};
