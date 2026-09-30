import { useEffect, useRef } from 'react';

/**
 * Ventana modal accesible: bloquea el fondo, toma el foco al abrir
 * y se cierra con Esc (si se pasa onClose).
 */
export default function Modal({ titulo, children, acciones, onClose, ancho = 520 }) {
  const ref = useRef(null);

  useEffect(() => {
    const anterior = document.activeElement;
    const primero = ref.current?.querySelector('input, select, button:not([data-cerrar])');
    (primero || ref.current)?.focus();
    return () => anterior?.focus?.();
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && onClose) {
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
        style={{ maxWidth: ancho }}
        onKeyDown={onKeyDown}
      >
        <div className="modal-encabezado">
          <h3 id="modal-titulo">{titulo}</h3>
          {onClose && (
            <button type="button" className="btn ghost sm" data-cerrar onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          )}
        </div>
        <div className="modal-cuerpo">{children}</div>
        {acciones && <div className="modal-acciones">{acciones}</div>}
      </div>
    </div>
  );
}
