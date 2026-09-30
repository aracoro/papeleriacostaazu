-- GET /productos/{id}
-- Consulta un producto por su ID.
USE papeleria_costa_azul;
SELECT id, nombre, categoria, marca, presentacion, sku, codigo_barras, descripcion,
       unidad, precio_venta, costo_promedio, stock, stock_minimo, imagen, estado,
       creado, actualizado
FROM productos
WHERE id = ${id};
