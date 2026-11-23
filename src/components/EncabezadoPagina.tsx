import { PageHeader } from '@ai27-tech/ui';

/** Barra superior de página: título a la izquierda, acciones a la derecha.
 *  Corresponde al prompt 4 del diseño. */
export function EncabezadoPagina({
  titulo,
  children,
}: {
  titulo: string;
  children?: React.ReactNode;
}) {
  // `PageHeader` pasa las acciones debajo del título en pantallas angostas.
  return (
    <PageHeader
      title={titulo}
      actions={children}
      className="border-border shrink-0 border-b px-4 py-4 sm:px-8 sm:py-6"
    />
  );
}

/** Marcador de pantalla sin construir, para que el scaffold navegue de verdad en lugar
 *  de mostrar páginas en blanco. Se borra al implementar cada fase. */
export function PorConstruir({ fase, descripcion }: { fase: string; descripcion: string }) {
  return (
    <div className="px-8 py-10">
      <p className="text-accent font-mono text-xs tracking-widest uppercase">{fase}</p>
      <p className="text-text-muted mt-2 max-w-prose text-sm">{descripcion}</p>
    </div>
  );
}
