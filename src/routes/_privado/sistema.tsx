import { createFileRoute } from '@tanstack/react-router';

import { SistemaSection } from '@/features/sistema/SistemaSection';

export const Route = createFileRoute('/_privado/sistema')({
  component: Sistema,
});

function Sistema() {
  return <SistemaSection />;
}
