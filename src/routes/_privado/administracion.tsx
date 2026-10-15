import { createFileRoute } from '@tanstack/react-router';

import { AdministracionSection } from '@/features/administracion';

export const Route = createFileRoute('/_privado/administracion')({
  component: Administracion,
});

function Administracion() {
  return <AdministracionSection />;
}
