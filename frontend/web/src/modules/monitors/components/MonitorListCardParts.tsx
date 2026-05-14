import LoadingState from '../../../shared/LoadingState';
import type { Monitor } from '../../../shared/monitorApi';
import type { MonitorViewStatus } from '../../../shared/monitorFilters';
import { TrashIcon } from '../../../shared/uiIcons';
import { toneStyles, uiTheme } from '../../../theme/commonStyles';
import { styles } from '../MonitorListCard.styles';

export function DeleteSelectedModal({
  error,
  isDeleting,
  isOpen,
  monitors,
  onCancel,
  onConfirm,
}: {
  error: string | null;
  isDeleting: boolean;
  isOpen: boolean;
  monitors: Monitor[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={!isDeleting ? onCancel : undefined}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-monitors-title"
        style={styles.confirmModal}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={styles.confirmIconWrap}>
          <TrashIcon size={20} />
        </div>

        <h2 id="delete-monitors-title" style={styles.confirmTitle}>
          Confirmar eliminación
        </h2>

        <p style={styles.confirmCopy}>
          {monitors.length === 1
            ? "Esta web se eliminará de forma permanente junto con su historial."
            : "Las webs seleccionadas se eliminarán de forma permanente junto con su historial."}
        </p>

        <div style={styles.confirmList}>
          {monitors.slice(0, 4).map((monitor) => (
            <div key={monitor.id} style={styles.confirmListItem}>
              <strong>{monitor.name}</strong>
              <span style={styles.confirmListUrl}>{monitor.target}</span>
            </div>
          ))}

          {monitors.length > 4 && (
            <div style={styles.confirmListMore}>
              +{monitors.length - 4} webs adicionales
            </div>
          )}
        </div>

        {error && <div style={styles.feedbackError}>{error}</div>}

        <div style={styles.confirmActions}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancelar
          </button>

          <button
            type="button"
            style={styles.dangerButton}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <LoadingState variant="button" label="Eliminando monitores" />
            ) : (
              "Eliminar seleccionadas"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: MonitorViewStatus }) {
  const isUp = status === "UP";
  const isDown = status === "DOWN";
  const isPaused = status === "PAUSED";

  return (
    <span
      style={{
        ...styles.badge,
        background: isUp
          ? toneStyles.green.background
          : isDown
            ? toneStyles.red.background
            : isPaused
              ? uiTheme.colors.primarySoft
              : toneStyles.slate.background,
        color: isUp
          ? toneStyles.green.color
          : isDown
            ? toneStyles.red.color
            : isPaused
              ? uiTheme.colors.primary
              : toneStyles.slate.color,
      }}
    >
      <span style={styles.badgeDot} />
      {isUp
        ? "Operativo"
        : isDown
          ? "Problema"
          : isPaused
            ? "Pausada"
            : "Pendiente"}
    </span>
  );
}

export function MiniSparkline({ status }: { status: MonitorViewStatus }) {
  const color =
    status === "DOWN"
      ? uiTheme.colors.danger
      : status === "PAUSED"
        ? uiTheme.colors.slate
        : uiTheme.colors.success;

  return (
    <svg width="74" height="24" viewBox="0 0 74 24">
      <path
        d="M0 15 L8 12 L14 14 L20 6 L27 19 L34 10 L42 12 L50 8 L58 14 L66 11 L74 15"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
      />
    </svg>
  );
}

