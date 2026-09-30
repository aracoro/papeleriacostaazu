import { useEffect, useState } from 'react';
import { getProductos, getVentasPorRango } from '../api';

// Fecha local AAAA-MM-DD (toISOString usa UTC y en la noche cambia de día)
const fechaLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    productos: 0,
    stockTotal: 0,
    ventasHoy: 0,
    totalHoy: 0,
  });
  const [ventasDias, setVentasDias] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    const hoy = new Date();
    const hoyStr = fechaLocal(hoy);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - 6);
    const semanaStr = fechaLocal(inicioSemana);

    // Dos consultas al mismo tiempo: productos y ventas de la semana.
    // Las de hoy se sacan de las de la semana (antes eran 3 consultas en fila).
    const [productosRes, ventasSemanaRes] = await Promise.all([
      getProductos(),
      getVentasPorRango(semanaStr, hoyStr),
    ]);

    const productos = productosRes.data || [];
    const ventasSemana = ventasSemanaRes.data || [];
    const ventasHoy = ventasSemana.filter((v) => String(v.fecha || '').slice(0, 10) === hoyStr);

    const stockTotal = productos.reduce((acc, p) => acc + (p.stock || 0), 0);
    const totalHoy = ventasHoy.reduce((acc, v) => acc + Number(v.total || 0), 0);

    const dias = [];
    for (let i = 6; i >= 0; i -= 1) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - i);
      const clave = fechaLocal(fecha);
      const label = fecha.toLocaleDateString('es-MX', { weekday: 'short' });
      const totalDia = ventasSemana
        .filter((v) => v.fecha?.slice(0, 10) === clave)
        .reduce((acc, v) => acc + Number(v.total || 0), 0);
      dias.push({ label, total: totalDia });
    }

    setStats({
      productos: productos.length,
      stockTotal,
      ventasHoy: ventasHoy.length,
      totalHoy,
    });
    setVentasDias(dias);
    setLoading(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Inicio</h2>
        </div>
        <button className="btn secondary" onClick={cargarDatos} disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon accent">📦</div>
          <div>
            <p className="stat-label">Productos</p>
            <p className="stat-value">{stats.productos}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon success">📊</div>
          <div>
            <p className="stat-label">Stock total</p>
            <p className="stat-value">{stats.stockTotal}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon accent">🧾</div>
          <div>
            <p className="stat-label">Ventas hoy</p>
            <p className="stat-value">{stats.ventasHoy}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon success">💰</div>
          <div>
            <p className="stat-label">Total vendido hoy</p>
            <p className="stat-value">${stats.totalHoy.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="card chart-card">
        <div className="chart-header">
          <div>
            <h3>Ventas de los últimos 7 días</h3>
          </div>
          <div className="legend">
            <span className="legend-dot accent"></span>
            <span>Ingresos</span>
          </div>
        </div>
        <div className="bar-chart">
          {ventasDias.map((dia) => (
            <div key={dia.label} className="bar-item">
              <div className="bar" style={{ height: `${Math.min(dia.total, 1000) / 10 + 10}%` }}>
                <span className="bar-value">${dia.total.toFixed(2)}</span>
              </div>
              <span className="bar-label">{dia.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
