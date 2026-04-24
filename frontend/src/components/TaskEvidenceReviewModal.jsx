import React from 'react';
import { X } from 'lucide-react';

const TaskEvidenceReviewModal = ({
  task,
  t,
  loading,
  assignedTo,
  horseName,
  statusColor,
  evidenceImage,
  evidenceImageSrc,
  onClose,
  onApprove,
  onReject,
  onOpenFullscreen,
}) => {
  if (!task) return null;

  const canReview = task.status === 'Pending Review' || task.status === 'Completed';

  return (
    <div
      data-testid="task-evidence-review-overlay"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-background/80 backdrop-blur-sm px-4 pb-4 pt-[72px] sm:p-6"
      onClick={onClose}
    >
      <div
        data-testid="task-evidence-review-panel"
        className="my-auto flex min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface-container-highest max-h-[calc(100dvh-5.5rem)] sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-border shrink-0">
          <h3 className="text-xl font-bold text-foreground">{t('Task Evidence Review')}</h3>
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto">
          <div className="shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
              {t('Task Information')}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Task Name', task.name],
                ['Assigned To', assignedTo],
                ['Horse', horseName],
                ['Type', task.type],
                ['Priority', task.priority],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
                  <p className="text-foreground font-medium mt-0.5">{value}</p>
                </div>
              ))}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {t('Status')}
                </p>
                <span
                  className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                  style={{
                    backgroundColor: `${statusColor}22`,
                    color: statusColor,
                    borderColor: `${statusColor}44`,
                  }}
                >
                  {t(task.status)}
                </span>
              </div>
            </div>
          </div>

          {evidenceImage && (
            <div className="flex shrink min-h-0 flex-col overflow-hidden" style={{ maxHeight: '300px' }}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 shrink-0">
                {t('Evidence Photo')}
              </p>
              <img
                src={evidenceImageSrc}
                alt="Task evidence"
                className="w-full h-full object-contain rounded-lg border border-border cursor-pointer min-h-0 shrink"
                onClick={onOpenFullscreen}
                onError={(e) => {
                  e.currentTarget.src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="18"%3EImage not found%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
          )}

          {(task.completionNotes || task.description) && (
            <div className="p-3 rounded-lg bg-surface-container-high shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t('Completion Notes')}
              </p>
              <p className="text-sm text-foreground mt-1">{task.completionNotes || task.description}</p>
            </div>
          )}

          {task.completedTime && (
            <div className="shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t('Completion Time')}
              </p>
              <p className="text-sm text-foreground mt-0.5 mono-data">
                {new Date(task.completedTime).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3 shrink-0">
          {canReview && (
            <>
              <button
                type="button"
                onClick={onApprove}
                disabled={loading}
                className="flex-1 h-10 rounded-lg bg-success/15 border border-success/40 text-success text-sm font-semibold hover:bg-success/25 transition-colors disabled:opacity-50"
              >
                {t('Approve')}
              </button>
              <button
                type="button"
                onClick={onReject}
                disabled={loading}
                className="flex-1 h-10 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-colors disabled:opacity-50"
              >
                {t('Reject')}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors"
          >
            {t('Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskEvidenceReviewModal;
