import { createFileRoute } from '@tanstack/react-router';

import { EncabezadoPagina, PorConstruir } from '@/components/EncabezadoPagina';

export const Route = createFileRoute('/_privado/viajes')({
  component: Viajes,
});

function Viajes() {
  return (
    <>
      <EncabezadoPagina titulo="Viajes" />
      <PorConstruir
        fase="F3"
        descripcion="La pantalla principal: lista de viajes filtrable por fecha, placa, custodio, etiqueta y novedad, con una tira de miniaturas por renglón para ver qué hay dentro sin abrir. Es el nivel uno del modelo de dos niveles."
      />
    </>
  );
}
