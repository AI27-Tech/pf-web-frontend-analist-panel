/*
 * GaleriaSection. La `*Section` del dominio `galeria`.
 *
 * Integración con librería @ai27-tech/ui:
 * - ImageGrid: maneja filtros, búsqueda, grilla y meta de resultados
 * - ImageCard: renderiza cada item con su imagen y metadata
 * - Visor: abre fotos/audios con zoom, rotación y reproductor
 *
 * El renderItem usa ImageCard, que trae los estilos de la librería por defecto.
 */

import { ImageGrid, ImageCard, Visor, Badge } from '@ai27-tech/ui';
import type { FilterDefinition } from '@ai27-tech/ui';
import { useState } from 'react';

import { urlOriginal } from '@/lib/datos/medios';
import { etiquetaVisible, type Medio } from '@/lib/datos/tipos';
import { resolverImagenVisor, imagenProvisional, estadoProvisional } from './provisional';

export interface GaleriaSectionProps {
  readonly medios: readonly Medio[];
}

export function GaleriaSection({ medios }: GaleriaSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Definir los filtros que ImageGrid mostrará
  const filters: FilterDefinition[] = [
    {
      key: 'tipo',
      label: 'Tipo de evidencia',
      options: [
        { label: 'Todas', value: 'TODO' },
        { label: 'Fotos', value: 'FOTO' },
        { label: 'Audios', value: 'AUDIO' },
      ],
    },
    {
      key: 'etiqueta',
      label: 'Categoría',
      options: [
        { label: 'Todas', value: 'TODO' },
        ...Array.from(new Set(medios.flatMap((m) => m.etiquetas).filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, 'es'))
          .map((val) => ({ label: val, value: val })),
      ],
    },
    {
      key: 'placa',
      label: 'Unidad',
      options: [
        { label: 'Todas', value: 'TODO' },
        ...Array.from(new Set(medios.map((m) => m.placas).filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, 'es'))
          .map((val) => ({ label: val, value: val })),
      ],
    },
    {
      key: 'custodio',
      label: 'Custodio',
      options: [
        { label: 'Todos', value: 'TODO' },
        ...Array.from(new Set(medios.map((m) => m.custodioUid).filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, 'es'))
          .map((val) => ({ label: val, value: val })),
      ],
    },
  ];

  // Matching function: determina si un medio cumple con los filtros activos
  const matchesFilters = (medio: Medio, activeFilters: Record<string, string>) => {
    if (activeFilters.tipo && activeFilters.tipo !== 'TODO' && medio.tipo !== activeFilters.tipo)
      return false;
    if (
      activeFilters.etiqueta &&
      activeFilters.etiqueta !== 'TODO' &&
      !medio.etiquetas.includes(activeFilters.etiqueta)
    )
      return false;
    if (
      activeFilters.placa &&
      activeFilters.placa !== 'TODO' &&
      medio.placas !== activeFilters.placa
    )
      return false;
    if (
      activeFilters.custodio &&
      activeFilters.custodio !== 'TODO' &&
      medio.custodioUid !== activeFilters.custodio
    )
      return false;
    return true;
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Cabezal */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, margin: 0 }}>Galería</h1>
          <Badge variant="escort" pill>
            AI27 FORENSIC ARCHIVE
          </Badge>
        </div>
        <p
          style={{
            margin: '0.5rem 0 0 0',
            color: 'var(--ui-text-muted, #999)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: '50%',
              backgroundColor: 'var(--ui-success, #10b981)',
            }}
          />
          {medios.length.toLocaleString('es-MX')}{' '}
          {medios.length === 1 ? 'evidencia fotográfica' : 'evidencias fotográficas'} registradas en
          ruta
        </p>
      </div>

      {/* Grid de imágenes */}
      <ImageGrid<Medio>
        items={[...medios]}
        filters={filters}
        renderItem={(medio, index) => {
          const estado = estadoProvisional(medio);
          return (
            <ImageCard
              key={medio.id}
              src={imagenProvisional(medio)}
              alt={etiquetaVisible(medio)}
              title={`${medio.capturadoEn.getHours().toString().padStart(2, '0')}:${medio.capturadoEn.getMinutes().toString().padStart(2, '0')}`}
              subtitle={etiquetaVisible(medio)}
              footer={<small>{medio.placas || 'S/UNIDAD'}</small>}
              badges={[
                {
                  label: estado.label,
                  variant: estado.variant,
                  position: 'left',
                  pill: true,
                },
                {
                  label: medio.tipo,
                  variant: 'neutral',
                  position: 'right',
                  pill: true,
                },
              ]}
              onClick={() => setOpenIndex(index)}
            />
          );
        }}
        matchesFilters={matchesFilters}
        columns={6}
        gap="1rem"
        showCount={true}
        emptyMessage="No hay archivos para estos filtros."
      />

      {/* Visor: abre cuando se hace click en un item */}
      {openIndex !== null && medios[openIndex] && (
        <Visor
          mediums={medios.map((medio) => ({
            id: medio.id,
            type: medio.tipo === 'AUDIO' ? 'AUDIO' : 'IMAGE',
            label: etiquetaVisible(medio),
            comment: medio.comentario ?? '',
          }))}
          initialIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          resolveUrl={(medium) => {
            const medio = medios.find((m) => m.id === medium.id);
            return medio ? resolverImagenVisor(medio, urlOriginal) : '';
          }}
        />
      )}
    </div>
  );
}
