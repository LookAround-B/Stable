import React, { useState } from 'react';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  rowsPerPage = 15,
  onRowsPerPageChange,
  total = 0 
}) => {
  const [goToPage, setGoToPage] = useState('');

  const handleGoToPage = () => {
    const page = parseInt(goToPage, 10);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setGoToPage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleGoToPage();
    }
  };

  // Generate page items: 1 2 .. [current] .. last
  const getPageItems = () => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const items = [];

    // Always show page 1
    items.push(1);

    // Always show page 2 (if not last)
    if (totalPages > 2) items.push(2);

    // Ellipsis before current if current is far from start
    if (currentPage > 3) items.push('...');

    // Show current page if it's not already shown (not 1 or 2 or last)
    if (currentPage > 2 && currentPage < totalPages) items.push(currentPage);

    // Ellipsis after current if current is far from end
    if (currentPage < totalPages - 1) items.push('...');

    // Always show last page
    items.push(totalPages);

    // Remove duplicate page numbers and consecutive ellipsis
    const seen = new Set();
    return items.filter((item, i) => {
      if (item === '...') return items[i - 1] !== '...';
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
  };

  const pageItems = getPageItems();

  if (totalPages <= 1) return null;

  return (
    <div className="pagination-wrapper">
      <div className="pagination-container">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="pagination-btn pagination-nav-btn"
          aria-label="Previous page"
        >
          ‹
        </button>

        {/* Page Numbers with ellipsis */}
        <div className="pagination-numbers">
          {pageItems.map((item, idx) =>
            item === '...' ? (
              <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
            ) : (
              <button
                key={item}
                onClick={() => onPageChange(item)}
                className={`pagination-page-btn ${currentPage === item ? 'active' : ''}`}
                aria-label={`Go to page ${item}`}
                aria-current={currentPage === item ? 'page' : undefined}
              >
                {item}
              </button>
            )
          )}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="pagination-btn pagination-nav-btn"
          aria-label="Next page"
        >
          ›
        </button>

        {/* Divider */}
        <div className="pagination-divider"></div>

        {/* Rows Per Page Dropdown */}
        <div className="pagination-control">
          <label htmlFor="rows-per-page" className="pagination-label">Rows per page:</label>
          <select
            id="rows-per-page"
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
            className="pagination-select"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Go To Page Input */}
        <div className="pagination-control">
          <label htmlFor="go-to-page" className="pagination-label">Go to:</label>
          <input
            id="go-to-page"
            type="number"
            min="1"
            max={totalPages}
            value={goToPage}
            onChange={(e) => setGoToPage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Page"
            className="pagination-input"
          />
          <button
            onClick={handleGoToPage}
            className="pagination-go-btn"
            aria-label="Go to page"
          >
            Go
          </button>
        </div>

        {/* Page Info */}
        <div className="pagination-info">
          <span>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
          {total > 0 && <span className="pagination-total">({total} items)</span>}
        </div>
      </div>
    </div>
  );
};

export default Pagination;
