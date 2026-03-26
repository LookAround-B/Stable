import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  rowsPerPage = 15,
  onRowsPerPageChange,
  total = 0,
}) => {
  const getPageItems = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const items = [1];

    if (currentPage > 3) items.push('...');

    for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page += 1) {
      items.push(page);
    }

    if (currentPage < totalPages - 2) items.push('...');

    items.push(totalPages);

    return items.filter((item, index) => item !== '...' || items[index - 1] !== '...');
  };

  const pageItems = getPageItems();
  const safeTotal = total || totalPages * rowsPerPage;
  const rangeStart = safeTotal === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const rangeEnd = safeTotal === 0 ? 0 : Math.min(currentPage * rowsPerPage, safeTotal);

  if (totalPages <= 1) return null;

  return (
    <div className="lovable-pagination">
      <div className="lovable-pagination-summary">
        <span>Showing</span>
        <span className="lovable-pagination-range">{rangeStart}-{rangeEnd}</span>
        <span>of {safeTotal}</span>
      </div>

      <div className="lovable-pagination-controls">
        {typeof onRowsPerPageChange === 'function' && (
          <div className="lovable-pagination-rows">
            <span className="lovable-pagination-label">Rows</span>
            <select
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
              className="lovable-pagination-select"
              aria-label="Rows per page"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
        <div className="lovable-pagination-buttons">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="lovable-pagination-nav"
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>

          {pageItems.map((item, idx) =>
            item === '...' ? (
              <span key={`ellipsis-${idx}`} className="lovable-pagination-ellipsis">...</span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`lovable-pagination-page ${currentPage === item ? 'active' : ''}`}
                aria-label={`Go to page ${item}`}
                aria-current={currentPage === item ? 'page' : undefined}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="lovable-pagination-nav"
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
