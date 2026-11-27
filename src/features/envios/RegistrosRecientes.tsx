import { Card, CardBody, EmptyState } from '@ai27-tech/ui';
import { TriangleAlert } from 'lucide-react';
import type { EnvioRegistrado } from '@/lib/datos/registroEnvios';

const formatoHora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });

/**
 * Envíos que esta sesión registró y la función confirmó, el más reciente primero.
 *
 * No es un historial: Checklist no lee la colección `envios` (decisión del Lead, interfaz del
 * perfil §5), así que la lista nace de las respuestas de la función de alta y se vacía al
 * recargar la página.
 */
export function RegistrosRecientes({ registros }: { registros: readonly EnvioRegistrado[] }) {
  if (registros.length === 0) {
    return (
      <EmptyState
        icon={<TriangleAlert aria-hidden="true" className="text-warning size-8" />}
        title="No hay registros recientes."
        description="Aquí aparecen los envíos que registres en esta sesión."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3" aria-label="Envíos registrados en esta sesión">
      {registros.map((envio) => (
        <li key={envio.shipmentId}>
          <Card variant="outlined">
            <CardBody className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-text cifras-tabulares font-mono text-sm font-semibold">
                  {envio.shipmentId}
                </p>
                <time
                  className="text-text-muted text-xs"
                  dateTime={envio.registradoEn.toISOString()}
                >
                  {formatoHora.format(envio.registradoEn)}
                </time>
              </div>
              <dl className="text-text-muted grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt>Económico</dt>
                <dd className="text-text font-mono">{envio.numeroEconomico}</dd>
                <dt>Línea</dt>
                <dd className="text-text">{envio.lineaTransportista}</dd>
                <dt>Bitácora</dt>
                <dd className="text-text font-mono">{envio.bitacoraLegacyId}</dd>
              </dl>
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}
