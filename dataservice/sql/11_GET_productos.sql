-- GET /productos
-- Catálogo de productos con búsqueda (q), estado (activo/inactivo) y stock (todos/con/sin).
USE papeleria_costa_azul;
SELECT id, nombre, categoria, marca, presentacion, sku, codigo_barras, descripcion,
       unidad, precio_venta, costo_promedio, stock, stock_minimo, imagen, estado,
       creado, actualizado
FROM productos
WHERE (IFNULL(${q}, '') = ''
       OR nombre LIKE CONCAT('%', ${q}, '%')
       OR sku LIKE CONCAT('%', ${q}, '%')
       OR codigo_barras LIKE CONCAT('%', ${q}, '%')
       OR categoria LIKE CONCAT('%', ${q}, '%')
       OR marca LIKE CONCAT('%', ${q}, '%')
       OR presentacion LIKE CONCAT('%', ${q}, '%'))
  AND (IFNULL(${estado}, '') = '' OR estado = ${estado})
  AND (IFNULL(${stock}, 'todos') = 'todos'
       OR (${stock} = 'con' AND stock > 0)
       OR (${stock} = 'sin' AND stock <= 0))
ORDER BY nombre ASC;
