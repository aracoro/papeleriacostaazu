-- PUT /ventas
-- Crea el encabezado de una venta y devuelve su folio.
USE papeleria_costa_azul;
INSERT INTO ventas (usuario_id, cliente, pago, fecha, total)
VALUES (${usuario_id}, NULLIF(${cliente}, ''), ${pago}, ${fecha}, ${total});
SELECT LAST_INSERT_ID() AS id;
