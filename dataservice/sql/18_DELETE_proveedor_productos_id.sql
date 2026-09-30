-- DELETE /proveedor_productos/{id}
-- Quita un producto de un proveedor. Falla si ya hay compras con esa relación (la API la desactiva en su lugar).
USE papeleria_costa_azul;
DELETE FROM proveedor_productos WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
