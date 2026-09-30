import { useEffect, useMemo, useState } from 'react';
import logo from '../assets/logo.png';
import {
  getProductos,
  registrarVenta,
  getVentaDetalle,
  getFacturaPorVenta,
  generarFactura,
} from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

// Catálogos del SAT (los más usados en mostrador)
const REGIMENES = [
  ['616', '616 - Sin obligaciones fiscales'],
  ['612', '612 - Personas Físicas con Actividades Empresariales'],
  ['626', '626 - Régimen Simplificado de Confianza'],
  ['605', '605 - Sueldos y Salarios'],
  ['606', '606 - Arrendamiento'],
  ['621', '621 - Incorporación Fiscal'],
  ['601', '601 - General de Ley Personas Morales'],
  ['603', '603 - Personas Morales con Fines no Lucrativos'],
];
const USOS_CFDI = [
  ['G03', 'G03 - Gastos en general'],
  ['G01', 'G01 - Adquisición de mercancías'],
  ['S01', 'S01 - Sin efectos fiscales'],
  ['CP01', 'CP01 - Pagos'],
];
const DATOS_FISCALES_VACIOS = {
  rfc: '',
  razon_social: '',
  regimen_fiscal: '616',
  codigo_postal: '',
  uso_cfdi: 'G03',
  correo: '',
};

// Evita que un nombre de producto o de cliente se interprete como HTML al imprimir
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ahoraLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Imprime un documento HTML en un iframe oculto */
function imprimirHtml(html) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  iframe.contentDocument?.open();
  iframe.contentDocument?.write(html);
  iframe.contentDocument?.close();

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 300);
  };
}

export default function PosPage() {
  const business = {
    nombre: 'Papelería Costa Azul',
    rfc: 'RFC: XAXX010101000',
    domicilio: 'Calle 123, Colonia Centro, Ciudad, Estado',
    telefono: 'Tel: 555-123-4567',
    politica: 'Cambios/devoluciones dentro de 7 días con ticket.',
    leyenda: 'Precios con IVA incluido',
  };

  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [procesando, setProcesando] = useState(false);

  // Flujo de cobro y facturación
  const [recibo, setRecibo] = useState(null); // venta cobrada que se muestra en el recibo
  const [preguntarFactura, setPreguntarFactura] = useState(false);
  const [capturandoFactura, setCapturandoFactura] = useState(false);
  const [factura, setFactura] = useState(null);
  const [datosFiscales, setDatosFiscales] = useState(DATOS_FISCALES_VACIOS);
  const [errorFactura, setErrorFactura] = useState('');
  const [facturando, setFacturando] = useState(false);
  const [folioBuscado, setFolioBuscado] = useState('');

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const { data, error } = await getProductos();
    if (!error) {
      setProductos(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    }
  };

  const productosFiltrados = useMemo(() => {
    if (!busqueda) return productos;

    const lower = busqueda.toLowerCase();

    return productos.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(lower) ||
        p.codigo_barras?.toLowerCase().includes(lower) ||
        p.marca?.toLowerCase().includes(lower) ||
        p.sku?.toLowerCase().includes(lower)
    );
  }, [busqueda, productos]);

  const agregarProducto = (producto) => {
    setMensaje({ tipo: '', texto: '' });

    const existente = carrito.find((l) => l.producto.id === producto.id);

    if (existente) {
      if (existente.cantidad + 1 > Number(producto.stock || 0)) {
        setMensaje({ tipo: 'error', texto: 'Stock insuficiente' });
        return;
      }

      setCarrito((prev) =>
        prev.map((l) =>
          l.producto.id === producto.id
            ? { ...l, cantidad: l.cantidad + 1 }
            : l
        )
      );
      return;
    }

    if (Number(producto.stock || 0) < 1) {
      setMensaje({ tipo: 'error', texto: 'Sin stock disponible' });
      return;
    }

    setCarrito((prev) => [
      ...prev,
      {
        producto,
        cantidad: 1,
        precio_unitario: Number(producto.precio_venta || 0),
      },
    ]);
  };

  const actualizarCantidad = (id, delta) => {
    setMensaje({ tipo: '', texto: '' });

    setCarrito((prev) =>
      prev
        .map((l) => {
          if (l.producto.id !== id) return l;

          const nuevaCantidad = l.cantidad + delta;

          if (nuevaCantidad < 1) return null;

          if (nuevaCantidad > Number(l.producto.stock || 0)) {
            setMensaje({ tipo: 'error', texto: 'Stock insuficiente' });
            return l;
          }

          return { ...l, cantidad: nuevaCantidad };
        })
        .filter(Boolean)
    );
  };

  const eliminarLinea = (id) => {
    setCarrito((prev) => prev.filter((l) => l.producto.id !== id));
  };

  const total = carrito.reduce(
    (acc, l) => acc + Number(l.precio_unitario || l.producto.precio_venta || 0) * l.cantidad,
    0
  );

  const subtotal = total / 1.16;
  const iva = total - subtotal;

  const imprimirTicket = (ventaInfo) => {
    const fecha = ventaInfo.fecha || ahoraLocal();
    const lineasHtml = ventaInfo.items
      .map((l) => {
        const desc = esc((l.producto.nombre || '').slice(0, 30));
        const cant = l.cantidad.toString().padStart(3, ' ');
        const pUnit = Number(l.precio_unitario).toFixed(2).padStart(8, ' ');
        const imp = (Number(l.precio_unitario) * l.cantidad).toFixed(2).padStart(9, ' ');
        return `<tr class="mono">
            <td>${cant} x ${desc}</td>
            <td class="right">$${pUnit}</td>
            <td class="right">$${imp}</td>
          </tr>`;
      })
      .join('');

    const logoUrl = new URL(logo, window.location.origin).href;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ticket</title>
          <style>
            @page { size: 58mm 200mm; margin: 0; }
            @media print { body { margin: 0; } }
            body { font-family: Arial, sans-serif; padding: 8px; color: #000; max-width: 58mm; margin: 0 auto; font-size: 10px; font-weight: 600; }
            .header { text-align: center; }
            img { max-width: 120px; margin: 2px auto 0; display: block; }
            h2 { margin: 0 0 2px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 4px 2px; font-size: 9px; text-align: left; color: #000; font-weight: 700; }
            .mono { font-family: 'Courier New', monospace; }
            .right { text-align: right; }
            .line { border-top: 1px dashed #999; margin: 6px 0; }
            .totales { margin-top: 8px; }
            .totales div { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10px; font-weight: 700; }
            .footer { margin-top: 10px; text-align: center; font-size: 9px; color: #000; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" alt="Logo" />
            <h2>${business.nombre}</h2>
            <div class="mono">
              <div>${business.rfc}</div>
              <div>${business.domicilio}</div>
              <div>${business.telefono}</div>
            </div>
            <div class="line"></div>
            <div class="mono">
              <div>Fecha: ${fecha}</div>
              <div>Folio: ${ventaInfo.id}</div>
              <div>Cajero: ${ventaInfo.cajero || ''}</div>
            </div>
            <div class="line"></div>
          </div>
          <table>
            <thead>
              <tr class="mono"><th>Detalle</th><th class="right">P.Unit</th><th class="right">Importe</th></tr>
            </thead>
            <tbody>
              ${lineasHtml}
            </tbody>
          </table>
          <div class="line"></div>
          <div class="totales">
            <div><span>Subtotal</span><strong>$${ventaInfo.subtotal.toFixed(2)}</strong></div>
            <div><span>IVA 16%</span><strong>$${ventaInfo.iva.toFixed(2)}</strong></div>
            <div><span>Total</span><strong>$${ventaInfo.total.toFixed(2)}</strong></div>
          </div>
          <div class="footer">
            <div>¡Gracias por su compra!</div>
            <div>${business.politica}</div>
            <div>${business.leyenda}</div>
          </div>
        </body>
      </html>
    `;

    imprimirHtml(html);
  };

  const imprimirFactura = (fac, venta) => {
    const lineas = (venta?.items || [])
      .map(
        (l) => `<tr>
          <td>${l.cantidad}</td>
          <td>H87 - Pieza</td>
          <td>${esc(l.producto.nombre)}</td>
          <td class="num">$${(Number(l.precio_unitario) / 1.16).toFixed(2)}</td>
          <td class="num">$${((Number(l.precio_unitario) * l.cantidad) / 1.16).toFixed(2)}</td>
        </tr>`
      )
      .join('');

    const html = `<!doctype html>
      <html><head><meta charset="utf-8" /><title>Factura ${esc(fac.id)}</title>
      <style>
        @page { size: letter; margin: 18mm; }
        body { font-family: Arial, sans-serif; color: #111; font-size: 12px; }
        .enc { display: flex; justify-content: space-between; border-bottom: 2px solid #0c4a7a; padding-bottom: 10px; }
        h1 { margin: 0; font-size: 20px; color: #0c4a7a; }
        .caja { border: 1px solid #ccc; border-radius: 6px; padding: 10px; margin-top: 12px; }
        .caja h3 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; color: #0c4a7a; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border-bottom: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background: #eef2f6; }
        .num { text-align: right; }
        .tot { margin-top: 10px; margin-left: auto; width: 260px; }
        .tot div { display: flex; justify-content: space-between; padding: 3px 0; }
        .tot .grande { font-size: 15px; font-weight: 700; border-top: 1px solid #111; }
        .nota { margin-top: 18px; font-size: 10px; color: #555; }
      </style></head><body>
        <div class="enc">
          <div>
            <h1>${esc(business.nombre)}</h1>
            <div>${esc(business.rfc)}</div>
            <div>${esc(business.domicilio)}</div>
          </div>
          <div style="text-align:right">
            <h1>FACTURA</h1>
            <div>Folio: F-${esc(fac.id)}</div>
            <div>Venta (ticket): ${esc(fac.venta_id)}</div>
            <div>Fecha: ${esc(String(fac.fecha || '').slice(0, 16))}</div>
          </div>
        </div>
        <div class="caja">
          <h3>Receptor</h3>
          <div><strong>${esc(fac.razon_social)}</strong></div>
          <div>RFC: ${esc(fac.rfc)} · C.P. ${esc(fac.codigo_postal)}</div>
          <div>Régimen fiscal: ${esc(fac.regimen_fiscal)} · Uso CFDI: ${esc(fac.uso_cfdi)}</div>
          ${fac.correo ? `<div>Correo: ${esc(fac.correo)}</div>` : ''}
        </div>
        <table>
          <thead><tr><th>Cant.</th><th>Unidad</th><th>Descripción</th><th class="num">Valor unitario</th><th class="num">Importe</th></tr></thead>
          <tbody>${lineas}</tbody>
        </table>
        <div class="tot">
          <div><span>Subtotal</span><span>$${Number(fac.subtotal).toFixed(2)}</span></div>
          <div><span>IVA 16%</span><span>$${Number(fac.iva).toFixed(2)}</span></div>
          <div class="grande"><span>Total</span><span>$${Number(fac.total).toFixed(2)}</span></div>
        </div>
        <div class="nota">Si la venta tuvo devoluciones, el total facturado ya las descuenta.
        Documento sin validez fiscal hasta su timbrado como CFDI ante el SAT.</div>
      </body></html>`;

    imprimirHtml(html);
  };

  /** Abre el recibo de una venta ya registrada (para facturar después) */
  const abrirRecibo = async () => {
    const folio = Number(folioBuscado);
    if (!folio) {
      setMensaje({ tipo: 'error', texto: 'Escribe el folio del ticket' });
      return;
    }
    const [{ data, error }, { data: fac }] = await Promise.all([
      getVentaDetalle(folio),
      getFacturaPorVenta(folio),
    ]);
    if (error || !data?.venta) {
      setMensaje({ tipo: 'error', texto: 'No se encontró ese folio' });
      return;
    }
    const totalVenta = Number(data.venta.total || 0);
    setRecibo({
      id: data.venta.id,
      fecha: String(data.venta.fecha || '').slice(0, 16),
      cajero: data.venta.usuario?.nombre || '',
      total: totalVenta,
      subtotal: totalVenta / 1.16,
      iva: totalVenta - totalVenta / 1.16,
      items: (data.detalle || []).map((d) => ({
        producto: { nombre: d.producto?.nombre || `Producto ${d.producto_id}` },
        cantidad: d.cantidad,
        precio_unitario: d.precio,
      })),
    });
    setFactura(fac || null);
    setFolioBuscado('');
    setMensaje({ tipo: '', texto: '' });
  };

  const responderFacturar = (si) => {
    setPreguntarFactura(false);
    if (si) abrirCapturaFactura();
  };

  // Botón "Generar Factura": si ya existe, la reimprime; si no, pide los datos fiscales
  const abrirCapturaFactura = () => {
    if (factura) {
      imprimirFactura(factura, recibo);
      return;
    }
    setDatosFiscales(DATOS_FISCALES_VACIOS);
    setErrorFactura('');
    setCapturandoFactura(true);
  };

  const cambiarDatoFiscal = (e) => {
    const { name, value } = e.target;
    setDatosFiscales((prev) => ({ ...prev, [name]: value }));
  };

  const enviarFactura = async (e) => {
    e.preventDefault();
    setErrorFactura('');
    setFacturando(true);
    const { data, error } = await generarFactura({ venta_id: recibo.id, ...datosFiscales });
    setFacturando(false);
    if (error) {
      setErrorFactura(error.message || 'No se pudo generar la factura');
      return;
    }
    setFactura(data);
    setCapturandoFactura(false);
    imprimirFactura(data, recibo);
  };

  const cerrarRecibo = () => {
    setRecibo(null);
    setFactura(null);
    setCapturandoFactura(false);
    setPreguntarFactura(false);
  };

  const cobrar = async () => {
    if (!carrito.length) {
      setMensaje({ tipo: 'error', texto: 'Agrega productos antes de cobrar' });
      return;
    }

    if (!user?.id) {
      setMensaje({ tipo: 'error', texto: 'No se encontró el usuario de la sesión' });
      return;
    }

    setProcesando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      // La fecha/hora y el usuario los pone el servidor (zona horaria local y usuario de la sesión)
      const payload = {
        cliente: '',
        pago: 'efectivo',
        lineas: carrito.map((l) => ({
          producto_id: l.producto.id,
          cantidad: l.cantidad,
          precio: Number(l.precio_unitario || l.producto.precio_venta || 0),
        })),
      };

      const { data, error } = await registrarVenta(payload);

      if (error) {
        throw new Error(error.message || 'No se pudo registrar la venta');
      }

      const folio = data?.id || data?.data?.id || '';

      setMensaje({
        tipo: 'success',
        texto: `Venta registrada. Folio: ${folio}`,
      });

      const lineas = carrito.map((l) => ({
        producto: l.producto,
        cantidad: l.cantidad,
        precio_unitario: Number(l.precio_unitario || l.producto.precio_venta || 0),
      }));

      setCarrito([]);
      await cargarProductos();

      // Pago exitoso: se guarda el recibo y se pregunta si se desea facturar
      setRecibo({
        id: folio,
        fecha: ahoraLocal(),
        subtotal,
        iva,
        total,
        items: lineas,
        cajero: user?.nombre || user?.usuario || 'Cajero',
      });
      setFactura(null);
      setPreguntarFactura(true);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo registrar la venta' });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Punto de Venta</h2>
        </div>

        <form
          className="buscar-ticket"
          onSubmit={(e) => {
            e.preventDefault();
            abrirRecibo();
          }}
        >
          <label htmlFor="folio-ticket" className="muted">Ticket anterior</label>
          <input
            id="folio-ticket"
            type="number"
            min="1"
            placeholder="Folio"
            value={folioBuscado}
            onChange={(e) => setFolioBuscado(e.target.value)}
          />
          <button className="btn secondary" type="submit">Ver recibo</button>
        </form>

        {mensaje.texto && (
          <div className={`alert ${mensaje.tipo === 'error' ? 'error' : 'success'}`}>
            {mensaje.texto}
          </div>
        )}
      </div>

      <div className="pos-layout">
        <div className="pos-left">
          <div className="card">
            <div className="input-group">
              <input
                type="text"
                placeholder="Buscar o escanear código de barras"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const prod = productos.find((p) => p.codigo_barras === busqueda.trim());
                    if (prod) {
                      agregarProducto(prod);
                      setBusqueda('');
                    } else {
                      setMensaje({ tipo: 'error', texto: 'Producto no encontrado' });
                    }
                  }
                }}
              />
              <button className="btn primary" type="button">
                Buscar
              </button>
            </div>
          </div>

          <div className="product-list card">
            <h3>Productos</h3>
            <div className="scroll-area">
              {productosFiltrados.map((p) => (
                <div key={p.id} className="product-row">
                  <div>
                    <p className="product-name">{p.nombre}</p>
                    <p className="muted">
                      {p.marca} · Código: {p.codigo_barras}
                    </p>
                  </div>
                  <div className="product-meta">
                    <span className="badge">${Number(p.precio_venta || 0).toFixed(2)}</span>
                    <span className={Number(p.stock || 0) > 5 ? 'stock ok' : 'stock low'}>
                      Stock: {p.stock}
                    </span>
                    <button className="btn secondary" type="button" onClick={() => agregarProducto(p)}>
                      Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card table-wrapper">
            <h3>Carrito</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Precio</th>
                  <th>Importe</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((l) => (
                  <tr key={l.producto.id}>
                    <td>{l.producto.nombre}</td>
                    <td>
                      <div className="qty-control">
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => actualizarCantidad(l.producto.id, -1)}
                        >
                          -
                        </button>
                        <span>{l.cantidad}</span>
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => actualizarCantidad(l.producto.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td>${Number(l.precio_unitario || l.producto.precio_venta || 0).toFixed(2)}</td>
                    <td>${(Number(l.precio_unitario || l.producto.precio_venta || 0) * l.cantidad).toFixed(2)}</td>
                    <td>
                      <button
                        className="btn link"
                        type="button"
                        onClick={() => eliminarLinea(l.producto.id)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}

                {!carrito.length && (
                  <tr>
                    <td colSpan="5">No hay productos en el carrito</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pos-right">
          <div className="card summary-card">
            <h3>Total</h3>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>IVA incluido</span>
              <span>${iva.toFixed(2)}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <button className="btn primary full" type="button" onClick={cobrar} disabled={procesando}>
              {procesando ? 'Procesando...' : 'Cobrar'}
            </button>
          </div>
        </div>
      </div>

      {recibo && preguntarFactura && (
        <Modal
          titulo="Pago registrado"
          ancho={440}
          acciones={
            <>
              <button type="button" className="btn secondary" onClick={() => responderFacturar(false)}>
                No
              </button>
              <button type="button" className="btn primary" onClick={() => responderFacturar(true)}>
                Sí, facturar
              </button>
            </>
          }
        >
          <p className="muted" style={{ margin: 0 }}>
            Ticket {recibo.id} · Total ${Number(recibo.total).toFixed(2)}
          </p>
          <p className="pregunta-factura">¿Desea facturar esta compra?</p>
        </Modal>
      )}

      {recibo && !preguntarFactura && !capturandoFactura && (
        <Modal
          titulo={`Recibo de pago · Ticket ${recibo.id}`}
          onClose={cerrarRecibo}
          ancho={560}
          acciones={
            <>
              <button type="button" className="btn secondary" onClick={() => imprimirTicket(recibo)}>
                Imprimir ticket
              </button>
              <button type="button" className="btn secondary" onClick={abrirCapturaFactura}>
                Generar Factura
              </button>
              <button type="button" className="btn primary" onClick={cerrarRecibo}>
                Nueva venta
              </button>
            </>
          }
        >
          <div className="recibo-datos">
            <span>Fecha: {recibo.fecha}</span>
            <span>Cajero: {recibo.cajero}</span>
          </div>
          <table className="recibo-tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="num">Cant.</th>
                <th className="num">Precio</th>
                <th className="num">Importe</th>
              </tr>
            </thead>
            <tbody>
              {recibo.items.map((l, i) => (
                <tr key={i}>
                  <td>{l.producto.nombre}</td>
                  <td className="num">{l.cantidad}</td>
                  <td className="num">${Number(l.precio_unitario).toFixed(2)}</td>
                  <td className="num">${(Number(l.precio_unitario) * l.cantidad).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="recibo-totales">
            <span>Subtotal: ${Number(recibo.subtotal).toFixed(2)}</span>
            <span>IVA 16%: ${Number(recibo.iva).toFixed(2)}</span>
            <span className="total">Total: ${Number(recibo.total).toFixed(2)}</span>
          </div>
          {factura && (
            <div className="factura-estado" role="status">
              Facturada: F-{factura.id} · RFC {factura.rfc}. "Generar Factura" la vuelve a imprimir.
            </div>
          )}
        </Modal>
      )}

      {recibo && capturandoFactura && (
        <Modal titulo={`Facturar ticket ${recibo.id}`} onClose={() => setCapturandoFactura(false)} ancho={600}>
          <form className="form-factura" onSubmit={enviarFactura}>
            <label>
              RFC
              <input name="rfc" value={datosFiscales.rfc} onChange={cambiarDatoFiscal} maxLength={13} required autoComplete="off" />
            </label>
            <label>
              Código postal
              <input name="codigo_postal" value={datosFiscales.codigo_postal} onChange={cambiarDatoFiscal} maxLength={5} inputMode="numeric" required />
            </label>
            <label className="completo">
              Nombre o razón social
              <input name="razon_social" value={datosFiscales.razon_social} onChange={cambiarDatoFiscal} required />
            </label>
            <label>
              Régimen fiscal
              <select name="regimen_fiscal" value={datosFiscales.regimen_fiscal} onChange={cambiarDatoFiscal}>
                {REGIMENES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </label>
            <label>
              Uso de CFDI
              <select name="uso_cfdi" value={datosFiscales.uso_cfdi} onChange={cambiarDatoFiscal}>
                {USOS_CFDI.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </label>
            <label className="completo">
              Correo para enviar la factura (opcional)
              <input type="email" name="correo" value={datosFiscales.correo} onChange={cambiarDatoFiscal} />
            </label>
            {errorFactura && <div className="alert error completo" role="alert">{errorFactura}</div>}
            <div className="completo modal-acciones" style={{ padding: 0 }}>
              <button type="button" className="btn secondary" onClick={() => setCapturandoFactura(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn primary" disabled={facturando}>
                {facturando ? 'Generando...' : 'Generar Factura'}
              </button>
            </div>
          </form>
          <p className="nota-fiscal">Total a facturar: ${Number(recibo.total).toFixed(2)} (se descuentan las devoluciones, si las hay).</p>
        </Modal>
      )}
    </div>
  );
}