import { createFileRoute } from '@tanstack/react-router';
import { EnviosSection } from '@/features/envios';

export const Route = createFileRoute('/_privado/envios')({
  component: Envios,
});

/** Ruta de Checklist (única sección de ese rol). La guarda de `_privado` ya la limita. */
function Envios() {
  return <EnviosSection />;
}
