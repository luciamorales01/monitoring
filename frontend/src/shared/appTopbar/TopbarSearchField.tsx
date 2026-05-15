import { SearchIcon } from '../uiIcons';
import { appTopbarStyles as styles } from '../AppTopbar.styles';

type TopbarSearchFieldProps = {
  onSearchChange?: (value: string) => void;
  searchPlaceholder: string;
  searchValue: string;
};

export default function TopbarSearchField({
  onSearchChange,
  searchPlaceholder,
  searchValue,
}: TopbarSearchFieldProps) {
  return (
    <label style={styles.searchField}>
      <span style={styles.searchIcon}>
        <SearchIcon size={16} />
      </span>
      <input
        type="search"
        value={searchValue}
        onChange={(event) => onSearchChange?.(event.target.value)}
        placeholder={searchPlaceholder}
        style={styles.searchInput}
      />
    </label>
  );
}
