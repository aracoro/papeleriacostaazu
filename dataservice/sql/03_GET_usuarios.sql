-- GET /usuarios
-- Lista todos los usuarios (sin contraseña).
USE papeleria_costa_azul;
SELECT id, nombre, usuario, correo, rol, activo, creado, actualizado
FROM usuarios
ORDER BY creado DESC, id DESC;
