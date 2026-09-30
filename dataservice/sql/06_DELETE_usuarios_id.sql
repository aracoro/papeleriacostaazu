-- DELETE /usuarios/{id}
-- Elimina un usuario (falla si ya tiene ventas, compras o devoluciones).
USE papeleria_costa_azul;
DELETE FROM usuarios WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
