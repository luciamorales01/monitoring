import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  createInvitation,
  getInvitations,
  getUsers,
  revokeInvitation,
  updateUser,
  updateUserStatus,
  type CreateInvitationInput,
  type UpdateUserInput,
  type User,
  type UserInvitation,
  type UserRole,
  type UserStatus,
} from '../../shared/userApi';
import AppTopbar from '../../shared/AppTopbar';
import LoadingState from '../../shared/LoadingState';
import { useCurrentUserPermissions } from '../../shared/permissions';
import { EditIcon, MailIcon, MoreHorizontalIcon, ShieldIcon, UsersIcon } from '../../shared/uiIcons';
import {
  inputBase,
  kpiCardBase,
  pageMain,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  tableCardBase,
  uiTheme,
} from '../../theme/commonStyles';

type UserRoleLabel = 'Administrador' | 'Editor' | 'Solo lectura';

export default function UsersPage() {
  const { canWrite: canWriteActions } = useCurrentUserPermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<UserInvitation | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const pendingInvitations = useMemo(
    () => invitations.filter((invitation) => invitation.status === 'PENDING'),
    [invitations],
  );

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.status === 'ACTIVE').length,
      inactive: users.filter((user) => user.status === 'INACTIVE').length,
      admins: users.filter((user) => user.role === 'OWNER' || user.role === 'ADMIN').length,
      pending: pendingInvitations.length,
    };
  }, [pendingInvitations.length, users]);

  const loadData = async () => {
    try {
      setError(null);
      const [currentUsers, currentInvitations] = await Promise.all([
        getUsers(),
        getInvitations(),
      ]);
      setUsers(currentUsers);
      setInvitations(currentInvitations);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'No se pudieron cargar los usuarios.');
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const handleUpdateUser = async (input: UpdateUserInput) => {
    if (!editingUser) return;

    try {
      setIsSaving(true);
      setActionError(null);
      const updatedUser = await updateUser(editingUser.id, input);
      setUsers((currentUsers) => currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      setEditingUser(null);
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : 'No se pudo actualizar el usuario.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      setActionError(null);
      const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const updatedUser = await updateUserStatus(user.id, nextStatus);
      setUsers((currentUsers) => currentUsers.map((currentUser) => (currentUser.id === updatedUser.id ? updatedUser : currentUser)));
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : 'No se pudo cambiar el estado del usuario.');
    }
  };

  const handleCreateInvitation = async (input: CreateInvitationInput) => {
    try {
      setIsSaving(true);
      setActionError(null);
      const invitation = await createInvitation(input);
      setInvitations((currentInvitations) => [invitation, ...currentInvitations]);
      setInviteResult(invitation);
      setShowInviteModal(false);
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : 'No se pudo crear la invitación.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeInvitation = async (invitation: UserInvitation) => {
    try {
      setActionError(null);
      const updatedInvitation = await revokeInvitation(invitation.id);
      setInvitations((currentInvitations) =>
        currentInvitations.map((currentInvitation) =>
          currentInvitation.id === updatedInvitation.id ? updatedInvitation : currentInvitation,
        ),
      );
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : 'No se pudo revocar la invitación.');
    }
  };

  return (
    <main style={styles.main}>
      <AppTopbar
        title="Usuarios"
        subtitle="Gestiona miembros, roles, estados e invitaciones del equipo."
        onRefresh={loadData}
        cta={
          canWriteActions
            ? {
                icon: <MailIcon size={16} />,
                label: 'Invitar usuario',
                onClick: () => {
                  setActionError(null);
                  setShowInviteModal(true);
                },
              }
            : undefined
        }
      />

      <section style={styles.kpiGrid}>
        <KpiCard icon={<UsersIcon size={18} />} title="Usuarios" value={stats.total} note={`${stats.active} activos`} />
        <KpiCard icon={<ShieldIcon size={18} />} title="Admins" value={stats.admins} note="OWNER + ADMIN" />
        <KpiCard icon={<MoreHorizontalIcon size={18} />} title="Inactivos" value={stats.inactive} note="Acceso bloqueado" />
        <KpiCard icon={<MailIcon size={18} />} title="Pendientes" value={stats.pending} note="Invitaciones activas" />
      </section>

      {actionError ? <div style={styles.errorBox}>{actionError}</div> : null}

      {inviteResult?.inviteUrl ? (
        <div style={styles.successBox}>
          <strong>Invitación creada.</strong>
          <span>Copia este enlace y envíaselo al usuario:</span>
          <code style={styles.inviteLink}>{inviteResult.inviteUrl}</code>
          <button type="button" style={styles.smallButton} onClick={() => navigator.clipboard?.writeText(inviteResult.inviteUrl ?? '')}>
            Copiar enlace
          </button>
        </div>
      ) : null}

      <section style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Miembros</h2>
              <p style={styles.cardSubtitle}>Usuarios con acceso a la organización.</p>
            </div>
          </div>

          {loading ? (
            <LoadingState variant="table" label="Cargando usuarios" rows={7} />
          ) : error ? (
            <p style={styles.empty}>{error}</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Usuario</th>
                  <th style={styles.th}>Rol</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Última actividad</th>
                  {canWriteActions ? <th style={styles.thActions}>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.userCell}>
                        <span style={styles.avatar}>{getInitials(user.name)}</span>
                        <div>
                          <strong>{user.name}</strong>
                          <p style={styles.muted}>{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}><RoleBadge role={getRoleLabel(user.role)} /></td>
                    <td style={styles.td}><StatusBadge status={user.status} /></td>
                    <td style={styles.td}>{formatDate(user.updatedAt)}</td>
                    {canWriteActions ? (
                      <td style={styles.tdActions}>
                        <div style={styles.actionsInline}>
                          <button type="button" style={styles.actionButton} onClick={() => setEditingUser(user)}>
                            <EditIcon size={14} /> Editar
                          </button>
                          <button type="button" style={styles.actionButton} onClick={() => handleToggleStatus(user)}>
                            {user.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside style={styles.sideCard}>
          <div style={styles.cardHeaderCompact}>
            <h2 style={styles.cardTitle}>Invitaciones pendientes</h2>
            <span style={styles.counter}>{pendingInvitations.length}</span>
          </div>

          {pendingInvitations.length === 0 ? (
            <p style={styles.empty}>No hay invitaciones pendientes.</p>
          ) : (
            <div style={styles.inviteList}>
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} style={styles.inviteItem}>
                  <div>
                    <strong>{invitation.email}</strong>
                    <p style={styles.muted}>{getRoleLabel(invitation.role)} · caduca {formatDate(invitation.expiresAt)}</p>
                  </div>
                  {canWriteActions ? (
                    <button type="button" style={styles.dangerButton} onClick={() => handleRevokeInvitation(invitation)}>
                      Revocar
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>

      <UserEditModal
        error={actionError}
        isOpen={canWriteActions && Boolean(editingUser)}
        isSaving={isSaving}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSubmit={handleUpdateUser}
      />

      <InviteUserModal
        error={actionError}
        isOpen={canWriteActions && showInviteModal}
        isSaving={isSaving}
        onClose={() => setShowInviteModal(false)}
        onSubmit={handleCreateInvitation}
      />
    </main>
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

  useEffect(() => {
    if (!isOpen || !user) return;
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  return (
    <Modal title="Editar usuario" subtitle={user.email} onClose={onClose}>
      <div style={styles.modalForm}>
        <Field label="Nombre" value={name} onChange={setName} disabled={isSaving} />
        <Field label="Email" value={email} onChange={setEmail} disabled={isSaving} type="email" />
        <label style={styles.modalField}>
          <span>Rol</span>
          <select style={styles.modalInput} value={role} onChange={(event) => setRole(event.target.value as UserRole)} disabled={isSaving}>
            <option value="OWNER">Administrador</option>
            <option value="ADMIN">Editor</option>
            <option value="VIEWER">Solo lectura</option>
          </select>
        </label>
      </div>
      {error ? <div style={styles.modalError}>{error}</div> : null}
      <div style={styles.modalActions}>
        <button type="button" style={styles.secondaryButton} onClick={onClose} disabled={isSaving}>Cancelar</button>
        <button type="button" style={styles.primaryButton} onClick={() => onSubmit({ name: name.trim(), email: email.trim(), role })} disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </Modal>
  );
}

function InviteUserModal({
  error,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: {
  error: string | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: CreateInvitationInput) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('VIEWER');

  useEffect(() => {
    if (!isOpen) return;
    setEmail('');
    setRole('VIEWER');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal title="Invitar usuario" subtitle="El usuario recibirá un enlace para crear su contraseña." onClose={onClose}>
      <div style={styles.modalFormSingle}>
        <Field label="Email" value={email} onChange={setEmail} disabled={isSaving} type="email" />
        <label style={styles.modalField}>
          <span>Rol</span>
          <select style={styles.modalInput} value={role} onChange={(event) => setRole(event.target.value as UserRole)} disabled={isSaving}>
            <option value="ADMIN">Editor</option>
            <option value="VIEWER">Solo lectura</option>
            <option value="OWNER">Administrador</option>
          </select>
        </label>
      </div>
      {error ? <div style={styles.modalError}>{error}</div> : null}
      <div style={styles.modalActions}>
        <button type="button" style={styles.secondaryButton} onClick={onClose} disabled={isSaving}>Cancelar</button>
        <button type="button" style={styles.primaryButton} onClick={() => onSubmit({ email: email.trim(), role })} disabled={isSaving}>
          {isSaving ? 'Creando...' : 'Crear invitación'}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: ReactNode; onClose: () => void }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>{title}</h2>
            <p style={styles.modalSubtitle}>{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; type?: string }) {
  return (
    <label style={styles.modalField}>
      <span>{label}</span>
      <input style={styles.modalInput} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} type={type} />
    </label>
  );
}

function KpiCard({ icon, title, value, note }: { icon: ReactNode; title: string; value: string | number; note: string }) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiIcon}>{icon}</div>
      <div>
        <p style={styles.kpiTitle}>{title}</p>
        <strong style={styles.kpiValue}>{value}</strong>
        <p style={styles.kpiNote}>{note}</p>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRoleLabel }) {
  return <span style={styles.roleBadge}>{role}</span>;
}

function StatusBadge({ status }: { status: UserStatus }) {
  const isActive = status === 'ACTIVE';
  return <span style={{ ...styles.statusBadge, color: isActive ? uiTheme.colors.success : uiTheme.colors.muted }}>{isActive ? 'Activo' : 'Inactivo'}</span>;
}

function getRoleLabel(role: UserRole): UserRoleLabel {
  const roleMap: Record<UserRole, UserRoleLabel> = {
    OWNER: 'Administrador',
    ADMIN: 'Editor',
    VIEWER: 'Solo lectura',
  };
  return roleMap[role];
}

function getInitials(value: string) {
  return value.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const styles: Record<string, CSSProperties> = {
  main: {
    ...pageMain,
    backgroundImage:
      'linear-gradient(135deg, rgba(37, 99, 235, 0.07), transparent 30%), linear-gradient(225deg, rgba(15, 23, 42, 0.045), transparent 28%)',
  },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 20 },
  kpiCard: { ...kpiCardBase, display: 'flex', alignItems: 'center', gap: 14, minHeight: 92, borderRadius: 20 },
  kpiIcon: { width: 44, height: 44, borderRadius: 16, display: 'grid', placeItems: 'center', color: uiTheme.colors.primary, background: uiTheme.colors.primarySoft },
  kpiTitle: { margin: 0, fontSize: 12, fontWeight: 600, color: uiTheme.colors.text },
  kpiValue: { display: 'block', marginTop: 6, fontSize: 24, color: uiTheme.colors.primary },
  kpiNote: { margin: '6px 0 0', fontSize: 11, color: uiTheme.colors.muted },
  grid: { display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, alignItems: 'start' },
  card: { ...tableCardBase, borderRadius: 20, overflow: 'hidden' },
  sideCard: { ...surfaceCard, borderRadius: 20, padding: 18 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', padding: 20, borderBottom: `1px solid ${uiTheme.colors.border}` },
  cardHeaderCompact: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  cardTitle: { margin: 0, fontSize: 17, fontWeight: 700 },
  cardSubtitle: { margin: '6px 0 0', color: uiTheme.colors.muted, fontSize: 13 },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  th: { textAlign: 'left', padding: '13px 16px', color: uiTheme.colors.muted, fontSize: 12, borderBottom: `1px solid ${uiTheme.colors.border}`, fontWeight: 600 },
  thActions: { textAlign: 'right', padding: '13px 16px', color: uiTheme.colors.muted, fontSize: 12, borderBottom: `1px solid ${uiTheme.colors.border}`, fontWeight: 600 },
  tr: { borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`, background: 'rgba(255, 255, 255, 0.88)' },
  td: { padding: '13px 16px', fontSize: 12, color: uiTheme.colors.text, verticalAlign: 'middle' },
  tdActions: { padding: '13px 16px', textAlign: 'right', verticalAlign: 'middle' },
  userCell: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: { width: 34, height: 34, borderRadius: 999, display: 'grid', placeItems: 'center', background: uiTheme.colors.primary, color: '#fff', fontWeight: 700, fontSize: 12 },
  muted: { margin: '4px 0 0', color: uiTheme.colors.muted, fontSize: 11 },
  roleBadge: { padding: '5px 9px', borderRadius: 8, background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary, fontSize: 11, fontWeight: 700 },
  statusBadge: { fontWeight: 700, fontSize: 12 },
  actionsInline: { display: 'inline-flex', gap: 8, justifyContent: 'flex-end' },
  actionButton: { ...secondaryButtonBase, minHeight: 34, padding: '0 10px', borderRadius: 12, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  smallButton: { ...secondaryButtonBase, minHeight: 32, padding: '0 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer', width: 'fit-content' },
  dangerButton: { ...secondaryButtonBase, color: uiTheme.colors.danger, minHeight: 32, padding: '0 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer' },
  inviteList: { display: 'grid', gap: 10 },
  inviteItem: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: 12, borderRadius: 12, background: uiTheme.colors.surfaceSoft },
  counter: { minWidth: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center', background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary, fontWeight: 800 },
  empty: { color: uiTheme.colors.muted, fontSize: 13, padding: 16, margin: 0 },
  errorBox: { marginBottom: 16, padding: 14, borderRadius: 12, background: uiTheme.colors.dangerSoft, color: uiTheme.colors.danger, fontWeight: 700, fontSize: 13 },
  successBox: { ...surfaceCard, marginBottom: 16, padding: 16, display: 'grid', gap: 8, borderRadius: 14 },
  inviteLink: { display: 'block', padding: 10, borderRadius: 10, background: uiTheme.colors.surfaceSoft, color: uiTheme.colors.text, overflowWrap: 'anywhere', fontSize: 12 },
  modalOverlay: { position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(15,23,42,.42)', display: 'grid', placeItems: 'center', padding: 24 },
  modal: { ...surfaceCard, width: 'min(560px, 100%)', padding: 24, borderRadius: 20 },
  modalHeader: { marginBottom: 18 },
  modalTitle: { margin: 0, fontSize: 20, fontWeight: 700 },
  modalSubtitle: { margin: '7px 0 0', color: uiTheme.colors.muted, fontSize: 13 },
  modalForm: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  modalFormSingle: { display: 'grid', gap: 14 },
  modalField: { display: 'grid', gap: 7, color: uiTheme.colors.muted, fontSize: 12, fontWeight: 700 },
  modalInput: { ...inputBase, width: '100%', boxSizing: 'border-box' },
  modalError: { marginTop: 16, padding: 12, borderRadius: 10, background: uiTheme.colors.dangerSoft, color: uiTheme.colors.danger, fontSize: 13, fontWeight: 700 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
  secondaryButton: { ...secondaryButtonBase, height: 40, borderRadius: 14, padding: '0 14px', cursor: 'pointer' },
  primaryButton: { ...primaryButtonBase, height: 40, borderRadius: 14, padding: '0 16px', cursor: 'pointer' },
};
