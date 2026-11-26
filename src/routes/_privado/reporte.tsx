import { createFileRoute } from '@tanstack/react-router';

import { ReporteSection } from '@/features/reporte/ReporteSection';

export const Route = createFileRoute('/_privado/reporte')({
  validateSearch: (search: Record<string, unknown>) => ({
    envio: typeof search.envio === 'string' && search.envio.trim() ? search.envio : undefined,
  }),
  component: Reporte,
});

function Reporte() {
  const { envio } = Route.useSearch();
  return <ReporteSection envio={envio} />;
}
