-- GET /proveedor_productos
-- Productos que surte cada proveedor. proveedor_id = 0 devuelve todos.
USE papeleria_costa_azul;
SELECT pp.id, pp.proveedor_id, pp.producto_id, pp.codigo_proveedor, pp.costo_actual, pp.activo,
       pr.nombre AS proveedor_nombre,
       p.nombre AS producto_nombre,
       p.sku AS producto_sku,
       p.codigo_barras AS producto_codigo_barras,
       p.stock AS producto_stock,
       p.precio_venta AS producto_precio_venta,
       p.categoria, p.marca, p.presentacion, p.unidad
FROM proveedor_productos pp
INNER JOIN proveedores pr ON pr.id = pp.proveedor_id
INNER JOIN productos p ON p.id = pp.producto_id
WHERE (IFNULL(${proveedor_id}, 0) = 0 OR pp.proveedor_id = ${proveedor_id})
ORDER BY pr.nombre ASC, p.nombre ASC;
