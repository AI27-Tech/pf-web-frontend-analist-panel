import { createFileRoute } from '@tanstack/react-router';

import { EncabezadoPagina, PorConstruir } from '@/components/EncabezadoPagina';

export const Route = createFileRoute('/_privado/reporte')({
  component: Reporte,
});

function Reporte() {
  return (
    <>
      <EncabezadoPagina titulo="Reporte" />
      <PorConstruir
        fase="F5"
        descripcion="Cinco secciones —Adopción, Operación y tiempos, Cobertura, Calidad de datos y Costos— con rango de fechas configurable y atajos. El PDF lo genera el navegador desde la hoja de impresión: no hay librería de generación. Sin métricas de volumen ni rankings de custodios por cantidad de fotos."
      />
    </>
  );
}
