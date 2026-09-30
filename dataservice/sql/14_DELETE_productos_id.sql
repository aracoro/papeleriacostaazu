-- DELETE /productos/{id}
-- Elimina un producto (falla si ya tiene ventas o movimientos).
USE papeleria_costa_azul;
DELETE FROM productos WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
