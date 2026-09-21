import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { sampleMedios } from '@/features/visor/sampleData';
import { Visor } from '@/features/visor/Visor';

/**
 * Banco de pruebas del visor, en /_dev/visor. Fuera del guard de sesión: abre el
 * visor con medios de prueba para desarrollarlo sin login ni Firebase.
 * Ruta de desarrollo; se borra al terminar el visor.
 */
export const Route = createFileRoute('/_dev/visor')({
  component: VisorTestbed,
});

function VisorTestbed() {
  const [open, setOpen] = useState(true);

  return (
    <main className="bg-canvas min-h-screen p-8">
      <h1 className="text-text text-xl font-semibold">Banco de pruebas — Visor</h1>
      <p className="text-text-muted mt-1 text-sm">
        Ruta de desarrollo. Abre el visor con {sampleMedios.length} medios de prueba, sin sesión.
      </p>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-accent text-on-accent mt-6 rounded px-4 py-2 text-sm font-semibold"
      >
        Abrir visor
      </button>

      {open && <Visor medios={sampleMedios} initialIndex={0} onClose={() => setOpen(false)} />}
    </main>
  );
}
