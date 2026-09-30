-- PUT /proveedor_productos
-- Asigna un producto a un proveedor con su costo y código. Si la relación ya existía (inactiva), la reactiva con los datos nuevos.
USE papeleria_costa_azul;
INSERT INTO proveedor_productos (proveedor_id, producto_id, codigo_proveedor, costo_actual, activo)
VALUES (${proveedor_id}, ${producto_id}, NULLIF(${codigo_proveedor}, ''), ${costo_actual}, 1)
ON DUPLICATE KEY UPDATE
  codigo_proveedor = VALUES(codigo_proveedor),
  costo_actual = VALUES(costo_actual),
  activo = 1;
SELECT id FROM proveedor_productos
WHERE proveedor_id = ${proveedor_id} AND producto_id = ${producto_id};
