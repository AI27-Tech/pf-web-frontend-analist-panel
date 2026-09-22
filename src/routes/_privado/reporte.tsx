import { createFileRoute } from '@tanstack/react-router';

import { ReporteSection } from '@/features/reporte/ReporteSection';

export const Route = createFileRoute('/_privado/reporte')({
  component: Reporte,
});

function Reporte() {
  return <ReporteSection />;
}
