import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useI18n } from '../context/I18nContext';
import { Clock, Package, Search, Users, BarChart3, X, Camera } from 'lucide-react';

const cropImageToSquare = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Failed to read image'));
  reader.onload = (event) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const offsetX = Math.floor((img.width - size) / 2);
      const offsetY = Math.floor((img.height - size) / 2);
      const canvas = document.createElement('canvas');
      const outputSize = Math.min(1200, size);
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, outputSize, outputSize);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to process image'));
            return;
          }
          resolve(new File([blob], file.name.replace(/\\.[^.]+$/, '') + '-square.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.9
      );
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

const MyAssignedTasksPage = () => {
  const { t } = useI18n();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [submissionData, setSubmissionData] = useState({
    proofImage: '',
    completionNotes: '',
  });

  useEffect(() => {
    loadAssignedTasks();
  }, []);

  useEffect(() => {
    setSubmissionData({ proofImage: '', completionNotes: '' });
  }, [selectedTaskId]);

  // ESC key handler for fullscreen image
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setFullscreenImage(null);
      }
    };
    
    if (fullscreenImage) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [fullscreenImage]);

  const loadAssignedTasks = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/tasks/my-tasks');
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setMessage('âœ— Failed to load your tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const squareFile = await cropImageToSquare(file);
      const formData = new FormData();
      formData.append('file', squareFile);

      const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSubmissionData((prev) => ({
        ...prev,
        proofImage: response.data.url || response.data.path,
      }));
    } catch (error) {
      setMessage('Square image upload failed');
    }
  };

  const handleSubmitTask = async (taskId) => {
    try {
      const task = tasks.find((entry) => entry.id === taskId);
      const proofRequired = Boolean(task?.requiredProof);

      if (proofRequired && !submissionData.proofImage) {
        setMessage('This task requires a proof image before submission');
        return;
      }

      setLoading(true);
      await apiClient.patch(`/tasks/${taskId}/submit-completion`, {
        proofImage: submissionData.proofImage,
        completionNotes: submissionData.completionNotes,
      });

      setMessage('âœ“ Task submitted successfully! Awaiting approval...');
      setSelectedTaskId(null);
      setSubmissionData({ proofImage: '', completionNotes: '' });
      loadAssignedTasks();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`âœ— Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      setLoading(true);
      await apiClient.patch(`/tasks/${taskId}/start`);
      setMessage('✔ Task started! You can now submit completion.');
      loadAssignedTasks();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`✗ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const statusMatch = filterStatus === 'All' || task.status === filterStatus;
    const searchMatch = 
      task.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.horse?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.createdBy?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && (searchTerm === '' || searchMatch);
  });

  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((task) => task.status === 'Pending').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'In Progress').length;
  const reviewTasks = tasks.filter((task) => task.status === 'Pending Review').length;
  const approvedTasks = tasks.filter((task) => task.status === 'Approved').length;
  const proofRequiredTasks = tasks.filter((task) => task.requiredProof).length;
  const completionRate = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;
  const progressMatrixTitle = totalTasks === 0
    ? t('No Active Queue')
    : reviewTasks > 0
      ? `${reviewTasks} ${t('Awaiting Review')}`
      : inProgressTasks > 0
        ? `${inProgressTasks} ${t('Live Tasks')}`
        : `${approvedTasks} ${t('Approved')}`;
  const progressMatrixSub = totalTasks === 0
    ? t('No tasks in your assigned queue yet')
    : `${pendingTasks} ${t('Pending')} Â· ${inProgressTasks} ${t('In Progress')} Â· ${reviewTasks} ${t('Pending Review')}`;
  const statusPills = [
    { key: 'All', label: t('All Tasks'), count: totalTasks },
    { key: 'Pending', label: t('Pending'), count: pendingTasks },
    { key: 'In Progress', label: t('In Progress'), count: inProgressTasks },
    { key: 'Pending Review', label: t('Pending Review'), count: reviewTasks },
    { key: 'Approved', label: t('Approved'), count: approvedTasks },
  ];

  const getStatusBadge = (status) => {
    const cfg = {
      'Pending': 'border-blue-500/30 text-blue-400 bg-blue-500/10',
      'In Progress': 'border-warning/30 text-warning bg-warning/10',
      'Pending Review': 'border-destructive/30 text-destructive bg-destructive/10',
      'Approved': 'border-success/30 text-success bg-success/10',
      'Rejected': 'border-muted-foreground/30 text-muted-foreground bg-muted',
    };
    const cls = cfg[status] || 'border-border text-muted-foreground bg-muted';
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
        {t(status)}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const cfg = {
      'High': 'border-destructive/30 text-destructive bg-destructive/10',
      'Urgent': 'border-destructive/30 text-destructive bg-destructive/10',
      'Medium': 'border-warning/30 text-warning bg-warning/10',
      'Low': 'border-success/30 text-success bg-success/10',
    };
    const cls = cfg[priority] || 'border-border text-muted-foreground bg-muted';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
        {priority}
      </span>
    );
  };

  const getTaskImageSrc = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    const apiRoot = process.env.REACT_APP_API_URL?.replace('/api', '') || '';
    return `${apiRoot}${imagePath}`;
  };

  const activeSubmissionTask = tasks.find((task) => task.id === selectedTaskId) || null;

  return (
    <div className="my-assigned-page space-y-6">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">My Assigned <span className="text-primary">{t("Tasks")}</span></h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            {t('Personal Task Console')} &nbsp;Â·&nbsp; {t('Complete and submit your assigned tasks with evidence')}
          </p>
        </div>
        <div className="bg-surface-container-highest rounded-xl px-5 py-4 edge-glow flex items-center gap-4">
          <div className="w-[72px] h-[72px] rounded-full border-2 border-primary p-2.5 flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-full bg-primary/8 flex items-center justify-center p-2">
              <span className="text-lg font-bold text-primary leading-none">{completionRate}%</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t('Progress Matrix')}</p>
            <p className="text-lg font-bold text-foreground">{progressMatrixTitle}</p>
            <p className="text-xs text-muted-foreground mt-1">{progressMatrixSub}</p>
          </div>
        </div>
      </div>

      {/* â”€â”€ KPI Cards â”€â”€ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('Assigned'), value: totalTasks, sub: t('Tasks currently visible in your queue') },
          { label: t('In Progress'), value: inProgressTasks, sub: t('Tasks you have already started') },
          { label: t('Pending Review'), value: reviewTasks, sub: t('Completions currently awaiting approval') },
          { label: t('Approved'), value: approvedTasks, sub: t('Tasks fully cleared and completed') },
        ].map(k => (
          <div key={k.label} className="bg-surface-container-highest rounded-xl p-4 sm:p-5 edge-glow">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">{k.label}</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground mt-2 mono-data">{k.value}</p>
            <p className="text-xs mt-1 text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* â”€â”€ Message â”€â”€ */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.includes('âœ—') ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>
          {message}
        </div>
      )}

      {/* â”€â”€ Filters + Search â”€â”€ */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar scroll-smooth">
          {statusPills.map(pill => (
            <button
              key={pill.key}
              onClick={() => setFilterStatus(pill.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 flex items-center gap-2 ${
                filterStatus === pill.key
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent hover:bg-surface-container-highest'
              }`}
            >
              {pill.label}
              <span className="text-[10px] font-bold mono-data">{pill.count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={t('Search tasks by name, type, horse...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full pl-10 pr-8 rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" type="button"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>

      {/* â”€â”€ Main Grid â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Task Cards */}
        <div className="space-y-4">
          {loading && filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('Loading your tasks...')}</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">âœ“ {t('No tasks assigned to you yet')}</div>
          ) : (
            filteredTasks.map((task) => {
              const evidenceSrc = task.proofImage ? getTaskImageSrc(task.proofImage) : '';

              return (
                <div key={task.id} className="bg-surface-container-high rounded-xl overflow-hidden edge-glow border border-primary/10 hover:border-primary/30 transition-all duration-300 group">
                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-[132px] sm:min-w-[132px]">
                        <div
                          className="w-full aspect-square rounded-xl overflow-hidden border border-border bg-surface-container-highest"
                          onClick={(e) => {
                            if (!evidenceSrc) return;
                            e.stopPropagation();
                            setFullscreenImage(evidenceSrc);
                          }}
                        >
                          {evidenceSrc ? (
                            <img src={evidenceSrc} alt="Task evidence" className="w-full h-full object-cover cursor-pointer" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <Camera className="w-5 h-5 text-primary/60" />
                              <span className="text-[10px] font-semibold uppercase tracking-wider">{t('No Evidence')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(task.status)}
                            {getPriorityBadge(task.priority)}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono opacity-60 shrink-0">ID: {String(task.id).slice(0, 8).toUpperCase()}</span>
                        </div>

                        <h3 className="text-lg font-bold text-foreground leading-tight">{task.name}</h3>
                        <p className="text-sm text-primary/90 mt-1 font-medium">{task.type}</p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary/60" /> {new Date(task.scheduledTime).toLocaleString()}</span>
                          {task.horse?.name && <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-primary/60" /> {task.horse.name}</span>}
                          {task.createdBy?.fullName && <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary/60" /> {task.createdBy.fullName}</span>}
                        </div>

                        {task.description && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{task.description}</p>}

                        {task.completionNotes && (
                          <div className="mt-3 p-3 rounded-lg bg-surface-container-highest">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("Completion Notes")}</p>
                            <p className="text-sm text-foreground mt-1">{task.completionNotes}</p>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="mt-4 flex gap-2 flex-wrap">
                          {task.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleStartTask(task.id)}
                              disabled={loading}
                              className="h-9 px-5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/25 transition-colors disabled:opacity-50"
                            >
                              ▶ Start Task
                            </button>
                          )}
                          {task.status === 'In Progress' && (
                            <button
                              type="button"
                              onClick={() => setSelectedTaskId(task.id)}
                              disabled={loading}
                              className="h-9 px-5 rounded-lg bg-success/15 border border-success/30 text-success text-sm font-semibold hover:bg-success/25 transition-colors disabled:opacity-50"
                            >
                              ✔ Submit Completion
                            </button>
                          )}
                          {(task.status === 'Pending Review' || task.status === 'Approved') && (
                            <span className="h-9 px-5 rounded-lg bg-muted/50 border border-border text-muted-foreground text-sm font-medium flex items-center">
                              {task.status === 'Approved' ? '✔ Approved' : '⏳ Awaiting Review'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-4">
          {/* Shift Focus */}
          <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">{t('Shift Focus')}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t('Quick readout for your current task board')}</p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{t('Approved')}</span>
                  <span className="text-sm font-bold text-foreground">{completionRate}%</span>
                </div>
                <div className="w-full h-1 rounded-full bg-surface-container-high mt-1">
                  <div className="h-1 rounded-full bg-primary" style={{ width: `${completionRate}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{t('Awaiting Review')}</span>
                  <span className="text-sm font-bold text-foreground">{reviewTasks}</span>
                </div>
                <div className="w-full h-1 rounded-full bg-surface-container-high mt-1">
                  <div className="h-1 rounded-full bg-primary" style={{ width: `${totalTasks ? Math.max(8, Math.round((reviewTasks / totalTasks) * 100)) : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Execution Notes */}
          <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">{t('Execution Notes')}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {proofRequiredTasks > 0
                ? `${proofRequiredTasks} ${t('task(s) currently require photo evidence before approval')}`
                : t('Photo evidence is optional unless the task specifically requests it')}
            </p>
            <div className="space-y-3">
              {[
                { num: '01', label: `${pendingTasks} ${t('Ready to Start')}`, sub: t('Tasks sitting in your pending queue') },
                { num: '02', label: `${inProgressTasks} ${t('Live Tasks')}`, sub: t('Currently active tasks under execution') },
                { num: '03', label: t('Upload Proof'), sub: t('Completion photos and notes keep the approval flow moving') },
              ].map(item => (
                <div key={item.num} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">{item.num}</div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â• SUBMISSION MODAL â•â•â•â•â•â•â•â•â•â•â• */}
      {selectedTaskId && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTaskId(null)}>
          <div className="bg-surface-container-highest border border-border rounded-xl p-7 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-foreground">{t('Submit Task Completion')}</h3>
              <button className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSelectedTaskId(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {activeSubmissionTask?.requiredProof ? (
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Upload Evidence Photo *
                  </label>
                  <input type="file" id="proof-upload" accept="image/*" onChange={handleImageUpload} disabled={loading} className="hidden" />
                  <label htmlFor="proof-upload" className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-surface-container-high">
                    <Camera className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{submissionData.proofImage ? 'Change Photo' : 'Click to Upload'}</p>
                      <p className="text-xs text-muted-foreground">{t("Required for this task - JPG, PNG")}</p>
                    </div>
                  </label>
                  {submissionData.proofImage && (
                    <div className="mt-3 flex items-center gap-3">
                      <img
                        src={getTaskImageSrc(submissionData.proofImage)}
                        alt="Preview"
                        className="max-w-[100px] max-h-[80px] rounded-lg border border-border object-cover cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFullscreenImage(getTaskImageSrc(submissionData.proofImage));
                        }}
                      />
                      <span className="text-xs text-success font-medium">{t("Photo uploaded")}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-surface-container-high px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{t("Photo evidence is not required for this task")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("You can submit completion notes directly.")}</p>
                </div>
              )}
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Completion Notes (Optional)")}</label>
                <textarea value={submissionData.completionNotes} onChange={(e) => setSubmissionData((prev) => ({ ...prev, completionNotes: e.target.value }))} placeholder="Any notes about task completion..." rows="4" disabled={loading} className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSubmitTask(selectedTaskId)}
                  disabled={loading || (activeSubmissionTask?.requiredProof && !submissionData.proofImage)}
                  className="btn-save-primary flex-1"
                >{loading ? 'Submitting...' : 'Submit Completion'}</button>
                <button type="button" onClick={() => setSelectedTaskId(null)} disabled={loading} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">{t("Cancel")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Fullscreen Image â”€â”€ */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black/88 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              onClick={() => setFullscreenImage(null)}
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={fullscreenImage}
              alt="Task evidence preview"
              className="w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAssignedTasksPage;



