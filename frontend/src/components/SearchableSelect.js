import React, { useState, useRef, useEffect } from 'react';

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
 *  - creatable     {bool}     allow typing a custom value not in the options list
 */
const SearchableSelect = ({
  name,
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  required = false,
  className = '',  searchable = true,  creatable = false,}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openUp, setOpenUp] = useState(false);
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
  (Array.isArray(options) &&
    options.find((o) => String(o?.value) === String(value))?.label) ||
  (creatable && value ? value : '');

  const filtered = Array.isArray(options) ? options.filter((o) =>
    o?.label?.toLowerCase?.().includes(search.toLowerCase()) ?? false
  ) : [];

  const showCreateOption = creatable && search.trim() &&
    !filtered.some(o => o.label.toLowerCase() === search.trim().toLowerCase());

  const handleSelect = (optionValue) => {
    onChange({ target: { name: name || '', value: optionValue } });
    setOpen(false);
    setSearch('');
  };

  const handleToggle = () => {
    if (!disabled) {
      if (!open && wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUp(spaceBelow < 260);
      }
      setOpen((prev) => !prev);
    }
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
        <span className="ss-arrow"></span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`ss-dropdown ${openUp ? 'ss-dropdown-up' : ''}`} role="listbox">
          {/* Search box */}
          {searchable && (
          <div className="ss-search-wrapper">
            <input
              ref={searchRef}
              type="text"
              className="ss-search"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          )}

          {/* Options */}
          <ul className="ss-list">
            {showCreateOption && (
              <li
                className="ss-option ss-create-option"
                onClick={() => handleSelect(search.trim())}
                role="option"
                style={{ color: '#2563eb', fontWeight: 600 }}
              >
                + Add "{search.trim()}"
              </li>
            )}
            {filtered.length === 0 && !showCreateOption ? (
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
