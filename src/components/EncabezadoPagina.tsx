/** Barra superior de página: título a la izquierda, acciones a la derecha.
 *  Corresponde al prompt 4 del diseño. */
export function EncabezadoPagina({
  titulo,
  children,
}: {
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-borde flex items-center justify-between border-b px-8 py-6">
      <h1 className="text-texto text-xl font-semibold tracking-tight">{titulo}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}

/** Marcador de pantalla sin construir, para que el scaffold navegue de verdad en lugar
 *  de mostrar páginas en blanco. Se borra al implementar cada fase. */
export function PorConstruir({ fase, descripcion }: { fase: string; descripcion: string }) {
  return (
    <div className="px-8 py-10">
      <p className="text-acento font-mono text-xs tracking-widest uppercase">{fase}</p>
      <p className="text-texto-tenue mt-2 max-w-prose text-sm">{descripcion}</p>
    </div>
  );
}
