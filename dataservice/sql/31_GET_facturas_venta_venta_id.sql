-- GET /facturas/venta/{venta_id}
-- Factura de una venta, si ya se generó.
USE papeleria_costa_azul;
SELECT f.id, f.venta_id, f.rfc, f.razon_social, f.regimen_fiscal, f.codigo_postal, f.uso_cfdi,
       f.correo, f.subtotal, f.iva, f.total, f.fecha, u.nombre AS usuario_nombre
FROM facturas f
LEFT JOIN usuarios u ON u.id = f.usuario_id
WHERE f.venta_id = ${venta_id};
