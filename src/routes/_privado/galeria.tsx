import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';

import { EncabezadoPagina } from '@/components/EncabezadoPagina';
import { GaleriaSection } from '@/features/galeria/GaleriaSection';
import { listarMedios } from '@/lib/datos/medios';

/**
 * Galería: archivos ENTRE viajes, para responder «todas las fotos de tal etiqueta en tal
 * periodo». El loader es la frontera de datos (misma regla que el resto del panel): trae
 * TODOS los medios por defecto y `GaleriaSection` lo refina en cliente por fecha,
 * etiqueta y tipo, y abre el visor.
 *
 * Diferencia entre estados:
 * - Error: No se pudo conectar con Firebase o falló la consulta.
 * - Vacío: La consulta fue exitosa pero no hay medios en el período.
 * - Con datos: Se devuelven los medios reales.
 */
export const Route = createFileRoute('/_privado/galeria')({
  loader: async () => {
    try {
      // Cargar TODOS los medios sin filtro de fechas por defecto
      const medios = await listarMedios({ desde: '', hasta: '' });
      return { medios, error: null };
    } catch (error) {
      console.error('[Galería] Error al listar medios:', error);
      return { medios: [], error: 'No se pudo cargar la galería en este momento.' };
    }
  },
  component: Galeria,
});

function Galeria() {
  const { medios, error } = Route.useLoaderData();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EncabezadoPagina titulo="Galería" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-8 py-6">
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
            <AlertTriangle className="text-danger size-8" aria-hidden="true" />
            <p className="text-text-muted text-sm">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-accent text-xs font-semibold hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : medios.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-text-muted text-sm">No hay fotos en la galería.</p>
          </div>
        ) : (
          <GaleriaSection medios={medios} />
        )}
      </div>
    </div>
  );
}
