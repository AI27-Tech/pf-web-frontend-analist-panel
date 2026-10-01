import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SeleccionPeriodo } from '@/lib/formato/fechas';

import { SelectorPeriodo } from './SelectorPeriodo';

describe('SelectorPeriodo', () => {
  it('marca el atajo activo con aria-pressed', () => {
    render(<SelectorPeriodo seleccion={{ atajo: 'mes' }} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Este mes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Hoy' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('notifica el atajo elegido', async () => {
    const onChange = vi.fn();
    render(<SelectorPeriodo seleccion={{ atajo: 'mes' }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Esta semana' }));
    expect(onChange).toHaveBeenCalledWith({ atajo: 'semana' });
  });

  it('no muestra los campos de fecha salvo en Rango', () => {
    render(<SelectorPeriodo seleccion={{ atajo: 'mes' }} onChange={() => {}} />);
    expect(screen.queryByLabelText('Fecha desde')).not.toBeInTheDocument();
  });

  it('en Rango expone los dos campos de fecha con sus valores', () => {
    const seleccion: SeleccionPeriodo = {
      atajo: 'rango',
      desde: '2026-09-01',
      hasta: '2026-09-30',
    };
    render(<SelectorPeriodo seleccion={seleccion} onChange={() => {}} />);
    expect(screen.getByLabelText('Fecha desde')).toHaveValue('2026-09-01');
    expect(screen.getByLabelText('Fecha hasta')).toHaveValue('2026-09-30');
  });

  it('avisa cuando el rango es inválido', () => {
    const seleccion: SeleccionPeriodo = {
      atajo: 'rango',
      desde: '2026-09-30',
      hasta: '2026-09-01',
    };
    render(<SelectorPeriodo seleccion={seleccion} onChange={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/no puede ser posterior/i);
  });
});
