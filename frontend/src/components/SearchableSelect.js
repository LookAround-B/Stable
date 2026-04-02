import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
  menuPosition = 'bottom',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({});
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedTrigger = wrapperRef.current?.contains(e.target);
      const clickedDropdown = dropdownRef.current?.contains(e.target);

      if (!clickedTrigger && !clickedDropdown) {
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
    if (open) {
      updateDropdownStyle();
      window.addEventListener('resize', updateDropdownStyle);
      window.addEventListener('scroll', updateDropdownStyle, true);
      return () => {
        window.removeEventListener('resize', updateDropdownStyle);
        window.removeEventListener('scroll', updateDropdownStyle, true);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedLabel =
    (Array.isArray(options) &&
      options.find((o) => String(o?.value) === String(value))?.label) ||
    (creatable && value ? value : '');

  const filtered = Array.isArray(options) ? options.filter((o) =>
    o?.label?.toLowerCase?.().includes(search.toLowerCase()) ?? false
  ) : [];

  const visibleOptionCount = 5;
  const showSearch = searchable && options.length > 5;
  const hiddenOptionCount = Math.max(filtered.length - visibleOptionCount, 0);

  const updateDropdownStyle = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const viewportPadding = 16;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const minScrollHeight = 96;
    const maxH = Math.max(minScrollHeight, Math.min(240, (spaceBelow >= spaceAbove ? spaceBelow : spaceAbove) - (showSearch ? 64 : 0) - (hiddenOptionCount > 0 ? 38 : 0) - 12));

    if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
      setDropdownStyle({ position: 'fixed', top: rect.bottom + 6, left: rect.left, width: rect.width, maxScrollHeight: maxH, flip: false });
    } else {
      setDropdownStyle({ position: 'fixed', bottom: window.innerHeight - rect.top + 6, left: rect.left, width: rect.width, maxScrollHeight: maxH, flip: true });
    }
  };

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

  const heightClass = size === 'sm' ? 'h-10' : 'h-11';

  const dropdownContent = open ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: dropdownStyle.flip ? undefined : dropdownStyle.top,
        bottom: dropdownStyle.flip ? dropdownStyle.bottom : undefined,
        left: dropdownStyle.left,
        width: dropdownStyle.width,
        zIndex: 9999,
      }}
      className="rounded-xl bg-surface-container-highest border border-border shadow-2xl overflow-hidden"
    >
      {showSearch && (
        <div className="p-2.5 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
            <input
              ref={searchRef}
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-high/50 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/40 focus:border-foreground/30 outline-none"
            />
          </div>
        </div>
      )}
      <div
        className="efm-select-options-scroll overflow-y-auto py-1.5"
        style={{ maxHeight: `${dropdownStyle.maxScrollHeight || 240}px` }}
      >
        {showCreateOption && (
          <button
            type="button"
            onClick={() => handleSelect(search.trim())}
            className="w-full text-left px-4 py-3 text-sm text-primary flex items-center gap-2 transition-colors hover:bg-primary/10"
          >
            + Add "{search.trim()}"
          </button>
        )}
        {filtered.length === 0 && !showCreateOption ? (
          <p className="px-4 py-3 text-sm text-muted-foreground text-center">No results</p>
        ) : (
          filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between gap-2 transition-colors hover:bg-primary/10 ${
                String(option.value) === String(value) ? 'text-primary bg-primary/5' : 'text-foreground'
              }`}
            >
              <span className="truncate">{option.label}</span>
              {String(option.value) === String(value) && <Check className="w-4 h-4 shrink-0" />}
            </button>
          ))
        )}
      </div>
      {hiddenOptionCount > 0 && (
        <div className="efm-select-more-indicator px-4 py-2 text-xs font-semibold tracking-[0.16em] uppercase">
          {`More +${hiddenOptionCount}`}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div ref={wrapperRef} className={`relative efm-searchable-select ${className}`}>
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
        className={`w-full ${heightClass} px-4 rounded-lg bg-surface-container-high border border-border text-sm flex items-center justify-between gap-2 outline-none focus:ring-1 focus:ring-foreground/30 transition-colors hover:border-foreground/30 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className={`truncate ${selectedLabel ? 'text-foreground' : 'text-muted-foreground/60'}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown — rendered via portal to escape overflow clipping */}
      {ReactDOM.createPortal(dropdownContent, document.body)}
    </div>
  );
};

export default SearchableSelect;
