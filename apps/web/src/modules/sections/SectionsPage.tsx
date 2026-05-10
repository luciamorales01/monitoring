import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  controlBase,
  inputBase,
  pageActiveButtonBase,
  pageArrowBase,
  pageMain,
  paginationBase,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  uiTheme,
} from '../../theme/commonStyles';
import AppTopbar from '../../shared/AppTopbar';
import LoadingState from '../../shared/LoadingState';
import {
  getMonitors,
  type Monitor,
} from '../../shared/monitorApi';
import {
  getMonitorViewStatus,
  sortMonitorsByStatusAndLastCheck,
  type MonitorViewStatus,
} from '../../shared/monitorFilters';
import { useLocalPagination } from '../../shared/useLocalPagination';
import { useCurrentUserPermissions } from '../../shared/permissions';
import {
  FolderIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  TrashIcon,
  EditIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
} from '../../shared/uiIcons';
import type { MonitorSection, SectionIcon } from '../../shared/sectionsStore';
import {
  createSection,
  deleteSection,
  getSections,
  updateSection,
} from '../../shared/sectionsApi';
import {
  SectionIconGlyph,
  getSectionIconWrapStyle,
  sectionIconOptions,
} from './sectionVisuals';

type SectionSummary = MonitorSection & {
  monitors: Monitor[];
  monitorCount: number;
  onlineCount: number;
  downCount: number;
  pausedCount: number;
  unknownCount: number;
  statusLabel: string;
  statusTone: 'green' | 'orange' | 'slate';
};

type EditorState = {
  isOpen: boolean;
  section: MonitorSection | null;
};

type FeedbackState =
  | {
      type: 'success' | 'error';
      text: string;
    }
  | null;

export default function SectionsPage() {
  const navigate = useNavigate();
  const { canWrite: canWriteActions } = useCurrentUserPermissions();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [sections, setSections] = useState<MonitorSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    isOpen: false,
    section: null,
  });
  const [manageOpen, setManageOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target?.closest('[data-section-menu-root="true"]')) {
        setActiveMenuId(null);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const loadMonitors = async () => {
    setLoading(true);

    try {
      const [nextMonitors, nextSections] = await Promise.all([
        getMonitors(),
        getSections(),
      ]);

      setMonitors(nextMonitors);
      setSections(nextSections);
      setError(null);
    } catch (currentError) {
      console.error('Error loading sections', currentError);
      setError('No se pudieron cargar las secciones.');
      setMonitors([]);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMonitors();
  }, []);

  const sectionSummaries = useMemo<SectionSummary[]>(() => {
    return sections.map((section) => {
      const assignedMonitors = sortMonitorsByStatusAndLastCheck(
        monitors.filter((monitor) => section.monitorIds.includes(monitor.id)),
      );
      const viewStatuses = assignedMonitors.map((monitor) =>
        getMonitorViewStatus(monitor),
      );
      const onlineCount = viewStatuses.filter((status) => status === 'UP').length;
      const downCount = viewStatuses.filter((status) => status === 'DOWN').length;
      const pausedCount = viewStatuses.filter((status) => status === 'PAUSED').length;
      const unknownCount = viewStatuses.filter((status) => status === 'UNKNOWN').length;

      let statusLabel = 'Sin monitores';
      let statusTone: SectionSummary['statusTone'] = 'slate';

      if (assignedMonitors.length > 0 && downCount > 0) {
        statusLabel =
          downCount === 1 ? '1 incidencia' : `${downCount} incidencias`;
        statusTone = 'orange';
      } else if (assignedMonitors.length > 0 && unknownCount > 0) {
        statusLabel = 'Revision pendiente';
        statusTone = 'slate';
      } else if (assignedMonitors.length > 0 && pausedCount === assignedMonitors.length) {
        statusLabel = 'Pausada';
        statusTone = 'slate';
      } else if (assignedMonitors.length > 0) {
        statusLabel = 'Todo operativo';
        statusTone = 'green';
      }

      return {
        ...section,
        monitors: assignedMonitors,
        monitorCount: assignedMonitors.length,
        onlineCount,
        downCount,
        pausedCount,
        unknownCount,
        statusLabel,
        statusTone,
      };
    });
  }, [monitors, sections]);

  const assignedMonitorIds = useMemo(
    () => new Set(sectionSummaries.flatMap((section) => section.monitorIds)),
    [sectionSummaries],
  );

  const unassignedMonitors = useMemo(
    () =>
      sortMonitorsByStatusAndLastCheck(
        monitors.filter((monitor) => !assignedMonitorIds.has(monitor.id)),
      ),
    [assignedMonitorIds, monitors],
  );

  const visibleSections = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return sectionSummaries.filter((section) => {
      return (
        searchTerm.length === 0 ||
        section.name.toLowerCase().includes(searchTerm) ||
        section.description.toLowerCase().includes(searchTerm)
      );
    });
  }, [search, sectionSummaries]);

  const {
    page,
    setPage,
    pageItems,
    totalPages,
    rangeStart,
    rangeEnd,
    hasNextPage,
    hasPreviousPage,
  } = useLocalPagination(visibleSections, {
    pageSize: 6,
    resetKey: `${search}|${visibleSections.length}`,
  });

  const handleOpenCreate = () => {
    setManageOpen(false);
    setEditorState({ isOpen: true, section: null });
    setActiveMenuId(null);
  };

  const handleOpenEdit = (section: MonitorSection) => {
    setEditorState({ isOpen: true, section });
    setActiveMenuId(null);
    setManageOpen(false);
  };

  const handleCloseEditor = () => {
    setEditorState({ isOpen: false, section: null });
  };

  const handleSaveSection = async (payload: {
    name: string;
    description: string;
    icon: SectionIcon;
    monitorIds: number[];
    expectedStatusCode: number;
    frequencySeconds: number;
    timeoutSeconds: number;
    locations: string[];
    isActive: boolean;
  }) => {
    try {
      if (editorState.section) {
        await updateSection(editorState.section.id, payload);
      } else {
        await createSection(payload);
      }

      setFeedback({
        type: 'success',
        text: editorState.section
          ? 'Seccion actualizada correctamente.'
          : 'Seccion creada y lista para agrupar monitores.',
      });
      handleCloseEditor();
      await loadMonitors();
    } catch (currentError) {
      console.error('Error saving section', currentError);
      setFeedback({
        type: 'error',
        text: currentError instanceof Error ? currentError.message : 'No se pudo guardar la seccion.',
      });
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await deleteSection(sectionId);
      setFeedback({
        type: 'success',
        text: 'Seccion eliminada. Los monitores quedan sin agrupar.',
      });
      setActiveMenuId(null);
      await loadMonitors();
    } catch (currentError) {
      console.error('Error deleting section', currentError);
      setFeedback({
        type: 'error',
        text: currentError instanceof Error ? currentError.message : 'No se pudo eliminar la seccion.',
      });
    }
  };

  return (
    <>
      <main style={styles.page}>
        <AppTopbar
          title="Secciones"
          subtitle="Organiza tus monitores en grupos personalizados."
          onRefresh={loadMonitors}
          cta={
            canWriteActions
              ? {
                  icon: <PlusIcon size={16} />,
                  label: "Nueva seccion",
                  onClick: handleOpenCreate,
                }
              : undefined
          }
        />

        <div style={styles.topbarControls}>
          <div style={styles.metaRow}>
            <span style={styles.metaChip}>
              <MonitorIcon size={14} />
              {monitors.length} monitores totales
            </span>
            <span style={styles.metaChip}>
              <ClockIcon size={14} />
              {unassignedMonitors.length} sin seccion
            </span>
          </div>

          <div style={styles.headerSide}>
            <label style={styles.searchWrap}>
              <SearchIcon size={18} />
              <input
                style={styles.searchInput}
                placeholder="Buscar secciones..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            {canWriteActions ? (
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setManageOpen(true)}
              >
                <SettingsIcon size={16} />
                Gestionar secciones
              </button>
            ) : null}
          </div>
        </div>

        {feedback && (
          <div
            style={
              feedback.type === 'success'
                ? styles.feedbackSuccess
                : styles.feedbackError
            }
          >
            {feedback.text}
          </div>
        )}

        <section style={styles.listCard}>
          {loading ? (
            <LoadingState variant="cards" label="Cargando secciones" rows={4} />
          ) : error ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <FolderIcon size={26} />
              </div>
              <strong>{error}</strong>
            </div>
          ) : visibleSections.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <FolderIcon size={26} />
              </div>
              <strong>
                {sectionSummaries.length === 0
                  ? 'Aun no hay secciones creadas.'
                  : 'No hay secciones que coincidan con la busqueda.'}
              </strong>
              <p style={styles.emptyCopy}>
                {sectionSummaries.length === 0
                  ? 'Crea la primera seccion para agrupar monitores reales en la base de datos.'
                  : 'Prueba otro nombre o cambia el filtro actual.'}
              </p>
              {canWriteActions ? (
                <div style={styles.emptyActions}>
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={handleOpenCreate}
                  >
                    <PlusIcon size={16} />
                    Crear seccion
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div style={styles.rows}>
                {pageItems.map((section) => (
                  <article
                    key={section.id}
                    style={styles.row}
                    onClick={() => navigate(`/sections/${section.id}`)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/sections/${section.id}`);
                      }
                    }}
                  >
                    <div style={styles.rowMain}>
                      <div
                        style={getSectionIconWrapStyle(
                          section.icon,
                          styles.sectionIcon,
                        )}
                      >
                        <SectionIconGlyph icon={section.icon} size={26} />
                      </div>

                      <div style={styles.rowCopy}>
                        <strong style={styles.rowTitle}>{section.name}</strong>
                        <p style={styles.rowDescription}>
                          {section.description || 'Sin descripcion.'}
                        </p>
                        <span style={styles.monitorBadge}>
                          <MonitorIcon size={14} />
                          {section.monitorCount}{' '}
                          {section.monitorCount === 1 ? 'monitor' : 'monitores'}
                        </span>
                      </div>
                    </div>

                    <div style={styles.rowMetrics}>
                      <div style={styles.metricBox}>
                        <span style={styles.metricLabel}>Estado</span>
                        <span
                          style={{
                            ...styles.statusValue,
                            ...(section.statusTone === 'green'
                              ? styles.statusGreen
                              : section.statusTone === 'orange'
                                ? styles.statusOrange
                                : styles.statusSlate),
                          }}
                        >
                          <span style={styles.statusDot}>●</span>
                          {section.statusLabel}
                        </span>
                      </div>

                      <div style={styles.metricBox}>
                        <span style={styles.metricLabel}>Monitores</span>
                        <strong style={styles.metricValue}>
                          {section.onlineCount} / {section.monitorCount}
                        </strong>
                      </div>

                      {canWriteActions ? (
                        <div
                          style={styles.actionsWrap}
                          data-section-menu-root="true"
                        >
                          <button
                            type="button"
                            style={styles.moreButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveMenuId((currentId) =>
                                currentId === section.id ? null : section.id,
                              );
                            }}
                          >
                            <MoreHorizontalIcon size={18} />
                          </button>

                        {activeMenuId === section.id && (
                          <div style={styles.menu}>
                            <button
                              type="button"
                              style={styles.menuItem}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenEdit(section);
                              }}
                            >
                              <EditIcon size={14} />
                              Editar
                            </button>
                            <button
                              type="button"
                              style={styles.menuItem}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenEdit(section);
                              }}
                            >
                              <CheckCircleIcon size={14} />
                              Asignar monitores
                            </button>
                            <button
                              type="button"
                              style={{ ...styles.menuItem, ...styles.menuItemDanger }}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteSection(section.id);
                              }}
                            >
                              <TrashIcon size={14} />
                              Eliminar
                            </button>
                          </div>
                        )}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>

              <div style={styles.pagination}>
                <span style={styles.paginationText}>
                  Mostrando {rangeStart} a {rangeEnd} de {visibleSections.length}{' '}
                  secciones
                </span>

                <div style={styles.pages}>
                  <button
                    type="button"
                    style={styles.pageArrow}
                    onClick={() => setPage(page - 1)}
                    disabled={!hasPreviousPage}
                    aria-label="Pagina anterior"
                  >
                    <span style={styles.pageArrowLeft}>
                      <ChevronRightIcon size={14} />
                    </span>
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                    (pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        style={
                          pageNumber === page
                            ? styles.pageActiveButton
                            : styles.pageNumberButton
                        }
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    style={styles.pageArrow}
                    onClick={() => setPage(page + 1)}
                    disabled={!hasNextPage}
                    aria-label="Pagina siguiente"
                  >
                    <ChevronRightIcon size={14} />
                  </button>
                </div>

                <span style={styles.pageSize}>6 por pagina</span>
              </div>
            </>
          )}
        </section>
      </main>

      <SectionEditorModal
        isOpen={canWriteActions && editorState.isOpen}
        monitors={monitors}
        section={editorState.section}
        sections={sectionSummaries}
        onClose={handleCloseEditor}
        onSubmit={handleSaveSection}
      />

      <ManageSectionsModal
        isOpen={canWriteActions && manageOpen}
        sections={sectionSummaries}
        onClose={() => setManageOpen(false)}
        onCreate={handleOpenCreate}
        onDelete={handleDeleteSection}
        onEdit={handleOpenEdit}
      />
    </>
  );
}

function SectionEditorModal({
  isOpen,
  monitors,
  section,
  sections,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  monitors: Monitor[];
  section: MonitorSection | null;
  sections: SectionSummary[];
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string;
    icon: SectionIcon;
    monitorIds: number[];
    expectedStatusCode: number;
    frequencySeconds: number;
    timeoutSeconds: number;
    locations: string[];
    isActive: boolean;
  }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<SectionIcon>('folder');
  const [monitorIds, setMonitorIds] = useState<number[]>([]);
  const [expectedStatusCode, setExpectedStatusCode] = useState(200);
  const [frequencySeconds, setFrequencySeconds] = useState(60);
  const [timeoutSeconds, setTimeoutSeconds] = useState(10);
  const [locations, setLocations] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName(section?.name ?? '');
    setDescription(section?.description ?? '');
    setIcon(section?.icon ?? 'folder');
    setMonitorIds(section?.monitorIds ?? []);
    setExpectedStatusCode(section?.expectedStatusCode ?? 200);
    setFrequencySeconds(section?.frequencySeconds ?? 60);
    setTimeoutSeconds(section?.timeoutSeconds ?? 10);
    setLocations(section?.locations ?? []);
    setIsActive(section?.isActive ?? true);
    setFormError(null);
  }, [isOpen, section]);

  const sortedMonitors = useMemo(
    () => sortMonitorsByStatusAndLastCheck(monitors),
    [monitors],
  );

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

  const toggleLocation = (location: string) => {
    setLocations((currentLocations) =>
      currentLocations.includes(location)
        ? currentLocations.filter((item) => item !== location)
        : [...currentLocations, location],
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
      expectedStatusCode,
      frequencySeconds,
      timeoutSeconds,
      locations,
      isActive,
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.editorModal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>
              {section ? 'Editar seccion' : 'Nueva seccion'}
            </h2>
            <p style={styles.modalSubtitle}>
              Configura nombre, estilo y monitores asignados.
            </p>
          </div>
          <button type="button" style={styles.modalClose} onClick={onClose}>
            <ChevronRightIcon size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        <div style={styles.formGrid}>
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
            <div style={styles.locationPicker}>
              {['Madrid', 'Frankfurt', 'Virginia'].map((location) => (
                <label key={location} style={styles.locationOption}>
                  <input
                    type="checkbox"
                    checked={locations.includes(location)}
                    onChange={() => toggleLocation(location)}
                  />
                  {location}
                </label>
              ))}
            </div>
          </div>

          <div style={styles.field}>
            <span>Monitores asignados</span>
            <p style={styles.fieldHint}>
              Puedes asignar un mismo monitor a varias secciones si tiene sentido operativo.
            </p>
            <div style={styles.monitorSelector}>
              {monitors.length === 0 ? (
                <div style={styles.selectorEmpty}>No hay monitores disponibles.</div>
              ) : (
                sortedMonitors.map((monitor) => {
                  const viewStatus = getMonitorViewStatus(monitor);
                  const linkedSection = sections.find(
                    (currentSection) =>
                      currentSection.id !== section?.id &&
                      currentSection.monitorIds.includes(monitor.id),
                  );

                  return (
                    <label key={monitor.id} style={styles.monitorOption}>
                      <input
                        type="checkbox"
                        checked={monitorIds.includes(monitor.id)}
                        onChange={() => toggleMonitor(monitor.id)}
                      />
                      <div style={styles.monitorOptionCopy}>
                        <strong>{monitor.name}</strong>
                        <span>{monitor.target}</span>
                        {linkedSection && (
                          <small style={styles.monitorLinkedSection}>
                            Ahora en: {linkedSection.name}
                          </small>
                        )}
                      </div>
                      <StatusBadge status={viewStatus} />
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {formError && <div style={styles.feedbackError}>{formError}</div>}

        <div style={styles.modalActions}>
          <button type="button" style={styles.secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" style={styles.primaryButton} onClick={handleSubmit}>
            <PlusIcon size={16} />
            {section ? 'Guardar cambios' : 'Crear seccion'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageSectionsModal({
  isOpen,
  sections,
  onClose,
  onCreate,
  onDelete,
  onEdit,
}: {
  isOpen: boolean;
  sections: SectionSummary[];
  onClose: () => void;
  onCreate: () => void;
  onDelete: (sectionId: string) => void;
  onEdit: (section: MonitorSection) => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.manageModal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Gestionar secciones</h2>
            <p style={styles.modalSubtitle}>
              Edita nombres, revisa asignaciones o elimina grupos vacios.
            </p>
          </div>
          <button type="button" style={styles.modalClose} onClick={onClose}>
            <ChevronRightIcon size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        <div style={styles.manageList}>
          {sections.length === 0 ? (
            <div style={styles.selectorEmpty}>Todavia no has creado secciones.</div>
          ) : (
            sections.map((section) => (
              <div key={section.id} style={styles.manageRow}>
                <div style={styles.manageRowMain}>
                  <div
                    style={getSectionIconWrapStyle(
                      section.icon,
                      styles.sectionIcon,
                    )}
                  >
                    <SectionIconGlyph icon={section.icon} size={20} />
                  </div>
                  <div>
                    <strong>{section.name}</strong>
                    <p style={styles.manageDescription}>
                      {section.monitorCount} monitores asignados
                    </p>
                  </div>
                </div>

                <div style={styles.manageActions}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => onEdit(section)}
                  >
                    <EditIcon size={14} />
                    Editar
                  </button>
                  <button
                    type="button"
                    style={styles.dangerButton}
                    onClick={() => onDelete(section.id)}
                  >
                    <TrashIcon size={14} />
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.modalActions}>
          <button type="button" style={styles.secondaryButton} onClick={onClose}>
            Cerrar
          </button>
          <button type="button" style={styles.primaryButton} onClick={onCreate}>
            <PlusIcon size={16} />
            Nueva seccion
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: MonitorViewStatus }) {
  const isPositive = status === 'UP';
  const isWarning = status === 'PAUSED' || status === 'UNKNOWN';

  return (
    <span
      style={{
        ...styles.inlineBadge,
        ...(isPositive
          ? styles.inlineBadgeSuccess
          : isWarning
            ? styles.inlineBadgeSlate
            : styles.inlineBadgeDanger),
      }}
    >
      {status === 'UP'
        ? 'Operativo'
        : status === 'DOWN'
          ? 'Incidencia'
          : status === 'PAUSED'
            ? 'Pausado'
            : 'Pendiente'}
    </span>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    ...pageMain,
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
    backgroundImage:
      'linear-gradient(135deg, rgba(37, 99, 235, 0.07), transparent 30%), linear-gradient(225deg, rgba(15, 23, 42, 0.045), transparent 28%)',
  },
  topbarControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 18,
    marginTop: -12,
    marginBottom: 2,
  },
  headerSide: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    minWidth: 420,
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaChip: {
    ...controlBase,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 500,
    color: uiTheme.colors.muted,
    borderRadius: 14,
  },
  searchWrap: {
    ...inputBase,
    width: '100%',
    maxWidth: 310,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: uiTheme.colors.muted,
    paddingLeft: 14,
    borderRadius: 14,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    background: 'transparent',
    color: uiTheme.colors.text,
    fontSize: 14,
  },
  primaryButton: {
    ...primaryButtonBase,
    height: 42,
    padding: '0 18px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    fontWeight: 600,
    borderRadius: 14,
  },
  secondaryButton: {
    ...secondaryButtonBase,
    height: 42,
    padding: '0 16px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    fontWeight: 500,
    borderRadius: 14,
  },
  dangerButton: {
    ...secondaryButtonBase,
    height: 42,
    padding: '0 16px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    fontWeight: 500,
    color: uiTheme.colors.danger,
    borderColor: '#fecaca',
    background: uiTheme.colors.dangerSoft,
    borderRadius: 14,
  },
  tabs: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
  },
  tabButton: {
    border: 'none',
    background: 'transparent',
    color: uiTheme.colors.muted,
    fontWeight: 500,
    fontSize: 14,
    padding: '0 16px 14px',
    cursor: 'pointer',
  },
  tabActiveButton: {
    border: 'none',
    background: 'transparent',
    color: uiTheme.colors.primary,
    fontWeight: 600,
    fontSize: 14,
    padding: '0 16px 14px',
    cursor: 'pointer',
    boxShadow: `inset 0 -2px 0 ${uiTheme.colors.primary}`,
  },
  feedbackSuccess: {
    ...surfaceCard,
    borderColor: '#bbf7d0',
    background: uiTheme.colors.successSoft,
    color: uiTheme.colors.success,
    padding: '14px 18px',
    fontWeight: 500,
  },
  feedbackError: {
    ...surfaceCard,
    borderColor: '#fecaca',
    background: uiTheme.colors.dangerSoft,
    color: uiTheme.colors.danger,
    padding: '14px 18px',
    fontWeight: 500,
  },
  listCard: {
    ...surfaceCard,
    overflow: 'hidden',
    minHeight: 420,
    borderRadius: 20,
  },
  rows: {
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.7fr)',
    gap: 16,
    padding: '22px 20px',
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    alignItems: 'center',
    cursor: 'pointer',
    background: uiTheme.colors.surface,
  },
  rowMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    minWidth: 0,
  },
  sectionIcon: {
    width: 66,
    height: 66,
    borderRadius: 18,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  rowCopy: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  rowTitle: {
    fontSize: 16,
  },
  rowDescription: {
    margin: 0,
    color: uiTheme.colors.muted,
    lineHeight: 1.45,
  },
  monitorBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    padding: '6px 10px',
    borderRadius: 999,
    background: uiTheme.colors.surfaceSoft,
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 500,
  },
  rowMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 16,
    alignItems: 'center',
  },
  metricBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: uiTheme.colors.muted,
    fontWeight: 500,
  },
  metricValue: {
    fontSize: 16,
  },
  statusValue: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 500,
  },
  statusDot: {
    fontSize: 13,
    lineHeight: 1,
  },
  statusGreen: {
    color: uiTheme.colors.success,
  },
  statusOrange: {
    color: uiTheme.colors.warning,
  },
  statusSlate: {
    color: uiTheme.colors.muted,
  },
  actionsWrap: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  moreButton: {
    ...controlBase,
    width: 42,
    height: 42,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    background: uiTheme.colors.surface,
    borderRadius: 14,
  },
  menu: {
    ...surfaceCard,
    position: 'absolute',
    top: 48,
    right: 0,
    minWidth: 190,
    zIndex: 10,
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    borderRadius: 18,
  },
  menuItem: {
    border: 'none',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    padding: '10px 12px',
    color: uiTheme.colors.text,
    cursor: 'pointer',
    fontWeight: 600,
  },
  menuItemDanger: {
    color: uiTheme.colors.danger,
  },
  emptyState: {
    minHeight: 420,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    padding: '48px 20px',
    color: uiTheme.colors.text,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    margin: '0 auto 16px',
    display: 'grid',
    placeItems: 'center',
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
  },
  emptyCopy: {
    margin: '10px 0 0',
    maxWidth: 440,
    color: uiTheme.colors.muted,
    lineHeight: 1.5,
  },
  emptyActions: {
    marginTop: 18,
    display: 'flex',
    justifyContent: 'center',
  },
  pagination: {
    ...paginationBase,
    padding: '20px 18px',
  },
  paginationText: {
    fontSize: 13,
  },
  pages: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pageArrow: {
    ...pageArrowBase,
  },
  pageArrowLeft: {
    display: 'inline-flex',
    transform: 'rotate(180deg)',
  },
  pageActiveButton: {
    ...pageActiveButtonBase,
  },
  pageNumberButton: {
    ...pageArrowBase,
    width: 36,
    fontWeight: 500,
  },
  pageSize: {
    justifySelf: 'end',
    ...controlBase,
    padding: '8px 12px',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.38)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 30,
    padding: 24,
    borderRadius: 20,
  },
  editorModal: {
    ...surfaceCard,
    width: 'min(880px, 100%)',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: 24,
    borderRadius: 20,
  },
  manageModal: {
    ...surfaceCard,
    width: 'min(720px, 100%)',
    maxHeight: '85vh',
    overflow: 'auto',
    padding: 24,
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 22,
  },
  modalTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
  },
  modalSubtitle: {
    margin: '8px 0 0',
    color: uiTheme.colors.muted,
  },
  modalClose: {
    ...controlBase,
    width: 38,
    height: 38,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    background: uiTheme.colors.surface,
    borderRadius: 14,
  },
  formGrid: {
    display: 'grid',
    gap: 18,
  },
  field: {
    display: 'grid',
    gap: 10,
    fontWeight: 500,
    color: uiTheme.colors.text,
  },
  fieldHint: {
    margin: '-2px 0 0',
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 500,
  },
  fieldInput: {
    ...inputBase,
    height: 44,
    borderRadius: 14,
  },
  scheduleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 12,
  },
  switchCard: {
    ...surfaceCard,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 12px',
    fontSize: 13,
  },
  locationPicker: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  },
  locationOption: {
    ...surfaceCard,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    fontSize: 13,
  },
  textarea: {
    ...controlBase,
    minHeight: 110,
    padding: 14,
    resize: 'vertical',
    font: 'inherit',
    color: uiTheme.colors.text,
    borderRadius: 14,
  },
  iconPicker: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: 10,
  },
  iconOption: {
    ...controlBase,
    minHeight: 84,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    cursor: 'pointer',
    fontWeight: 500,
    background: uiTheme.colors.surface,
    borderRadius: 14,
  },
  iconOptionActive: {
    borderColor: uiTheme.colors.primary,
    boxShadow: `0 0 0 1px ${uiTheme.colors.primary}`,
    background: uiTheme.colors.primarySoft,
  },
  iconOptionBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
  },
  monitorSelector: {
    ...controlBase,
    maxHeight: 280,
    overflow: 'auto',
    padding: 8,
    display: 'grid',
    gap: 8,
  },
  monitorOption: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 12,
    background: uiTheme.colors.background,
  },
  monitorOptionCopy: {
    minWidth: 0,
    display: 'grid',
    gap: 4,
  },
  monitorLinkedSection: {
    color: uiTheme.colors.primary,
    fontSize: 12,
    fontWeight: 500,
  },
  selectorEmpty: {
    padding: '18px 14px',
    textAlign: 'center',
    color: uiTheme.colors.muted,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  manageList: {
    display: 'grid',
    gap: 10,
  },
  manageRow: {
    ...surfaceCard,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  manageRowMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  manageDescription: {
    margin: '6px 0 0',
    color: uiTheme.colors.muted,
  },
  manageActions: {
    display: 'flex',
    gap: 10,
  },
  inlineBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  },
  inlineBadgeSuccess: {
    color: uiTheme.colors.success,
    background: uiTheme.colors.successSoft,
  },
  inlineBadgeDanger: {
    color: uiTheme.colors.danger,
    background: uiTheme.colors.dangerSoft,
  },
  inlineBadgeSlate: {
    color: uiTheme.colors.muted,
    background: uiTheme.colors.surfaceSoft,
  },
};
