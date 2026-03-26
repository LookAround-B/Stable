import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  label?: string;
  defaultValue?: string; // "YYYY-MM-DD"
  placeholder?: string;
  className?: string;
}

function formatDisplay(date: Date | undefined): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const lbl = 'label-sm text-muted-foreground block mb-1.5';

export default function DatePicker({ label, defaultValue, placeholder = 'Pick a date', className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(
    defaultValue ? new Date(defaultValue + 'T00:00:00') : undefined
  );

  return (
    <div className={className}>
      {label && <label className={lbl}>{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-sm text-left flex items-center gap-2 outline-none transition-colors hover:border-primary/50 focus:ring-1 focus:ring-primary',
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
            onSelect={(d) => { setDate(d); setOpen(false); }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
