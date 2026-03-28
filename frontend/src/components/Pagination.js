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
    <div className="pagination-shell flex flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="pagination-nav flex items-center justify-between gap-2 sm:justify-start">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg border border-border text-xs text-foreground font-medium disabled:opacity-30 hover:bg-surface-container-high transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-3 h-3" /> Previous
        </button>
        <button
          onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
          disabled={currentPage >= safeTotalPages}
          className="px-3 py-1.5 rounded-lg border border-border text-xs text-foreground font-medium disabled:opacity-30 hover:bg-surface-container-high transition-colors flex items-center gap-1"
        >
          Next <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="pagination-meta flex items-center justify-center gap-3 sm:justify-end">
        {typeof onRowsPerPageChange === 'function' && (
          <div className="pagination-rows hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows</span>
            <select
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
              className="h-7 rounded border border-border bg-surface-container-high px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
        <div className="pagination-pages flex items-center justify-center gap-1">
          {pageItems.map((item) =>
            typeof item === 'string' ? (
              <span key={item} className="px-1 text-xs text-muted-foreground">
                ...
              </span>
            ) : (
              <button
                key={item}
                onClick={() => onPageChange(item)}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                  currentPage === item
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-container-high'
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
