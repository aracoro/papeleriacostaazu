-- GET /compras
-- Historial de compras con proveedor y usuario.
USE papeleria_costa_azul;
SELECT c.id, c.num_fact, c.proveedor_id, c.usuario_id, c.fecha, c.total, c.notas, c.creado,
       p.nombre AS proveedor_nombre,
       u.nombre AS usuario_nombre
FROM compras c
INNER JOIN proveedores p ON p.id = c.proveedor_id
INNER JOIN usuarios u ON u.id = c.usuario_id
ORDER BY c.fecha DESC, c.id DESC;
