import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { CardListSkeleton } from '../components/Skeleton'
import apiClient from '../services/apiClient'
import { useI18n } from '../context/I18nContext'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const STATUS_COLORS = {
  scheduled: { bg: '#3b82f6', light: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
  completed: { bg: '#10b981', light: 'rgba(16,185,129,0.15)', text: '#10b981' },
  cancelled: { bg: '#ef4444', light: 'rgba(239,68,68,0.15)', text: '#ef4444' },
}

const MeetingPage = () => {
  const { user } = useAuth()
  const { t } = useI18n()
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

  const statusBadgeStyle = (status) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
    background: STATUS_COLORS[status?.toLowerCase()]?.light || 'rgba(255,255,255,0.1)',
    color: STATUS_COLORS[status?.toLowerCase()]?.text || 'inherit',
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{t('Meetings')}</h1>
          <p style={{ margin: '4px 0 0', opacity: 0.55, fontSize: '0.875rem' }}>Schedule and track team meetings</p>
        </div>
        {canCreateMeeting && (
          <button
            style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
            onClick={() => { setFormData(prev => ({ ...prev, meetingDate: new Date().toISOString().split('T')[0] })); setShowCreateForm(true) }}
          >
            + New Meeting
          </button>
        )}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', alignItems: 'start' }}>

        {/* CALENDAR */}
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <button style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'inherit', cursor: 'pointer', borderRadius: '8px', padding: '6px 14px', fontSize: '1.1rem' }}
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>&#8249;</button>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
              {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </h2>
            <button style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'inherit', cursor: 'pointer', borderRadius: '8px', padding: '6px 14px', fontSize: '1.1rem' }}
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>&#8250;</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', padding: '10px 4px', fontSize: '0.72rem', fontWeight: 600, opacity: 0.45, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</div>
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
                    background: isSelected ? 'rgba(59,130,246,0.15)' : isToday ? 'rgba(99,102,241,0.1)' : 'transparent',
                    border: isSelected ? '1.5px solid rgba(59,130,246,0.45)' : isToday ? '1.5px solid rgba(99,102,241,0.3)' : '1.5px solid transparent',
                    transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                  }}
                >
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: isToday ? 700 : 400,
                    background: isToday ? '#6366f1' : 'transparent',
                    color: isToday ? '#fff' : 'inherit',
                  }}>{date.getDate()}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', padding: '0 2px' }}>
                    {dayMeetings.slice(0, 2).map(m => (
                      <div
                        key={m.id}
                        onClick={e => { e.stopPropagation(); handleSelectMeeting(m) }}
                        title={m.title}
                        style={{
                          background: STATUS_COLORS[m.status?.toLowerCase()]?.bg || '#3b82f6',
                          color: '#fff', fontSize: '0.58rem', fontWeight: 600,
                          padding: '1px 4px', borderRadius: '4px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer',
                        }}
                      >{m.title}</div>
                    ))}
                    {dayMeetings.length > 2 && (
                      <div style={{ fontSize: '0.6rem', opacity: 0.5, paddingLeft: '2px' }}>+{dayMeetings.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ padding: '12px 20px 16px', display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', alignItems: 'center' }}>
            {Object.entries(STATUS_COLORS).map(([s, c]) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', opacity: 0.7 }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: c.bg, display: 'inline-block' }} />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </div>
            ))}
            {canCreateMeeting && <span style={{ fontSize: '0.74rem', opacity: 0.4, marginLeft: 'auto' }}>Click a date to schedule</span>}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '4px', gap: '4px' }}>
            {['upcoming', 'past', 'all'].map(f => (
              <button key={f} onClick={() => setFilterType(f)} style={{
                flex: 1, padding: '8px 0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                background: filterType === f ? '#3b82f6' : 'transparent',
                color: filterType === f ? '#fff' : 'inherit',
                opacity: filterType === f ? 1 : 0.55,
                transition: 'all 0.2s',
              }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>

          {selectedDate && selectedDateMeetings.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                  {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </h3>
                <span style={{ fontSize: '0.75rem', background: 'rgba(59,130,246,0.18)', color: '#3b82f6', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>{selectedDateMeetings.length}</span>
              </div>
              {selectedDateMeetings.map(m => (
                <MeetingCard key={m.id} meeting={m} selected={selectedMeeting?.id === m.id} onClick={() => handleSelectMeeting(m)} statusBadgeStyle={statusBadgeStyle} t={t} />
              ))}
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{filterType.charAt(0).toUpperCase() + filterType.slice(1)} Meetings</h3>
              <span style={{ fontSize: '0.75rem', background: 'rgba(59,130,246,0.18)', color: '#3b82f6', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>{filteredMeetings.length}</span>
            </div>
            {loading ? (
              <div style={{ padding: '12px' }}><CardListSkeleton count={3} /></div>
            ) : filteredMeetings.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', opacity: 0.4, fontSize: '0.875rem' }}>No meetings found</div>
            ) : filteredMeetings.map(m => (
              <MeetingCard key={m.id} meeting={m} selected={selectedMeeting?.id === m.id} onClick={() => handleSelectMeeting(m)} statusBadgeStyle={statusBadgeStyle} t={t} />
            ))}
          </div>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      {showDetailPanel && selectedMeeting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setShowDetailPanel(false)}>
          <div style={{ width: '100%', maxWidth: '520px', height: '100%', background: '#f5f5f0', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.25)', color: '#111' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={statusBadgeStyle(selectedMeeting.status)}>{t(selectedMeeting.status)}</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.3 }}>{selectedMeeting.title}</h2>
              </div>
              <button onClick={() => setShowDetailPanel(false)} style={{ background: 'rgba(0,0,0,0.07)', border: 'none', color: '#111', cursor: 'pointer', borderRadius: '8px', padding: '6px 12px', fontSize: '1rem' }}>&#10005;</button>
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
                  <span style={{ minWidth: '90px', opacity: 0.5, flexShrink: 0, fontWeight: 500 }}>{label}</span>
                  <span>{val}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '0 24px 20px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.45, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
                Participants ({selectedMeeting.participants.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedMeeting.participants.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '20px', padding: '4px 12px 4px 4px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                      {p.employee.profileImage
                        ? <img src={p.employee.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : p.employee.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.2 }}>{p.employee.fullName}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{p.employee.designation}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(user.id === selectedMeeting.createdBy?.id || parentRoles.includes(user.designation)) && (
              <div style={{ padding: '0 24px 28px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '20px' }}>
                {isMeetingPast(selectedMeeting) ? (
                  <>
                    <button
                      onClick={() => setShowMOMForm(!showMOMForm)}
                      style={{ padding: '10px 18px', background: showMOMForm ? 'rgba(0,0,0,0.07)' : '#3b82f6', color: showMOMForm ? '#111' : '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', width: '100%' }}
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
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{label}</div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                              <input
                                type="text" placeholder={placeholder} value={momInputs[inputKey]}
                                onChange={e => setMOMInputs(prev => ({ ...prev, [inputKey]: e.target.value }))}
                                onKeyPress={e => e.key === 'Enter' && handler()}
                                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: '#111', fontSize: '0.875rem' }}
                              />
                              <button onClick={handler} style={{ padding: '8px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>+</button>
                            </div>
                            {momData[key].length > 0 && (
                              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {momData[key].map((item, i) => (
                                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '7px 10px', fontSize: '0.83rem' }}>
                                    <span style={{ flex: 1 }}>{item}</span>
                                    <button onClick={() => handleRemoveMOMItem(key, i)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.4, fontSize: '0.85rem' }}>x</button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={handleSaveMOM} disabled={loading} style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                            {loading ? 'Saving...' : 'Save MOM'}
                          </button>
                          {(momData.pointsDiscussed.length > 0 || momData.memberInputs.length > 0 || momData.decisions.length > 0) && (
                            <button onClick={handleGenerateGmail} style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.06)', color: '#111', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>Send to Gmail</button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', fontSize: '0.83rem', color: '#f59e0b' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowCreateForm(false)}>
          <div style={{ background: '#f5f5f0', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', color: '#111' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{t('New Meeting')}</h2>
              <button onClick={() => setShowCreateForm(false)} style={{ background: 'rgba(0,0,0,0.08)', border: 'none', color: '#111', cursor: 'pointer', borderRadius: '8px', padding: '6px 12px' }}>&#10005;</button>
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto', padding: '8px', background: 'rgba(0,0,0,0.03)', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)' }}>
                  {employees.map(emp => {
                    const sel = formData.participants.includes(emp.id)
                    return (
                      <div
                        key={emp.id}
                        onClick={() => setFormData(prev => ({ ...prev, participants: sel ? prev.participants.filter(id => id !== emp.id) : [...prev.participants, emp.id] }))}
                        style={{ padding: '5px 10px', borderRadius: '20px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: sel ? 600 : 400, background: sel ? '#3b82f6' : 'rgba(0,0,0,0.06)', color: sel ? '#fff' : '#111', border: sel ? '1px solid #3b82f6' : '1px solid rgba(0,0,0,0.12)', transition: 'all 0.15s', userSelect: 'none' }}
                      >
                        {emp.fullName}
                      </div>
                    )
                  })}
                </div>
              </FieldWrap>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                  {loading ? 'Creating...' : 'Create Meeting'}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.06)', color: '#111', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
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
      padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
      background: selected ? 'rgba(59,130,246,0.09)' : 'transparent',
      borderLeft: selected ? '3px solid #3b82f6' : '3px solid transparent',
      transition: 'all 0.15s',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '5px' }}>
      <span style={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.3 }}>{meeting.title}</span>
      <span style={statusBadgeStyle(meeting.status)}>{t(meeting.status)}</span>
    </div>
    <div style={{ display: 'flex', gap: '12px', fontSize: '0.77rem', opacity: 0.55, flexWrap: 'wrap' }}>
      <span>{new Date(meeting.meetingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      {meeting.meetingTime && <span>{meeting.meetingTime}</span>}
      <span>{meeting.participants.length} attendee{meeting.participants.length !== 1 ? 's' : ''}</span>
    </div>
  </div>
)

const FieldWrap = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.6 }}>{label}</label>
    {children}
  </div>
)

const inputSt = {
  padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.15)',
  background: '#fff', color: '#111', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box',
}

export default MeetingPage
