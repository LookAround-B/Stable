import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { CardListSkeleton } from '../components/Skeleton'
import apiClient from '../services/apiClient'
import { useI18n } from '../context/I18nContext'
import usePermissions from '../hooks/usePermissions'
import { Navigate } from 'react-router-dom'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const STATUS_COLORS = {
  scheduled: { bg: 'var(--lovable-primary)', light: 'rgba(209,153,255,0.15)', text: 'var(--lovable-primary)' },
  completed: { bg: 'var(--lovable-success)', light: 'rgba(0,230,199,0.14)', text: 'var(--lovable-success)' },
  cancelled: { bg: '#fb7185', light: 'rgba(251,113,133,0.14)', text: '#fb7185' },
}

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
  const parentRoles = ['Director', 'School Administrator', 'Stable Manager']
  const canCreateMeeting = user && parentRoles.includes(user.designation)
  const selectedDateMeetings = selectedDate ? getMeetingsForDate(selectedDate) : []
  const scheduledCount = meetings.filter(meeting => meeting.status?.toLowerCase() === 'scheduled').length
  const completedCount = meetings.filter(meeting => meeting.status?.toLowerCase() === 'completed').length
  const cancelledCount = meetings.filter(meeting => meeting.status?.toLowerCase() === 'cancelled').length
  const panelShellStyle = {
    background: 'var(--lovable-panel)',
    border: '1px solid var(--lovable-line)',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: 'var(--lovable-shadow-soft)',
  }
  const ghostButtonStyle = {
    background: 'var(--lovable-panel-alt)',
    border: '1px solid var(--lovable-line)',
    color: 'var(--lovable-text)',
    cursor: 'pointer',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '0.95rem',
  }
  const primaryButtonStyle = {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, var(--lovable-primary), var(--lovable-primary-dim))',
    color: 'var(--lovable-bg)',
    border: '1px solid rgba(209, 153, 255, 0.3)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.9rem',
    boxShadow: '0 14px 30px rgba(168, 85, 247, 0.22)',
  }
  const mutedCountStyle = {
    fontSize: '0.75rem',
    background: 'var(--lovable-primary-soft)',
    color: 'var(--lovable-primary)',
    padding: '2px 8px',
    borderRadius: '20px',
    fontWeight: 700,
  }

  const statusBadgeStyle = (status) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
    background: STATUS_COLORS[status?.toLowerCase()]?.light || 'var(--lovable-panel-alt)',
    color: STATUS_COLORS[status?.toLowerCase()]?.text || 'var(--lovable-text)',
  })

  if (!p.viewMeetings) return <Navigate to="/" replace />

  return (
    <div className="page-container lovable-page-shell meeting-page">
      <div className="page-header">
        <div>
          <div className="lovable-header-kicker">
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--lg" />
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--sm" />
            <span>{t('Coordination Desk')}</span>
          </div>
          <h1>{t('Meetings')}</h1>
          <p>{t('Schedule and track team meetings')}</p>
        </div>
        <div className="lovable-header-actions">
          {canCreateMeeting && (
            <button
              style={primaryButtonStyle}
              onClick={() => { setFormData(prev => ({ ...prev, meetingDate: new Date().toISOString().split('T')[0] })); setShowCreateForm(true) }}
            >
              + {t('New Meeting')}
            </button>
          )}
          <div className="lovable-command-chip">
            <div className="lovable-command-ring">{scheduledCount}</div>
            <div className="lovable-command-copy">
              <strong>{t('Meeting Queue')}</strong>
              <span>{t('Upcoming Schedule')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lovable-metric-strip">
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Scheduled')}</div>
          <div className="lovable-metric-card-value">{scheduledCount}</div>
          <div className="lovable-metric-card-sub">{t('Meetings currently planned')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Completed')}</div>
          <div className="lovable-metric-card-value">{completedCount}</div>
          <div className="lovable-metric-card-sub">{t('Meetings with closed outcomes')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Cancelled')}</div>
          <div className="lovable-metric-card-value">{cancelledCount}</div>
          <div className="lovable-metric-card-sub">{t('Meetings removed from the active queue')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Visible')}</div>
          <div className="lovable-metric-card-value">{filteredMeetings.length}</div>
          <div className="lovable-metric-card-sub">{t('Meetings shown under the current filter')}</div>
        </div>
      </div>

      <div className="meeting-page-grid" style={{ display: 'grid', gap: '24px', alignItems: 'start' }}>

        {/* CALENDAR */}
        <div style={panelShellStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--lovable-line)' }}>
            <button style={ghostButtonStyle}
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>&#8249;</button>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--lovable-text)' }}>
              {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </h2>
            <button style={ghostButtonStyle}
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>&#8250;</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--lovable-line)' }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', padding: '10px 4px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--lovable-text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px', gap: '2px' }}>
            {calendarDays.map((date, idx) => {
              if (!date) return <div key={idx} />
              const dayMeetings = getMeetingsForDate(date)
              const isToday = date.toDateString() === today.toDateString()
              const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()
              return (
                <div
                  key={idx}
                  onClick={() => handleDateClick(date)}
                  style={{
                    padding: '4px', minHeight: '72px', borderRadius: '10px',
                    cursor: canCreateMeeting ? 'pointer' : 'default',
                    background: isSelected ? 'var(--lovable-primary-soft)' : isToday ? 'rgba(209,153,255,0.08)' : 'transparent',
                    border: isSelected ? '1.5px solid var(--lovable-line-strong)' : isToday ? '1.5px solid rgba(209,153,255,0.28)' : '1.5px solid transparent',
                    transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                  }}
                >
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: isToday ? 700 : 400,
                    background: isToday ? 'var(--lovable-primary)' : 'transparent',
                    color: isToday ? 'var(--lovable-bg)' : 'var(--lovable-text)',
                  }}>{date.getDate()}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', padding: '0 2px' }}>
                    {dayMeetings.slice(0, 2).map(m => (
                      <div
                        key={m.id}
                        onClick={e => { e.stopPropagation(); handleSelectMeeting(m) }}
                        title={m.title}
                        style={{
                          background: STATUS_COLORS[m.status?.toLowerCase()]?.bg || 'var(--lovable-primary)',
                          color: 'var(--lovable-bg)', fontSize: '0.58rem', fontWeight: 700,
                          padding: '1px 4px', borderRadius: '4px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer',
                        }}
                      >{m.title}</div>
                    ))}
                    {dayMeetings.length > 2 && (
                      <div style={{ fontSize: '0.6rem', color: 'var(--lovable-text-soft)', paddingLeft: '2px' }}>+{dayMeetings.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ padding: '12px 20px 16px', display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid var(--lovable-line)', alignItems: 'center', color: 'var(--lovable-text-muted)' }}>
            {Object.entries(STATUS_COLORS).map(([s, c]) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: c.bg, display: 'inline-block' }} />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </div>
            ))}
            {canCreateMeeting && <span style={{ fontSize: '0.74rem', color: 'var(--lovable-text-soft)', marginLeft: 'auto' }}>{t('Click a date to schedule')}</span>}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lovable-side-stack">
          <div className="lovable-panel">
            <div className="lovable-pill-row">
            {['upcoming', 'past', 'all'].map(f => (
              <button key={f} onClick={() => setFilterType(f)} style={{
                flex: 1, padding: '10px 0', borderRadius: '999px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                background: filterType === f ? 'var(--lovable-primary-soft)' : 'var(--lovable-panel-alt)',
                color: filterType === f ? 'var(--lovable-primary)' : 'var(--lovable-text-muted)',
                border: filterType === f ? '1px solid rgba(209,153,255,0.28)' : '1px solid var(--lovable-line)',
                transition: 'all 0.2s',
              }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
            </div>
          </div>

          {selectedDate && selectedDateMeetings.length > 0 && (
            <div style={panelShellStyle}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--lovable-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--lovable-text)' }}>
                  {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </h3>
                <span style={mutedCountStyle}>{selectedDateMeetings.length}</span>
              </div>
              {selectedDateMeetings.map(m => (
                <MeetingCard key={m.id} meeting={m} selected={selectedMeeting?.id === m.id} onClick={() => handleSelectMeeting(m)} statusBadgeStyle={statusBadgeStyle} t={t} />
              ))}
            </div>
          )}

          <div style={panelShellStyle}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--lovable-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--lovable-text)' }}>{filterType.charAt(0).toUpperCase() + filterType.slice(1)} {t('Meetings')}</h3>
              <span style={mutedCountStyle}>{filteredMeetings.length}</span>
            </div>
            {loading ? (
              <div style={{ padding: '12px' }}><CardListSkeleton count={3} /></div>
            ) : filteredMeetings.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--lovable-text-soft)', fontSize: '0.875rem' }}>{t('No meetings found')}</div>
            ) : filteredMeetings.map(m => (
              <MeetingCard key={m.id} meeting={m} selected={selectedMeeting?.id === m.id} onClick={() => handleSelectMeeting(m)} statusBadgeStyle={statusBadgeStyle} t={t} />
            ))}
          </div>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      {showDetailPanel && selectedMeeting && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--lovable-overlay)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setShowDetailPanel(false)}>
          <div className="meeting-detail-drawer" style={{ width: '100%', maxWidth: '520px', height: '100%', background: 'var(--lovable-panel)', overflowY: 'auto', boxShadow: '-18px 0 48px rgba(0,0,0,0.22)', color: 'var(--lovable-text)', borderLeft: '1px solid var(--lovable-line)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--lovable-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={statusBadgeStyle(selectedMeeting.status)}>{t(selectedMeeting.status)}</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.3, color: 'var(--lovable-text)' }}>{selectedMeeting.title}</h2>
              </div>
              <button onClick={() => setShowDetailPanel(false)} style={ghostButtonStyle}>&#10005;</button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                ['Date', new Date(selectedMeeting.meetingDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
                ['Time', selectedMeeting.meetingTime || 'Not specified'],
                ['Location', selectedMeeting.location || 'Not specified'],
                ['Description', selectedMeeting.description || 'No description'],
                ['Created by', selectedMeeting.createdBy?.fullName || '-'],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', gap: '12px', fontSize: '0.875rem' }}>
                  <span style={{ minWidth: '90px', color: 'var(--lovable-text-soft)', flexShrink: 0, fontWeight: 500 }}>{label}</span>
                  <span style={{ color: 'var(--lovable-text-muted)' }}>{val}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '0 24px 20px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--lovable-text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
                Participants ({selectedMeeting.participants.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedMeeting.participants.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'var(--lovable-panel-alt)', border: '1px solid var(--lovable-line)', borderRadius: '20px', padding: '4px 12px 4px 4px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--lovable-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--lovable-bg)', overflow: 'hidden', flexShrink: 0 }}>
                      {p.employee.profileImage
                        ? <img src={p.employee.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : p.employee.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.2, color: 'var(--lovable-text)' }}>{p.employee.fullName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--lovable-text-soft)' }}>{p.employee.designation}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(user.id === selectedMeeting.createdBy?.id || parentRoles.includes(user.designation)) && (
              <div style={{ padding: '0 24px 28px', borderTop: '1px solid var(--lovable-line)', paddingTop: '20px' }}>
                {isMeetingPast(selectedMeeting) ? (
                  <>
                    <button
                      onClick={() => setShowMOMForm(!showMOMForm)}
                      style={showMOMForm ? { ...ghostButtonStyle, width: '100%', padding: '10px 18px', fontWeight: 700, fontSize: '0.875rem' } : { ...primaryButtonStyle, width: '100%', padding: '10px 18px', fontSize: '0.875rem' }}
                    >
                      {showMOMForm ? 'x Hide MOM' : 'Add / Edit Minutes of Meeting'}
                    </button>
                    {showMOMForm && (
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {[
                          { label: 'Points Discussed', key: 'pointsDiscussed', inputKey: 'newPoint', placeholder: 'Add a point...', handler: handleAddMOMPoint },
                          { label: 'Member Inputs', key: 'memberInputs', inputKey: 'newInput', placeholder: 'Add input from a member...', handler: handleAddMOMMemberInput },
                          { label: 'Decisions Made', key: 'decisions', inputKey: 'newDecision', placeholder: 'Add a decision...', handler: handleAddMOMDecision },
                        ].map(({ label, key, inputKey, placeholder, handler }) => (
                          <div key={key}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--lovable-text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{label}</div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                              <input
                                type="text" placeholder={placeholder} value={momInputs[inputKey]}
                                onChange={e => setMOMInputs(prev => ({ ...prev, [inputKey]: e.target.value }))}
                                onKeyPress={e => e.key === 'Enter' && handler()}
                                style={{ ...inputSt, flex: 1 }}
                              />
                              <button onClick={handler} style={{ ...primaryButtonStyle, padding: '8px 14px', borderRadius: '10px' }}>+</button>
                            </div>
                            {momData[key].length > 0 && (
                              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {momData[key].map((item, i) => (
                                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--lovable-panel-alt)', border: '1px solid var(--lovable-line)', borderRadius: '10px', padding: '7px 10px', fontSize: '0.83rem', color: 'var(--lovable-text-muted)' }}>
                                    <span style={{ flex: 1 }}>{item}</span>
                                    <button onClick={() => handleRemoveMOMItem(key, i)} style={{ background: 'none', border: 'none', color: 'var(--lovable-text-soft)', cursor: 'pointer', fontSize: '0.85rem' }}>x</button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={handleSaveMOM} disabled={loading} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, var(--lovable-success), #2ce2bb)', color: 'var(--lovable-bg)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}>
                            {loading ? 'Saving...' : 'Save MOM'}
                          </button>
                          {(momData.pointsDiscussed.length > 0 || momData.memberInputs.length > 0 || momData.decisions.length > 0) && (
                            <button onClick={handleGenerateGmail} style={{ ...ghostButtonStyle, padding: '10px 16px', fontWeight: 700, fontSize: '0.875rem' }}>Send to Gmail</button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', fontSize: '0.83rem', color: '#f59e0b' }}>
                    MOM available after {new Date(selectedMeeting.meetingDate).toLocaleDateString('en-IN')}{selectedMeeting.meetingTime ? ` at ${selectedMeeting.meetingTime}` : ''}.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--lovable-overlay)', backdropFilter: 'blur(10px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowCreateForm(false)}>
          <div className="meeting-create-modal" style={{ background: 'var(--lovable-panel)', border: '1px solid var(--lovable-line)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', color: 'var(--lovable-text)', boxShadow: 'var(--lovable-shadow)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--lovable-text)' }}>{t('New Meeting')}</h2>
              <button onClick={() => setShowCreateForm(false)} style={ghostButtonStyle}>&#10005;</button>
            </div>
            <form onSubmit={handleCreateMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FieldWrap label="Meeting Title *">
                <input type="text" required value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., Quarterly Review" style={inputSt} />
              </FieldWrap>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FieldWrap label="Date *">
                  <input type="date" required value={formData.meetingDate} onChange={e => setFormData(prev => ({ ...prev, meetingDate: e.target.value }))} style={inputSt} />
                </FieldWrap>
                <FieldWrap label="Time">
                  <input type="time" value={formData.meetingTime} onChange={e => setFormData(prev => ({ ...prev, meetingTime: e.target.value }))} style={inputSt} />
                </FieldWrap>
              </div>
              <FieldWrap label="Location">
                <input type="text" value={formData.location} onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g., Conference Room A" style={inputSt} />
              </FieldWrap>
              <FieldWrap label="Description">
                <textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Meeting purpose and agenda" rows={3} style={{ ...inputSt, resize: 'vertical' }} />
              </FieldWrap>
              <FieldWrap label={`Participants${formData.participants.length > 0 ? ` (${formData.participants.length} selected)` : ''}`}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto', padding: '8px', background: 'var(--lovable-panel-alt)', borderRadius: '10px', border: '1px solid var(--lovable-line)' }}>
                  {employees.map(emp => {
                    const sel = formData.participants.includes(emp.id)
                    return (
                      <div
                        key={emp.id}
                        onClick={() => setFormData(prev => ({ ...prev, participants: sel ? prev.participants.filter(id => id !== emp.id) : [...prev.participants, emp.id] }))}
                        style={{ padding: '5px 10px', borderRadius: '20px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: sel ? 700 : 500, background: sel ? 'linear-gradient(135deg, var(--lovable-primary), var(--lovable-primary-dim))' : 'var(--lovable-panel-alt)', color: sel ? 'var(--lovable-bg)' : 'var(--lovable-text-muted)', border: sel ? '1px solid rgba(209,153,255,0.3)' : '1px solid var(--lovable-line)', transition: 'all 0.15s', userSelect: 'none' }}
                      >
                        {emp.fullName}
                      </div>
                    )
                  })}
                </div>
              </FieldWrap>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, flex: 1, padding: '12px', fontSize: '0.9rem' }}>
                  {loading ? 'Creating...' : 'Create Meeting'}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} style={{ ...ghostButtonStyle, padding: '12px 20px', fontWeight: 700 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const MeetingCard = ({ meeting, selected, onClick, statusBadgeStyle, t }) => (
  <div
    onClick={onClick}
    style={{
      padding: '14px 20px', borderBottom: '1px solid var(--lovable-line)', cursor: 'pointer',
      background: selected ? 'rgba(209,153,255,0.08)' : 'transparent',
      borderLeft: selected ? '3px solid var(--lovable-primary)' : '3px solid transparent',
      transition: 'all 0.15s',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '5px' }}>
      <span style={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.3, color: 'var(--lovable-text)' }}>{meeting.title}</span>
      <span style={statusBadgeStyle(meeting.status)}>{t(meeting.status)}</span>
    </div>
    <div style={{ display: 'flex', gap: '12px', fontSize: '0.77rem', color: 'var(--lovable-text-soft)', flexWrap: 'wrap' }}>
      <span>{new Date(meeting.meetingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      {meeting.meetingTime && <span>{meeting.meetingTime}</span>}
      <span>{meeting.participants.length} attendee{meeting.participants.length !== 1 ? 's' : ''}</span>
    </div>
  </div>
)

const FieldWrap = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--lovable-text-soft)' }}>{label}</label>
    {children}
  </div>
)

const inputSt = {
  padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--lovable-line)',
  background: 'var(--bg-input)', color: 'var(--lovable-text)', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box',
}

export default MeetingPage
