/*
 * Genera, a partir de server/endpoints.js:
 *   - dataservice/sql/NN_METODO_ruta.sql  (el SQL de cada endpoint, para copiar/pegar)
 *   - dataservice/GUIA_ENDPOINTS.md       (método, ruta, parámetros y SQL de cada uno)
 *
 * Uso:  npm run dataservice:guia
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { endpoints } from '../server/endpoints.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_DIR = path.join(__dirname, 'sql');

fs.rmSync(SQL_DIR, { recursive: true, force: true });
fs.mkdirSync(SQL_DIR, { recursive: true });

const ACCION = { GET: 'Consultar', POST: 'Actualizar', PUT: 'Crear', DELETE: 'Eliminar' };
const TIPO = { string: 'STRING', integer: 'INTEGER', number: 'NUMBER' };
const slug = (p) => p.replace(/^\//, '').replace(/[{}]/g, '').replace(/\//g, '_');

const md = [];
md.push('# Guía de endpoints de TiDB Cloud Data Service');
md.push('');
md.push('Archivo generado automáticamente desde `server/endpoints.js` (no lo edites a mano).');
md.push('');
md.push('Convención de verbos: **GET** consultar · **POST** actualizar · **DELETE** eliminar · **PUT** crear.');
md.push('');
md.push(`Total: **${endpoints.length} endpoints**.`);
md.push('');
md.push('## Cómo crear cada endpoint en la consola');
md.push('');
md.push('1. En tu Data App da clic en **+** → **Create Endpoint**.');
md.push('2. En **Properties**: escribe el **Path** y elige el **Request Method** exactamente como aparecen abajo. Si el endpoint indica *Max Rows*, cámbialo.');
md.push('3. Pega el SQL en el editor (también está en `dataservice/sql/`).');
md.push('4. En **Params**, revisa que cada parámetro tenga el **Type** indicado y marca **Required** donde diga "sí". Los parámetros de la ruta (`{id}`) se crean solos.');
md.push('5. Pon valores de prueba en **Test Values**, da clic en **Test** y verifica que `result.code` sea `200`.');
md.push('6. Da clic en **Deploy**.');
md.push('');
md.push('> Crea primero los GET: son de solo lectura y no modifican datos al probarlos.');
md.push('');
md.push('## Resumen');
md.push('');
md.push('| # | Método | Acción | Path | Módulo |');
md.push('|---|--------|--------|------|--------|');
endpoints.forEach((e, i) => {
  md.push(`| ${i + 1} | \`${e.method}\` | ${ACCION[e.method]} | \`${e.path}\` | ${e.tag} |`);
});
md.push('');

endpoints.forEach((e, i) => {
  const n = String(i + 1).padStart(2, '0');
  const file = `${n}_${e.method}_${slug(e.path)}.sql`;
  const header = `-- ${e.method} ${e.path}\n-- ${e.description}\n`;
  fs.writeFileSync(path.join(SQL_DIR, file), `${header}${e.sql}\n`);

  md.push(`## ${i + 1}. ${e.method} ${e.path}`);
  md.push('');
  md.push(`${e.description}`);
  md.push('');
  md.push(`- **Método:** \`${e.method}\` (${ACCION[e.method]})`);
  md.push(`- **Path:** \`${e.path}\``);
  if (e.maxRows) md.push(`- **Max Rows:** ${e.maxRows}`);
  md.push(`- **Archivo SQL:** \`dataservice/sql/${file}\``);
  md.push('');
  if (e.params.length) {
    md.push('| Parámetro | Type | Required | Ubicación |');
    md.push('|-----------|------|----------|-----------|');
    e.params.forEach((p) => {
      const ubic = p.path ? 'Path' : e.method === 'GET' || e.method === 'DELETE' ? 'Query' : 'Body';
      md.push(`| \`${p.name}\` | ${TIPO[p.type]} | ${p.required ? 'sí' : 'no'} | ${ubic} |`);
    });
  } else {
    md.push('Sin parámetros.');
  }
  md.push('');
  md.push('```sql');
  md.push(e.sql);
  md.push('```');
  md.push('');
});

fs.writeFileSync(path.join(__dirname, 'GUIA_ENDPOINTS.md'), md.join('\n'));
console.log(`Generados ${endpoints.length} archivos SQL en dataservice/sql y dataservice/GUIA_ENDPOINTS.md`);
