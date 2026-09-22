import { createFileRoute } from '@tanstack/react-router';

import { GaleriaSection } from '@/features/galeria/GaleriaSection';
import { SAMPLE_MEDIOS } from '@/features/galeria/provisional';
import { listarMedios } from '@/lib/datos/medios';
import { rangoDeAtajo } from '@/lib/formato/fechas';

/**
 * Galería: archivos ENTRE viajes, para responder «todas las fotos de tal etiqueta en tal
 * periodo». El loader es la frontera de datos (misma regla que el resto del panel): trae
 * el corpus del periodo por defecto y `GaleriaSection` lo refina en cliente por etiqueta
 * y tipo, y abre el visor.
 *
 * El periodo por defecto es el mes en curso, el mismo atajo que usa la pantalla de
 * Viajes, para que ambas hablen del mismo corte. Cuando la galería tenga su propio
 * selector de fechas, este rango saldrá de un search param validado.
 *
 * Provisional: si Firebase no devuelve datos —config de desarrollo ficticia o corpus
 * vacío— se cae a `SAMPLE_MEDIOS` para que la pantalla se vea poblada mientras se
 * conecta el backend real. En cuanto haya documentos, ganan los reales.
 */
export const Route = createFileRoute('/_privado/galeria')({
  loader: async () => {
    const { desde, hasta } = rangoDeAtajo('mes');
    try {
      const medios = await listarMedios({ desde, hasta });
      return { medios: medios.length > 0 ? medios : SAMPLE_MEDIOS };
    } catch {
      return { medios: SAMPLE_MEDIOS };
    }
  },
  component: Galeria,
});

function Galeria() {
  const { medios } = Route.useLoaderData();
  return <GaleriaSection medios={medios} />;
}
