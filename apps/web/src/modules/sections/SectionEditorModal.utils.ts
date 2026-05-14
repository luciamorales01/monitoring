import type { MonitorStatus } from '../../shared/monitorApi';
import type { MonitorViewStatus } from '../../shared/monitorFilters';
import type { SectionEditorMode } from './SectionEditorModal.types';

export function getModeContent(mode: SectionEditorMode, hasSection: boolean) {
  if (mode === 'monitors') {
    return {
      title: 'Anadir monitor a seccion',
      subtitle: 'Selecciona monitores disponibles y evita duplicados en esta seccion.',
      submitLabel: 'Guardar monitores',
    };
  }

  if (mode === 'members') {
    return {
      title: 'Anadir miembros a seccion',
      subtitle: 'Selecciona las personas responsables de revisar esta seccion.',
      submitLabel: 'Guardar miembros',
    };
  }

  return {
    title: hasSection ? 'Editar seccion' : 'Nueva seccion',
    subtitle: 'Configura nombre, estilo y monitores asignados.',
    submitLabel: hasSection ? 'Guardar cambios' : 'Crear seccion',
  };
}

export function getStatusLabel(status: MonitorStatus | MonitorViewStatus) {
  if (status === 'UP') {
    return 'Operativo';
  }

  if (status === 'DOWN') {
    return 'Incidencia';
  }

  if (status === 'PAUSED') {
    return 'Pausado';
  }

  return 'Pendiente';
}

