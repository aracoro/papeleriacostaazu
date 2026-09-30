-- =====================================================================
--  Datos de demostración (OPCIONAL)
--  Ejecútalo después de 01_tidb_schema.sql si quieres tener proveedores
--  y productos para probar ventas, compras y devoluciones en el examen.
-- =====================================================================

USE papeleria_costa_azul;

INSERT INTO proveedores (nombre, correo, rfc, direccion, telefono) VALUES
('Distribuidora Escolar del Pacífico', 'ventas@depacifico.mx', 'DEP010101AAA', 'Av. del Mar 120, Mazatlán', '6691234567'),
('Papelera Sinaloense', 'contacto@papelerasin.mx', 'PSI020202BBB', 'Blvd. Rafael Buelna 45, Mazatlán', '6697654321'),
('Suministros de Oficina Norte', 'pedidos@sonorte.mx', 'SON030303CCC', 'Calle Juárez 300, Culiacán', '6671112233');

INSERT INTO productos
  (nombre, categoria, marca, presentacion, sku, codigo_barras, descripcion, unidad, precio_venta, costo_promedio, stock, stock_minimo)
VALUES
('Cuaderno profesional raya', 'Cuadernos', 'Scribe', '100 hojas', 'CUA-001', '7501000000011', 'Cuaderno profesional de raya, espiral', 'pieza', 45.00, 28.00, 40, 10),
('Cuaderno profesional cuadro', 'Cuadernos', 'Scribe', '100 hojas', 'CUA-002', '7501000000028', 'Cuaderno profesional cuadro chico', 'pieza', 45.00, 28.00, 35, 10),
('Crayones', 'Arte', 'Crayola', 'Caja 24 pzas', 'ART-001', '7501000000035', 'Crayones de colores', 'caja', 65.00, 40.00, 20, 5),
('Pluma tinta gel negra', 'Escritura', 'Pilot', 'Pieza', 'ESC-001', '7501000000042', 'Pluma de gel punto fino', 'pieza', 22.00, 12.50, 80, 20),
('Lápiz grafito No. 2', 'Escritura', 'Mirado', 'Pieza', 'ESC-002', '7501000000059', 'Lápiz de grafito con goma', 'pieza', 8.00, 4.00, 150, 30),
('Goma de borrar blanca', 'Escritura', 'Pelikan', 'Pieza', 'ESC-003', '7501000000066', 'Goma blanca de migajón', 'pieza', 10.00, 5.50, 60, 15),
('Pegamento en barra', 'Adhesivos', 'Pritt', '21 g', 'ADH-001', '7501000000073', 'Lápiz adhesivo', 'pieza', 38.00, 22.00, 25, 8),
('Hojas blancas carta', 'Papel', 'Facia', 'Paquete 500', 'PAP-001', '7501000000080', 'Papel bond tamaño carta', 'paquete', 120.00, 85.00, 4, 5);

INSERT INTO proveedor_productos (proveedor_id, producto_id, codigo_proveedor, costo_actual) VALUES
(1, 1, 'DEP-SCR-R100', 28.00),
(1, 2, 'DEP-SCR-C100', 28.00),
(1, 3, 'DEP-CRA-24', 40.00),
(2, 4, 'PSI-PIL-GEL', 12.50),
(2, 5, 'PSI-MIR-2', 4.00),
(2, 6, 'PSI-PEL-GOM', 5.50),
(3, 7, 'SON-PRI-21', 22.00),
(3, 8, 'SON-FAC-500', 85.00);
