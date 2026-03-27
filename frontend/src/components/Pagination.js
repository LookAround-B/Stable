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
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onPageChange(Math.max(1, currentPage - 1))} 
          disabled={currentPage === 1} 
          className="px-3 py-1.5 rounded-lg border border-border text-xs text-foreground font-medium disabled:opacity-30 hover:bg-surface-container-high transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-3 h-3" /> Previous
        </button>
        <button 
          onClick={() => onPageChange(Math.min(totalPages || 1, currentPage + 1))} 
          disabled={currentPage >= totalPages} 
          className="px-3 py-1.5 rounded-lg border border-border text-xs text-foreground font-medium disabled:opacity-30 hover:bg-surface-container-high transition-colors flex items-center gap-1"
        >
          Next <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {typeof onRowsPerPageChange === 'function' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
              className="bg-surface-container-high border border-border rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages || 1 }, (_, i) => (
            <button 
              key={i} 
              onClick={() => onPageChange(i + 1)} 
              className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${currentPage === i + 1 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-surface-container-high'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pagination;
