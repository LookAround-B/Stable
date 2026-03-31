import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { CardListSkeleton } from '../components/Skeleton'
import apiClient from '../services/apiClient'
import { useI18n } from '../context/I18nContext'
import usePermissions from '../hooks/usePermissions'
import { Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar, Users, Clock, MapPin, Plus, X } from 'lucide-react'
import DatePicker from '../components/shared/DatePicker';
import TimePicker from '../components/shared/TimePicker';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const MeetingPage = () => {
  const { user } = useAuth()
  const { t } = useI18n()
  const p = usePermissions()
  const [meetings, setMeetings] = useState([])
  const [employees, setEmployees] = useState([])
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [filterType, setFilterType] = useState('upcoming')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showMOMForm, setShowMOMForm] = useState(false)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const [formData, setFormData] = useState({
    title: '', description: '', meetingDate: '', meetingTime: '', location: '', participants: [],
  })
  const [momData, setMOMData] = useState({ pointsDiscussed: [], memberInputs: [], decisions: [] })
  const [momInputs, setMOMInputs] = useState({ newPoint: '', newInput: '', newDecision: '' })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchMeetings() }, [filterType])
  useEffect(() => { fetchEmployees() }, [])
  useEffect(() => {
    const interval = setInterval(fetchMeetings, 60000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType])

  const fetchMeetings = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/meetings', { params: { filterType: 'all' } })
      if (response.data.success) setMeetings(response.data.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const fetchEmployees = async () => {
    try {
      const r = await apiClient.get('/employees/all')
      if (r.data.success) setEmployees(r.data.data)
    } catch (e) { console.error(e) }
  }

  const handleDateClick = (date) => {
    setSelectedDate(date)
    if (canCreateMeeting) {
      setFormData(prev => ({ ...prev, meetingDate: date.toISOString().split('T')[0] }))
    }
  }

  const handleCreateMeeting = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const r = await apiClient.post('/meetings', {
        title: formData.title,
        description: formData.description,
        meetingDate: formData.meetingDate + 'T12:00:00',
        meetingTime: formData.meetingTime,
        location: formData.location,
        participantIds: formData.participants,
      })
      if (r.data.success) {
        setFormData({ title: '', description: '', meetingDate: '', meetingTime: '', location: '', participants: [] })
        setShowCreateForm(false)
        fetchMeetings()
      }
    } catch (e) {
      alert('Failed to create meeting: ' + (e.response?.data?.error || e.message))
    } finally { setLoading(false) }
  }

  const handleSelectMeeting = (meeting) => {
    setSelectedMeeting(meeting)
    setShowDetailPanel(true)
    setShowMOMForm(false)
    if (meeting.mom) {
      setMOMData({
        pointsDiscussed: JSON.parse(meeting.mom.pointsDiscussed || '[]'),
        memberInputs: JSON.parse(meeting.mom.memberInputs || '[]'),
        decisions: JSON.parse(meeting.mom.decisions || '[]'),
      })
    } else {
      setMOMData({ pointsDiscussed: [], memberInputs: [], decisions: [] })
    }
  }

  const handleAddMOMPoint = () => {
    if (momInputs.newPoint.trim()) {
      setMOMData(prev => ({ ...prev, pointsDiscussed: [...prev.pointsDiscussed, momInputs.newPoint] }))
      setMOMInputs(prev => ({ ...prev, newPoint: '' }))
    }
  }
  const handleAddMOMMemberInput = () => {
    if (momInputs.newInput.trim()) {
      setMOMData(prev => ({ ...prev, memberInputs: [...prev.memberInputs, momInputs.newInput] }))
      setMOMInputs(prev => ({ ...prev, newInput: '' }))
    }
  }
  const handleAddMOMDecision = () => {
    if (momInputs.newDecision.trim()) {
      setMOMData(prev => ({ ...prev, decisions: [...prev.decisions, momInputs.newDecision] }))
      setMOMInputs(prev => ({ ...prev, newDecision: '' }))
    }
  }
  const handleRemoveMOMItem = (section, index) =>
    setMOMData(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }))

  const handleSaveMOM = async () => {
    if (!selectedMeeting) return
    try {
      setLoading(true)
      const r = await apiClient.patch(`/meetings/${selectedMeeting.id}/mom`, momData)
      if (r.data.success) { setSelectedMeeting(r.data.data); fetchMeetings() }
    } catch (e) { alert('Failed to save MOM') } finally { setLoading(false) }
  }

  const handleGenerateGmail = () => {
    if (!selectedMeeting) return
    const lines = [
      `Meeting: ${selectedMeeting.title}`,
      `Date: ${new Date(selectedMeeting.meetingDate).toLocaleDateString('en-IN')}`,
      `Time: ${selectedMeeting.meetingTime || 'N/A'}`,
      `Location: ${selectedMeeting.location || 'N/A'}`,
      '',
      'Members:',
      ...selectedMeeting.participants.map(p => `- ${p.employee.fullName} (${p.employee.designation})`),
      '',
      'Points Discussed:',
      ...momData.pointsDiscussed.map(p => `- ${p}`),
      '',
      'Member Inputs:',
      ...momData.memberInputs.map(i => `- ${i}`),
      '',
      'Decisions:',
      ...momData.decisions.map(d => `- ${d}`),
    ]
    window.open(`https://mail.google.com/mail/u/0/?view=cm&fs=1&body=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }

  const generateCalendar = () => {
    const year = currentMonth.getFullYear(), month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = Array(firstDay).fill(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    return days
  }

  const getMeetingsForDate = (date) => {
    if (!date) return []
    const y = date.getFullYear()
    const mo = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return meetings.filter(m => m.meetingDate.split('T')[0] === `${y}-${mo}-${d}`)
  }

  const getFilteredMeetings = () => {
    const now = new Date()
    return meetings.filter(m => {
      const dt = new Date(m.meetingDate)
      const [h, min] = (m.meetingTime || '00:00').split(':')
      dt.setHours(parseInt(h), parseInt(min), 0, 0)
      if (filterType === 'upcoming') return dt >= now
      if (filterType === 'past') return dt < now
      return true
    })
  }

  const isMeetingPast = (meeting) => {
    const dt = new Date(meeting.meetingDate)
    const [h, min] = (meeting.meetingTime || '00:00').split(':')
    dt.setHours(parseInt(h), parseInt(min), 0, 0)
    return dt <= new Date()
  }

  const today = new Date()
  const calendarDays = generateCalendar()
  const filteredMeetings = getFilteredMeetings()
  const parentRoles = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager']
  const canCreateMeeting = user && parentRoles.includes(user.designation)
  const selectedDateMeetings = selectedDate ? getMeetingsForDate(selectedDate) : []
  const scheduledCount = meetings.filter(meeting => meeting.status?.toLowerCase() === 'scheduled').length
  const completedCount = meetings.filter(meeting => meeting.status?.toLowerCase() === 'completed').length
  const cancelledCount = meetings.filter(meeting => meeting.status?.toLowerCase() === 'cancelled').length
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const getStatusBadge = (status) => {
    const cfg = {
      scheduled: 'border-primary/30 text-primary bg-primary/10',
      completed: 'border-success/30 text-success bg-success/10',
      cancelled: 'border-destructive/30 text-destructive bg-destructive/10',
    }
    const cls = cfg[status?.toLowerCase()] || 'border-border text-muted-foreground bg-muted'
    return (
      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
        {status}
      </span>
    )
  }

  if (!p.viewMeetings) return <Navigate to="/dashboard" replace />

  const filters = ['upcoming', 'past', 'all']

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t('Meetings')}</h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            {t('Schedule and track team meetings')} &nbsp;·&nbsp; Coordination Desk
          </p>
        </div>
        <div className="meeting-header-actions flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {canCreateMeeting && (
            <button
              onClick={() => { setFormData(prev => ({ ...prev, meetingDate: new Date().toISOString().split('T')[0] })); setShowCreateForm(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4" /> {t('New Meeting')}
            </button>
          )}
          <div className="meeting-upcoming-queue-card w-full sm:w-auto bg-surface-container-highest rounded-xl p-4 edge-glow flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">{scheduledCount}</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Upcoming</p>
              <p className="text-lg font-bold text-foreground">{t('Meeting Queue')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Scheduled', value: scheduledCount, sub: t('Meetings currently planned'), icon: Calendar },
          { label: 'Completed', value: completedCount, sub: t('Meetings with closed outcomes'), icon: Clock },
          { label: 'Cancelled', value: cancelledCount, sub: t('Meetings removed from queue'), icon: X },
          { label: 'Visible', value: filteredMeetings.length, sub: t('Meetings under current filter'), icon: Users },
        ].map(k => (
          <div key={k.label} className="bg-surface-container-highest rounded-xl p-4 sm:p-5 edge-glow relative overflow-hidden">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2">
              <k.icon className="w-3.5 h-3.5 text-primary" /> {k.label}
            </p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground mt-2 mono-data">{k.value}</p>
            <p className="text-xs mt-1 text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              filterType === f
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Calendar + Meeting Cards */}
        <div className="space-y-4">
          {/* Calendar */}
          <div className="bg-surface-container-highest rounded-xl p-4 edge-glow max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="orbit-heading-ignore text-lg font-bold text-foreground">{monthName}</h2>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-px">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[10px] uppercase tracking-widest text-muted-foreground font-semibold py-1.5">{d}</div>
              ))}
              {calendarDays.map((date, idx) => {
                if (!date) return <div key={idx} className="aspect-square" />
                const dayMeetings = getMeetingsForDate(date)
                const hasMeeting = dayMeetings.length > 0
                const isToday = date.toDateString() === today.toDateString()
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()
                return (
                  <div
                    key={idx}
                    onClick={() => handleDateClick(date)}
                    className={`aspect-square flex flex-col items-center justify-center relative rounded-lg text-xs transition-all cursor-pointer group ${
                      isToday ? 'bg-primary text-primary-foreground font-bold' :
                      isSelected ? 'bg-primary/15 text-primary border border-primary/30' :
                      hasMeeting ? 'bg-primary/10 text-primary hover:bg-primary/20' :
                      'text-muted-foreground hover:bg-surface-container-high hover:text-foreground'
                    }`}
                  >
                    {date.getDate()}
                    {hasMeeting && !isToday && (
                      <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                    {!hasMeeting && !isToday && canCreateMeeting && (
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-2.5 h-2.5 text-primary absolute top-0.5 right-0.5" />
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 mt-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Scheduled</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-success" /> Completed</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /> Cancelled</span>
              {canCreateMeeting && <span className="flex items-center gap-1.5 text-xs text-primary italic ml-auto">{t('Click any day to schedule')}</span>}
            </div>
          </div>

          {/* Meeting Cards */}
          {loading ? (
            <div className="p-4"><CardListSkeleton count={3} /></div>
          ) : filteredMeetings.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">{t('No meetings found')}</p>
          ) : filteredMeetings.map(m => (
            <div key={m.id} onClick={() => handleSelectMeeting(m)} className="bg-surface-container-high rounded-xl p-5 edge-glow border border-primary/10 hover:border-primary/30 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                {getStatusBadge(m.status)}
                <span className="text-xs text-muted-foreground italic">ID: {m.id?.slice(0, 8).toUpperCase()}</span>
              </div>
              <h3 className="text-lg font-bold text-foreground">{m.title}</h3>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(m.meetingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {m.meetingTime && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {m.meetingTime}</span>}
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {m.participants?.length || 0} attendees</span>
              </div>
              {m.description && <p className="text-sm text-muted-foreground mt-3">{m.description}</p>}
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">{t('Quick Stats')}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Scheduled</span>
                <span className="text-sm font-bold text-primary">{scheduledCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Completed</span>
                <span className="text-sm font-bold text-success">{completedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Cancelled</span>
                <span className="text-sm font-bold text-destructive">{cancelledCount}</span>
              </div>
            </div>
          </div>

          {/* Selected date meetings */}
          {selectedDate && selectedDateMeetings.length > 0 && (
            <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex justify-between items-center">
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">{selectedDateMeetings.length}</span>
              </div>
              {selectedDateMeetings.map(m => (
                <div key={m.id} onClick={() => handleSelectMeeting(m)} className={`px-5 py-3 border-b border-border/50 cursor-pointer transition-colors hover:bg-surface-container-high/50 ${selectedMeeting?.id === m.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="font-semibold text-sm text-foreground">{m.title}</span>
                    {getStatusBadge(m.status)}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                    {m.meetingTime && <span>{m.meetingTime}</span>}
                    <span>{m.participants?.length || 0} attendees</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Common Venues */}
          <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">{t('Common Venues')}</h3>
            </div>
            <div className="space-y-2 text-sm">
              {['Main Office', 'Arena Conference', 'Stable Block A'].map((venue, i) => (
                <div key={venue} className="flex items-center justify-between text-muted-foreground">
                  <span>{venue}</span>
                  <span className="text-foreground font-medium">{[4, 2, 1][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ DETAIL DRAWER ═══════════ */}
      {showDetailPanel && selectedMeeting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowDetailPanel(false)}>
          <div className="w-full max-w-[520px] h-full bg-surface-container-highest overflow-y-auto border-l border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between px-6 py-5 border-b border-border gap-3">
              <div className="flex-1">
                <div className="mb-2">{getStatusBadge(selectedMeeting.status)}</div>
                <h2 className="text-xl font-bold text-foreground leading-tight">{selectedMeeting.title}</h2>
              </div>
              <button onClick={() => setShowDetailPanel(false)} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3">
              {[
                ['Date', new Date(selectedMeeting.meetingDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
                ['Time', selectedMeeting.meetingTime || 'Not specified'],
                ['Location', selectedMeeting.location || 'Not specified'],
                ['Description', selectedMeeting.description || 'No description'],
                ['Created by', selectedMeeting.createdBy?.fullName || '-'],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-3 text-sm">
                  <span className="min-w-[90px] text-muted-foreground font-medium shrink-0">{label}</span>
                  <span className="text-foreground">{val}</span>
                </div>
              ))}
            </div>

            <div className="px-6 pb-5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                Participants ({selectedMeeting.participants.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedMeeting.participants.map(p => (
                  <div key={p.id} className="flex items-center gap-2 bg-surface-container-high border border-border rounded-full py-1 pl-1 pr-3">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground overflow-hidden shrink-0">
                      {p.employee.profileImage
                        ? <img src={p.employee.profileImage} alt="" className="w-full h-full object-cover" />
                        : p.employee.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground leading-tight">{p.employee.fullName}</div>
                      <div className="text-[10px] text-muted-foreground">{p.employee.designation}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(user.id === selectedMeeting.createdBy?.id || parentRoles.includes(user.designation)) && (
              <div className="px-6 pb-6 pt-5 border-t border-border">
                {isMeetingPast(selectedMeeting) ? (
                  <>
                    <button
                      onClick={() => setShowMOMForm(!showMOMForm)}
                      className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${showMOMForm ? 'border border-border text-foreground hover:bg-surface-container-high' : 'bg-primary text-primary-foreground hover:brightness-110'}`}
                    >
                      {showMOMForm ? '✕ Hide MOM' : 'Add / Edit Minutes of Meeting'}
                    </button>
                    {showMOMForm && (
                      <div className="mt-4 space-y-5">
                        {[
                          { label: 'Points Discussed', key: 'pointsDiscussed', inputKey: 'newPoint', placeholder: 'Add a point...', handler: handleAddMOMPoint },
                          { label: 'Member Inputs', key: 'memberInputs', inputKey: 'newInput', placeholder: 'Add input from a member...', handler: handleAddMOMMemberInput },
                          { label: 'Decisions Made', key: 'decisions', inputKey: 'newDecision', placeholder: 'Add a decision...', handler: handleAddMOMDecision },
                        ].map(({ label, key, inputKey, placeholder, handler }) => (
                          <div key={key}>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{label}</p>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text" placeholder={placeholder} value={momInputs[inputKey]}
                                onChange={e => setMOMInputs(prev => ({ ...prev, [inputKey]: e.target.value }))}
                                onKeyPress={e => e.key === 'Enter' && handler()}
                                className="flex-1 h-9 px-3 rounded-lg bg-surface-container-high border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none"
                              />
                              <button onClick={handler} className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold hover:brightness-110 transition-all">+</button>
                            </div>
                            {momData[key].length > 0 && (
                              <div className="space-y-1.5">
                                {momData[key].map((item, i) => (
                                  <div key={i} className="flex items-center gap-2 bg-surface-container-high border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground">
                                    <span className="flex-1">{item}</span>
                                    <button onClick={() => handleRemoveMOMItem(key, i)} className="text-muted-foreground hover:text-destructive transition-colors">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="flex gap-3">
                          <button onClick={handleSaveMOM} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-success text-success-foreground text-sm font-semibold hover:brightness-110 transition-all">
                            {loading ? 'Saving...' : 'Save MOM'}
                          </button>
                          {(momData.pointsDiscussed.length > 0 || momData.memberInputs.length > 0 || momData.decisions.length > 0) && (
                            <button onClick={handleGenerateGmail} className="py-2.5 px-4 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-surface-container-high transition-colors">Send to Gmail</button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/25 text-sm text-warning">
                    MOM available after {new Date(selectedMeeting.meetingDate).toLocaleDateString('en-IN')}{selectedMeeting.meetingTime ? ` at ${selectedMeeting.meetingTime}` : ''}.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ CREATE MODAL ═══════════ */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowCreateForm(false)}>
          <div className="bg-surface-container-highest border border-border rounded-xl p-7 w-full max-w-[560px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-foreground">{t('New Meeting')}</h2>
              <button onClick={() => setShowCreateForm(false)} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Meeting Title *</label>
                <input type="text" required value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., Quarterly Review" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Date *</label>
                  <DatePicker value={formData.meetingDate} onChange={(val) => setFormData(prev => ({ ...prev, meetingDate: val }))} required />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Time</label>
                  <TimePicker value={formData.meetingTime} onChange={(val) => setFormData(prev => ({ ...prev, meetingTime: val }))} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Location</label>
                <input type="text" value={formData.location} onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g., Conference Room A" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Description</label>
                <textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Meeting purpose and agenda" rows={3} className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Participants{formData.participants.length > 0 ? ` (${formData.participants.length} selected)` : ''}</label>
                <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto p-3 bg-surface-container-high rounded-lg border border-border">
                  {employees.map(emp => {
                    const sel = formData.participants.includes(emp.id)
                    return (
                      <div
                        key={emp.id}
                        onClick={() => setFormData(prev => ({ ...prev, participants: sel ? prev.participants.filter(id => id !== emp.id) : [...prev.participants, emp.id] }))}
                        className={`px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all select-none ${sel ? 'bg-primary text-primary-foreground font-bold' : 'bg-surface-container-highest text-muted-foreground hover:text-foreground border border-border'}`}
                      >
                        {emp.fullName}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 h-10 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase">
                  {loading ? 'Creating...' : 'Create Meeting'}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MeetingPage
