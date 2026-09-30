-- PUT /proveedores
-- Crea un proveedor.
USE papeleria_costa_azul;
INSERT INTO proveedores (nombre, correo, rfc, direccion, telefono, activo)
VALUES (${nombre}, NULLIF(${correo}, ''), NULLIF(${rfc}, ''), NULLIF(${direccion}, ''), NULLIF(${telefono}, ''), 1);
SELECT LAST_INSERT_ID() AS id;
