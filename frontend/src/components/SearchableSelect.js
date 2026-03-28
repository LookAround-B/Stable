import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

/**
 * SearchableSelect – a drop-in replacement for <select> that adds a search box.
 * Styled to match EFM shared SelectField design.
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
 *  - size          {string}   'sm' = h-9, 'default' = h-10
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
  className = '',
  searchable = true,
  creatable = false,
  size = 'default',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);
  const searchRef = useRef(null);

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

  const showSearch = searchable && options.length > 5;

  const showCreateOption = creatable && search.trim() &&
    !filtered.some(o => o.label.toLowerCase() === search.trim().toLowerCase());

  const handleSelect = (optionValue) => {
    onChange({ target: { name: name || '', value: optionValue } });
    setOpen(false);
    setSearch('');
  };

  const handleToggle = () => {
    if (!disabled) setOpen((prev) => !prev);
  };

  const heightClass = size === 'sm' ? 'h-9' : 'h-10';

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
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
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full ${heightClass} px-3 rounded-lg bg-surface-container-high border border-border text-sm flex items-center justify-between gap-2 outline-none focus:ring-1 focus:ring-primary transition-colors hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className={`truncate ${selectedLabel ? 'text-foreground' : 'text-muted-foreground/60'}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[160px] rounded-lg bg-surface-container-highest border border-border shadow-xl overflow-hidden">
          {showSearch && (
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchRef}
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-8 pl-8 pr-3 rounded-md bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          )}

          <div className="max-h-52 overflow-y-auto py-1">
            {showCreateOption && (
              <button
                type="button"
                onClick={() => handleSelect(search.trim())}
                className="w-full text-left px-3 py-2 text-sm text-primary flex items-center gap-2 transition-colors hover:bg-primary/10"
              >
                + Add "{search.trim()}"
              </button>
            )}
            {filtered.length === 0 && !showCreateOption ? (
              <p className="px-3 py-2 text-sm text-muted-foreground text-center">No results</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors hover:bg-primary/10 ${
                    String(option.value) === String(value) ? 'text-primary bg-primary/5' : 'text-foreground'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {String(option.value) === String(value) && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
