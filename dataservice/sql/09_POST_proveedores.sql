-- POST /proveedores
-- Actualiza los datos de un proveedor.
USE papeleria_costa_azul;
UPDATE proveedores
SET nombre = ${nombre},
    correo = NULLIF(${correo}, ''),
    rfc = NULLIF(${rfc}, ''),
    direccion = NULLIF(${direccion}, ''),
    telefono = NULLIF(${telefono}, '')
WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
