import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import apiClient from '../services/apiClient'
import '../styles/MeetingPage.css'

const MeetingPage = () => {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [employees, setEmployees] = useState([])
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [filterType, setFilterType] = useState('upcoming') // upcoming, past, all
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showMOMForm, setShowMOMForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meetingDate: '',
    meetingTime: '',
    location: '',
    participants: [],
  })

  const [momData, setMOMData] = useState({
    pointsDiscussed: [],
    memberInputs: [],
    decisions: [],
  })

  const [momInputs, setMOMInputs] = useState({
    newPoint: '',
    newInput: '',
    newDecision: '',
  })

  // Fetch meetings
  useEffect(() => {
    fetchMeetings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType])

  // Fetch employees
  useEffect(() => {
    fetchEmployees()
  }, [])

  // Auto-refresh meetings every 60 seconds for live filtering (Upcoming → Past)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMeetings()
    }, 60000) // Refresh every 60 seconds
    
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType])

  const fetchMeetings = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/meetings', {
        params: { filterType },
      })
      if (response.data.success) {
        setMeetings(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/employees/all')
      if (response.data.success) {
        setEmployees(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleDateClick = (date) => {
    setFormData({ ...formData, meetingDate: date.toISOString().split('T')[0] })
    setShowCreateForm(true)
  }

  const handleAddParticipant = (employeeId) => {
    if (!formData.participants.includes(employeeId)) {
      setFormData({
        ...formData,
        participants: [...formData.participants, employeeId],
      })
    }
  }

  const handleRemoveParticipant = (employeeId) => {
    setFormData({
      ...formData,
      participants: formData.participants.filter((id) => id !== employeeId),
    })
  }

  const handleCreateMeeting = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await apiClient.post('/meetings', {
        title: formData.title,
        description: formData.description,
        meetingDate: formData.meetingDate + 'T12:00:00', // Append time to fix timezone issue
        meetingTime: formData.meetingTime,
        location: formData.location,
        participantIds: formData.participants, // Send as participantIds
      })
      if (response.data.success) {
        setMeetings([...meetings, response.data.data])
        setFormData({
          title: '',
          description: '',
          meetingDate: '',
          meetingTime: '',
          location: '',
          participants: [],
        })
        setShowCreateForm(false)
        alert('Meeting created successfully!')
        fetchMeetings()
      }
    } catch (error) {
      console.error('Error creating meeting:', error)
      alert('Failed to create meeting: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleSelectMeeting = async (meeting) => {
    setSelectedMeeting(meeting)
    if (meeting.mom) {
      setMOMData({
        pointsDiscussed: JSON.parse(meeting.mom.pointsDiscussed || '[]'),
        memberInputs: JSON.parse(meeting.mom.memberInputs || '[]'),
        decisions: JSON.parse(meeting.mom.decisions || '[]'),
      })
    }
  }

  const handleAddMOMPoint = () => {
    if (momInputs.newPoint.trim()) {
      setMOMData({
        ...momData,
        pointsDiscussed: [...momData.pointsDiscussed, momInputs.newPoint],
      })
      setMOMInputs({ ...momInputs, newPoint: '' })
    }
  }

  const handleAddMOMMemberInput = () => {
    if (momInputs.newInput.trim()) {
      setMOMData({
        ...momData,
        memberInputs: [...momData.memberInputs, momInputs.newInput],
      })
      setMOMInputs({ ...momInputs, newInput: '' })
    }
  }

  const handleAddMOMDecision = () => {
    if (momInputs.newDecision.trim()) {
      setMOMData({
        ...momData,
        decisions: [...momData.decisions, momInputs.newDecision],
      })
      setMOMInputs({ ...momInputs, newDecision: '' })
    }
  }

  const handleRemoveMOMItem = (section, index) => {
    setMOMData({
      ...momData,
      [section]: momData[section].filter((_, i) => i !== index),
    })
  }

  const handleSaveMOM = async () => {
    if (!selectedMeeting) return

    try {
      setLoading(true)
      const response = await apiClient.patch(
        `/meetings/${selectedMeeting.id}/mom`,
        momData
      )
      if (response.data.success) {
        setSelectedMeeting(response.data.data)
        alert('MOM saved successfully!')
        fetchMeetings()
      }
    } catch (error) {
      console.error('Error saving MOM:', error)
      alert('Failed to save MOM: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateGmail = () => {
    if (!selectedMeeting) return

    const emailBody = `
Meeting Details:
Title: ${selectedMeeting.title}
Date: ${new Date(selectedMeeting.meetingDate).toLocaleDateString('en-IN')}
Time: ${selectedMeeting.meetingTime || 'N/A'}
Location: ${selectedMeeting.location || 'N/A'}

Members:
${selectedMeeting.participants.map((p) => `- ${p.employee.fullName} (${p.employee.designation})`).join('\n')}

Points Discussed:
${momData.pointsDiscussed.map((p) => `- ${p}`).join('\n')}

Member Inputs:
${momData.memberInputs.map((i) => `- ${i}`).join('\n')}

Decisions:
${momData.decisions.map((d) => `- ${d}`).join('\n')}
    `

    // Open Gmail compose with pre-filled content
    const mailtoLink = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=director@school.com&bcc=admin@school.com&body=${encodeURIComponent(emailBody)}`
    window.open(mailtoLink, '_blank')
  }

  const generateCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const getMeetingsForDate = (date) => {
    if (!date) return []
    // Format local date as YYYY-MM-DD without converting to UTC
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    return meetings.filter((m) => m.meetingDate.split('T')[0] === dateStr)
  }

  const calendarDays = generateCalendar()
  const parentRoles = ['Director', 'School Administrator', 'Stable Manager']
  const canCreateMeeting = user && parentRoles.includes(user.designation)

  return (
    <div className="meeting-page">
      <h1>📅 Meetings</h1>

      <div className="meeting-container">
        {/* Calendar Section */}
        <div className="calendar-section">
          <div className="calendar-header">
            <button
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
              }
            >
              ←
            </button>
            <h2>
              {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
              }
            >
              →
            </button>
          </div>

          <div className="weekday-labels">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="weekday-label">
                {day}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((date, index) => (
              <div
                key={index}
                className={`calendar-day ${date ? '' : 'empty'}`}
                onClick={() => date && canCreateMeeting && handleDateClick(date)}
              >
                {date && (
                  <>
                    <div className="day-number">{date.getDate()}</div>
                    <div className="day-meetings">
                      {getMeetingsForDate(date).map((meeting) => (
                        <div
                          key={meeting.id}
                          className={`meeting-dot ${meeting.status.toLowerCase()}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectMeeting(meeting)
                          }}
                          title={meeting.title}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {canCreateMeeting && (
            <p className="calendar-hint">📌 Click on a date to create a meeting</p>
          )}
        </div>

        {/* Meeting Details Section */}
        <div className="details-section">
          <div className="filter-buttons">
            <button
              className={filterType === 'upcoming' ? 'active' : ''}
              onClick={() => setFilterType('upcoming')}
            >
              Upcoming
            </button>
            <button
              className={filterType === 'past' ? 'active' : ''}
              onClick={() => setFilterType('past')}
            >
              Past
            </button>
            <button
              className={filterType === 'all' ? 'active' : ''}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
          </div>

          {/* Filtered Meetings List */}
          <div className="meetings-list-container">
            <h4>
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)} Meetings ({
                meetings.filter((m) => {
                  const now = new Date()
                  const mDateTime = new Date(m.meetingDate)
                  const [hours, minutes] = (m.meetingTime || '00:00').split(':')
                  mDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)
                  if (filterType === 'upcoming') return mDateTime >= now
                  if (filterType === 'past') return mDateTime < now
                  return true
                }).length
              })
            </h4>
            <div className="meetings-list">
              {meetings
                .filter((m) => {
                  const now = new Date()
                  const mDateTime = new Date(m.meetingDate)
                  const [hours, minutes] = (m.meetingTime || '00:00').split(':')
                  mDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)
                  if (filterType === 'upcoming') return mDateTime >= now
                  if (filterType === 'past') return mDateTime < now
                  return true
                })
                .map((meeting) => (
                  <div
                    key={meeting.id}
                    className={`meeting-list-item ${
                      selectedMeeting?.id === meeting.id ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectMeeting(meeting)}
                  >
                    <div className="meeting-list-header">
                      <span className="meeting-title">{meeting.title}</span>
                      <span className={`status-badge-small ${meeting.status.toLowerCase()}`}>
                        {meeting.status}
                      </span>
                    </div>
                    <div className="meeting-list-date">
                      📅 {new Date(meeting.meetingDate).toLocaleDateString('en-IN')}{' '}
                      {meeting.meetingTime && `at ${meeting.meetingTime}`}
                    </div>
                    <div className="meeting-list-participants">
                      👥 {meeting.participants.length} attendee
                      {meeting.participants.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {selectedMeeting ? (
            <div className="meeting-details">
              <h3>{selectedMeeting.title}</h3>
              <div className="detail-info">
                <p>
                  <strong>Date:</strong>{' '}
                  {new Date(selectedMeeting.meetingDate).toLocaleDateString('en-IN')}
                </p>
                <p>
                  <strong>Time:</strong> {selectedMeeting.meetingTime || 'N/A'}
                </p>
                <p>
                  <strong>Location:</strong> {selectedMeeting.location || 'N/A'}
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`status-badge ${selectedMeeting.status.toLowerCase()}`}>
                    {selectedMeeting.status}
                  </span>
                </p>
                <p>
                  <strong>Description:</strong> {selectedMeeting.description || 'N/A'}
                </p>
              </div>

              <h4>Participants ({selectedMeeting.participants.length})</h4>
              <div className="participants-list">
                {selectedMeeting.participants.map((p) => (
                  <div key={p.id} className="participant">
                    {p.employee.profileImage && (
                      <img
                        src={p.employee.profileImage}
                        alt={p.employee.fullName}
                        className="participant-image"
                      />
                    )}
                    <div className="participant-info">
                      <p className="name">{p.employee.fullName}</p>
                      <p className="designation">{p.employee.designation}</p>
                    </div>
                  </div>
                ))}
              </div>

              {(user.id === selectedMeeting.createdBy.id ||
              parentRoles.includes(user.designation)) &&
              new Date(selectedMeeting.meetingDate) <= new Date() ? (
                <>
                  <button
                    className="btn-mom"
                    onClick={() => setShowMOMForm(!showMOMForm)}
                  >
                    {showMOMForm ? '✕ Hide MOM' : '📝 Add/Edit MOM'}
                  </button>

                  {showMOMForm && (
                    <div className="mom-form">
                      <h4>Minutes of Meeting</h4>

                      <div className="mom-section">
                        <label>Points Discussed</label>
                        <div className="input-group">
                          <input
                            type="text"
                            placeholder="Add a point..."
                            value={momInputs.newPoint}
                            onChange={(e) =>
                              setMOMInputs({ ...momInputs, newPoint: e.target.value })
                            }
                            onKeyPress={(e) =>
                              e.key === 'Enter' && handleAddMOMPoint()
                            }
                          />
                          <button onClick={handleAddMOMPoint}>+ Add</button>
                        </div>
                        <ul className="mom-list">
                          {momData.pointsDiscussed.map((point, index) => (
                            <li key={index}>
                              {point}
                              <button
                                className="btn-remove"
                                onClick={() =>
                                  handleRemoveMOMItem('pointsDiscussed', index)
                                }
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mom-section">
                        <label>Member Inputs</label>
                        <div className="input-group">
                          <input
                            type="text"
                            placeholder="Add input from member..."
                            value={momInputs.newInput}
                            onChange={(e) =>
                              setMOMInputs({ ...momInputs, newInput: e.target.value })
                            }
                            onKeyPress={(e) =>
                              e.key === 'Enter' && handleAddMOMMemberInput()
                            }
                          />
                          <button onClick={handleAddMOMMemberInput}>+ Add</button>
                        </div>
                        <ul className="mom-list">
                          {momData.memberInputs.map((input, index) => (
                            <li key={index}>
                              {input}
                              <button
                                className="btn-remove"
                                onClick={() =>
                                  handleRemoveMOMItem('memberInputs', index)
                                }
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mom-section">
                        <label>Decisions Made</label>
                        <div className="input-group">
                          <input
                            type="text"
                            placeholder="Add decision..."
                            value={momInputs.newDecision}
                            onChange={(e) =>
                              setMOMInputs({ ...momInputs, newDecision: e.target.value })
                            }
                            onKeyPress={(e) =>
                              e.key === 'Enter' && handleAddMOMDecision()
                            }
                          />
                          <button onClick={handleAddMOMDecision}>+ Add</button>
                        </div>
                        <ul className="mom-list">
                          {momData.decisions.map((decision, index) => (
                            <li key={index}>
                              {decision}
                              <button
                                className="btn-remove"
                                onClick={() =>
                                  handleRemoveMOMItem('decisions', index)
                                }
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mom-actions">
                        <button
                          className="btn-save"
                          onClick={handleSaveMOM}
                          disabled={loading}
                        >
                          {loading ? 'Saving...' : '💾 Save MOM'}
                        </button>
                        {(momData.pointsDiscussed.length > 0 ||
                          momData.memberInputs.length > 0 ||
                          momData.decisions.length > 0) && (
                          <button
                            className="btn-gmail"
                            onClick={handleGenerateGmail}
                          >
                            ✉️ Send to Gmail
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : user.id === selectedMeeting.createdBy.id ||
              parentRoles.includes(user.designation) ? (
                <div style={{
                  padding: '15px',
                  background: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '6px',
                  color: '#856404',
                  marginTop: '15px'
                }}>
                  <p><strong>📋 MOM Available After Meeting:</strong></p>
                  <p>Minutes of Meeting can be added after {new Date(selectedMeeting.meetingDate).toLocaleDateString('en-IN')}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="no-selection">
              <p>Select a meeting to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Meeting Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Meeting</h2>
            <form onSubmit={handleCreateMeeting}>
              <div className="form-group">
                <label>Meeting Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Quarterly Review"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.meetingDate}
                    onChange={(e) =>
                      setFormData({ ...formData, meetingDate: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={formData.meetingTime}
                    onChange={(e) =>
                      setFormData({ ...formData, meetingTime: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Conference Room A"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Meeting purpose and agenda"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Select Participants</label>
                <div className="participant-selector">
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      className={`participant-option ${
                        formData.participants.includes(emp.id) ? 'selected' : ''
                      }`}
                      onClick={() => handleAddParticipant(emp.id)}
                    >
                      {emp.fullName} ({emp.designation})
                    </div>
                  ))}
                </div>
              </div>

              <div className="selected-participants">
                <h4>Selected Participants ({formData.participants.length})</h4>
                <div className="chips">
                  {formData.participants.map((empId) => {
                    const emp = employees.find((e) => e.id === empId)
                    return (
                      <div key={empId} className="chip">
                        {emp?.fullName}
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(empId)}
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : '✅ Create Meeting'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MeetingPage
