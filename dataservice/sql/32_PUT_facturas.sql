-- PUT /facturas
-- Genera la factura de una venta con los datos fiscales del cliente. Una venta solo puede facturarse una vez.
USE papeleria_costa_azul;
INSERT INTO facturas (venta_id, rfc, razon_social, regimen_fiscal, codigo_postal, uso_cfdi, correo,
                      subtotal, iva, total, usuario_id, fecha)
VALUES (${venta_id}, ${rfc}, ${razon_social}, ${regimen_fiscal}, ${codigo_postal}, ${uso_cfdi},
        NULLIF(${correo}, ''), ${subtotal}, ${iva}, ${total}, ${usuario_id}, ${fecha});
SELECT LAST_INSERT_ID() AS id;
