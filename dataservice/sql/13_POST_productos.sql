-- POST /productos
-- Actualiza un producto.
USE papeleria_costa_azul;
UPDATE productos
SET nombre = ${nombre},
    categoria = NULLIF(${categoria}, ''),
    marca = NULLIF(${marca}, ''),
    presentacion = NULLIF(${presentacion}, ''),
    sku = NULLIF(${sku}, ''),
    codigo_barras = NULLIF(${codigo_barras}, ''),
    descripcion = NULLIF(${descripcion}, ''),
    unidad = ${unidad},
    precio_venta = ${precio_venta},
    costo_promedio = ${costo_promedio},
    stock = ${stock},
    stock_minimo = ${stock_minimo},
    imagen = NULLIF(${imagen}, ''),
    estado = ${estado}
WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
