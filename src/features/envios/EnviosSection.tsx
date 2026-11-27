import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import { EncabezadoPagina } from '@/components/EncabezadoPagina';
import type { EnvioRegistrado } from '@/lib/datos/registroEnvios';
import { FormularioEnvio } from './FormularioEnvio';
import { RegistrosRecientes } from './RegistrosRecientes';

/** Cuántos registros recientes se muestran. La lista es de la sesión, no un historial. */
const TOPE_RECIENTES = 10;

/**
 * Sección «Envíos» de Checklist (Echo 06): formulario de alta a la izquierda y, a la
 * derecha, lo que esta sesión ya registró.
 */
export function EnviosSection() {
  const [recientes, setRecientes] = useState<readonly EnvioRegistrado[]>([]);

  function alRegistrar(envio: EnvioRegistrado) {
    setRecientes((previos) => [envio, ...previos].slice(0, TOPE_RECIENTES));
  }

  return (
    <>
      <EncabezadoPagina titulo="Envíos" />
      <div className="grid gap-8 px-4 py-4 sm:px-8 sm:py-6 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-4" aria-labelledby="titulo-datos-checklist">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="text-text-muted size-5" aria-hidden="true" />
            <h2 id="titulo-datos-checklist" className="text-text text-lg font-semibold">
              Datos del checklist
            </h2>
          </div>
          <FormularioEnvio onRegistrado={alRegistrar} />
        </section>
        <section className="flex min-w-0 flex-col gap-4" aria-labelledby="titulo-registros">
          <h2 id="titulo-registros" className="text-text text-lg font-semibold">
            Registros recientes
          </h2>
          <RegistrosRecientes registros={recientes} />
        </section>
      </div>
    </>
  );
}
