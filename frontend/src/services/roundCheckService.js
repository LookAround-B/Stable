const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api'

const roundCheckService = {
  // Get round check for a specific date
  getRoundCheck: async (date) => {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_URL}/round-checks?date=${date}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      const err = new Error(error.error || 'Failed to fetch round check')
      err.status = response.status
      throw err
    }

    return response.json()
  },

  // Update round check for a specific date
  updateRoundCheck: async (date, morningCompleted, afternoonCompleted, eveningCompleted) => {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_URL}/round-checks`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date,
        morningCompleted,
        afternoonCompleted,
        eveningCompleted,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      const err = new Error(error.error || 'Failed to update round check')
      err.status = response.status
      throw err
    }

    return response.json()
  },
}

export default roundCheckService
