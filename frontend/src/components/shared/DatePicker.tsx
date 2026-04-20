import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from 'components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover';
import { cn } from 'lib/utils';

interface DatePickerProps {
  label?: string;
  defaultValue?: string; // "YYYY-MM-DD"
  value?: string; // controlled "YYYY-MM-DD"
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(date: Date | undefined): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const lbl = 'label-sm text-muted-foreground block mb-1.5';

export default function DatePicker({ label, defaultValue, value: controlledValue, onChange, placeholder = 'Pick a date', className, disabled, required, name }: DatePickerProps) {
  const isControlled = controlledValue !== undefined;
  const [open, setOpen] = useState(false);
  const [internalDate, setInternalDate] = useState<Date | undefined>(
    defaultValue ? new Date(defaultValue + 'T00:00:00') : undefined
  );

  const date = isControlled
    ? (controlledValue ? new Date(controlledValue + 'T00:00:00') : undefined)
    : internalDate;

  function handleSelect(d: Date | undefined) {
    if (!isControlled) setInternalDate(d);
    if (d) onChange?.(toDateStr(d));
    else onChange?.('');
    setOpen(false);
  }

  return (
    <div className={className}>
      {label && <label className={lbl}>{label}</label>}
      {required && <input type="text" required value={date ? toDateStr(date) : ''} onChange={() => {}} className="sr-only absolute" tabIndex={-1} aria-hidden="true" />}
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-sm text-left flex items-center gap-2 outline-none transition-colors hover:border-primary/50 focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed',
              date ? 'text-foreground' : 'text-muted-foreground/50'
            )}
          >
            <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1 truncate">{date ? formatDisplay(date) : placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-surface-container-highest border-border shadow-xl"
          align="start"
          sideOffset={4}
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {name && <input type="hidden" name={name} value={isControlled ? (controlledValue || '') : (date ? toDateStr(date) : '')} />}
    </div>
  );
}
