import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';

import { listarMediosDelViaje } from '@/lib/datos/medios';
import { obtenerViaje } from '@/lib/datos/viajes';

import { ExpedienteDetalle } from '@/features/expediente/ExpedienteDetalle';
import { ExpedienteDetalleSkeleton } from '@/features/expediente/ExpedienteDetalleSkeleton';
import { MEDIOS_MUESTRA_EXPEDIENTE } from '@/features/expediente/provisional';

export const Route = createFileRoute('/_privado/viajes/$id')({
  component: Pantalla_Expediente,
});

function Pantalla_Expediente() {
  const { id } = Route.useParams();

  const consultaViaje = useQuery({
    queryKey: ['viaje', id],
    queryFn: () => obtenerViaje(id),
  });

  const consultaMedios = useQuery({
    queryKey: ['medios', id],
    queryFn: async () => {
      try {
        const medios = await listarMediosDelViaje(id);
        return medios.length > 0 ? medios : [...MEDIOS_MUESTRA_EXPEDIENTE];
      } catch {
        return [...MEDIOS_MUESTRA_EXPEDIENTE];
      }
    },
    enabled: consultaViaje.data != null,
  });

  if (consultaViaje.isPending) {
    return <ExpedienteDetalleSkeleton />;
  }

  if (consultaViaje.isError || consultaViaje.data === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
        <AlertTriangle className="text-danger size-8" aria-hidden="true" />
        <p className="text-text-muted text-sm">
          {consultaViaje.data === null
            ? 'No se encontró el expediente solicitado.'
            : 'No se pudo cargar el expediente.'}
        </p>
        <Link to="/viajes" className="text-accent text-sm hover:underline">
          Volver a viajes
        </Link>
      </div>
    );
  }

  return (
    <ExpedienteDetalle
      viaje={consultaViaje.data}
      medios={consultaMedios.data ?? []}
      cargandoMedios={consultaMedios.isPending}
    />
  );
}
