import { Button, FormField, Input, Modal } from '@ai27-tech/ui';
import { useQuery } from '@tanstack/react-query';
import { Download, Info, Search } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { listarMediosDeCustodioEnPeriodo } from '@/lib/datos/medios';
import type { EstadisticaCustodio, FilaViaje } from '@/lib/datos/tipos';
import type { RangoFechas } from '@/lib/formato/fechas';

import { buscarUnidades } from './buscarUnidades';
import { descargarCsv } from './exportarCsv';
import { GraficaArchivosPorDia, GraficaViajesPorDia } from './graficas/GraficasReportes';
import { actividadPorDiaACsv, nombreArchivoReporte, reporteUnidadACsv } from './reportesCsv';
import { archivosPorDia, viajesPorDia } from './seriesReporte';

/**
 * Modal «Reportes»: reúne los CSV adicionales del panel, cada uno con una gráfica que
 * resume lo mismo que su archivo. El reporte de unidad lee los archivos de la unidad
 * elegida en cuanto se elige; la actividad por día se calcula con los datos del periodo
 * que la pantalla ya cargó, sin consultas nuevas.
 *
 * Se monta sólo mientras está abierto, así que el selector de unidad arranca siempre con
 * la unidad del filtro de la página.
 */
export interface ReportesModalProps {
  open: boolean;
  onClose: () => void;
  rango: RangoFechas;
  porCustodio: EstadisticaCustodio[];
  porViaje: FilaViaje[];
  /** `uid` del custodio filtrado en la página; preselecciona la unidad del reporte. */
  custodioInicial: string | null;
}

const enteros = new Intl.NumberFormat('es-MX');

/**
 * `true` si el error es el `failed-precondition` con que Firestore rechaza una consulta
 * sin su índice compuesto. Se detecta por el código para no importar el SDK en la UI.
 */
function faltaIndice(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'failed-precondition'
  );
}

/** Un reporte del modal: título, qué contiene y su acción de descarga. */
function ItemReporte({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border flex flex-col gap-3 border-b py-4 last:border-b-0">
      <div>
        <h4 className="text-text text-sm font-medium">{titulo}</h4>
        <p className="text-text-muted text-xs">{descripcion}</p>
      </div>
      {children}
    </div>
  );
}

export function ReportesModal({
  open,
  onClose,
  rango,
  porCustodio,
  porViaje,
  custodioInicial,
}: ReportesModalProps) {
  // Unidad elegida (`uid`) y texto del buscador.
  const [uid, setUid] = useState(custodioInicial ?? '');
  const [texto, setTexto] = useState(
    () => porCustodio.find((c) => c.uid === custodioInicial)?.nombre ?? '',
  );

  const [listaAbierta, setListaAbierta] = useState(false);

  // Con una unidad ya elegida se muestran todas, para poder cambiarla sin borrar el texto.
  const opciones = buscarUnidades(porCustodio, uid === '' ? texto : '');

  function elegir(custodio: EstadisticaCustodio): void {
    setUid(custodio.uid);
    setTexto(custodio.nombre);
    setListaAbierta(false);
  }

  // Los archivos de la unidad se leen al ELEGIRLA, no al pulsar «Descargar»: la gráfica y el
  // CSV deben salir de los mismos datos. El caché de react-query evita leerlos otra vez al
  // descargar, así que el total de lecturas es el mismo.
  const { desde, hasta } = rango;
  const nombreUnidad = porCustodio.find((c) => c.uid === uid)?.nombre ?? uid;
  const archivos = useQuery({
    queryKey: ['archivos-unidad', uid, desde, hasta],
    queryFn: async () => {
      try {
        return await listarMediosDeCustodioEnPeriodo({ desde, hasta }, uid);
      } catch (error) {
        // El mensaje de Firestore (p. ej. el enlace del índice que pide) no se muestra en
        // pantalla; se deja en la consola para diagnosticar.
        console.error('[Reporte de unidad] No se pudo leer los archivos de la unidad.', error);
        throw error;
      }
    },
    enabled: uid !== '',
    retry: false,
  });

  const serieArchivos = useMemo(
    () => archivosPorDia(archivos.data?.medios ?? [], { desde, hasta }),
    [archivos.data, desde, hasta],
  );
  const serieViajes = useMemo(
    () => viajesPorDia(porViaje, { desde, hasta }),
    [porViaje, desde, hasta],
  );

  function descargarUnidad(): void {
    if (!archivos.data) return;
    descargarCsv(
      nombreArchivoReporte('reporte_unidad', rango, nombreUnidad),
      reporteUnidadACsv(archivos.data.medios),
    );
  }

  function descargar(prefijo: string, csv: string): void {
    descargarCsv(nombreArchivoReporte(prefijo, rango), csv);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Reportes"
      footer={
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <p className="text-text-muted text-xs">
        Periodo: {rango.desde} a {rango.hasta}. La actividad por día cubre todo el periodo, sin los
        filtros de la página.
      </p>

      <div
        role="note"
        className="border-border bg-surface-high text-text-muted mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs"
      >
        <Info size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Los reportes se generan con los datos disponibles hasta la fecha y hora de la descarga.
        </p>
      </div>

      <ItemReporte
        titulo="Reporte de unidad"
        descripcion="Una fila por archivo (foto o audio) que subió la unidad en el periodo, con número económico, tipo, fecha, hora y coordenadas."
      >
        <div
          className="flex flex-col gap-1"
          onBlur={(e) => {
            // Cierra la lista al salir del campo y de sus opciones.
            if (!e.currentTarget.contains(e.relatedTarget)) setListaAbierta(false);
          }}
        >
          <FormField label="Unidad">
            <Input
              type="search"
              role="combobox"
              aria-expanded={listaAbierta}
              aria-controls="opciones-unidad"
              placeholder="Buscar o elegir una unidad…"
              autoComplete="off"
              value={texto}
              startAdornment={<Search size={16} strokeWidth={1.75} />}
              onFocus={() => setListaAbierta(true)}
              onChange={(e) => {
                setTexto(e.target.value);
                setUid('');
                setListaAbierta(true);
              }}
              onKeyDown={(e) => {
                const primera = opciones[0];
                if (e.key === 'Enter' && uid === '' && primera) {
                  e.preventDefault();
                  elegir(primera);
                }
              }}
            />
          </FormField>
          {listaAbierta && (
            <ul
              id="opciones-unidad"
              role="listbox"
              aria-label="Unidades"
              className="border-border bg-surface max-h-56 overflow-y-auto rounded border"
            >
              {opciones.length === 0 ? (
                <li className="text-text-muted px-3 py-2 text-xs">
                  {porCustodio.length === 0
                    ? 'No hay unidades con actividad en el periodo.'
                    : 'Ninguna unidad coincide con la búsqueda.'}
                </li>
              ) : (
                opciones.map((c) => (
                  <li key={c.uid} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={c.uid === uid}
                      className={`text-text hover:bg-surface-high w-full px-3 py-2 text-left text-sm ${
                        c.uid === uid ? 'font-semibold' : ''
                      }`}
                      onClick={() => elegir(c)}
                    >
                      {c.nombre}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        {uid !== '' && archivos.isPending && (
          <p className="text-text-muted text-xs">Leyendo los archivos de la unidad…</p>
        )}
        {archivos.isSuccess && <GraficaArchivosPorDia datos={serieArchivos} />}
        <div>
          <Button
            variant="outline"
            disabled={!archivos.isSuccess}
            onClick={descargarUnidad}
            startIcon={<Download size={16} strokeWidth={1.75} />}
          >
            Descargar reporte de unidad
          </Button>
        </div>
        {archivos.isError && (
          <p role="alert" className="text-xs text-red-400">
            {faltaIndice(archivos.error)
              ? 'Falta un índice de Firestore para esta consulta. Pide que se desplieguen los índices de pf-infra-firebase.'
              : 'No se pudieron leer los archivos de la unidad. Intenta de nuevo.'}
          </p>
        )}
        {archivos.isSuccess && (
          <p className="text-text-muted text-xs">
            La unidad tiene {enteros.format(archivos.data.medios.length)} archivo(s) en el periodo (
            {enteros.format(archivos.data.medios.filter((m) => m.tipo === 'FOTO').length)} fotos y{' '}
            {enteros.format(archivos.data.medios.filter((m) => m.tipo === 'AUDIO').length)} audios).
          </p>
        )}
        {archivos.isSuccess && archivos.data.recortado && (
          <p role="alert" className="text-xs text-amber-400">
            La unidad tiene más archivos de los que se pueden leer de una vez: el reporte incluye
            los más antiguos y le faltan los más recientes. Prueba con un periodo más corto.
          </p>
        )}
      </ItemReporte>

      <ItemReporte
        titulo="Actividad por día"
        descripcion="Seguimientos, evidencia y números económicos activos de cada día del periodo, incluidos los días sin actividad."
      >
        <GraficaViajesPorDia datos={serieViajes} />
        <div>
          <Button
            variant="outline"
            onClick={() => descargar('actividad_por-dia', actividadPorDiaACsv(porViaje, rango))}
            startIcon={<Download size={16} strokeWidth={1.75} />}
          >
            Descargar actividad por día
          </Button>
        </div>
      </ItemReporte>
    </Modal>
  );
}
