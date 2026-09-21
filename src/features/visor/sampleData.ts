import type { Medio } from '@/lib/datos/tipos';

/**
 * Medios de prueba para desarrollar el visor sin Firebase, sin sesión y SIN RED.
 *
 * Las imágenes se generan localmente como data URI de un SVG: no hay ninguna descarga
 * externa (útil cuando un proxy bloquea los servicios de imágenes de relleno). El SVG
 * incluye texto pequeño a propósito —un folio, un número de candado—, porque el valor
 * del visor es poder leerlo: así el zoom se prueba de verdad.
 *
 * ESTE ARCHIVO ES DE DESARROLLO. Se borra cuando el visor consuma medios reales.
 */

/** Construye un data URI de un SVG con un rótulo grande y una línea de texto fino. */
function svgImage(options: {
  width: number;
  height: number;
  background: string;
  label: string;
  fineText: string;
}): string {
  const { width, height, background, label, fineText } = options;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="${background}"/>
      <rect x="8" y="8" width="${width - 16}" height="${height - 16}" fill="none" stroke="#e2e8f0" stroke-width="2" opacity="0.4"/>
      <text x="50%" y="42%" fill="#e2e8f0" font-family="monospace" font-size="${Math.round(height / 10)}" font-weight="700" text-anchor="middle">${label}</text>
      <text x="50%" y="54%" fill="#94a3b8" font-family="monospace" font-size="${Math.round(height / 34)}" text-anchor="middle">${fineText}</text>
      <text x="50%" y="93%" fill="#64748b" font-family="monospace" font-size="${Math.round(height / 48)}" text-anchor="middle">${width}x${height} · imagen de prueba local (SVG)</text>
    </svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const sampleMedios: Medio[] = [
  {
    id: 'prueba-1',
    viajeId: 'viaje-demo',
    tipo: 'FOTO',
    etiqueta: 'Candado',
    rutaOriginal: svgImage({
      width: 1920,
      height: 1080,
      background: '#1c222e',
      label: 'CANDADO',
      fineText: 'Folio de candado: CN-8842-091 — íntegro al inicio del viaje',
    }),
    rutaMiniatura: svgImage({
      width: 320,
      height: 180,
      background: '#1c222e',
      label: 'CANDADO',
      fineText: 'CN-8842-091',
    }),
    capturadoEn: new Date('2026-09-20T08:14:00'),
    recibidoEn: new Date('2026-09-20T08:15:12'),
    ubicacion: {
      latitud: 19.4326,
      longitud: -99.1332,
      precisionMetros: 8,
      antiguedadMs: 3200,
    },
    ubicacionTexto: 'Central de Abasto, CDMX',
    comentario: 'Candado íntegro al inicio del viaje.',
    bytes: 842_000,
    duracionMs: null,
    placas: 'ABC-12-34',
    custodioUid: 'custodio-demo',
    fechaLocal: '2026-09-20',
  },
  {
    id: 'prueba-2',
    viajeId: 'viaje-demo',
    tipo: 'FOTO',
    etiqueta: 'Documento',
    // Vertical, para probar el encuadre de documentos.
    rutaOriginal: svgImage({
      width: 1080,
      height: 1920,
      background: '#161b24',
      label: 'CARTA PORTE',
      fineText: 'Folio fiscal: 3F9A-77C2-45E1-90BD — revisar dígito verificador',
    }),
    rutaMiniatura: svgImage({
      width: 180,
      height: 320,
      background: '#161b24',
      label: 'DOC',
      fineText: '3F9A-77C2',
    }),
    capturadoEn: new Date('2026-09-20T08:40:00'),
    recibidoEn: new Date('2026-09-20T08:41:03'),
    ubicacion: null,
    ubicacionTexto: null,
    comentario: 'Folio de la carta porte. Documento vertical.',
    bytes: 1_204_000,
    duracionMs: null,
    placas: 'ABC-12-34',
    custodioUid: 'custodio-demo',
    fechaLocal: '2026-09-20',
  },
  {
    id: 'prueba-3',
    viajeId: 'viaje-demo',
    tipo: 'FOTO',
    etiqueta: 'Caja',
    rutaOriginal: svgImage({
      width: 1920,
      height: 1080,
      background: '#242b3a',
      label: 'CAJA',
      fineText: 'Sello lateral: SL-0471 — sin daños visibles',
    }),
    rutaMiniatura: svgImage({
      width: 320,
      height: 180,
      background: '#242b3a',
      label: 'CAJA',
      fineText: 'SL-0471',
    }),
    capturadoEn: new Date('2026-09-20T14:02:00'),
    recibidoEn: new Date('2026-09-20T14:05:47'),
    ubicacion: {
      latitud: 19.504,
      longitud: -99.115,
      precisionMetros: 42,
      antiguedadMs: 61_000,
    },
    ubicacionTexto: 'Ecatepec, Edomex',
    comentario: null,
    bytes: 933_000,
    duracionMs: null,
    placas: 'ABC-12-34',
    custodioUid: 'custodio-demo',
    fechaLocal: '2026-09-20',
  },
];
