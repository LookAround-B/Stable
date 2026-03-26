import DatePicker from './DatePicker';
import TimePicker from './TimePicker';

interface DateTimePickerProps {
  label?: string;
  className?: string;
}

const lbl = 'label-sm text-muted-foreground block mb-1.5';

export default function DateTimePicker({ label, className }: DateTimePickerProps) {
  return (
    <div className={className}>
      {label && <label className={lbl}>{label}</label>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DatePicker placeholder="Pick a date" />
        <TimePicker placeholder="Pick a time" />
      </div>
    </div>
  );
}
