import { Link } from 'react-router-dom';
import { appTopbarStyles as styles } from '../AppTopbar.styles';
import type { TopbarUserSummary } from '../AppTopbar.types';
import { UsersIcon } from '../uiIcons';

type TopbarUserMenuProps = {
  avatarInitials: string;
  isOpen: boolean;
  onLogout: () => void;
  onToggle: () => void;
  userSummary?: TopbarUserSummary;
};

export default function TopbarUserMenu({
  avatarInitials,
  isOpen,
  onLogout,
  onToggle,
  userSummary,
}: TopbarUserMenuProps) {
  return (
    <div style={styles.menuRoot} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        style={userSummary ? styles.userButton : styles.avatarButton}
        onClick={onToggle}
        aria-expanded={isOpen}
        title="Usuario"
      >
        {userSummary ? (
          <>
            <span style={styles.userAvatar}>{userSummary.initials}</span>
            <span style={styles.userCopy}>
              <strong style={styles.userName}>{userSummary.name}</strong>
              <small style={styles.userRole}>{userSummary.role}</small>
            </span>
          </>
        ) : (
          avatarInitials
        )}
      </button>

      {isOpen ? (
        <div style={styles.userDropdown}>
          <Link to="/profile" style={styles.userMenuItem}>
            <UsersIcon size={15} />
            Perfil
          </Link>
          <button type="button" style={styles.userMenuItem} onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
