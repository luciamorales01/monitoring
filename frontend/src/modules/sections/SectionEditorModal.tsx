import { useEffect, useMemo, useState } from 'react';
import {
  getMonitorViewStatus,
  sortMonitorsByStatusAndLastCheck,
} from '../../shared/monitorFilters';
import type { SectionIcon } from '../../shared/sectionsStore';
import { ChevronRightIcon, PlusIcon, SearchIcon } from '../../shared/uiIcons';
import {
  SectionIconGlyph,
  sectionIconOptions,
} from './sectionVisuals';
import { StatusBadge } from './components/SectionEditorStatusBadge';
import { styles } from './SectionEditorModal.styles';
import type { SectionEditorModalProps } from './SectionEditorModal.types';
import { getModeContent } from './SectionEditorModal.utils';

export type {
  SectionEditorMode,
  SectionEditorSubmitPayload,
  SectionSummaryOption,
} from './SectionEditorModal.types';

export default function SectionEditorModal({
  isOpen,
  monitors,
  canManageMembers,
  users,
  section,
  sections,
  onClose,
  onSubmit,
  mode = 'full',
}: SectionEditorModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<SectionIcon>('folder');
  const [monitorIds, setMonitorIds] = useState<number[]>([]);
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [expectedStatusCode, setExpectedStatusCode] = useState(200);
  const [frequencySeconds, setFrequencySeconds] = useState(60);
  const [timeoutSeconds, setTimeoutSeconds] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [monitorSearch, setMonitorSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName(section?.name ?? '');
    setDescription(section?.description ?? '');
    setIcon(section?.icon ?? 'folder');
    setMonitorIds(section?.monitorIds ?? []);
    setMemberIds(section?.memberIds ?? []);
    setExpectedStatusCode(section?.expectedStatusCode ?? 200);
    setFrequencySeconds(section?.frequencySeconds ?? 60);
    setTimeoutSeconds(section?.timeoutSeconds ?? 10);
    setIsActive(section?.isActive ?? true);
    setMonitorSearch('');
    setMemberSearch('');
    setFormError(null);
  }, [isOpen, section]);

  const sortedMonitors = useMemo(
    () => sortMonitorsByStatusAndLastCheck(monitors),
    [monitors],
  );

  const filteredMonitors = useMemo(() => {
    const searchTerm = monitorSearch.trim().toLowerCase();

    return sortedMonitors.filter((monitor) => {
      if (searchTerm.length === 0) {
        return true;
      }

      return (
        monitor.name.toLowerCase().includes(searchTerm) ||
        monitor.target.toLowerCase().includes(searchTerm)
      );
    });
  }, [monitorSearch, sortedMonitors]);

  const filteredUsers = useMemo(() => {
    const searchTerm = memberSearch.trim().toLowerCase();

    return users.filter((user) => {
      if (searchTerm.length === 0) {
        return true;
      }

      return (
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    });
  }, [memberSearch, users]);

  if (!isOpen) {
    return null;
  }

  const toggleMonitor = (monitorId: number) => {
    setMonitorIds((currentIds) =>
      currentIds.includes(monitorId)
        ? currentIds.filter((id) => id !== monitorId)
        : [...currentIds, monitorId],
    );
  };

  const toggleMember = (memberId: number) => {
    setMemberIds((currentIds) =>
      currentIds.includes(memberId)
        ? currentIds.filter((id) => id !== memberId)
        : [...currentIds, memberId],
    );
  };

  const handleSubmit = () => {
    const normalizedName = name.trim();

    if (!normalizedName) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (!Number.isInteger(frequencySeconds) || frequencySeconds < 30) {
      setFormError('La frecuencia minima es 30 segundos.');
      return;
    }
    if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1) {
      setFormError('El timeout minimo es 1 segundo.');
      return;
    }
    if (!Number.isInteger(expectedStatusCode) || expectedStatusCode < 100 || expectedStatusCode > 599) {
      setFormError('El codigo esperado debe estar entre 100 y 599.');
      return;
    }

    onSubmit({
      name: normalizedName,
      description: description.trim(),
      icon,
      monitorIds,
      memberIds,
      expectedStatusCode,
      frequencySeconds,
      timeoutSeconds,
      isActive,
    });
  };

  const content = getModeContent(mode, Boolean(section));

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.editorModal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>{content.title}</h2>
            <p style={styles.modalSubtitle}>{content.subtitle}</p>
          </div>
          <button type="button" style={styles.modalClose} onClick={onClose}>
            <ChevronRightIcon size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        <div style={styles.formGrid}>
          {mode === 'full' ? (
            <>
              <label style={styles.field}>
                <span>Nombre</span>
                <input
                  style={styles.fieldInput}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Core web"
                />
              </label>

              <label style={styles.field}>
                <span>Descripcion</span>
                <textarea
                  style={styles.textarea}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe que monitores pertenecen a esta seccion."
                />
              </label>

              <div style={styles.field}>
                <span>Icono</span>
                <div style={styles.iconPicker}>
                  {sectionIconOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      style={{
                        ...styles.iconOption,
                        ...(icon === option.key ? styles.iconOptionActive : {}),
                      }}
                      onClick={() => setIcon(option.key)}
                    >
                      <span
                        style={{
                          ...styles.iconOptionBadge,
                          background: option.background,
                          color: option.color,
                        }}
                      >
                        <SectionIconGlyph icon={option.key} size={18} />
                      </span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.field}>
                <span>Programacion por defecto</span>
                <div style={styles.scheduleGrid}>
                  <label style={styles.field}>
                    <span>Frecuencia (s)</span>
                    <input
                      type="number"
                      min={30}
                      style={styles.fieldInput}
                      value={frequencySeconds}
                      onChange={(event) => setFrequencySeconds(Number(event.target.value))}
                    />
                  </label>
                  <label style={styles.field}>
                    <span>Timeout (s)</span>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      style={styles.fieldInput}
                      value={timeoutSeconds}
                      onChange={(event) => setTimeoutSeconds(Number(event.target.value))}
                    />
                  </label>
                  <label style={styles.field}>
                    <span>Codigo HTTP esperado</span>
                    <input
                      type="number"
                      min={100}
                      max={599}
                      style={styles.fieldInput}
                      value={expectedStatusCode}
                      onChange={(event) => setExpectedStatusCode(Number(event.target.value))}
                    />
                  </label>
                  <label style={styles.switchCard}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                    />
                    Seccion activa
                  </label>
                </div>
              </div>
            </>
          ) : null}

          {mode !== 'members' ? (
            <div style={styles.field}>
              <span>Monitores asignados</span>
              <p style={styles.fieldHint}>
                Puedes asignar un mismo monitor a varias secciones si tiene sentido operativo.
              </p>
              <label style={styles.inlineSearchWrap}>
                <SearchIcon size={16} />
                <input
                  style={styles.inlineSearchInput}
                  value={monitorSearch}
                  onChange={(event) => setMonitorSearch(event.target.value)}
                  placeholder="Buscar monitores..."
                />
              </label>
              <div style={styles.monitorSelector}>
                {monitors.length === 0 ? (
                  <div style={styles.selectorEmpty}>No hay monitores disponibles.</div>
                ) : filteredMonitors.length === 0 ? (
                  <div style={styles.selectorEmpty}>No hay monitores que coincidan con la busqueda.</div>
                ) : (
                  filteredMonitors.map((monitor) => {
                    const viewStatus = getMonitorViewStatus(monitor);
                    const linkedSection = sections.find(
                      (currentSection) =>
                        currentSection.id !== section?.id &&
                        currentSection.monitorIds.includes(monitor.id),
                    );
                    const isSelected = monitorIds.includes(monitor.id);

                    return (
                      <label
                        key={monitor.id}
                        style={{
                          ...styles.monitorOption,
                          ...(isSelected ? styles.selectorOptionSelected : {}),
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMonitor(monitor.id)}
                        />
                        <div style={styles.monitorOptionCopy}>
                          <strong>{monitor.name}</strong>
                          <span>{monitor.target}</span>
                          {linkedSection ? (
                            <small style={styles.monitorLinkedSection}>
                              Ahora en: {linkedSection.name}
                            </small>
                          ) : null}
                        </div>
                        <StatusBadge status={viewStatus} />
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {canManageMembers && mode !== 'monitors' ? (
            <div style={styles.field}>
              <span>Miembros</span>
              <p style={styles.fieldHint}>
                Asigna personas responsables de revisar esta seccion.
              </p>
              <label style={styles.inlineSearchWrap}>
                <SearchIcon size={16} />
                <input
                  style={styles.inlineSearchInput}
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Buscar miembros..."
                />
              </label>
              <div style={styles.monitorSelector}>
                {users.length === 0 ? (
                  <div style={styles.selectorEmpty}>No hay miembros disponibles.</div>
                ) : filteredUsers.length === 0 ? (
                  <div style={styles.selectorEmpty}>No hay miembros que coincidan con la busqueda.</div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = memberIds.includes(user.id);

                    return (
                      <label
                        key={user.id}
                        style={{
                          ...styles.monitorOption,
                          ...(isSelected ? styles.selectorOptionSelected : {}),
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMember(user.id)}
                        />
                        <div style={styles.monitorOptionCopy}>
                          <strong>{user.name}</strong>
                          <span>{user.email}</span>
                        </div>
                        <span style={styles.inlineBadgeSlate}>{user.role}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>

        {formError ? <div style={styles.feedbackError}>{formError}</div> : null}

        <div style={styles.modalActions}>
          <button type="button" style={styles.secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" style={styles.primaryButton} onClick={handleSubmit}>
            <PlusIcon size={16} />
            {content.submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
