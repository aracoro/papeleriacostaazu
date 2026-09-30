-- GET /devoluciones/venta/{venta_id}
-- Devoluciones ya hechas de una venta.
USE papeleria_costa_azul;
SELECT id, venta_id, producto_id, cantidad, motivo, fecha
FROM devoluciones
WHERE venta_id = ${venta_id}
ORDER BY fecha DESC, id DESC;
