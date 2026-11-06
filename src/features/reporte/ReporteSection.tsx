import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { folioDePeriodo, obtenerMetricas } from '@/lib/datos/metricas';
import { resolverPeriodo, type SeleccionPeriodo } from '@/lib/formato/fechas';

import { ActividadReporteSection } from './ActividadReporteSection';
import { AvisoCobertura } from './AvisoCobertura';
import { GraficasReporteSection } from './GraficasReporteSection';
import { ReporteFiltros } from './ReporteFiltros';
import { ReporteHeader } from './ReporteHeader';
import { ReportesModal } from './ReportesModal';
import { TablaCustodiosSection } from './TablaCustodiosSection';
import { TablaViajesSection } from './TablaViajesSection';
import { TarjetasEstadistica } from './TarjetasEstadistica';
import { ReporteCargando, ReporteError, ReporteVacio } from './estados';
import { descargarCsv, nombreArchivoCsv, viajesACsv } from './exportarCsv';
import {
  FILTRO_VACIO,
  estadisticasDeViajes,
  filtrarCustodios,
  filtrarViajes,
  hayFiltroActivo,
  type FiltroReporte,
} from './filtros';

/**
 * Orquesta la pantalla de reporte como un DASHBOARD: una sola barra de filtros gobierna
 * toda la página. El periodo y el filtro viven aquí; el filtro se aplica una vez sobre
 * los agregados y los datos ya filtrados bajan a las tarjetas, las gráficas y las tablas.
 *
 * Por defecto (sin filtro) todo muestra el panorama global del periodo. Cuando hay un
 * filtro activo, las tarjetas se recalculan sobre la selección y ocultan su delta.
 */
export function ReporteSection() {
  const [periodo, setPeriodo] = useState<SeleccionPeriodo>({ atajo: 'mes' });
  const [filtro, setFiltro] = useState<FiltroReporte>(FILTRO_VACIO);
  const [reportesAbiertos, setReportesAbiertos] = useState(false);

  const rango = resolverPeriodo(periodo);

  const consulta = useQuery({
    // Sin `medios`: esta pantalla no muestra las gráficas por hora ni de GB.
    queryKey: ['metricas', rango, 'sin-medios'],
    queryFn: () => obtenerMetricas(rango, { conMedios: false }),
  });

  const folio = consulta.data?.folio ?? folioDePeriodo(rango);
  const sinDatos = consulta.isSuccess && consulta.data.estadisticas.viajesAuditados.valor === '0';

  // Datos filtrados: se calculan una sola vez y se comparten con los tres bloques. Las
  // opciones de los dropdowns salen de los datos GLOBALES (no filtrados), para no perder
  // opciones al aplicar un filtro.
  const datos = consulta.data;
  const filtroActivo = hayFiltroActivo(filtro);

  const custodiosFiltrados = useMemo(
    () => (datos ? filtrarCustodios(datos.porCustodio, filtro, datos.porViaje) : []),
    [datos, filtro],
  );
  const viajesFiltrados = useMemo(
    () => (datos ? filtrarViajes(datos.porViaje, filtro, datos.porCustodio) : []),
    [datos, filtro],
  );

  // Exporta exactamente lo que muestra «Registro por viaje». Sólo se ofrece cuando la
  // consulta terminó y hay datos; en cualquier otro estado el botón queda deshabilitado.
  const puedeExportar = consulta.isSuccess && !sinDatos;
  function exportarCsv(): void {
    // `filtro.custodio` es un uid; el nombre se resuelve igual que en `filtrarViajes`.
    const nombreCustodio =
      datos?.porCustodio.find((c) => c.uid === filtro.custodio)?.nombre ?? null;
    descargarCsv(nombreArchivoCsv(rango, filtro, nombreCustodio), viajesACsv(viajesFiltrados));
  }

  // Tarjetas: globales por defecto; recalculadas sobre la selección cuando hay filtro.
  const estadisticas = useMemo(() => {
    if (!datos) return null;
    return filtroActivo ? estadisticasDeViajes(viajesFiltrados) : datos.estadisticas;
  }, [datos, filtroActivo, viajesFiltrados]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ReporteHeader
        folio={folio}
        seleccion={periodo}
        onExportarCsv={puedeExportar ? exportarCsv : undefined}
        onAbrirReportes={puedeExportar ? () => setReportesAbiertos(true) : undefined}
        onPeriodoChange={(seleccion) => {
          // Cambiar de periodo limpia el filtro: un custodio o placa del periodo anterior
          // puede no existir en el nuevo.
          setFiltro(FILTRO_VACIO);
          setPeriodo(seleccion);
        }}
      />

      {reportesAbiertos && datos && (
        <ReportesModal
          open
          onClose={() => setReportesAbiertos(false)}
          rango={rango}
          porCustodio={datos.porCustodio}
          porViaje={datos.porViaje}
          custodioInicial={filtro.custodio}
        />
      )}

      {consulta.isPending && <ReporteCargando />}

      {consulta.isError && <ReporteError onReintentar={() => consulta.refetch()} />}

      {consulta.isSuccess && sinDatos && (
        <ReporteVacio onAmpliarRango={() => setPeriodo({ atajo: 'mes' })} />
      )}

      {consulta.isSuccess && !sinDatos && datos && estadisticas && (
        <div className="reporte-imprimible space-y-8 px-8 py-6">
          <ReporteFiltros
            filtro={filtro}
            onFiltroChange={setFiltro}
            custodios={datos.porCustodio}
            unidades={datos.porUnidad}
          />
          <AvisoCobertura cobertura={datos.cobertura} alcance="reporte" />
          <TarjetasEstadistica estadisticas={estadisticas} />
          {/* 01 — Custodios y unidades */}
          <GraficasReporteSection
            porCustodio={custodiosFiltrados}
            porUnidad={porUnidadFiltrada(datos.porUnidad, viajesFiltrados, filtroActivo)}
            filtro={filtro}
            onFiltroChange={setFiltro}
          />
          {/* 02 — Estadísticas por custodio */}
          <TablaCustodiosSection porCustodio={custodiosFiltrados} />
          {/* 03 — Actividad del periodo */}
          <ActividadReporteSection porViaje={viajesFiltrados} />
          {/* 04 — Registro por viaje */}
          <TablaViajesSection porViaje={viajesFiltrados} />
        </div>
      )}
    </div>
  );
}

/**
 * Viajes por unidad recalculados sobre la selección filtrada. Sin filtro, se usa el
 * agregado global tal cual; con filtro, se recuenta por placa desde los viajes visibles,
 * para que la gráfica de unidades responda igual que el resto de la página.
 */
function porUnidadFiltrada(
  global: { placas: string; viajes: number }[],
  viajesFiltrados: { placas: string }[],
  filtroActivo: boolean,
) {
  if (!filtroActivo) return global;
  const porPlaca = new Map<string, number>();
  for (const v of viajesFiltrados) {
    if (v.placas === '') continue;
    porPlaca.set(v.placas, (porPlaca.get(v.placas) ?? 0) + 1);
  }
  return [...porPlaca.entries()]
    .map(([placas, viajes]) => ({ placas, viajes }))
    .sort((a, b) => b.viajes - a.viajes);
}
