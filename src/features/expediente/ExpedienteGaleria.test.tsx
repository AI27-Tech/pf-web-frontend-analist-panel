import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Medio } from '@/lib/datos/tipos';

import { ExpedienteGaleria } from './ExpedienteGaleria';

/**
 * Medios de muestra (id `muestra-…`, como en `features/galeria/provisional.ts`)
 */
function crearMedio(sobrescribir: Partial<Medio>): Medio {
  return {
    id: 'muestra-0',
    viajeId: 'viaje-01',
    tipo: 'FOTO',
    etiqueta: 'salida',
    rutaOriginal: 'muestras/archivo.jpg',
    rutaMiniatura: null,
    capturadoEn: new Date('2026-09-01T08:19:00-06:00'),
    recibidoEn: null,
    ubicacion: null,
    ubicacionTexto: null,
    comentario: null,
    bytes: 4_800_000,
    duracionMs: null,
    placas: 'YZ-498-LK',
    custodioUid: 'custodio-01',
    fechaLocal: '2026-09-01',
    ...sobrescribir,
  };
}

describe('ExpedienteGaleria', () => {
  it('muestra el mensaje de vacío cuando no hay medios y no está cargando', () => {
    render(<ExpedienteGaleria medios={[]} cargando={false} />);

    expect(
      screen.getByText('Este viaje no tiene archivos registrados todavía.'),
    ).toBeInTheDocument();
  });

  it('no muestra el mensaje de vacío mientras está cargando', () => {
    render(<ExpedienteGaleria medios={[]} cargando={true} />);

    expect(
      screen.queryByText('Este viaje no tiene archivos registrados todavía.'),
    ).not.toBeInTheDocument();
  });

  it('agrupa los medios por etiqueta y numera cada sección en orden de aparición', () => {
    const medios = [
      crearMedio({ id: 'muestra-1', etiqueta: 'salida' }),
      crearMedio({ id: 'muestra-2', etiqueta: 'salida' }),
      crearMedio({ id: 'muestra-3', etiqueta: 'incidencia' }),
    ];

    render(<ExpedienteGaleria medios={medios} />);

    expect(screen.getByText(/\[01\]\s*salida/i)).toBeInTheDocument();
    expect(screen.getByText(/\[02\]\s*incidencia/i)).toBeInTheDocument();
  });

  it('muestra el conteo real de evidencias por grupo, sin inventar ubicación ni alertas', () => {
    const medios = [
      crearMedio({ id: 'muestra-1', etiqueta: 'salida' }),
      crearMedio({ id: 'muestra-2', etiqueta: 'salida' }),
    ];

    render(<ExpedienteGaleria medios={medios} />);

    expect(screen.getByText('2 evidencias')).toBeInTheDocument();
  });

  it('agrupa los medios sin etiqueta bajo «Sin etiqueta»', () => {
    render(<ExpedienteGaleria medios={[crearMedio({ id: 'muestra-1', etiqueta: '' })]} />);

    expect(screen.getByText(/\[01\]\s*Sin etiqueta/i)).toBeInTheDocument();
  });

  it('renderiza una tarjeta por cada medio con su hora y placas', () => {
    const medios = [crearMedio({ id: 'muestra-1', etiqueta: 'salida' })];
    const { container } = render(<ExpedienteGaleria medios={medios} />);

    expect(within(container).getByText(/02:19|08:19/)).toBeInTheDocument();
  });
});
