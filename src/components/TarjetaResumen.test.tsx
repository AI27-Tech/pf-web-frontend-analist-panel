import { render, screen } from '@testing-library/react';
import { Truck } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { TarjetaResumen } from './TarjetaResumen';

describe('TarjetaResumen', () => {
  it('muestra el título y el valor', () => {
    render(<TarjetaResumen titulo="Viajes auditados" Icono={Truck} valor="1,428" />);
    expect(screen.getByText('Viajes auditados')).toBeInTheDocument();
    expect(screen.getByText('1,428')).toBeInTheDocument();
  });

  it('formatea el delta positivo con signo y en verde cuando subir es bueno', () => {
    render(
      <TarjetaResumen titulo="Viajes" Icono={Truck} valor="1,428" delta={0.124} contexto="vs. anterior" />,
    );
    const delta = screen.getByText('+12.4%');
    expect(delta.parentElement?.className).toContain('text-success');
  });

  it('pinta en rojo un delta positivo cuando la métrica invierte el sentido', () => {
    render(
      <TarjetaResumen
        titulo="Incidencias"
        Icono={Truck}
        valor="1,428"
        delta={0.124}
        contexto="vs. anterior"
        invertirColorDelta
      />,
    );
    expect(screen.getByText('+12.4%').parentElement?.className).toContain('text-danger');
  });

  it('sin delta muestra sólo el contexto', () => {
    render(<TarjetaResumen titulo="Duración" Icono={Truck} valor="10h 40m" contexto="Duración total" />);
    expect(screen.getByText('Duración total')).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('aplica el tamaño de valor grande por defecto y mediano cuando se pide', () => {
    const { rerender } = render(<TarjetaResumen titulo="A" Icono={Truck} valor="grande" />);
    expect(screen.getByText('grande').className).toContain('text-5xl');

    rerender(<TarjetaResumen titulo="A" Icono={Truck} valor="mediano" tamanoValor="medio" />);
    expect(screen.getByText('mediano').className).toContain('text-lg');
  });
});
