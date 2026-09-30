-- POST /usuarios
-- Actualiza nombre, correo, rol y estado de un usuario.
USE papeleria_costa_azul;
UPDATE usuarios
SET nombre = ${nombre},
    correo = ${correo},
    rol = ${rol},
    activo = ${activo}
WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
