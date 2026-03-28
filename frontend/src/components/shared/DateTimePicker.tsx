import DatePicker from './DatePicker';
import TimePicker from './TimePicker';

interface DateTimePickerProps {
  label?: string;
  value?: string; // controlled "YYYY-MM-DDTHH:MM" (datetime-local format)
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

const lbl = 'label-sm text-muted-foreground block mb-1.5';

export default function DateTimePicker({ label, value, onChange, className, disabled, required, name }: DateTimePickerProps) {
  const datePart = value ? value.split('T')[0] : '';
  const timePart = value ? (value.split('T')[1] || '').substring(0, 5) : '';

  function handleDateChange(d: string) {
    const t = timePart || '00:00';
    onChange?.(d ? `${d}T${t}` : '');
  }

  function handleTimeChange(t: string) {
    const d = datePart || new Date().toISOString().split('T')[0];
    onChange?.(`${d}T${t}`);
  }

  return (
    <div className={className}>
      {label && <label className={lbl}>{label}</label>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DatePicker placeholder="Pick a date" value={datePart} onChange={handleDateChange} disabled={disabled} required={required} />
        <TimePicker placeholder="Pick a time" value={timePart} onChange={handleTimeChange} disabled={disabled} />
      </div>
      {name && <input type="hidden" name={name} value={value || ''} />}
    </div>
  );
}
