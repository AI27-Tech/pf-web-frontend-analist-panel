import { createFileRoute } from '@tanstack/react-router';

import { EncabezadoPagina, PorConstruir } from '@/components/EncabezadoPagina';

export const Route = createFileRoute('/_privado/galeria')({
  component: Galeria,
});

function Galeria() {
  return (
    <>
      <EncabezadoPagina titulo="Galería" />
      <PorConstruir
        fase="F4"
        descripcion="Archivos entre viajes, para responder «todas las fotos de tal etiqueta en tal periodo». Comparte los filtros con la pantalla de Viajes."
      />
    </>
  );
}
