import React, { useState, useRef, useEffect } from 'react';
import '../styles/SearchableSelect.css';

/**
 * SearchableSelect – a drop-in replacement for <select> that adds a search box.
 *
 * Props (mirrors native <select> where possible):
 *  - name          {string}   input name (forwarded in synthetic onChange event)
 *  - id            {string}
 *  - value         {string}   currently selected value
 *  - onChange      {func}     called with synthetic { target: { name, value } }
 *  - options       {Array}    [{ value, label }]
 *  - placeholder   {string}   text shown when nothing is selected
 *  - disabled      {bool}
 *  - required      {bool}
 *  - className     {string}   extra class for the wrapper
 */
const SearchableSelect = ({
  name,
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  required = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);
  const searchRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  const selectedLabel =
    Array.isArray(options) && options.find((o) => String(o.value) === String(value))?.label || '';

  const filtered = Array.isArray(options) ? options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  ) : [];

  const handleSelect = (optionValue) => {
    onChange({ target: { name: name || '', value: optionValue } });
    setOpen(false);
    setSearch('');
  };

  const handleToggle = () => {
    if (!disabled) setOpen((prev) => !prev);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`searchable-select ${className} ${disabled ? 'disabled' : ''} ${open ? 'open' : ''}`}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden native input for form validation */}
      <input
        type="text"
        name={name}
        id={id}
        value={value || ''}
        required={required}
        readOnly
        tabIndex={-1}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
        onChange={() => {}}
      />

      {/* Trigger button */}
      <button
        type="button"
        className="ss-trigger"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`ss-label ${!selectedLabel ? 'ss-placeholder' : ''}`}>
          {selectedLabel || placeholder}
        </span>
        <span className="ss-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="ss-dropdown" role="listbox">
          {/* Search box */}
          <div className="ss-search-wrapper">
            <input
              ref={searchRef}
              type="text"
              className="ss-search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options */}
          <ul className="ss-list">
            {filtered.length === 0 ? (
              <li className="ss-no-results">No results found</li>
            ) : (
              filtered.map((option) => (
                <li
                  key={option.value}
                  className={`ss-option ${String(option.value) === String(value) ? 'selected' : ''} ${option.value === '' ? 'ss-empty-option' : ''}`}
                  onClick={() => handleSelect(option.value)}
                  role="option"
                  aria-selected={String(option.value) === String(value)}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
