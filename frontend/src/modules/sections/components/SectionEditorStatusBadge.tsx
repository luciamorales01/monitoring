import type { MonitorViewStatus } from '../../../shared/monitorFilters';
import { styles } from '../SectionEditorModal.styles';
import { getStatusLabel } from '../SectionEditorModal.utils';

export function StatusBadge({ status }: { status: MonitorViewStatus }) {
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
      {getStatusLabel(status)}
    </span>
  );
}

