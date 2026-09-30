-- POST /proveedor_productos
-- Actualiza el código, el costo o el estado (activo/inactivo) de un producto con un proveedor.
USE papeleria_costa_azul;
UPDATE proveedor_productos
SET codigo_proveedor = NULLIF(${codigo_proveedor}, ''),
    costo_actual = ${costo_actual},
    activo = ${activo}
WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
