-- GET /usuarios/{id}
-- Consulta un usuario por su ID (sin contraseña).
USE papeleria_costa_azul;
SELECT id, nombre, usuario, correo, rol, activo, creado, actualizado
FROM usuarios
WHERE id = ${id};
