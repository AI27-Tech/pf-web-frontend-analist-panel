import { render, screen } from '@testing-library/react';
import { Truck } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import type { Estadistica } from '@/lib/datos/metricas';

import { TarjetaEstadistica } from './TarjetaEstadistica';

const base: Estadistica = { valor: '1,428', delta: 0.124, contexto: 'vs. periodo anterior' };

describe('TarjetaEstadistica', () => {
  it('muestra el título y el valor', () => {
    render(<TarjetaEstadistica titulo="Viajes auditados" estadistica={base} Icono={Truck} />);
    expect(screen.getByText('Viajes auditados')).toBeInTheDocument();
    expect(screen.getByText('1,428')).toBeInTheDocument();
  });

  it('formatea el delta positivo con signo y en verde cuando subir es bueno', () => {
    render(<TarjetaEstadistica titulo="Viajes auditados" estadistica={base} Icono={Truck} />);
    const delta = screen.getByText('+12.4%');
    expect(delta).toBeInTheDocument();
    // El color vive en el span que envuelve la flecha y la cifra; `+12.4%` está en el
    // span interior de cifras, así que se sube un nivel para leer la clase de estado.
    expect(delta.parentElement?.className).toContain('text-success');
  });

  it('pinta en rojo un delta positivo cuando la métrica invierte el sentido', () => {
    render(
      <TarjetaEstadistica
        titulo="Incidencias registradas"
        estadistica={base}
        Icono={Truck}
        invertirColorDelta
      />,
    );
    const delta = screen.getByText('+12.4%');
    expect(delta.parentElement?.className).toContain('text-danger');
  });

  it('sin periodo anterior muestra sólo el contexto, sin delta', () => {
    render(
      <TarjetaEstadistica
        titulo="Viajes auditados"
        estadistica={{ valor: '10', delta: null, contexto: 'vs. periodo anterior' }}
        Icono={Truck}
      />,
    );
    expect(screen.getByText('vs. periodo anterior')).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });
});
