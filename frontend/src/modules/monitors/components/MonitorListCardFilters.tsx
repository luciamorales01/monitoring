import type { MonitorListFilterState } from '../MonitorListCard.types';
import { styles } from '../MonitorListCard.styles';
import { FilterIcon } from '../../../shared/uiIcons';

type MonitorListCardFiltersProps = {
  filters: MonitorListFilterState;
  hasActiveFilters: boolean;
  onFilterChange: (key: keyof MonitorListFilterState, value: string) => void;
  onResetFilters: () => void;
};

export default function MonitorListCardFilters({
  filters,
  hasActiveFilters,
  onFilterChange,
  onResetFilters,
}: MonitorListCardFiltersProps) {
  return (
    <div style={styles.filters}>
      <input
        style={styles.search}
        placeholder="Buscar por nombre o URL..."
        value={filters.search}
        onChange={(event) => onFilterChange('search', event.target.value)}
      />

      <label style={styles.filterGroup}>
        <span>Estado</span>
        <select
          style={styles.select}
          value={filters.status}
          onChange={(event) => onFilterChange('status', event.target.value)}
        >
          <option value="ALL">Todos</option>
          <option value="UP">Operativas</option>
          <option value="DOWN">Con problemas</option>
          <option value="PAUSED">Pausadas</option>
          <option value="UNKNOWN">Pendientes</option>
        </select>
      </label>

      <label style={styles.filterGroup}>
        <span>Tipo</span>
        <select
          style={styles.select}
          value={filters.type}
          onChange={(event) => onFilterChange('type', event.target.value)}
        >
          <option value="ALL">Todos</option>
          <option value="HTTP">HTTP</option>
          <option value="HTTPS">HTTPS</option>
          <option value="SSL">SSL</option>
          <option value="TCP">TCP</option>
          <option value="DNS">DNS</option>
        </select>
      </label>

      <label style={styles.filterGroup}>
        <span>Orden</span>
        <select
          style={styles.select}
          value={filters.sort}
          onChange={(event) => onFilterChange('sort', event.target.value)}
        >
          <option value="status">Estado</option>
          <option value="name">Nombre</option>
          <option value="latest-check">Última comprobación</option>
          <option value="created-at">Creación</option>
        </select>
      </label>

      <button
        type="button"
        style={styles.secondaryButton}
        onClick={onResetFilters}
        disabled={!hasActiveFilters}
      >
        <FilterIcon size={14} />
        Limpiar filtros
      </button>
    </div>
  );
}
