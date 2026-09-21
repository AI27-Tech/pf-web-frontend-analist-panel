import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router';
import { FileStack, Images, BarChart3, Settings } from 'lucide-react';

import { esperarSesion } from '@/lib/datos/sesion';

/**
 * Layout de las pantallas autenticadas: barra lateral fija más el contenido.
 *
 * El guard espera a que Firebase Auth restaure la sesión antes de decidir. Leer
 * `auth.currentUser` directo mandaría al login a un usuario que sí tenía sesión.
 */
export const Route = createFileRoute('/_privado')({
  beforeLoad: async ({ location }) => {
    const usuario = await esperarSesion();
    if (!usuario) {
      // El scaffold no preserva el destino original todavía; cuando el panel tenga
      // enlaces profundos, esto lleva un search param validado.
      void location;
      throw redirect({ to: '/login' });
    }
  },
  component: Privado,
});

const destinos = [
  { a: '/viajes', etiqueta: 'Viajes', Icono: FileStack },
  { a: '/galeria', etiqueta: 'Galería', Icono: Images },
  { a: '/reporte', etiqueta: 'Reporte', Icono: BarChart3 },
  { a: '/ajustes', etiqueta: 'Ajustes', Icono: Settings },
] as const;

function Privado() {
  return (
    <div className="flex min-h-screen">
      {/* En tablet la barra se colapsa a iconos sin etiqueta (prompt 24 del diseño). */}
      <nav className="bg-superficie border-borde no-imprimir flex w-16 shrink-0 flex-col border-r py-6 lg:w-56">
        <p className="text-texto mb-8 px-4 text-lg font-semibold tracking-tight lg:px-6">AI27</p>
        <ul className="flex flex-col gap-1 px-2 lg:px-3">
          {destinos.map(({ a, etiqueta, Icono }) => (
            <li key={a}>
              <Link
                to={a}
                className="text-texto-tenue flex items-center gap-3 rounded px-3 py-3 text-sm"
                activeProps={{ className: 'bg-superficie-alta text-acento' }}
              >
                <Icono size={18} strokeWidth={1.75} />
                <span className="hidden lg:inline">{etiqueta}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
