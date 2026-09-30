-- =====================================================================
--  Papelería Costa Azul - Esquema para TiDB Cloud
-- =====================================================================
--  Adaptado del script original de MySQL. Cambios para TiDB:
--
--  * TiDB NO soporta funciones, triggers ni procedimientos almacenados.
--    Su lógica se movió a los endpoints de Data Service (carpeta
--    /dataservice) y a la API Express:
--      - validar_correo_usuario   -> validación en server/app.js
--      - validar_stock_venta      -> validación en server/app.js (PUT /api/ventas)
--      - actualizar_venta         -> endpoint PUT /ventas/detalle
--      - actualizar_compra        -> endpoints PUT /compras/existente y /compras/nueva
--      - registrar_compra_*       -> endpoints PUT /compras/existente y /compras/nueva
--      - valor_inventario()       -> cálculo directo en la vista vw_valor_inventario
--
--  * Los roles y usuarios de MySQL (CREATE ROLE / CREATE USER) se quitaron.
--    Los permisos ahora los controla la aplicación con 3 roles:
--      administrador, capturista y auditor.
--
--  * AUTO_ID_CACHE=1 hace que los ID (folios de venta, compras, etc.)
--    sean consecutivos como en MySQL. Sin esto TiDB puede saltar números.
--
--  Cómo usarlo: conéctate a TiDB con MySQL Workbench (SSL = Require),
--  abre este archivo y ejecútalo completo.
-- =====================================================================

DROP DATABASE IF EXISTS papeleria_costa_azul;
CREATE DATABASE papeleria_costa_azul;
USE papeleria_costa_azul;

CREATE TABLE usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    correo VARCHAR(150) UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    rol ENUM('administrador','capturista','auditor') NOT NULL DEFAULT 'auditor',
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) AUTO_ID_CACHE=1;

CREATE TABLE proveedores (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(150),
    rfc VARCHAR(30),
    direccion VARCHAR(255),
    telefono VARCHAR(30),
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) AUTO_ID_CACHE=1;

CREATE TABLE productos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(100),
    marca VARCHAR(100),
    presentacion VARCHAR(100),
    sku VARCHAR(100) UNIQUE,
    codigo_barras VARCHAR(100) UNIQUE,
    descripcion TEXT,
    unidad VARCHAR(30) NOT NULL DEFAULT 'pieza',
    precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    costo_promedio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 0,
    imagen VARCHAR(500),
    estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_producto (nombre, marca, presentacion)
) AUTO_ID_CACHE=1;

CREATE TABLE proveedor_productos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    proveedor_id INT UNSIGNED NOT NULL,
    producto_id INT UNSIGNED NOT NULL,
    codigo_proveedor VARCHAR(100),
    costo_actual DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_proveedor_producto (proveedor_id, producto_id),
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) AUTO_ID_CACHE=1;

CREATE TABLE compras (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    num_fact INT UNSIGNED UNIQUE,
    proveedor_id INT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    notas TEXT,
    creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) AUTO_ID_CACHE=1;

CREATE TABLE detalle_compras (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    compra_id INT UNSIGNED NOT NULL,
    proveedor_producto_id INT UNSIGNED NOT NULL,
    cantidad INT NOT NULL,
    costo DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (compra_id) REFERENCES compras(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (proveedor_producto_id) REFERENCES proveedor_productos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) AUTO_ID_CACHE=1;

CREATE TABLE ventas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    cliente VARCHAR(150),
    pago ENUM('efectivo','tarjeta','transferencia','mixto') NOT NULL DEFAULT 'efectivo',
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) AUTO_ID_CACHE=1;

CREATE TABLE detalle_ventas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venta_id INT UNSIGNED NOT NULL,
    producto_id INT UNSIGNED NOT NULL,
    cantidad INT NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venta_id) REFERENCES ventas(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) AUTO_ID_CACHE=1;

CREATE TABLE movimientos_inventario (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    producto_id INT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED,
    tipo ENUM('entrada_compra','salida_venta','ajuste_manual') NOT NULL,
    tabla_ref VARCHAR(50),
    id_ref INT UNSIGNED,
    cantidad INT NOT NULL,
    stock_anterior INT NOT NULL,
    stock_nuevo INT NOT NULL,
    costo_anterior DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    costo_nuevo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) AUTO_ID_CACHE=1;

CREATE TABLE devoluciones (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venta_id INT UNSIGNED,
    usuario_id INT UNSIGNED NOT NULL,
    producto_id INT UNSIGNED NOT NULL,
    cantidad INT NOT NULL,
    motivo TEXT,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venta_id) REFERENCES ventas(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) AUTO_ID_CACHE=1;

-- Facturas de venta (una por venta como máximo)
CREATE TABLE facturas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venta_id INT UNSIGNED NOT NULL,
    rfc VARCHAR(13) NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    regimen_fiscal CHAR(3) NOT NULL,
    codigo_postal CHAR(5) NOT NULL,
    uso_cfdi VARCHAR(4) NOT NULL,
    correo VARCHAR(150),
    subtotal DECIMAL(10,2) NOT NULL,
    iva DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    usuario_id INT UNSIGNED NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_factura_venta (venta_id),
    FOREIGN KEY (venta_id) REFERENCES ventas(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) AUTO_ID_CACHE=1;

-- ---------------------------------------------------------------------
-- Vistas (reportes)
-- ---------------------------------------------------------------------

CREATE VIEW vw_stock_bajo AS
SELECT
    id,
    nombre,
    categoria,
    marca,
    presentacion,
    stock,
    stock_minimo,
    precio_venta
FROM productos
WHERE stock <= stock_minimo;

CREATE VIEW vw_resumen_ventas AS
SELECT
    v.id,
    v.fecha,
    u.nombre AS usuario,
    v.cliente,
    v.pago,
    v.total
FROM ventas v
INNER JOIN usuarios u ON u.id = v.usuario_id;

-- Antes usaba la función valor_inventario(); ahora el cálculo va directo.
CREATE VIEW vw_valor_inventario AS
SELECT
    p.id,
    p.nombre,
    p.stock,
    p.costo_promedio,
    (p.stock * p.costo_promedio) AS valor_total
FROM productos p;

-- ---------------------------------------------------------------------
-- Usuarios iniciales (uno por rol)
-- Las contraseñas van cifradas (scrypt). Para entrar usa:
--   admin@papeleria.com       / admin
--   capturista@papeleria.com  / capturista
--   auditor@papeleria.com     / auditor
-- ---------------------------------------------------------------------

INSERT INTO usuarios (nombre, usuario, correo, contrasena, rol, activo) VALUES
('Administrador General', 'administrador', 'admin@papeleria.com',
 'scrypt$4c23ccc10ef42cb7bcb1015ab50e2300$61b13ba98358d9fee8be12800d2f6b79448340606edf219259606ec700d12f45045b2b4895a4200153d5a0e4773e92ae455657a89dcb84dad7571e84bcb48487',
 'administrador', 1),
('Usuario Capturista', 'capturista', 'capturista@papeleria.com',
 'scrypt$71c47c3e061682f66895a4f09f4b5c3c$a2f5e50e185379dc43c2b6a767f4ee84a698fd902aec5d0500370316d7c2959416ced5c8e92e196dc35eea3d53a1df9cdfe2a53f05c9a591b35e620df1b8ef1e',
 'capturista', 1),
('Usuario Auditor', 'auditor', 'auditor@papeleria.com',
 'scrypt$dd8f4ce64c8202684ed552ed6d72501f$f28377d9db77d65aeae16d25f29b5baabc4d38f7c5fdb1c737cd68688e8d51ddb7bb25562da3d7f96a08df7d22bc67f0bb01a18346385acf1748675f38aff304',
 'auditor', 1);
