
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileSpreadsheet, FileText, Download, Check } from 'lucide-react';

interface ExportDialogProps {
  trigger: React.ReactNode;
  filename?: string;
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

export default function ExportDialog({ trigger, filename = 'export' }: ExportDialogProps) {
  const [selected, setSelected] = useState<'xlsx' | 'csv'>('xlsx');
  const [open, setOpen] = useState(false);

  const handleDownload = () => {
    // Placeholder: in production, trigger actual file generation here
    const a = document.createElement('a');
    a.href = '#';
    a.download = `${filename}.${selected}`;
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-surface-container-highest border-border max-w-sm w-[calc(100%-2rem)] mx-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" /> Download As
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">Choose the file format for your export.</p>

        <div className="space-y-3 mt-1">
          {formats.map(fmt => {
            const isActive = selected === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => setSelected(fmt.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${isActive ? fmt.activeBg : fmt.bg}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isActive ? fmt.color + ' bg-current/10' : 'bg-surface-container text-muted-foreground'}`}>
                  <fmt.icon className="w-5 h-5" style={{ color: isActive ? undefined : undefined }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isActive ? fmt.color : 'text-foreground'}`}>
                    {fmt.label}
                    <span className="ml-1.5 text-[10px] font-mono uppercase tracking-wider opacity-60">{fmt.ext}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{fmt.desc}</p>
                </div>
                {isActive && (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${fmt.color} bg-current/15`}>
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleDownload}
          className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download {selected.toUpperCase()}
        </button>
      </DialogContent>
    </Dialog>
  );
}
