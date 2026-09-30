/*
 * Respaldo de la base de datos de TiDB a un archivo .sql local.
 *
 * Es la única parte que se conecta directo a TiDB (con usuario y
 * contraseña, por SSL): Data Service solo ejecuta los SQL de cada
 * endpoint y no puede leer la estructura completa de la base.
 *
 * El archivo generado se puede importar en un MySQL local
 * (los comentarios /*T! ... *\/ propios de TiDB, MySQL los ignora).
 */

const BATCH = 100;

export async function crearConexionRespaldo(config) {
  const mysql = await import('mysql2/promise');
  return mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
}

/**
 * Genera el contenido del respaldo.
 * @param {object} conn  conexión mysql2/promise (query + format)
 * @param {string} database
 */
export async function generarRespaldo(conn, database, { generadoPor = '' } = {}) {
  const out = [];
  const q = (id) => '`' + String(id).replace(/`/g, '``') + '`';

  const [tablas] = await conn.query(
    `SELECT TABLE_NAME AS nombre, TABLE_TYPE AS tipo
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME`,
    [database]
  );

  const baseTables = tablas.filter((t) => t.tipo === 'BASE TABLE').map((t) => t.nombre);
  const views = tablas.filter((t) => t.tipo === 'VIEW').map((t) => t.nombre);

  out.push('-- ==========================================================');
  out.push(`-- Respaldo de la base de datos ${database}`);
  out.push('-- Papelería Costa Azul - generado desde TiDB Cloud');
  out.push(`-- Fecha: ${new Date().toISOString()}`);
  if (generadoPor) out.push(`-- Generado por: ${generadoPor}`);
  out.push(`-- Tablas: ${baseTables.length}  Vistas: ${views.length}`);
  out.push('-- ==========================================================');
  out.push('');
  out.push('SET NAMES utf8mb4;');
  out.push('SET FOREIGN_KEY_CHECKS = 0;');
  out.push('');
  out.push(`CREATE DATABASE IF NOT EXISTS ${q(database)};`);
  out.push(`USE ${q(database)};`);
  out.push('');

  let totalFilas = 0;

  for (const tabla of baseTables) {
    const [[create]] = await conn.query(`SHOW CREATE TABLE ${q(tabla)}`);
    const createSql = create['Create Table'];

    out.push('-- ----------------------------------------------------------');
    out.push(`-- Tabla ${tabla}`);
    out.push('-- ----------------------------------------------------------');
    out.push(`DROP TABLE IF EXISTS ${q(tabla)};`);
    out.push(`${createSql};`);
    out.push('');

    const [rows] = await conn.query({ sql: `SELECT * FROM ${q(tabla)}`, rowsAsArray: true });
    totalFilas += rows.length;

    for (let i = 0; i < rows.length; i += BATCH) {
      const lote = rows.slice(i, i + BATCH);
      out.push(conn.format(`INSERT INTO ${q(tabla)} VALUES ?;`, [lote]));
    }
    if (rows.length) out.push('');
  }

  for (const vista of views) {
    const [[create]] = await conn.query(`SHOW CREATE VIEW ${q(vista)}`);
    // Quitamos DEFINER / ALGORITHM / SQL SECURITY: el usuario de TiDB no existe en MySQL local
    const createSql = String(create['Create View'])
      .replace(/\s+ALGORITHM\s*=\s*\w+/i, '')
      .replace(/\s+DEFINER\s*=\s*(`[^`]*`|'[^']*'|\S+)@(`[^`]*`|'[^']*'|\S+)/i, '')
      .replace(/\s+SQL SECURITY\s+\w+/i, '');

    out.push('-- ----------------------------------------------------------');
    out.push(`-- Vista ${vista}`);
    out.push('-- ----------------------------------------------------------');
    out.push(`DROP VIEW IF EXISTS ${q(vista)};`);
    out.push(`${createSql};`);
    out.push('');
  }

  out.push('SET FOREIGN_KEY_CHECKS = 1;');
  out.push(`-- Fin del respaldo (${totalFilas} registros)`);
  out.push('');

  return { sql: out.join('\n'), tablas: baseTables.length, vistas: views.length, filas: totalFilas };
}
