-- =====================================================================
--  Papelería Costa Azul - Facturación (migración)
-- =====================================================================
--  Ejecutar UNA vez en el SQL Editor de TiDB, conectado como root.
--  No borra ni modifica datos existentes: solo agrega la tabla facturas
--  y da permisos a los usuarios de BD creados con 03_usuarios_bd.sql.
--
--  Nota: la factura se guarda con los datos fiscales del cliente y los
--  importes de la venta. Para que tenga validez ante el SAT se debe
--  timbrar como CFDI con un proveedor autorizado (PAC); eso queda fuera
--  de este script.
-- =====================================================================

USE papeleria_costa_azul;

CREATE TABLE IF NOT EXISTS facturas (
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

-- Permisos de los usuarios de base de datos (prefijo del cluster)
GRANT SELECT ON papeleria_costa_azul.facturas TO '4SoVMKx4ivbRccJ.auditor'@'%';
GRANT SELECT, INSERT ON papeleria_costa_azul.facturas TO '4SoVMKx4ivbRccJ.capturista'@'%';
-- El administrador ya tiene SELECT en papeleria_costa_azul.* (solo lectura).

SHOW CREATE TABLE facturas;
