/**
 * Estado de carga del expediente, mientras se resuelve `obtenerViaje`.
 */
export function ExpedienteDetalleSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-8 py-6" aria-hidden="true">
      <div className="bg-surface-high h-8 w-64 animate-pulse rounded" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, indice) => (
          <div key={indice} className="bg-surface-high h-24 animate-pulse rounded" />
        ))}
      </div>
      <div className="bg-surface-high h-48 animate-pulse rounded" />
    </div>
  );
}
