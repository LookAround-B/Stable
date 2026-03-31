import { toast } from 'sonner';

export const showNoExportDataToast = (message = 'No data to export') => {
  toast.error(message, {
    description: 'Try changing the filters or add records before exporting.',
  });
};
