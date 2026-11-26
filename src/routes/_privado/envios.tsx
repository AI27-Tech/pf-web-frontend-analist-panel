import { createFileRoute } from '@tanstack/react-router';

import { EncabezadoPagina, PorConstruir } from '@/components/EncabezadoPagina';

export const Route = createFileRoute('/_privado/envios')({
  component: Envios,
});

/** Ruta de Checklist. El formulario llega con el ticket 06; aquí sólo se monta la
 *  sección para que el rol tenga su único destino. */
function Envios() {
  return (
    <>
      <EncabezadoPagina titulo="Envíos" />
      <PorConstruir
        fase="Envíos"
        descripcion="El alta de envíos estará disponible en la siguiente entrega."
      />
    </>
  );
}
