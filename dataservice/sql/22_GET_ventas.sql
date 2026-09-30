-- GET /ventas
-- Ventas con filtro opcional de fechas (desde / hasta en formato AAAA-MM-DD).
USE papeleria_costa_azul;
SELECT v.id, v.usuario_id, v.cliente, v.pago, v.fecha, v.total, v.creado,
       u.nombre AS usuario_nombre,
       u.rol AS usuario_rol
FROM ventas v
INNER JOIN usuarios u ON u.id = v.usuario_id
WHERE (IFNULL(${desde}, '') = '' OR DATE(v.fecha) >= ${desde})
  AND (IFNULL(${hasta}, '') = '' OR DATE(v.fecha) <= ${hasta})
ORDER BY v.fecha DESC, v.id DESC;
