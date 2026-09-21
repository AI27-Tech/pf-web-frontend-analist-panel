import { Badge, Button, Input, Navbar, Sidebar, SidebarItem } from '@ai27-tech/ui';
import { Outlet, useMatchRoute, useNavigate } from '@tanstack/react-router';
import {
  FileStack,
  Images,
  BarChart3,
  Bell,
  Search,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { observarSesion, type UsuarioSesion } from '@/lib/datos/sesion';

const nav = [
  { to: '/viajes', label: 'Viajes', Icon: FileStack },
  { to: '/galeria', label: 'Galería', Icon: Images },
  { to: '/reporte', label: 'Reporte', Icon: BarChart3 },
  { to: '/ajustes', label: 'Ajustes', Icon: Settings },
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

  return (
    <div className="flex h-screen">
      <Sidebar
        className="no-imprimir shrink-0"
        header={<span className="text-lg font-semibold tracking-tight">AI27</span>}
      >
        {nav.map(({ to, label, Icon }) => (
          <SidebarItem
            key={to}
            as="a"
            href={to}
            label={label}
            icon={<Icon size={18} strokeWidth={1.75} />}
            active={Boolean(matchRoute({ to }))}
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
          brand={
            <Input
              type="search"
              placeholder="Buscar viajes, folios…"
              aria-label="Buscar"
              startAdornment={<Search size={16} strokeWidth={1.75} />}
            />
          }
          actions={
            <>
              <Button
                variant="ghost"
                aria-label="Notificaciones"
                startIcon={<Bell size={18} strokeWidth={1.75} />}
              >
              </Button>
              <Button
                variant="ghost"
                aria-label="Cuenta de usuario"
                title={usuario?.correo ?? undefined}
                startIcon={<UserIcon size={18} strokeWidth={1.75} />}
              >
                {usuario?.nombre ?? 'Cuenta'}
              </Button>
            </>
          }
        />

        <main className="min-w-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
