import { useState } from 'react';
import { descargarRespaldo } from '../api';

export default function RespaldoPage() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [ultimo, setUltimo] = useState(null);

  const generar = async () => {
    setMensaje({ tipo: '', texto: '' });
    setLoading(true);
    const { data, error } = await descargarRespaldo();
    setLoading(false);

    if (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo generar el respaldo' });
      return;
    }

    setUltimo({ ...data, fecha: new Date().toLocaleString('es-MX') });
    setMensaje({ tipo: 'success', texto: `Respaldo descargado: ${data.nombre}` });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Respaldos</h2>
        </div>

        {mensaje.texto && (
          <div className={`alert ${mensaje.tipo === 'error' ? 'error' : 'success'}`}>{mensaje.texto}</div>
        )}
      </div>

      <div className="card">
        <h3>Respaldo de la base de datos</h3>
        <p className="text-muted">Archivo .sql con todas las tablas y registros. Se restaura desde MySQL Workbench.</p>

        <div className="form-actions">
          <button className="btn primary" type="button" onClick={generar} disabled={loading}>
            {loading ? 'Generando respaldo...' : 'Descargar respaldo .sql'}
          </button>
        </div>
      </div>

      {ultimo && (
        <div className="card">
          <h3>Último respaldo</h3>
          <table className="table">
            <tbody>
              <tr>
                <th>Archivo</th>
                <td>{ultimo.nombre}</td>
              </tr>
              <tr>
                <th>Fecha</th>
                <td>{ultimo.fecha}</td>
              </tr>
              <tr>
                <th>Tablas</th>
                <td>{ultimo.tablas}</td>
              </tr>
              <tr>
                <th>Registros</th>
                <td>{ultimo.filas}</td>
              </tr>
              <tr>
                <th>Tamaño</th>
                <td>{(ultimo.tamano / 1024).toFixed(1)} KB</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>

  );
}
