/*
 * Roles de la aplicación (los que pidió el profesor):
 *   auditor        -> solo lectura: consulta la información de la app
 *   capturista     -> lectura y escritura: realiza todas las transacciones
 *   administrador  -> lectura/escritura de usuarios, solo lectura de la app
 *                     y respaldo de la BD a un archivo .sql local
 *
 * Esto solo oculta botones en pantalla; los permisos reales
 * los valida el servidor (server/app.js).
 */
export const ROLES = {
  ADMIN: 'administrador',
  CAPTURISTA: 'capturista',
  AUDITOR: 'auditor',
};

export const TODOS = [ROLES.ADMIN, ROLES.CAPTURISTA, ROLES.AUDITOR];

export const ETIQUETA_ROL = {
  administrador: 'Administrador',
  capturista: 'Capturista',
  auditor: 'Auditor',
};

/** Solo el capturista puede crear, actualizar o eliminar datos de la app. */
export const puedeEscribir = (user) => user?.rol === ROLES.CAPTURISTA;
export const esAdmin = (user) => user?.rol === ROLES.ADMIN;
