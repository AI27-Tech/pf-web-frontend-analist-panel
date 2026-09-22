/**
 * Tipos del panel. NO son los documentos de Firestore: son lo que las pantallas
 * consumen, y los mappers de `src/lib/datos/` traducen de uno al otro.
 *
 * Esa separación es lo que permite cambiar de fuente de datos —de Firebase a un BFF
 * en Go, cuando la identidad de la plataforma esté lista— sin tocar una sola pantalla.
 *
 * El contrato de origen lo define pf-app-custodio/docs/PLAN.md §5.1. Este panel es
 * SÓLO LECTURA: no escribe ni un documento.
 */

export type CicloViaje = 'ACTIVO' | 'CERRADO' | 'DESCARTADO';
export type EstadoSubida = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETA' | 'FALLIDA';
export type TipoMedio = 'FOTO' | 'AUDIO';

/** Ubicación de una captura, con su confiabilidad. Una posición sin precisión ni
 *  antigüedad no se puede juzgar, así que las tres viajan juntas. */
export interface Ubicacion {
  latitud: number;
  longitud: number;
  precisionMetros: number;
  antiguedadMs: number;
}

/** Un archivo capturado en campo: el reemplazo de un mensaje de WhatsApp. */
export interface Medio {
  id: string;
  viajeId: string;
  tipo: TipoMedio;
  etiqueta: string;
  rutaOriginal: string;
  rutaMiniatura: string | null;
  capturadoEn: Date;
  recibidoEn: Date | null;
  ubicacion: Ubicacion | null;
  ubicacionTexto: string | null;
  comentario: string | null;
  bytes: number;
  duracionMs: number | null;
  placas: string;
  custodioUid: string;
  fechaLocal: string;
}

/** Un viaje: el contenedor de los archivos de un servicio. */
export interface Viaje {
  id: string;
  placas: string;
  custodioCorreo: string;
  custodioUid: string;
  fechaLocal: string;
  abiertoEn: Date;
  cerradoEn: Date | null;
  comentario: string | null;
  hayNovedad: boolean;
  ciclo: CicloViaje;
  motivoDescarte: string | null;
  subida: EstadoSubida;
  completo: boolean;
  mediosEsperados: number;
  mediosSubidos: number;
  fotos: number;
  audios: number;
}

/** Valor del catálogo de etiquetas. Pendiente de definición por Operación; hoy el
 *  panel lo lee de Firestore y no lo hardcodea. */
export interface Etiqueta {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface FiltrosViaje {
  desde: string;
  hasta: string;
  placas?: string;
  custodioUid?: string;
  hayNovedad?: boolean;
  limite?: number;
}

/** Filtros de la galería: archivos entre viajes acotados por periodo, etiqueta y tipo.
 *  Comparte `desde`/`hasta` (cadena `YYYY-MM-DD`) con la pantalla de Viajes. */
export interface FiltrosMedio {
  desde: string;
  hasta: string;
  tipo?: TipoMedio;
  etiqueta?: string;
  placas?: string;
  custodioUid?: string;
  limite?: number;
}
