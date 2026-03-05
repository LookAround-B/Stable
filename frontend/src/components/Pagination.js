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

  // Generate page numbers (show 5 pages max)
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const half = Math.floor(maxPagesToShow / 2);
      let start = currentPage - half;
      let end = currentPage + half;

      if (start < 1) {
        start = 1;
        end = maxPagesToShow;
      } else if (end > totalPages) {
        end = totalPages;
        start = totalPages - maxPagesToShow + 1;
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

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

        {/* Page Numbers */}
        <div className="pagination-numbers">
          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`}
              aria-label={`Go to page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
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
