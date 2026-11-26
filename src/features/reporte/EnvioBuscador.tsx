import { Button, FormField, Input } from '@ai27-tech/ui';
import { Search } from 'lucide-react';
import { useState } from 'react';

/**
 * Entrada del reporte por Shipment ID, arriba del selector de periodo. El valor viaja en
 * la URL (`/reporte?envio=S-100`) para que recargar y compartir la vista funcionen.
 */
export interface EnvioBuscadorProps {
  /** Shipment ID activo en la URL, si la vista de envío está montada. */
  envioActivo?: string | undefined;
  onBuscar: (shipmentId: string) => void;
  onLimpiar: () => void;
}

export function EnvioBuscador({ envioActivo, onBuscar, onLimpiar }: EnvioBuscadorProps) {
  const [texto, setTexto] = useState(envioActivo ?? '');

  return (
    <form
      className="border-border flex flex-wrap items-end gap-3 border-b px-4 py-3 sm:px-8"
      onSubmit={(evento) => {
        evento.preventDefault();
        const valor = texto.trim();
        if (valor) onBuscar(valor);
      }}
    >
      <FormField label="Reporte por Shipment ID">
        <Input
          type="search"
          placeholder="S-100"
          autoComplete="off"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          startAdornment={<Search size={16} strokeWidth={1.75} />}
        />
      </FormField>
      <Button type="submit" disabled={!texto.trim()}>
        Ver envío
      </Button>
      {envioActivo && (
        <Button type="button" variant="outline" onClick={onLimpiar}>
          Volver al tablero
        </Button>
      )}
    </form>
  );
}
