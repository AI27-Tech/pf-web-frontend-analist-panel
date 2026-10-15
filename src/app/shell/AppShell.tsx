import { Button, Navbar, Sidebar, SidebarItem } from '@ai27-tech/ui';
import { Outlet, useMatchRoute, useNavigate } from '@tanstack/react-router';
import {
  Images,
  User as UserIcon,
  Route,
  SquareText,
  SlidersHorizontal,
  Activity,
  Settings,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { observarSesion, type UsuarioSesion } from '@/lib/datos/sesion';

const nav = [
  { to: '/viajes', label: 'Viajes', Icon: Route },
  { to: '/galeria', label: 'Galería', Icon: Images },
  { to: '/reporte', label: 'Reporte', Icon: SquareText },
  { to: '/sistema', label: 'Sistema', Icon: Activity },
  { to: '/administracion', label: 'Administración', Icon: Settings },
  { to: '/ajustes', label: 'Ajustes', Icon: SlidersHorizontal },
] as const;

/**
 * Layout de las pantallas autenticadas: barra lateral, barra superior y el contenido.
 *
 * Vive fuera del archivo de ruta a propósito: `_privado.tsx` sólo resuelve la guarda de
 * sesión y monta este shell, así el layout queda reutilizable y aislado del enrutamiento.
 */
export function AppShell() {
  // La Sidebar de la librería es `height:100%`, así que el contenedor tiene que dar
  // la altura completa de la ventana para que ocupe todo el alto disponible.
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();

  // La barra superior muestra al usuario autenticado. Nos suscribimos al estado de la
  // sesión para reflejar login/logout en vivo, y nos damos de baja al desmontar.
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  useEffect(() => observarSesion(setUsuario), []);

  const [colapsada, setColapsada] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar
        className="no-imprimir shrink-0"
        header={
          colapsada ? undefined : <span className="text-lg font-semibold tracking-tight">AI27</span>
        }
        collapsed={colapsada}
        onToggleCollapse={() => setColapsada((previa) => !previa)}
      >
        {nav.map(({ to, label, Icon }) => (
          <SidebarItem
            key={to}
            as="a"
            href={to}
            label={label}
            icon={<Icon size={18} strokeWidth={1.75} />}
            // `fuzzy` marca activo el item tambien en las subrutas: sin el, `matchRoute`
            // hace match EXACTO y "Viajes" se apaga al entrar al detalle `/viajes/$id`.
            // Es seguro porque ningun item del nav es prefijo de otro (solo `/viajes`
            // tiene hijos), asi que no se activan dos pestanas a la vez.
            active={Boolean(matchRoute({ to, fuzzy: true }))}
            onClick={(event) => {
              // Renderiza como `<a>` real (accesible, clic-derecho), pero navega con
              // el router para no recargar la SPA en el clic normal.
              event.preventDefault();
              void navigate({ to });
            }}
          >
            {label}
          </SidebarItem>
        ))}
      </Sidebar>

      {/* Columna de contenido: barra superior fija y, debajo, la vista con scroll. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          sticky
          className="no-imprimir"
          actions={
            <Button
              variant="ghost"
              aria-label="Cuenta de usuario"
              title={usuario?.correo ?? undefined}
              startIcon={<UserIcon size={18} strokeWidth={1.75} />}
            >
              {usuario?.nombre ?? 'Cuenta'}
            </Button>
          }
        />

        <main className="min-w-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
