-- DELETE /proveedores/{id}
-- Elimina un proveedor (falla si tiene compras registradas).
USE papeleria_costa_azul;
DELETE FROM proveedores WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
