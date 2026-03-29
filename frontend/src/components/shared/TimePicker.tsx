import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover';
import { cn } from 'lib/utils';

interface TimePickerProps {
  label?: string;
  defaultValue?: string; // "HH:MM" 24-hour
  value?: string; // controlled "HH:MM" 24-hour
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function parseDefault(val?: string) {
  if (!val) return { hour: '', minute: '00', period: 'AM' as 'AM' | 'PM' };
  const [h, m] = val.split(':').map(Number);
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour = String(h === 0 ? 12 : h > 12 ? h - 12 : h).padStart(2, '0');
  const minute = String(m || 0).padStart(2, '0');
  // Round minute to nearest 5
  const roundedMin = String(Math.round(m / 5) * 5 % 60).padStart(2, '0');
  return { hour, minute: roundedMin, period };
}

const lbl = 'label-sm text-muted-foreground block mb-1.5';

function to24h(hour: string, minute: string, period: 'AM' | 'PM'): string {
  if (!hour) return '';
  let h = parseInt(hour, 10);
  if (period === 'AM' && h === 12) h = 0;
  else if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

export default function TimePicker({ label, defaultValue, value: controlledValue, onChange, placeholder = 'Pick a time', className, disabled, name }: TimePickerProps) {
  const isControlled = controlledValue !== undefined;
  const [open, setOpen] = useState(false);
  const initVal = controlledValue || defaultValue;
  const def = parseDefault(initVal);
  const [hour, setHour] = useState(def.hour);
  const [minute, setMinute] = useState(def.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(def.period);

  // Sync controlled value
  useEffect(() => {
    if (isControlled) {
      const parsed = parseDefault(controlledValue);
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
    }
  }, [controlledValue, isControlled]);

  const displayTime = hour ? `${hour}:${minute} ${period}` : '';

  function handleConfirm() {
    if (hour) {
      onChange?.(to24h(hour, minute, period));
    }
    setOpen(false);
  }

  function handleHour(h: string) {
    setHour(h);
    if (!isControlled) return;
    onChange?.(to24h(h, minute, period));
  }

  function handleMinute(m: string) {
    setMinute(m);
    if (!isControlled) return;
    onChange?.(to24h(hour, m, period));
  }

  function handlePeriod(p: 'AM' | 'PM') {
    setPeriod(p);
    if (!isControlled) return;
    onChange?.(to24h(hour, minute, p));
  }

  return (
    <div className={className}>
      {label && <label className={lbl}>{label}</label>}
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-sm text-left flex items-center gap-2 outline-none transition-colors hover:border-primary/50 focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed',
              displayTime ? 'text-foreground' : 'text-muted-foreground/50'
            )}
          >
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1">{displayTime || placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-52 p-3 bg-surface-container-highest border-border shadow-xl"
          align="start"
          sideOffset={4}
        >
          <div className="flex gap-1.5">
            {/* Hours column */}
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 text-center font-semibold">Hr</p>
              <div className="h-44 overflow-y-auto scrollbar-none space-y-0.5 pr-0.5">
                {HOURS.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleHour(h)}
                    className={cn(
                      'w-full h-8 rounded-md text-sm font-medium transition-colors',
                      hour === h
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-surface-container-high'
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes column */}
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 text-center font-semibold">Min</p>
              <div className="h-44 overflow-y-auto scrollbar-none space-y-0.5 pr-0.5">
                {MINUTES.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinute(m)}
                    className={cn(
                      'w-full h-8 rounded-md text-sm font-medium transition-colors',
                      minute === m
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-surface-container-high'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM column */}
            <div className="w-12">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 text-center font-semibold">—</p>
              <div className="space-y-0.5">
                {(['AM', 'PM'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePeriod(p)}
                    className={cn(
                      'w-full h-8 rounded-md text-sm font-medium transition-colors',
                      period === p
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-surface-container-high'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full mt-2.5 h-8 rounded-lg bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider hover:bg-primary/20 transition-colors"
          >
            Confirm
          </button>
        </PopoverContent>
      </Popover>
      {name && <input type="hidden" name={name} value={isControlled ? (controlledValue || '') : (hour ? to24h(hour, minute, period) : '')} />}
    </div>
  );
}
