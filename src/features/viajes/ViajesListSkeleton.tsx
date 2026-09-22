/**
 * Estado de carga de `ViajesList`.
 */
export interface ViajesListSkeletonProps {
  count: number;
}

export function ViajesListSkeleton({ count }: ViajesListSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, indice) => (
        <li key={indice} aria-hidden="true">
          <div className="bg-surface-high h-20 animate-pulse rounded" />
        </li>
      ))}
    </>
  );
}
