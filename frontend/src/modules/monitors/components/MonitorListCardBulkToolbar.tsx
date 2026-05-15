import { TrashIcon } from '../../../shared/uiIcons';
import { styles } from '../MonitorListCard.styles';

type MonitorListCardBulkToolbarProps = {
  isDeleting: boolean;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  selectedCount: number;
};

export default function MonitorListCardBulkToolbar({
  isDeleting,
  onClearSelection,
  onDeleteSelected,
  selectedCount,
}: MonitorListCardBulkToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div style={styles.bulkToolbar}>
      <div>
        <strong style={styles.bulkTitle}>
          {selectedCount} {selectedCount === 1 ? 'web seleccionada' : 'webs seleccionadas'}
        </strong>
        <p style={styles.bulkCopy}>
          Atajos: `Ctrl/Cmd + A` selecciona esta página. `Esc` limpia. `Shift +
          click` amplía rango.
        </p>
      </div>

      <div style={styles.bulkActions}>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={onClearSelection}
        >
          Limpiar selección
        </button>

        <button
          type="button"
          style={styles.dangerButton}
          onClick={onDeleteSelected}
          disabled={isDeleting}
        >
          <TrashIcon size={15} />
          {selectedCount === 1
            ? 'Eliminar seleccionada'
            : 'Eliminar seleccionadas'}
        </button>
      </div>
    </div>
  );
}
