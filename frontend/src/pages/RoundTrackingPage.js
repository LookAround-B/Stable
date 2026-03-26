import React, { useState, useEffect, useCallback } from 'react';
import roundCheckService from '../services/roundCheckService';
import { useI18n } from '../context/I18nContext';
import { Download, Users, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';

const RoundTrackingPage = () => {
  const { t } = useI18n();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [roundChecks, setRoundChecks] = useState([]);
  const [missingJamedars, setMissingJamedars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadRoundTracking = useCallback(async () => {
    try {
      setLoading(true);
      const data = await roundCheckService.getRoundCheck(selectedDate);
      setRoundChecks(data.roundChecks || []);
      setMissingJamedars(data.missingJamedars || []);
    } catch (error) {
      console.error('Error loading round tracking:', error);
      setMessage(`✗ Error loading data: ${error.message}`);
    } finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { loadRoundTracking(); }, [loadRoundTracking]);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const getCompletionStatus = (morning, afternoon, evening) => {
    const completed = [morning, afternoon, evening].filter(Boolean).length;
    return { count: completed, total: 3, percentage: Math.round((completed / 3) * 100) };
  };

  const totalJamedars = roundChecks.length + missingJamedars.length;
  const allCompleted = roundChecks.filter(r => r.morningCompleted && r.afternoonCompleted && r.eveningCompleted).length;
  const partiallyCompleted = roundChecks.filter(r =>
    (r.morningCompleted || r.afternoonCompleted || r.eveningCompleted) &&
    !(r.morningCompleted && r.afternoonCompleted && r.eveningCompleted)
  ).length;

  const handleDownloadExcel = () => {
    const allRows = [
      ...roundChecks.map(rc => {
        const status = getCompletionStatus(rc.morningCompleted, rc.afternoonCompleted, rc.eveningCompleted);
        return { 'Jamedar': rc.jamedar?.fullName || '', 'Morning': rc.morningCompleted ? 'Done' : 'Pending', 'Afternoon': rc.afternoonCompleted ? 'Done' : 'Pending', 'Evening': rc.eveningCompleted ? 'Done' : 'Pending', 'Completion %': `${status.percentage}%`, 'Last Updated': rc.updatedAt ? new Date(rc.updatedAt).toLocaleTimeString('en-GB') : '', 'Status': status.percentage === 100 ? 'Complete' : status.percentage === 0 ? 'Not Started' : 'In Progress' };
      }),
      ...missingJamedars.map(j => ({ 'Jamedar': j.fullName || '', 'Morning': '-', 'Afternoon': '-', 'Evening': '-', 'Completion %': '0%', 'Last Updated': '', 'Status': 'No Update' })),
    ];
    if (!allRows.length) { alert('No data to download'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(allRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Round Tracking');
    XLSX.writeFile(wb, `RoundTracking_${selectedDate}.xlsx`);
  };

  const ShiftBadge = ({ done }) => done
    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-success/30 text-success bg-success/10">✓ Done</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-muted-foreground/20 text-muted-foreground bg-muted">⊘ Pending</span>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Jamedar <span className="text-primary">Round Tracking</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Monitor all Jamedars\' daily round completions')}</p>
        </div>
        <button onClick={handleDownloadExcel} className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2"><Download className="w-4 h-4" /> Excel</button>
      </div>

      {message && <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.includes('✓') ? 'bg-success/15 text-success border border-success/30' : 'bg-destructive/15 text-destructive border border-destructive/30'}`}>{message}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: t('Total Jamedars'), value: totalJamedars, color: 'text-primary' },
          { icon: CheckCircle, label: t('All Rounds Done'), value: allCompleted, color: 'text-success' },
          { icon: Clock, label: t('Partial Rounds'), value: partiallyCompleted, color: 'text-warning' },
          { icon: AlertTriangle, label: t('No Updates'), value: missingJamedars.length, color: 'text-destructive' },
        ].map(k => (
          <div key={k.label} className="bg-surface-container-highest rounded-xl p-4 sm:p-5 edge-glow">
            <div className="flex items-center gap-2 mb-2">
              <k.icon className={`w-4 h-4 ${k.color}`} />
              <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">{k.label}</p>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-foreground mono-data">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Date Selector */}
      <div className="flex items-end gap-4">
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Select Date</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} disabled={loading} className="h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
        </div>
        <p className="text-sm text-muted-foreground pb-2">{formatDate(selectedDate)}</p>
      </div>

      {loading && <div className="text-center py-12 text-muted-foreground">⏳ Loading round tracking data...</div>}

      {!loading && (
        <>
          {/* Jamedars with Updates */}
          {roundChecks.length > 0 && (
            <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <h3 className="text-sm font-bold text-foreground">Jamedars with Updates ({roundChecks.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Jamedar Name', 'Morning', 'Afternoon', 'Evening', 'Completion', 'Last Updated'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roundChecks.map((rc) => {
                      const status = getCompletionStatus(rc.morningCompleted, rc.afternoonCompleted, rc.eveningCompleted);
                      const barColor = status.percentage === 100 ? 'bg-success' : status.percentage === 0 ? 'bg-destructive' : 'bg-warning';
                      return (
                        <tr key={rc.id} className="border-b border-border/50 hover:bg-surface-container-high transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{rc.jamedar.fullName}</p>
                            <p className="text-xs text-muted-foreground">{rc.jamedar.email}</p>
                          </td>
                          <td className="px-4 py-3"><ShiftBadge done={rc.morningCompleted} /></td>
                          <td className="px-4 py-3"><ShiftBadge done={rc.afternoonCompleted} /></td>
                          <td className="px-4 py-3"><ShiftBadge done={rc.eveningCompleted} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${status.percentage}%` }} />
                              </div>
                              <span className="text-xs font-bold text-foreground mono-data">{status.count}/{status.total}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground mono-data">
                            {new Date(rc.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Missing Jamedars */}
          {missingJamedars.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-bold text-foreground">⚠️ No Updates ({missingJamedars.length})</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {missingJamedars.map((jamedar) => (
                  <div key={jamedar.id} className="flex items-center gap-3 p-4 rounded-xl bg-surface-container-highest border border-warning/20 edge-glow">
                    <div className="w-9 h-9 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center text-warning text-sm font-bold shrink-0">!</div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{jamedar.fullName}</p>
                      <p className="text-xs text-muted-foreground">{jamedar.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {roundChecks.length === 0 && missingJamedars.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No Jamedars found in the system</div>
          )}
        </>
      )}
    </div>
  );
};

export default RoundTrackingPage;
