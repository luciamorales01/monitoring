import LoadingState from "../../../shared/LoadingState";
import {
  ActivityIcon,
  EditIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
} from "../../../shared/uiIcons";
import { monitorDetailStyles as styles } from "./monitorDetailStyles";

export function MonitorActionsMenu({
  isOpen,
  isActive,
  checking,
  toggling,
  onToggleMenu,
  onRunCheck,
  onToggleActive,
  onOpenEdit,
}: {
  isOpen: boolean;
  isActive: boolean;
  checking: boolean;
  toggling: boolean;
  onToggleMenu: () => void;
  onRunCheck: () => void;
  onToggleActive: () => void;
  onOpenEdit: () => void;
}) {
  return (
    <div
      style={styles.heroActions}
      className="monitor-detail-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        style={styles.actionButton}
        className="monitor-detail-button monitor-detail-button-menu"
        onClick={(event) => {
          event.stopPropagation();
          onToggleMenu();
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Acciones del monitor"
        title="Acciones"
      >
        <MoreHorizontalIcon size={18} />
      </button>

      {isOpen ? (
        <div
          style={styles.actionMenu}
          className="monitor-detail-action-menu"
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            style={styles.actionMenuItem}
            onClick={onRunCheck}
            disabled={checking}
          >
            {checking ? (
              <LoadingState variant="button" label="Comprobando monitor" />
            ) : (
              <>
                <ActivityIcon size={15} />
                Comprobar ahora
              </>
            )}
          </button>

          <button
            type="button"
            style={styles.actionMenuItem}
            onClick={onToggleActive}
            disabled={toggling}
          >
            {toggling ? (
              <LoadingState variant="button" label="Actualizando monitor" />
            ) : isActive ? (
              <>
                <PauseIcon size={15} />
                Pausar monitor
              </>
            ) : (
              <>
                <PlayIcon size={15} />
                Reanudar monitor
              </>
            )}
          </button>

          <button type="button" style={styles.actionMenuItem} onClick={onOpenEdit}>
            <EditIcon size={15} />
            Editar monitor
          </button>
        </div>
      ) : null}
    </div>
  );
}
