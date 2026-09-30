-- =====================================================================
--  Papelería Costa Azul - Usuarios de la BASE DE DATOS en TiDB Cloud
-- =====================================================================
--  Crea 3 usuarios de base de datos con permisos SOLO sobre la base
--  papeleria_costa_azul. Ninguno puede ver ni tocar otras bases.
--
--    Auditor        -> Solo lectura: consulta la información de la app
--    Capturista     -> Lectura y escritura: realiza todas las transacciones
--    Administrador  -> Lectura y escritura de usuarios, solo lectura de la app
--                      y puede hacer respaldos de la BD a local (.sql)
--
--  En TiDB Cloud todos los usuarios llevan el prefijo del cluster:
--    4SoVMKx4ivbRccJ.
--
--  ANTES DE EJECUTAR: cambia las 3 contraseñas (busca "CAMBIA_").
--  Ejecútalo completo en el SQL Editor de TiDB o en Workbench,
--  conectado con tu usuario 4SoVMKx4ivbRccJ.root.
--  Se puede volver a ejecutar: primero borra los usuarios y los recrea.
--  NO borra datos de la papelería.
-- =====================================================================

DROP USER IF EXISTS '4SoVMKx4ivbRccJ.auditor'@'%';
DROP USER IF EXISTS '4SoVMKx4ivbRccJ.capturista'@'%';
DROP USER IF EXISTS '4SoVMKx4ivbRccJ.administrador'@'%';

CREATE USER '4SoVMKx4ivbRccJ.auditor'@'%'       IDENTIFIED BY 'Auditor';
CREATE USER '4SoVMKx4ivbRccJ.capturista'@'%'    IDENTIFIED BY 'Capturista';
CREATE USER '4SoVMKx4ivbRccJ.administrador'@'%' IDENTIFIED BY 'Admin';

-- ---------------------------------------------------------------------
-- AUDITOR: solo lectura de la información de la app
-- (no puede ver la tabla usuarios, que guarda las contraseñas)
-- ---------------------------------------------------------------------
GRANT SELECT ON papeleria_costa_azul.productos              TO '4SoVMKx4ivbRccJ.auditor'@'%';
GRANT SELECT ON papeleria_costa_azul.proveedores            TO '4SoVMKx4ivbRccJ.auditor'@'%';
GRANT SELECT ON papeleria_costa_azul.proveedor_productos    TO '4SoVMKx4ivbRccJ.auditor'@'%';
GRANT SELECT ON papeleria_costa_azul.compras                TO '4SoVMKx4ivbRccJ.auditor'@'%';
GRANT SELECT ON papeleria_costa_azul.detalle_compras        TO '4SoVMKx4ivbRccJ.auditor'@'%';
GRANT SELECT ON papeleria_costa_azul.ventas                 TO '4SoVMKx4ivbRccJ.auditor'@'%';
GRANT SELECT ON papeleria_costa_azul.detalle_ventas         TO '4SoVMKx4ivbRccJ.auditor'@'%';
GRANT SELECT ON papeleria_costa_azul.devoluciones           TO '4SoVMKx4ivbRccJ.auditor'@'%';
GRANT SELECT ON papeleria_costa_azul.movimientos_inventario TO '4SoVMKx4ivbRccJ.auditor'@'%';
GRANT SELECT ON papeleria_costa_azul.vw_stock_bajo          TO '4SoVMKx4ivbRccJ.auditor'@'%';
GRANT SELECT ON papeleria_costa_azul.vw_resumen_ventas      TO '4SoVMKx4ivbRccJ.auditor'@'%';
GRANT SELECT ON papeleria_costa_azul.vw_valor_inventario    TO '4SoVMKx4ivbRccJ.auditor'@'%';
GRANT SELECT ON papeleria_costa_azul.facturas               TO '4SoVMKx4ivbRccJ.auditor'@'%';

-- ---------------------------------------------------------------------
-- CAPTURISTA: lectura y escritura, realiza todas las transacciones
-- (consultar, crear, actualizar y eliminar en las tablas de la papelería;
--  no tiene acceso a la tabla usuarios)
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON papeleria_costa_azul.productos              TO '4SoVMKx4ivbRccJ.capturista'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON papeleria_costa_azul.proveedores            TO '4SoVMKx4ivbRccJ.capturista'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON papeleria_costa_azul.proveedor_productos    TO '4SoVMKx4ivbRccJ.capturista'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON papeleria_costa_azul.compras                TO '4SoVMKx4ivbRccJ.capturista'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON papeleria_costa_azul.detalle_compras        TO '4SoVMKx4ivbRccJ.capturista'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON papeleria_costa_azul.ventas                 TO '4SoVMKx4ivbRccJ.capturista'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON papeleria_costa_azul.detalle_ventas         TO '4SoVMKx4ivbRccJ.capturista'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON papeleria_costa_azul.devoluciones           TO '4SoVMKx4ivbRccJ.capturista'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON papeleria_costa_azul.movimientos_inventario TO '4SoVMKx4ivbRccJ.capturista'@'%';
GRANT SELECT ON papeleria_costa_azul.vw_stock_bajo       TO '4SoVMKx4ivbRccJ.capturista'@'%';
GRANT SELECT ON papeleria_costa_azul.vw_resumen_ventas   TO '4SoVMKx4ivbRccJ.capturista'@'%';
GRANT SELECT ON papeleria_costa_azul.vw_valor_inventario TO '4SoVMKx4ivbRccJ.capturista'@'%';
GRANT SELECT, INSERT ON papeleria_costa_azul.facturas TO '4SoVMKx4ivbRccJ.capturista'@'%';

-- ---------------------------------------------------------------------
-- ADMINISTRADOR
--  * Solo lectura de toda la app (incluye tablas y vistas)
--  * SHOW VIEW: necesario para respaldar la definición de las vistas
--  * Lectura y escritura de la tabla usuarios
-- ---------------------------------------------------------------------
GRANT SELECT, SHOW VIEW ON papeleria_costa_azul.* TO '4SoVMKx4ivbRccJ.administrador'@'%';
GRANT INSERT, UPDATE, DELETE ON papeleria_costa_azul.usuarios TO '4SoVMKx4ivbRccJ.administrador'@'%';

-- ---------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------
SHOW GRANTS FOR '4SoVMKx4ivbRccJ.auditor'@'%';
SHOW GRANTS FOR '4SoVMKx4ivbRccJ.capturista'@'%';
SHOW GRANTS FOR '4SoVMKx4ivbRccJ.administrador'@'%';
