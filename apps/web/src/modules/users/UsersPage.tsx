import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  getUniqueOptions,
  isDateWithinLastDays,
  matchesSearchTerm,
  normalizeSearchTerm,
} from '../../shared/filterUtils';
import {
  getUsers,
  updateUser,
  type UpdateUserInput,
  type User,
  type UserRole,
  type UserStatus,
} from '../../shared/userApi';
import { useLocalPagination } from '../../shared/useLocalPagination';
import { useUrlFilterState } from '../../shared/useUrlFilterState';
import {
  avatarBase,
  controlBase,
  datePillBase,
  filterGroupBase,
  iconButtonBase,
  inputBase,
  kpiCardBase,
  pageActiveButtonBase,
  pageArrowBase,
  pageMain,
  pageSubtitle,
  pageTitle,
  paginationBase,
  primaryButtonBase,
  selectFakeBase,
  secondaryButtonBase,
  surfaceCard,
  tableCardBase,
  topActionsBase,
  topbarBase,
  uiTheme,
} from '../../theme/commonStyles';
import {
  BellIcon,
  CalendarIcon,
  EditIcon,
  FilterIcon,
  MailIcon,
  MoreHorizontalIcon,
  RefreshIcon,
  ShieldIcon,
  UsersIcon,
  GlobeIcon,
} from '../../shared/uiIcons';

type UserRoleLabel = 'Administrador' | 'Editor' | 'Solo lectura';
type LastAccessFilter = 'Todos' | 'Hoy' | 'Esta semana' | 'Este mes';

const userFilterDefaults = {
  lastAccess: 'Todos',
  role: 'Todos',
  search: '',
  status: 'Todos',
  team: 'Todos',
};

const userAllowedValues = {
  lastAccess: ['Todos', 'Hoy', 'Esta semana', 'Este mes'],
  role: ['Todos', 'Administrador', 'Editor', 'Solo lectura'],
  status: ['Todos', 'Activo', 'Inactivo'],
} as const;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { filters, hasActiveFilters, resetFilters, setFilter } = useUrlFilterState(
    userFilterDefaults,
    userAllowedValues,
  );

  const loadUsers = async () => {
    try {
      setError(null);
      const currentUsers = await getUsers();
      setUsers(currentUsers);
    } catch (currentError) {
      console.error('Error loading users', currentError);
      setError('No se pudieron cargar los usuarios.');
      setUsers([]);
    }
  };

  useEffect(() => {
    loadUsers().finally(() => setLoading(false));
  }, []);

  const teamOptions = useMemo(() => {
    return getUniqueOptions(
      users.map((user) => user.organization?.name ?? 'Organización'),
    );
  }, [users]);

  const filteredUsers = useMemo(() => {
    const searchTerm = normalizeSearchTerm(filters.search);

    return users.filter((user) => {
      const roleLabel = getRoleLabel(user.role);
      const statusLabel = getStatusLabel(user.status);
      const teamLabel = user.organization?.name ?? 'Organización';

      const matchesRole = filters.role === 'Todos' || roleLabel === filters.role;
      const matchesStatus = filters.status === 'Todos' || statusLabel === filters.status;
      const matchesTeam = filters.team === 'Todos' || teamLabel === filters.team;
      const matchesLastAccess = matchesLastAccessFilter(
        user.updatedAt,
        filters.lastAccess as LastAccessFilter,
      );

      return (
        matchesSearchTerm(searchTerm, user.name, user.email, roleLabel) &&
        matchesRole &&
        matchesStatus &&
        matchesTeam &&
        matchesLastAccess
      );
    });
  }, [filters.lastAccess, filters.role, filters.search, filters.status, filters.team, users]);

  const stats = useMemo(() => {
    const active = users.filter((user) => user.status === 'ACTIVE').length;
    const admins = users.filter((user) => getRoleLabel(user.role) === 'Administrador').length;
    const editors = users.filter((user) => getRoleLabel(user.role) === 'Editor').length;
    const readonly = users.filter((user) => getRoleLabel(user.role) === 'Solo lectura').length;

    return {
      total: users.length,
      active,
      admins,
      editors,
      readonly,
      pending: 0,
    };
  }, [users]);

  const {
    page,
    setPage,
    pageItems,
    totalPages,
    rangeStart,
    rangeEnd,
    hasPreviousPage,
    hasNextPage,
  } = useLocalPagination(filteredUsers, {
    pageSize: 10,
    resetKey: `${filters.search}|${filters.role}|${filters.status}|${filters.team}|${filters.lastAccess}|${filteredUsers.length}`,
  });

  const recentActivity = useMemo(() => {
    return [...users]
      .sort(
        (firstUser, secondUser) =>
          new Date(secondUser.updatedAt).getTime() - new Date(firstUser.updatedAt).getTime(),
      )
      .slice(0, 5);
  }, [users]);

  const teamDistribution = useMemo(() => {
    const totals = new Map<string, number>();

    for (const user of users) {
      const key = user.organization?.name ?? 'Organización';
      totals.set(key, (totals.get(key) ?? 0) + 1);
    }

    return Array.from(totals.entries()).sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1]);
  }, [users]);

  const roleDistribution = useMemo(() => {
    const total = Math.max(users.length, 1);
    const adminPercent = Math.round((stats.admins / total) * 100);
    const editorPercent = Math.round((stats.editors / total) * 100);
    const readonlyPercent = 100 - adminPercent - editorPercent;

    return {
      donut: `conic-gradient(${uiTheme.colors.primary} 0 ${adminPercent}%, #60a5fa ${adminPercent}% ${adminPercent + editorPercent}%, ${uiTheme.colors.warning} ${adminPercent + editorPercent}% ${adminPercent + editorPercent + readonlyPercent}%)`,
      adminLabel: `${stats.admins} (${formatPercent(stats.admins, users.length)})`,
      editorLabel: `${stats.editors} (${formatPercent(stats.editors, users.length)})`,
      readonlyLabel: `${stats.readonly} (${formatPercent(stats.readonly, users.length)})`,
    };
  }, [stats.admins, stats.editors, stats.readonly, users.length]);

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditError(null);
  };

  const handleCloseEdit = () => {
    if (isSavingEdit) {
      return;
    }

    setEditingUser(null);
    setEditError(null);
  };

  const handleSaveEdit = async (input: UpdateUserInput) => {
    if (!editingUser) {
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditError(null);
      const updatedUser = await updateUser(editingUser.id, input);
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === updatedUser.id ? updatedUser : user,
        ),
      );
      setEditingUser(null);
    } catch (currentError) {
      setEditError(
        currentError instanceof Error
          ? currentError.message
          : 'No se pudo actualizar el usuario.',
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <>
      <main style={styles.main}>
        <header style={styles.topbar}>
          <div>
            <h1 style={styles.title}>Usuarios</h1>
            <p style={styles.subtitle}>
              Gestiona los usuarios, roles y permisos de la plataforma.
            </p>
          </div>

          <div style={styles.topActions}>
            <div style={styles.datePill}>
              <CalendarIcon size={15} />
              24 may 2024 00:00 — 24 may 2024 23:59
            </div>
            <button type="button" style={styles.iconButton} onClick={() => void loadUsers()}>
              <RefreshIcon size={16} />
            </button>
            <div style={styles.bell}>
              <BellIcon size={16} />
              {stats.total > stats.active && <span style={styles.bellBadge}>{stats.total - stats.active}</span>}
            </div>
            <div style={styles.avatar}>AS</div>
            <span style={styles.adminText}>Admin</span>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => console.log('invite-user-click')}
            >
              <MailIcon size={16} />
              Invitar usuario
            </button>
          </div>
        </header>

        <section style={styles.kpiGrid}>
          <KpiCard icon={<UsersIcon size={18} />} title="Usuarios activos" value={stats.active} note={`De ${stats.total} registrados`} tone="blue" />
          <KpiCard icon={<ShieldIcon size={18} />} title="Administradores" value={stats.admins} note={formatPercent(stats.admins, stats.total)} tone="blue" />
          <KpiCard icon={<EditIcon size={18} />} title="Editores" value={stats.editors} note={formatPercent(stats.editors, stats.total)} tone="blue" />
          <KpiCard icon={<GlobeIcon size={18} />} title="Solo lectura" value={stats.readonly} note={formatPercent(stats.readonly, stats.total)} tone="orange" />
          <KpiCard icon={<MailIcon size={18} />} title="Invitaciones pendientes" value={stats.pending} note="Sin API disponible aún" tone="orange" />
        </section>

        <section style={styles.contentGrid}>
          <div style={styles.tableCard}>
            <div style={styles.filters}>
                <input
                  style={styles.search}
                  placeholder="Buscar por nombre, email o rol..."
                  value={filters.search}
                  onChange={(event) => setFilter('search', event.target.value)}
                />

              <FilterSelect label="Rol" value={filters.role} onChange={(value) => setFilter('role', value)} options={['Todos', 'Administrador', 'Editor', 'Solo lectura']} />
              <FilterSelect label="Estado" value={filters.status} onChange={(value) => setFilter('status', value)} options={['Todos', 'Activo', 'Inactivo']} />
              <FilterSelect label="Equipo" value={filters.team} onChange={(value) => setFilter('team', value)} options={['Todos', ...teamOptions]} />
              <FilterSelect label="Último acceso" value={filters.lastAccess} onChange={(value) => setFilter('lastAccess', value)} options={['Todos', 'Hoy', 'Esta semana', 'Este mes']} />

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={resetFilters}
                disabled={!hasActiveFilters}
              >
                <FilterIcon size={14} />
                Limpiar filtros
              </button>
            </div>

            {loading ? (
              <p style={styles.empty}>Cargando usuarios...</p>
            ) : error ? (
              <p style={styles.empty}>{error}</p>
            ) : (
              <>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Usuario</th>
                      <th style={styles.th}>Rol</th>
                      <th style={styles.th}>Equipo</th>
                      <th style={styles.th}>Estado</th>
                      <th style={styles.th}>Último acceso</th>
                      <th style={styles.th}>Actividad</th>
                      <th style={styles.th}>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageItems.map((user, index) => (
                      <tr
                        key={user.id}
                        style={{
                          ...styles.tr,
                          ...(hoveredRowId === `user-${user.id}` ? styles.trHover : {}),
                        }}
                        onMouseEnter={() => setHoveredRowId(`user-${user.id}`)}
                        onMouseLeave={() => setHoveredRowId(null)}
                      >
                        <td style={styles.td}>
                          <div style={styles.userCell}>
                            <span style={{ ...styles.userAvatar, background: avatarColors[index % avatarColors.length] }}>
                              {getInitials(user.name)}
                            </span>
                            <div>
                              <strong>{user.name}</strong>
                              <div style={styles.muted}>{user.email}</div>
                            </div>
                          </div>
                        </td>

                        <td style={styles.td}><RoleBadge role={getRoleLabel(user.role)} /></td>
                        <td style={styles.td}>{user.organization?.name ?? 'Organización'}</td>
                        <td style={styles.td}><StatusBadge status={getStatusLabel(user.status)} /></td>
                        <td style={styles.td}>{formatDateTimeLines(user.updatedAt).map((line) => <div key={`${user.id}-${line}`}>{line}</div>)}</td>
                        <td style={styles.td}>{user.status === 'ACTIVE' ? <MiniSparkline /> : <span style={styles.inactiveLine}>──────</span>}</td>
                        <td style={styles.td}>
                          <div style={styles.actions}>
                            <button
                              type="button"
                              style={styles.actionButton}
                              onClick={() => handleOpenEdit(user)}
                              title="Editar usuario"
                            >
                              <EditIcon size={15} />
                            </button>
                            <button
                              type="button"
                              style={styles.actionButton}
                              onClick={() => console.log('more-user-actions-click', user.id)}
                            >
                              <MoreHorizontalIcon size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!loading && !error && filteredUsers.length === 0 && (
                      <tr>
                        <td style={styles.emptyCell} colSpan={7}>
                          No hay usuarios que coincidan con los filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <section style={styles.pendingSection}>
                  <h2 style={styles.sectionTitle}>Invitaciones pendientes (0)</h2>
                  <div style={styles.emptyInviteState}>
                    No hay invitaciones pendientes. Esta sección queda preparada para futuras llamadas API.
                  </div>
                </section>
              </>
            )}

            <div style={styles.pagination}>
              <span>Mostrando {rangeStart} a {rangeEnd} de {filteredUsers.length} usuarios</span>
              <div style={styles.pages}>
                <button
                  type="button"
                  style={styles.pageArrow}
                  onClick={() => setPage(page - 1)}
                  disabled={!hasPreviousPage}
                  aria-label="Página anterior"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    style={pageNumber === page ? styles.pageActiveButton : styles.pageNumberButton}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  style={styles.pageArrow}
                  onClick={() => setPage(page + 1)}
                  disabled={!hasNextPage}
                  aria-label="Página siguiente"
                >
                  ›
                </button>
              </div>
              <span style={styles.selectFake}>10 por página</span>
            </div>
          </div>

          <aside style={styles.sidePanel}>
            <SideCard title="Usuarios por rol">
              <div style={styles.donutWrap}>
                <div style={{ ...styles.donutRing, background: roleDistribution.donut }}>
                  <div style={styles.donutCenter}>
                    <strong>{stats.total}</strong>
                    <span>Total</span>
                  </div>
                </div>
                <div style={styles.legend}>
                  <Legend color={uiTheme.colors.primary} label="Administradores" value={roleDistribution.adminLabel} />
                  <Legend color="#60a5fa" label="Editores" value={roleDistribution.editorLabel} />
                  <Legend color={uiTheme.colors.warning} label="Solo lectura" value={roleDistribution.readonlyLabel} />
                </div>
              </div>
            </SideCard>

            <SideCard title="Usuarios por equipo">
              {teamDistribution.length === 0 ? (
                <p style={styles.empty}>Sin usuarios registrados.</p>
              ) : (
                teamDistribution.map(([label, value]) => (
                  <ProgressRow key={label} label={String(label)} value={Number(value)} color={uiTheme.colors.primary} maxValue={stats.total} />
                ))
              )}
            </SideCard>

            <SideCard title="Actividad de usuarios (24h)">
              {recentActivity.length === 0 ? (
                <p style={styles.empty}>Sin actividad reciente.</p>
              ) : (
                recentActivity.map((user, index) => (
                  <div key={user.id} style={styles.activityRow}>
                    <span style={{ ...styles.activityIcon, background: activityColors[index % activityColors.length] }}>
                      <UsersIcon size={14} />
                    </span>
                    <div>
                      <strong>{user.name}</strong>
                      <p>{new Date(user.createdAt).getTime() === new Date(user.updatedAt).getTime() ? 'Alta en la plataforma' : 'Última actualización del perfil'}</p>
                    </div>
                    <span>{formatTime(user.updatedAt)}</span>
                  </div>
                ))
              )}

              <button type="button" style={styles.fullButton} onClick={() => console.log('view-user-activity-click')}>
                Ver toda la actividad
              </button>
            </SideCard>
          </aside>
        </section>
      </main>

      <UserEditModal
        error={editError}
        isOpen={Boolean(editingUser)}
        isSaving={isSavingEdit}
        user={editingUser}
        onClose={handleCloseEdit}
        onSubmit={handleSaveEdit}
      />
    </>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label style={styles.filterGroup}>
      <span>{label}</span>
      <select style={styles.select} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function UserEditModal({
  error,
  isOpen,
  isSaving,
  user,
  onClose,
  onSubmit,
}: {
  error: string | null;
  isOpen: boolean;
  isSaving: boolean;
  user: User | null;
  onClose: () => void;
  onSubmit: (input: UpdateUserInput) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('VIEWER');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) {
      return;
    }

    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setFormError(null);
  }, [isOpen, user]);

  if (!isOpen || !user) {
    return null;
  }

  const handleSubmit = () => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();

    if (!normalizedName) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    if (!normalizedEmail) {
      setFormError('El email es obligatorio.');
      return;
    }

    setFormError(null);
    onSubmit({
      name: normalizedName,
      email: normalizedEmail,
      role,
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-title"
        style={styles.editModal}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={styles.modalHeader}>
          <div>
            <h2 id="edit-user-title" style={styles.modalTitle}>
              Editar usuario
            </h2>
            <p style={styles.modalSubtitle}>{user.organization?.name ?? 'Organización'}</p>
          </div>
          <span style={styles.modalAvatar}>{getInitials(user.name)}</span>
        </div>

        <div style={styles.modalForm}>
          <label style={styles.modalField}>
            <span>Nombre</span>
            <input
              style={styles.modalInput}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
            />
          </label>

          <label style={styles.modalField}>
            <span>Email</span>
            <input
              style={styles.modalInput}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSaving}
              type="email"
            />
          </label>

          <label style={styles.modalField}>
            <span>Rol</span>
            <select
              style={styles.modalInput}
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              disabled={isSaving}
            >
              <option value="OWNER">Administrador</option>
              <option value="ADMIN">Editor</option>
              <option value="VIEWER">Solo lectura</option>
            </select>
          </label>

          <label style={styles.modalField}>
            <span>Estado</span>
            <input
              style={{ ...styles.modalInput, ...styles.readonlyInput }}
              value={getStatusLabel(user.status)}
              readOnly
            />
          </label>
        </div>

        {(formError || error) && (
          <div style={styles.modalError}>{formError ?? error}</div>
        )}

        <div style={styles.modalActions}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={handleSubmit}
            disabled={isSaving}
          >
            <EditIcon size={15} />
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  title,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  note: string;
  tone: 'green' | 'blue' | 'orange' | 'purple';
}) {
  const colors = {
    green: uiTheme.colors.success,
    blue: uiTheme.colors.primary,
    orange: uiTheme.colors.warning,
    purple: uiTheme.colors.primary,
  };

  return (
    <div style={styles.kpiCard}>
      <div style={{ ...styles.kpiIcon, background: `${colors[tone]}16`, color: colors[tone] }}>{icon}</div>
      <div>
        <p style={styles.kpiTitle}>{title}</p>
        <strong style={{ ...styles.kpiValue, color: colors[tone] }}>{value}</strong>
        <p style={styles.kpiNote}>{note}</p>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRoleLabel }) {
  const styleByRole = {
    Administrador: { background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary },
    Editor: { background: '#dbeafe', color: '#1d4ed8' },
    'Solo lectura': { background: uiTheme.colors.warningSoft, color: uiTheme.colors.warning },
  };

  return <span style={{ ...styles.roleBadge, ...styleByRole[role] }}>{role}</span>;
}

function StatusBadge({ status }: { status: 'Activo' | 'Inactivo' }) {
  const isActive = status === 'Activo';

  return (
    <span style={{ ...styles.statusBadge, color: isActive ? uiTheme.colors.success : uiTheme.colors.muted }}>
      <span style={styles.statusDot} />
      {status}
    </span>
  );
}

function MiniSparkline() {
  return (
    <svg width="78" height="26" viewBox="0 0 78 26">
      <path d="M0 18 L8 11 L17 14 L26 6 L35 16 L43 9 L52 13 L62 5 L78 12" fill="none" stroke="#2563eb" strokeWidth="2" />
      <rect x="0" y="0" width="78" height="26" rx="10" fill="#fbfdff" />
      <path d="M0 18 L8 11 L17 14 L26 6 L35 16 L43 9 L52 13 L62 5 L78 12" fill="none" stroke="#2563eb" strokeWidth="1.8" />
    </svg>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.sideCard}>
      <h2 style={styles.sideTitle}>{title}</h2>
      {children}
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={styles.legendRow}>
      <span style={{ ...styles.dot, background: color }} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  color,
  maxValue,
}: {
  label: string;
  value: number;
  color: string;
  maxValue: number;
}) {
  const width = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div style={styles.progressRow}>
      <span>{label}</span>
      <div style={styles.progressBar}>
        <span style={{ ...styles.progressFill, background: color, width: `${width}%` }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function getRoleLabel(role: User['role']): UserRoleLabel {
  const roleMap: Record<User['role'], UserRoleLabel> = {
    OWNER: 'Administrador',
    ADMIN: 'Editor',
    VIEWER: 'Solo lectura',
  };

  return roleMap[role];
}

function getStatusLabel(status: UserStatus) {
  return status === 'ACTIVE' ? 'Activo' : 'Inactivo';
}

function formatPercent(value: number, total: number) {
  return `${total ? ((value / total) * 100).toFixed(1) : '0.0'}% del total`;
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDateTimeLines(value: string) {
  const date = new Date(value);

  return [
    date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  ];
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function matchesLastAccessFilter(value: string, filter: LastAccessFilter) {
  if (filter === 'Todos') return true;
  if (filter === 'Hoy') return isDateWithinLastDays(value, 1);
  if (filter === 'Esta semana') return isDateWithinLastDays(value, 7);
  return isDateWithinLastDays(value, 30);
}

const avatarColors = ['#2563eb', '#1d4ed8', '#60a5fa', '#0ea5e9', '#f59e0b', '#3b82f6', '#94a3b8', '#1e40af'];
const activityColors = ['#dbeafe', '#eff6ff', '#dbeafe', '#eff6ff', '#dbeafe'];

const styles: Record<string, CSSProperties> = {
  main: pageMain,
  topbar: topbarBase,
  topActions: topActionsBase,
  title: pageTitle,
  subtitle: pageSubtitle,
  datePill: datePillBase,
  iconButton: iconButtonBase,
  bell: { ...iconButtonBase, position: 'relative' },
  bellBadge: { position: 'absolute', top: -6, right: -6, background: uiTheme.colors.primary, color: '#fff', borderRadius: 999, width: 18, height: 18, display: 'grid', placeItems: 'center', fontSize: 10 },
  avatar: { ...avatarBase, width: 38, height: 38, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13 },
  adminText: { color: uiTheme.colors.text, fontSize: 13 },
  primaryButton: { ...primaryButtonBase, padding: '0 16px', borderRadius: uiTheme.radii.sm, fontWeight: 800, fontSize: 14, cursor: 'pointer', minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 8 },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 16, marginBottom: 20 },
  kpiCard: { ...kpiCardBase, display: 'flex', gap: 16, alignItems: 'center', minHeight: 100 },
  kpiIcon: { width: 54, height: 54, borderRadius: 14, display: 'grid', placeItems: 'center', flexShrink: 0 },
  kpiTitle: { margin: 0, color: uiTheme.colors.text, fontWeight: 800, fontSize: 13 },
  kpiValue: { display: 'block', marginTop: 8, fontSize: 27, lineHeight: 1 },
  kpiNote: { margin: '8px 0 0', color: uiTheme.colors.muted, fontSize: 11 },

  contentGrid: { display: 'grid', gridTemplateColumns: '1fr 270px', gap: 16 },
  tableCard: { ...tableCardBase, borderRadius: uiTheme.radii.md },
  filters: { display: 'grid', gridTemplateColumns: 'minmax(280px, 1.8fr) minmax(150px, 0.75fr) minmax(150px, 0.75fr) minmax(150px, 0.75fr) minmax(150px, 0.75fr) auto', gap: 14, padding: 20, alignItems: 'end' },
  search: inputBase,
  filterGroup: filterGroupBase,
  select: inputBase,
  secondaryButton: { ...secondaryButtonBase, height: 40, borderRadius: uiTheme.radii.sm, fontWeight: 800, padding: '0 14px', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '13px 16px', color: uiTheme.colors.muted, fontSize: 12, borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`, borderBottom: `1px solid ${uiTheme.colors.border}`, fontWeight: 800 },
  tr: { borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`, background: '#fff' },
  trHover: { background: uiTheme.colors.background },
  td: { padding: '13px 16px', fontSize: 12, color: uiTheme.colors.text },
  emptyCell: { padding: '24px 16px', color: uiTheme.colors.muted, fontSize: 13, textAlign: 'center' },
  userCell: { display: 'flex', alignItems: 'center', gap: 12 },
  userAvatar: { width: 34, height: 34, borderRadius: 999, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12 },
  muted: { color: uiTheme.colors.muted, marginTop: 4, fontSize: 11 },
  roleBadge: { padding: '4px 8px', borderRadius: 5, fontSize: 11, fontWeight: 800 },
  statusBadge: { fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 999, background: 'currentColor', display: 'inline-block' },
  inactiveLine: { color: uiTheme.colors.slate },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end', whiteSpace: 'nowrap' },
  actionButton: { ...controlBase, width: 32, height: 32, borderRadius: uiTheme.radii.sm, cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#475569' },

  pendingSection: { borderTop: `1px solid ${uiTheme.colors.surfaceSoft}` },
  sectionTitle: { fontSize: 15, margin: 0, padding: '18px 16px 6px', fontWeight: 800 },
  emptyInviteState: { padding: '0 16px 18px', color: uiTheme.colors.muted, fontSize: 12 },

  pagination: { ...paginationBase, gap: 18, padding: '16px 20px' },
  pages: { display: 'flex', gap: 10, alignItems: 'center', justifySelf: 'center', color: uiTheme.colors.text },
  pageActiveButton: pageActiveButtonBase,
  pageNumberButton: { border: '1px solid transparent', background: 'transparent', color: '#475569', minWidth: 36, textAlign: 'center', cursor: 'pointer', padding: '7px 11px' },
  pageArrow: pageArrowBase,
  selectFake: { ...selectFakeBase, justifySelf: 'end' },

  sidePanel: { display: 'grid', gap: 16, alignContent: 'start' },
  sideCard: { ...surfaceCard, borderRadius: uiTheme.radii.md, padding: 18 },
  sideTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 800 },
  donutWrap: { display: 'grid', gap: 16 },
  donutRing: { width: 148, height: 148, margin: '0 auto', borderRadius: 999, display: 'grid', placeItems: 'center', position: 'relative', boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.05)' },
  donutCenter: { width: 98, height: 98, borderRadius: 999, background: '#ffffff', display: 'grid', placeItems: 'center', textAlign: 'center', color: '#0f172a', boxShadow: '0 0 0 8px rgba(255,255,255,0.94)' },
  legend: { display: 'grid', gap: 10, alignItems: 'start' },
  legendRow: { display: 'grid', gridTemplateColumns: '8px 1fr auto', gap: 10, alignItems: 'center', fontSize: 11 },
  dot: { width: 7, height: 7, borderRadius: 999 },
  progressRow: { display: 'grid', gridTemplateColumns: '70px 1fr 20px', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 12 },
  progressBar: { height: 5, borderRadius: 999, background: uiTheme.colors.border, overflow: 'hidden' },
  progressFill: { display: 'block', height: '100%', borderRadius: 999 },
  activityRow: { display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 10, alignItems: 'center', padding: '8px 0', fontSize: 11 },
  activityIcon: { width: 26, height: 26, borderRadius: 999, display: 'grid', placeItems: 'center', color: uiTheme.colors.primary },
  fullButton: { ...secondaryButtonBase, width: '100%', marginTop: 12, borderRadius: uiTheme.radii.sm, padding: '10px 12px', fontWeight: 700, cursor: 'pointer' },
  empty: { color: uiTheme.colors.muted, fontSize: 13 },
  modalOverlay: { position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(15, 23, 42, 0.38)', display: 'grid', placeItems: 'center', padding: 24 },
  editModal: { ...surfaceCard, width: 'min(560px, 100%)', padding: 24, borderRadius: uiTheme.radii.md },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, marginBottom: 20 },
  modalTitle: { margin: 0, fontSize: 20, fontWeight: 900 },
  modalSubtitle: { margin: '7px 0 0', color: uiTheme.colors.muted, fontSize: 13 },
  modalAvatar: { ...avatarBase, width: 46, height: 46, borderRadius: 999, fontWeight: 900, background: uiTheme.colors.primary },
  modalForm: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  modalField: { display: 'grid', gap: 7, color: uiTheme.colors.muted, fontSize: 12, fontWeight: 800 },
  modalInput: { ...inputBase, width: '100%', boxSizing: 'border-box' },
  readonlyInput: { background: uiTheme.colors.surfaceSoft, color: uiTheme.colors.muted },
  modalError: { marginTop: 16, padding: '12px 14px', borderRadius: uiTheme.radii.sm, background: uiTheme.colors.dangerSoft, color: uiTheme.colors.danger, fontSize: 13, fontWeight: 800 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
};
