import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppTopbar from '../../shared/AppTopbar';
import LoadingState from '../../shared/LoadingState';
import {
  getMonitors,
  type Monitor,
} from '../../shared/monitorApi';
import {
  getMonitorViewStatus,
  sortMonitorsByStatusAndLastCheck,
} from '../../shared/monitorFilters';
import { useLocalPagination } from '../../shared/useLocalPagination';
import { useCurrentUserPermissions } from '../../shared/permissions';
import {
  FolderIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  EditIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
} from '../../shared/uiIcons';
import type { MonitorSection } from '../../shared/sectionsStore';
import {
  createSection,
  deleteSection,
  getSections,
  updateSection,
  updateSectionMembers,
} from '../../shared/sectionsApi';
import {
  getUsers,
  type User,
} from '../../shared/userApi';
import {
  SectionIconGlyph,
  getSectionIconWrapStyle,
} from './sectionVisuals';
import SectionEditorModal, {
  type SectionEditorSubmitPayload,
} from './SectionEditorModal';
import { styles } from './SectionsPage.styles';
import type { EditorState, FeedbackState, SectionSummary } from './SectionsPage.types';
import { attachSectionsToMonitors } from './sectionMonitorLinks';

export default function SectionsPage() {
  const navigate = useNavigate();
  const {
    canWrite: canWriteActions,
  } = useCurrentUserPermissions();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<MonitorSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    isOpen: false,
    section: null,
  });
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
      const [nextMonitors, nextSections, nextUsers] = await Promise.all([
        getMonitors(),
        getSections(),
        canWriteActions ? getUsers() : Promise.resolve([]),
      ]);

      setMonitors(attachSectionsToMonitors(nextMonitors, nextSections));
      setSections(nextSections);
      setUsers(nextUsers);
      setError(null);
    } catch (currentError) {
      console.error('Error loading sections', currentError);
      setError('No se pudieron cargar las secciones.');
      setMonitors([]);
      setSections([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMonitors();
  }, [canWriteActions]);

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
    setEditorState({ isOpen: true, section: null });
    setActiveMenuId(null);
  };

  const handleOpenEdit = (section: MonitorSection) => {
    setEditorState({ isOpen: true, section });
    setActiveMenuId(null);
  };

  const handleCloseEditor = () => {
    setEditorState({ isOpen: false, section: null });
  };

  const handleSaveSection = async (payload: SectionEditorSubmitPayload) => {
    try {
      const { memberIds, ...sectionPayload } = payload;
      let savedSection: MonitorSection;

      if (editorState.section) {
        savedSection = await updateSection(editorState.section.id, sectionPayload);
      } else {
        savedSection = await createSection(sectionPayload);
      }

      if (canWriteActions) {
        await updateSectionMembers(savedSection.id, memberIds);
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
        canManageMembers={canWriteActions}
        users={users.filter((user) => user.status === 'ACTIVE')}
        section={editorState.section}
        onClose={handleCloseEditor}
        onSubmit={handleSaveSection}
      />
    </>
  );
}
