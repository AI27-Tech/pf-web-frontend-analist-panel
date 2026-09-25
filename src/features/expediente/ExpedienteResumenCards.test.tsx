import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Viaje } from '@/lib/datos/tipos';

import { ExpedienteResumenCards } from './ExpedienteResumenCards';

function crearViaje(sobrescribir: Partial<Viaje> = {}): Viaje {
  return {
    id: 'viaje-01',
    placas: 'YZ-498-LK',
    custodioTelefono: '+525563320001',
    custodioName: 'Cap. Jesús Pérez R.',
    custodioUid: 'custodio-01',
    fechaLocal: '2026-09-01',
    abiertoEn: new Date('2026-09-01T08:30:00-06:00'),
    cerradoEn: null,
    comentario: null,
    isUpdated: false,
    ciclo: 'ACTIVO',
    motivoDescarte: null,
    subida: 'EN_PROGRESO',
    completo: false,
    mediosEsperados: 18,
    uploadedFiles: 14,
    estados: ['activo'],
    etiquetas: [],
    fotos: 12,
    audios: 2,
    ...sobrescribir,
  };
}

describe('ExpedienteResumenCards', () => {
  it('muestra la fecha de apertura y el estado «en progreso» cuando el viaje no está cerrado', () => {
    render(<ExpedienteResumenCards viaje={crearViaje({ cerradoEn: null })} />);

    expect(screen.getByText('En progreso')).toBeInTheDocument();
  });

  it('muestra la fecha de cierre cuando el viaje ya está cerrado', () => {
    const viaje = crearViaje({ cerradoEn: new Date('2026-09-01T12:15:00-06:00') });
    render(<ExpedienteResumenCards viaje={viaje} />);

    expect(screen.queryByText('En progreso')).not.toBeInTheDocument();
    expect(screen.getByText(/Cerrado/)).toBeInTheDocument();
  });

  it('usa el teléfono del custodio (formateado) cuando no hay custodioName', () => {
    const viaje = crearViaje({ custodioTelefono: '+525563329999' });
    delete viaje.custodioName;
    render(<ExpedienteResumenCards viaje={viaje} />);

    // El nombre respalda al teléfono, así que el teléfono aparece dos veces (título y
    // subtítulo), y en ambos lugares se muestra agrupado como `+XX (XXX) XXX XXXX`.
    expect(screen.getAllByText('+52 (556) 332 9999').length).toBeGreaterThan(0);
  });

  it('muestra el conteo de archivos subidos sin el contexto de esperados', () => {
    render(
      <ExpedienteResumenCards viaje={crearViaje({ uploadedFiles: 14, mediosEsperados: 18 })} />,
    );

    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.queryByText(/esperados/)).not.toBeInTheDocument();
  });

  it('calcula la duración transcurrida entre apertura y cierre', () => {
    const viaje = crearViaje({
      abiertoEn: new Date('2026-09-01T08:30:00-06:00'),
      cerradoEn: new Date('2026-09-01T12:15:00-06:00'),
    });
    render(<ExpedienteResumenCards viaje={viaje} />);

    expect(screen.getByText('3h 45m')).toBeInTheDocument();
  });
});
