
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';

type ExportFormat = 'xlsx' | 'csv';

interface ExportDialogProps {
  trigger: React.ReactNode;
  title?: string;
  description?: string;
  options?: Partial<Record<ExportFormat, () => void | Promise<void>>>;
  defaultFormat?: ExportFormat;
}

const formats = [
  {
    id: 'xlsx',
    label: 'Excel Workbook',
    ext: '.xlsx',
    icon: FileSpreadsheet,
    desc: 'Best for pivot tables, formulas & formatting',
    color: 'text-success',
    bg: 'bg-success/10 border-success/20 hover:border-success/50',
    activeBg: 'bg-success/20 border-success/60',
  },
  {
    id: 'csv',
    label: 'CSV File',
    ext: '.csv',
    icon: FileText,
    desc: 'Plain text, compatible with any spreadsheet app',
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20 hover:border-primary/50',
    activeBg: 'bg-primary/20 border-primary/60',
  },
] as const;

export default function ExportDialog({
  trigger,
  title = 'Download As',
  description = 'Choose the file format for your export.',
  options,
  defaultFormat = 'xlsx',
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);

  const availableFormats = formats.filter((fmt) => typeof options?.[fmt.id] === 'function');

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setDownloading(null);
    }
  };

  const orderedFormats = [
    ...availableFormats.filter((fmt) => fmt.id === defaultFormat),
    ...availableFormats.filter((fmt) => fmt.id !== defaultFormat),
  ];

  const handleDownload = async (formatId: ExportFormat) => {
    const downloadHandler = options?.[formatId];
    if (!downloadHandler) {
      return;
    }

    try {
      setDownloading(formatId);
      await downloadHandler();
      setOpen(false);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-surface-container-highest border-border max-w-md w-[calc(100%-2rem)] mx-auto p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>

          <div className="grid gap-3">
            {orderedFormats.map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => handleDownload(fmt.id)}
                disabled={downloading !== null}
                className={`w-full flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all disabled:opacity-60 ${fmt.bg}`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${fmt.color} bg-current/12`}>
                  <fmt.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${fmt.color}`}>
                    {fmt.id === 'csv' ? 'Download CSV' : 'Download Excel'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{fmt.desc}</p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>

          {downloading && (
            <p className="text-xs text-muted-foreground">
              Downloading {downloading === 'csv' ? 'CSV' : 'Excel'}...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
