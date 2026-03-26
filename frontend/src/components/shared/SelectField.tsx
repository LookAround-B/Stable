
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface SelectFieldProps {
  label?: string;
  options: string[];
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  /** 'sm' = h-9 (for inline filter selects), 'default' = h-10 (for form fields) */
  size?: 'sm' | 'default';
}

export default function SelectField({
  label,
  options,
  placeholder = 'Select...',
  defaultValue,
  value: controlledValue,
  onChange,
  className = '',
  size = 'default',
}: SelectFieldProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const value = isControlled ? controlledValue : internalValue;
  const showSearch = options.length > 5;
  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function select(opt: string) {
    if (!isControlled) setInternalValue(opt);
    onChange?.(opt);
    setOpen(false);
    setSearch('');
  }

  const heightClass = size === 'sm' ? 'h-9' : 'h-10';

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && (
        <label className="label-sm text-muted-foreground block mb-1.5">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full ${heightClass} px-3 rounded-lg bg-surface-container-high border border-border text-sm flex items-center justify-between gap-2 outline-none focus:ring-1 focus:ring-primary transition-colors hover:border-primary/40`}
      >
        <span className={`truncate ${value ? 'text-foreground' : 'text-muted-foreground/60'}`}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[160px] rounded-lg bg-surface-container-highest border border-border shadow-xl overflow-hidden">
          {showSearch && (
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-8 pl-8 pr-3 rounded-md bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          )}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground text-center">No results</p>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => select(opt)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors hover:bg-primary/10 ${
                    value === opt ? 'text-primary bg-primary/5' : 'text-foreground'
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {value === opt && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
