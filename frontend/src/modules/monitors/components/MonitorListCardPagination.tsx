import { ChevronRightIcon } from '../../../shared/uiIcons';
import { styles } from '../MonitorListCard.styles';
import { getVisiblePageNumbers } from '../MonitorListCard.utils';

type MonitorListCardPaginationProps = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (nextPage: number) => void;
  page: number;
  rangeEnd: number;
  rangeStart: number;
  totalItems: number;
  totalPages: number;
};

export default function MonitorListCardPagination({
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  page,
  rangeEnd,
  rangeStart,
  totalItems,
  totalPages,
}: MonitorListCardPaginationProps) {
  return (
    <div style={styles.pagination}>
      <span style={styles.paginationText}>
        Mostrando {rangeStart} a {rangeEnd} de {totalItems} webs
      </span>

      <div style={styles.pages}>
        <button
          type="button"
          style={styles.pageArrow}
          aria-label="Página anterior"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
        >
          <span style={styles.pageArrowLeft}>
            <ChevronRightIcon size={14} />
          </span>
        </button>

        {getVisiblePageNumbers(page, totalPages).map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            style={
              pageNumber === page ? styles.pageActiveButton : styles.pageNumberButton
            }
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}

        <button
          type="button"
          style={styles.pageArrow}
          aria-label="Página siguiente"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
        >
          <ChevronRightIcon size={14} />
        </button>
      </div>

      <div style={styles.pageSizeWrap}>
        <span style={styles.pageSizeText}>10 por página</span>
      </div>
    </div>
  );
}
