import { createFileRoute } from '@tanstack/react-router';

import { EncabezadoPagina } from '@/components/EncabezadoPagina';
import { GaleriaSection } from '@/features/galeria/GaleriaSection';

/**
 * Galería: archivos ENTRE viajes, para responder «todas las fotos de tal unidad en tal
 * periodo».
 *
 * La ruta ya no tiene `loader`: antes traía los medios sin filtros (con un tope de 120
 * documentos arbitrarios) y `GaleriaSection` los refinaba en el cliente, así que un número
 * económico que no cayera en esos 120 no aparecía. Ahora `GaleriaSection` consulta a
 * Firestore según el período y el número económico elegidos, y es ella quien resuelve los
 * estados de carga, error y vacío, para no esconder la barra de filtros cuando un resultado
 * sale vacío.
 */
export const Route = createFileRoute('/_privado/galeria')({
  component: Galeria,
});

function Galeria() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <EncabezadoPagina titulo="Galería" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-8 py-6">
        <GaleriaSection />
      </div>
    </div>
  );
}
