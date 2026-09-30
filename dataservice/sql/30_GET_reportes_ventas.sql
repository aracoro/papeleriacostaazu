-- GET /reportes/ventas
-- Un renglón por recibo del periodo: total vendido, lo devuelto de ese recibo y el neto. Las devoluciones se restan del recibo original; no se cuentan como otra venta.
USE papeleria_costa_azul;
SELECT v.id, v.fecha, v.pago, v.total,
       u.nombre AS usuario_nombre,
       IFNULL(d.piezas_devueltas, 0) AS piezas_devueltas,
       IFNULL(d.monto_devuelto, 0) AS monto_devuelto,
       ROUND(v.total - IFNULL(d.monto_devuelto, 0), 2) AS neto
FROM ventas v
INNER JOIN usuarios u ON u.id = v.usuario_id
LEFT JOIN (
    SELECT de.venta_id,
           SUM(de.cantidad) AS piezas_devueltas,
           ROUND(SUM(de.cantidad * pr.precio), 2) AS monto_devuelto
    FROM devoluciones de
    INNER JOIN (
        SELECT venta_id, producto_id, SUM(subtotal) / SUM(cantidad) AS precio
        FROM detalle_ventas
        GROUP BY venta_id, producto_id
    ) pr ON pr.venta_id = de.venta_id AND pr.producto_id = de.producto_id
    GROUP BY de.venta_id
) d ON d.venta_id = v.id
WHERE (IFNULL(${desde}, '') = '' OR DATE(v.fecha) >= ${desde})
  AND (IFNULL(${hasta}, '') = '' OR DATE(v.fecha) <= ${hasta})
ORDER BY v.fecha DESC, v.id DESC;
