-- PUT /usuarios
-- Crea un usuario. La contraseña llega ya cifrada desde la API.
USE papeleria_costa_azul;
INSERT INTO usuarios (nombre, usuario, correo, contrasena, rol, activo)
VALUES (${nombre}, ${usuario}, ${correo}, ${contrasena}, ${rol}, 1);
SELECT LAST_INSERT_ID() AS id;
