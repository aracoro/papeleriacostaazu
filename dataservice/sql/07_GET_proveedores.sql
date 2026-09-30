-- GET /proveedores
-- Catálogo de proveedores.
USE papeleria_costa_azul;
SELECT id, nombre, correo, rfc, direccion, telefono, activo, creado, actualizado
FROM proveedores
ORDER BY nombre ASC;
