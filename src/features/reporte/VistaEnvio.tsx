import { Badge, Button, type BadgeVariant } from '@ai27-tech/ui';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, FileCheck2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { TarjetaResumen } from '@/components/TarjetaResumen';
import { Link, useNavigate } from '@tanstack/react-router';
import { datosMockActivos, obtenerVistaEnvio, totalesDeEnvio } from '@/lib/datos/envios';
import { Miniatura } from '@/features/galeria/Miniatura';
import { observarPerfil, type PerfilPanel } from '@/lib/datos/accesoPanel';
import type { CicloViaje, EnvioSeguimiento } from '@/lib/datos/tipos';

import { CorregirVinculoModal } from './CorregirVinculoModal';
import { ReporteCargando, ReporteError } from './estados';

const CICLO: Record<CicloViaje, { etiqueta: string; variant: BadgeVariant }> = {
  ACTIVO: { etiqueta: 'Activo', variant: 'secure' },
  CERRADO: { etiqueta: 'Cerrado', variant: 'neutral' },
  DESCARTADO: { etiqueta: 'Descartado', variant: 'warning' },
};

/**
 * Secciones de un envío por Shipment ID, insertadas arriba del tablero de periodo:
 * cabecera, totales (`N seguimientos · M validaciones`) y la lista de seguimientos
 * vinculados con sus medios. Los seguimientos enlazan a su expediente.
 *
 * Un envío inexistente y uno de otra empresa responden lo mismo, para no revelar que
 * existe. Sólo el Analista ve la corrección del vínculo.
 */
export interface VistaEnvioProps {
  shipmentId: string;
}

export function VistaEnvio({ shipmentId }: VistaEnvioProps) {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<PerfilPanel | null>(null);
  const [corrigiendo, setCorrigiendo] = useState<EnvioSeguimiento | null>(null);

  useEffect(() => observarPerfil(setPerfil), []);

  const consulta = useQuery({
    queryKey: ['envio', shipmentId],
    queryFn: () => obtenerVistaEnvio(shipmentId),
  });

  if (consulta.isPending) return <ReporteCargando />;
  if (consulta.isError) return <ReporteError onReintentar={() => consulta.refetch()} />;

  const vista = consulta.data;
  if (!vista) {
    return (
      <div className="border-border bg-surface flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border px-4 py-8 text-center">
        <p className="text-text-muted text-sm">
          No encontramos el envío. Elige otro Shipment ID en la barra de filtros.
        </p>
      </div>
    );
  }

  const totales = totalesDeEnvio(vista.seguimientos);
  const esAnalista = perfil?.rol === 'analista';

  return (
    <div className="space-y-8">
      {/* Cabecera del envío */}
      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 className="text-text font-mono text-lg font-semibold">{vista.envio.shipmentId}</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Línea transportista</dt>
            <dd className="text-text">{vista.envio.lineaTransportista}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Número económico</dt>
            <dd className="text-text font-mono">{vista.envio.numeroEconomico}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">ID de bitácora</dt>
            <dd className="text-text font-mono">{vista.envio.bitacoraLegacyId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Cliente</dt>
            <dd className="text-text">{vista.envio.clienteId}</dd>
          </div>
        </dl>
      </section>

      {vista.recortado && (
        <p
          role="alert"
          className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs text-amber-300"
        >
          El envío tiene más archivos de los que se pueden leer de una vez. Los totales y la lista
          cubren lo leído y pueden estar incompletos.
        </p>
      )}

      {/* Totales */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TarjetaResumen
          titulo="Seguimientos"
          Icono={ClipboardList}
          valor={totales.seguimientos}
          contexto="sin descartados"
        />
        <TarjetaResumen
          titulo="Validaciones"
          Icono={FileCheck2}
          valor={totales.validaciones}
          contexto="fotos y audios"
        />
      </section>

      {/* Seguimientos */}
      <section className="space-y-4">
        <h3 className="text-text text-sm font-medium">Seguimientos vinculados</h3>
        {vista.seguimientos.length === 0 ? (
          <p className="text-text-muted border-border bg-surface rounded-lg border p-6 text-center text-sm">
            0 seguimientos · 0 validaciones
          </p>
        ) : (
          vista.seguimientos.map((seguimiento) => (
            <article
              key={seguimiento.id}
              className="border-border bg-surface rounded-lg border p-4"
            >
              <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Badge variant={CICLO[seguimiento.ciclo].variant}>
                  {CICLO[seguimiento.ciclo].etiqueta}
                </Badge>
                <span className="text-text text-sm font-medium">{seguimiento.fechaLocal}</span>
                <span className="text-text-muted font-mono text-xs">
                  {seguimiento.placas || 'S/N.E.'}
                </span>
                <span className="text-text-muted truncate text-xs">
                  {seguimiento.custodioCorreo}
                </span>
                <span className="text-text-muted cifras-tabulares ml-auto text-xs">
                  {seguimiento.medios.filter((m) => m.tipo === 'FOTO').length} fotos ·{' '}
                  {seguimiento.medios.filter((m) => m.tipo === 'AUDIO').length} audios
                </span>
                <Link
                  to="/viajes/$id"
                  params={{ id: seguimiento.id }}
                  className="text-accent text-xs hover:underline"
                >
                  Ver expediente
                </Link>
                {esAnalista && (
                  <Button variant="outline" size="sm" onClick={() => setCorrigiendo(seguimiento)}>
                    Corregir vínculo
                  </Button>
                )}
              </header>

              {/* shortcut: la rejilla de miniaturas se omite con datos mock porque sus rutas
                  no existen en Storage; el conteo y el expediente cubren la revisión. */}
              {!datosMockActivos && seguimiento.medios.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {seguimiento.medios.map((medio) => (
                    <Miniatura
                      key={medio.id}
                      medio={medio}
                      onOpen={() =>
                        void navigate({ to: '/viajes/$id', params: { id: seguimiento.id } })
                      }
                    />
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </section>

      {corrigiendo && (
        <CorregirVinculoModal
          seguimiento={corrigiendo}
          onCerrar={() => setCorrigiendo(null)}
          onGuardado={() => {
            setCorrigiendo(null);
            void consulta.refetch();
          }}
        />
      )}
    </div>
  );
}
