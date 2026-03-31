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
  const safeTotalPages = Math.max(totalPages || 0, 1);

  const visiblePages = Array.from({ length: safeTotalPages }, (_, i) => i + 1).filter((page) => {
    if (safeTotalPages <= 7) return true;
    if (page === 1 || page === safeTotalPages) return true;
    return Math.abs(page - currentPage) <= 1;
  });

  const pageItems = [];
  visiblePages.forEach((page, index) => {
    pageItems.push(page);
    const nextPage = visiblePages[index + 1];
    if (nextPage && nextPage - page > 1) {
      pageItems.push(`ellipsis-${page}`);
    }
  });

  return (
    <div className="pagination-shell lovable-pagination">
      <div className="pagination-nav lovable-pagination-buttons flex items-center justify-between gap-2 sm:justify-start">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="lovable-pagination-nav w-auto min-w-[78px] px-3 text-xs font-medium disabled:opacity-30 flex items-center gap-1"
        >
          <ChevronLeft className="w-3 h-3" /> Previous
        </button>
        <button
          onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
          disabled={currentPage >= safeTotalPages}
          className="lovable-pagination-nav w-auto min-w-[62px] px-3 text-xs font-medium disabled:opacity-30 flex items-center gap-1"
        >
          Next <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="pagination-meta lovable-pagination-controls flex items-center justify-center gap-3 sm:justify-end">
        {typeof onRowsPerPageChange === 'function' && (
          <div className="pagination-rows lovable-pagination-rows hidden sm:flex items-center gap-2">
            <span className="lovable-pagination-label">Rows per page</span>
            <div className="lovable-pagination-select-shell">
              <select
                value={rowsPerPage}
                onChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
                className="lovable-pagination-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}
        <div className="pagination-pages lovable-pagination-buttons flex items-center justify-center gap-1">
          {pageItems.map((item) =>
            typeof item === 'string' ? (
              <span key={item} className="lovable-pagination-ellipsis">
                ...
              </span>
            ) : (
              <button
                key={item}
                onClick={() => onPageChange(item)}
                className={`lovable-pagination-page text-xs font-medium ${
                  currentPage === item
                    ? 'active'
                    : ''
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Pagination;
