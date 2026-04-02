import React, { useState, useEffect, useCallback } from 'react';
import roundCheckService from '../services/roundCheckService';
import { useI18n } from '../context/I18nContext';
import { ClipboardCheck, Sunrise, Sun, Moon, Info } from 'lucide-react';
import DatePicker from '../components/shared/DatePicker';
import { useAuth } from '../context/AuthContext';
import usePermissions from '../hooks/usePermissions';
import { Navigate } from 'react-router-dom';

const RoundCheckPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const canUpdateOwnRoundChecks = Boolean(user?.taskCapabilities?.canUpdateOwnRoundChecks);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [roundCheck, setRoundCheck] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [morningCompleted, setMorningCompleted] = useState(false);
  const [afternoonCompleted, setAfternoonCompleted] = useState(false);
  const [eveningCompleted, setEveningCompleted] = useState(false);

  const loadRoundCheck = useCallback(async () => {
    try {
      setLoading(true);
      const data = await roundCheckService.getRoundCheck(selectedDate);
      setRoundCheck(data.roundCheck);
      if (data.roundCheck) {
        setMorningCompleted(data.roundCheck.morningCompleted);
        setAfternoonCompleted(data.roundCheck.afternoonCompleted);
        setEveningCompleted(data.roundCheck.eveningCompleted);
      } else {
        setMorningCompleted(false); setAfternoonCompleted(false); setEveningCompleted(false);
      }
    } catch (error) {
      console.error('Error loading round check:', error);
      setMessage(`✗ Error loading data: ${error.message}`);
    } finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { loadRoundCheck(); }, [loadRoundCheck]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!morningCompleted && !afternoonCompleted && !eveningCompleted) {
      setMessage('✗ Please mark at least one round as completed'); return;
    }
    try {
      setLoading(true);
      await roundCheckService.updateRoundCheck(selectedDate, morningCompleted, afternoonCompleted, eveningCompleted);
      setMessage('✓ Round status updated successfully!');
      await loadRoundCheck();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) { setMessage(`✗ Error: ${error.message}`); }
    finally { setLoading(false); }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const completedCount = [morningCompleted, afternoonCompleted, eveningCompleted].filter(Boolean).length;

  const rounds = [
    { id: 'morning', label: 'Morning Round', time: 'Early Morning', icon: Sunrise, checked: morningCompleted, onChange: setMorningCompleted },
    { id: 'afternoon', label: 'Afternoon Round', time: 'Mid Day', icon: Sun, checked: afternoonCompleted, onChange: setAfternoonCompleted },
    { id: 'evening', label: 'Evening Round', time: 'Late Evening', icon: Moon, checked: eveningCompleted, onChange: setEveningCompleted },
  ];

  if (!p.viewInspections || !canUpdateOwnRoundChecks) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            <ClipboardCheck className="w-7 h-7 inline-block mr-2 text-primary" />
            {t('My Daily')} <span className="text-primary">{t('Rounds')}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Mark which rounds you have completed today')}</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium border ${message.includes('✗') ? 'bg-destructive/15 text-destructive border-destructive/30' : 'bg-success/15 text-success border-success/30'}`}>
          {message}
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Completed')}</span>
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center"><ClipboardCheck className="w-4 h-4 text-success" /></div>
          </div>
          <p className="text-3xl font-bold text-success">{completedCount} <span className="text-lg text-muted-foreground">/ 3</span></p>
          <div className="mt-2 h-1.5 rounded-full bg-surface-container-high overflow-hidden"><div className="h-full rounded-full bg-success transition-all" style={{ width: `${(completedCount / 3) * 100}%` }} /></div>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Selected Date')}</span>
          </div>
          <div className="flex items-center gap-4">
            <DatePicker value={selectedDate} onChange={(val) => setSelectedDate(val)} disabled={loading} />
            <p className="text-sm text-muted-foreground">{formatDate(selectedDate)}</p>
          </div>
        </div>
      </div>

      {/* Round Cards */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {rounds.map(round => {
            const Icon = round.icon;
            return (
              <label key={round.id} htmlFor={round.id} className={`bg-surface-container-highest rounded-xl p-6 edge-glow cursor-pointer transition-all border-2 ${round.checked ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:border-primary/20'}`}>
                <div className="flex items-center gap-4">
                  <input type="checkbox" id={round.id} checked={round.checked} onChange={(e) => round.onChange(e.target.checked)} disabled={loading} className="w-5 h-5 rounded accent-primary" />
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${round.checked ? 'bg-primary/20' : 'bg-surface-container-high'}`}>
                    <Icon className={`w-6 h-6 ${round.checked ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <span className={`font-semibold block ${round.checked ? 'text-primary' : 'text-foreground'}`}>{round.label}</span>
                    <span className="text-xs text-muted-foreground">{round.time}</span>
                  </div>
                </div>
                {round.checked && <span className="inline-flex items-center mt-3 ml-9 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-success/20 text-success border border-success/30">✓ Completed</span>}
              </label>
            );
          })}
        </div>

        {roundCheck && (
          <p className="text-xs text-muted-foreground mb-4">{t('Last updated')}: {new Date(roundCheck.updatedAt).toLocaleString('en-GB')}</p>
        )}

        <button type="submit" disabled={loading} className="btn-save-primary">
          {loading ? t('Updating...') : t('✓ Save Round Status')}
        </button>
      </form>

      {/* Info Box */}
      <div className="bg-surface-container-highest rounded-xl p-5 edge-glow border-l-4 border-l-primary/50">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-foreground mb-2">{t('Instructions')}</h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>{t('Check the boxes for rounds you have completed')}</li>
              <li>{t('Mark at least one round')}</li>
              <li>{t('Click "Save Round Status" to submit')}</li>
              <li>{t('You can update your status throughout the day')}</li>
              <li>{t('Your supervisor will see this information on the tracking dashboard')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoundCheckPage;
