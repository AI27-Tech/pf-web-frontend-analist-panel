import { TriangleAlert } from 'lucide-react';

import { TOPE_LECTURA_METRICAS, type CoberturaMetricas } from '@/lib/datos/metricas';

const enteros = new Intl.NumberFormat('es-MX');

/**
 * Aviso de lectura incompleta. Las métricas se calculan con una lectura acotada
 * (`TOPE_LECTURA_METRICAS`); cuando un periodo la rebasa, las cifras cubren sólo lo más
 * reciente. Sin este aviso, un ranking o un total incompleto se leería como exacto.
 *
 * El texto depende de la pantalla (`alcance`), porque cada una muestra cosas distintas:
 *  - `reporte`: tarjetas, tablas y rankings, que salen de los viajes. No lee `medios`.
 *  - `sistema`: la gráfica de descartes (viajes) y las de hora y GB (archivos).
 *
 * No muestra nada si la lectura está completa.
 */
export interface AvisoCoberturaProps {
  cobertura: CoberturaMetricas;
  alcance: 'reporte' | 'sistema';
}

export function AvisoCobertura({ cobertura, alcance }: AvisoCoberturaProps) {
  const tope = enteros.format(TOPE_LECTURA_METRICAS);
  const mensajes: string[] = [];

  if (cobertura.reportesRecortados) {
    mensajes.push(
      alcance === 'reporte'
        ? `El periodo tiene más seguimientos de los que se pueden leer de una vez (límite de ${tope}). Las tarjetas, tablas y rankings cubren los más recientes y pueden estar incompletos. Prueba con un periodo más corto.`
        : `El periodo tiene más seguimientos de los que se pueden leer de una vez (límite de ${tope}). La gráfica de descartes cubre los más recientes y puede estar incompleta.`,
    );
  }
  if (alcance === 'sistema' && cobertura.mediosRecortados) {
    mensajes.push(
      `Las gráficas «Capturas por hora» y «GB acumulados» se calculan con los ${tope} archivos más recientes del periodo.`,
    );
  }

  if (mensajes.length === 0) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs text-amber-300"
    >
      <TriangleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        {mensajes.map((mensaje) => (
          <p key={mensaje}>{mensaje}</p>
        ))}
      </div>
    </div>
  );
}
