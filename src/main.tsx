import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
// La librería es la única fuente de verdad de la paleta: sus tokens `--ui-*` y sus
// estilos base se importan primero, y `globales.css` sólo los re-expone con los
// nombres en español que usa el panel. Ver docs/PLAN.md §3 y §7.
import '@ai27-tech/ui/styles.css';
import './styles/globales.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Los listados y el reporte se cachean: un analista que vuelve a la misma vista no
// vuelve a pagar las lecturas de Firestore.
const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={clienteQuery}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
