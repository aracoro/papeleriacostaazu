-- GET /usuarios/login
-- Busca un usuario por correo o nombre de usuario (para iniciar sesión).
USE papeleria_costa_azul;
SELECT id, nombre, usuario, correo, contrasena, rol, activo
FROM usuarios
WHERE correo = ${login} OR usuario = ${login}
LIMIT 1;
