import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import '../styles/TasksPage.css';

const TASK_TYPES = [
  'Feed',
  'Grooming',
  'Maintenance',
  'Exercise',
  'Health Check',
  'Training',
  'Cleaning',
  'Other'
];

const CAN_CREATE_TASKS = [
  'Super Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
  'Instructor',
  'Ground Supervisor',
  'Jamedar'
];

const CAN_REVIEW_TASKS = [
  'Super Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
  'Instructor',
  'Ground Supervisor',
  'Senior Executive Accounts',
  'Jamedar'
];

const getRoleTaskDescription = (role) => {
  if (CAN_CREATE_TASKS.includes(role)) {
    return `Create and manage tasks - You can assign tasks to team members`;
  }
  return `View and complete your assigned tasks`;
};

const TasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [horses, setHorses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [viewingTaskId, setViewingTaskId] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [completionData, setCompletionData] = useState({
    photoUrl: '',
    notes: '',
  });
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Feed',
    horseId: '',
    assignedEmployeeId: '',
    priority: 'Medium',
    scheduledTime: '',
    requiredProof: false,
  });

  // Define hierarchy relationships for sorting
  const getHierarchyInfo = (designation) => {
    const hierarchy = {
      'Super Admin': { superiors: [], subordinates: ['Director', 'School Administrator', 'Ground Supervisor', 'Stable Manager', 'Senior Executive Admin', 'Senior Executive Accounts', 'Guard', 'Gardener', 'Housekeeping', 'Electrician', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Executive Admin', 'Executive Accounts'] },
      'Director': { superiors: ['Super Admin'], subordinates: ['School Administrator', 'Ground Supervisor', 'Stable Manager', 'Senior Executive Admin', 'Senior Executive Accounts', 'Guard', 'Gardener', 'Housekeeping', 'Electrician', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Executive Admin', 'Executive Accounts'] },
      'School Administrator': { superiors: ['Director', 'Super Admin'], subordinates: ['Ground Supervisor', 'Stable Manager', 'Senior Executive Admin', 'Senior Executive Accounts', 'Guard', 'Gardener', 'Housekeeping', 'Electrician', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Executive Admin', 'Executive Accounts'] },
      'Ground Supervisor': { superiors: ['Director', 'School Administrator', 'Super Admin'], subordinates: ['Guard', 'Gardener', 'Housekeeping', 'Electrician'] },
      'Stable Manager': { superiors: ['Director', 'School Administrator', 'Super Admin', 'Ground Supervisor'], subordinates: ['Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar'] },
      'Senior Executive Admin': { superiors: ['Director', 'School Administrator', 'Super Admin'], subordinates: ['Executive Admin'] },
      'Senior Executive Accounts': { superiors: ['Director', 'School Administrator', 'Super Admin'], subordinates: ['Executive Accounts'] },
      'Guard': { superiors: ['Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Gardener': { superiors: ['Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Housekeeping': { superiors: ['Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Electrician': { superiors: ['Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Groom': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Riding Boy': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Rider': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Instructor': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Farrier': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Jamedar': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Executive Admin': { superiors: ['Senior Executive Admin', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Executive Accounts': { superiors: ['Senior Executive Accounts', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
    };
    return hierarchy[designation] || { superiors: [], subordinates: [] };
  };

  // Define which roles each designation can see
  // Hierarchy: Supers see all, Middles see peers+superiors+subordinates, Staff see parents+superiors+peers
  const getVisibleRoles = (userDesignation) => {
    const roleVisibility = {
      'Super Admin': null, // null means see all
      'Director': null,
      'School Administrator': null,
      'Ground Supervisor': ['Ground Supervisor', 'Director', 'School Administrator', 'Super Admin', 'Stable Manager', 'Senior Executive Admin', 'Senior Executive Accounts', 'Guard', 'Gardener', 'Housekeeping', 'Electrician'],
      'Stable Manager': ['Stable Manager', 'Director', 'School Administrator', 'Super Admin', 'Ground Supervisor', 'Senior Executive Admin', 'Senior Executive Accounts', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar'],
      'Senior Executive Admin': ['Senior Executive Admin', 'Senior Executive Accounts', 'Director', 'School Administrator', 'Super Admin', 'Ground Supervisor', 'Stable Manager', 'Executive Admin'],
      'Senior Executive Accounts': ['Senior Executive Accounts', 'Senior Executive Admin', 'Director', 'School Administrator', 'Super Admin', 'Ground Supervisor', 'Stable Manager', 'Executive Accounts'],
      'Jamedar': ['Jamedar', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Guard': ['Guard', 'Ground Supervisor', 'Gardener', 'Housekeeping', 'Electrician'],
      'Groom': ['Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Riding Boy': ['Riding Boy', 'Groom', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Rider': ['Rider', 'Groom', 'Riding Boy', 'Instructor', 'Farrier', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Instructor': ['Instructor', 'Groom', 'Riding Boy', 'Rider', 'Farrier', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Farrier': ['Farrier', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Electrician': ['Electrician', 'Ground Supervisor', 'Guard', 'Gardener', 'Housekeeping'],
      'Gardener': ['Gardener', 'Ground Supervisor', 'Guard', 'Housekeeping', 'Electrician'],
      'Housekeeping': ['Housekeeping', 'Ground Supervisor', 'Guard', 'Gardener', 'Electrician'],
      'Executive Admin': ['Executive Admin', 'Senior Executive Admin', 'Director', 'School Administrator', 'Super Admin'],
      'Executive Accounts': ['Executive Accounts', 'Senior Executive Accounts', 'Director', 'School Administrator', 'Super Admin'],
    };
    return roleVisibility[userDesignation];
  };

  // Filter and sort employees based on user's role
  const getFilteredEmployeeList = (allEmployees) => {
    if (!user) return [];
    
    const visibleRoles = getVisibleRoles(user.designation);
    
    // Super Admin, Director, School Administrator see all
    if (visibleRoles !== null) {
      // Filter by visible roles
      allEmployees = allEmployees.filter(emp => visibleRoles.includes(emp.designation));
    }

    // Sort: pending first, then superiors, then self/peers, then subordinates
    const userHierarchy = getHierarchyInfo(user.designation);
    return allEmployees.sort((a, b) => {
      // 1. Pending employees first
      if (a.isApproved !== b.isApproved) {
        return a.isApproved ? 1 : -1; // Not approved comes first
      }

      // 2. Get sort priority for each employee
      const getPriority = (emp) => {
        if (userHierarchy.superiors.includes(emp.designation)) return 1; // Superiors
        if (emp.designation === user.designation) return 2; // Self/peers
        if (userHierarchy.subordinates.includes(emp.designation)) return 3; // Subordinates
        return 4; // Others
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 3. Within same priority, sort by name
      return a.fullName.localeCompare(b.fullName);
    });
  };

  const canCreateTasks = CAN_CREATE_TASKS.includes(user?.designation);

  useEffect(() => {
    loadTasks();
    loadHorses();
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Manage body scroll when modal is open
  useEffect(() => {
    if (viewingTaskId) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [viewingTaskId]);

  // All authenticated users can view tasks (assigned to them)
  // Only users in CAN_CREATE_TASKS can create new tasks

  const loadTasks = async () => {
    try {
      const response = await apiClient.get('/tasks');
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    }
  };

  const loadHorses = async () => {
    try {
      const response = await apiClient.get('/horses');
      setHorses(response.data.data || []);
    } catch (error) {
      console.error('Error loading horses:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await apiClient.get('/employees');
      const allEmployees = response.data.data || [];
      const filteredEmployees = getFilteredEmployeeList(allEmployees);
      setEmployees(filteredEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!formData.name || !formData.assignedEmployeeId || !formData.scheduledTime) {
        setMessage('✗ Please fill in all required fields');
        setLoading(false);
        return;
      }

      const response = await apiClient.post('/tasks', formData);
      
      setMessage('✓ Task created successfully!');
      setTasks([response.data, ...tasks]);
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        type: 'Feed',
        horseId: '',
        assignedEmployeeId: '',
        priority: 'Medium',
        scheduledTime: '',
        requiredProof: false,
      });
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      setMessage(`✗ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskId) => {
    setLoading(true);
    try {
      const response = await apiClient.patch(`/tasks/${taskId}`, { status: 'In Progress' });
      setTasks(tasks.map(t => t.id === taskId ? response.data : t));
      setMessage('✓ Task started!');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(`✗ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    // Find the task to check if proof is required
    const task = tasks.find(t => t.id === taskId);
    
    // If task requires proof, photo must be provided
    if (task?.requiredProof && !completionData.photoUrl) {
      setMessage('✗ Photo evidence is required for this task');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.patch(`/tasks/${taskId}`, { 
        status: 'Completed',
        completionNotes: completionData.notes,
        photoUrl: completionData.photoUrl
      });
      setTasks(tasks.map(t => t.id === taskId ? response.data : t));
      setMessage('✓ Task completed and submitted for approval!');
      setCompletionData({ photoUrl: '', notes: '' });
      setSelectedTaskId(null);
      setCompletionData({ photoUrl: '', notes: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`✗ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('✗ Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('✗ File size must be less than 5MB');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('Uploading file:', file.name);
      
      // Don't override Content-Type - let axios handle it automatically
      const response = await apiClient.post('/upload', formData);

      console.log('Upload response:', response.data);

      // Handle both { url } and { data: { url } } formats
      const uploadedUrl = response.data.url || response.data.data?.url;
      
      if (!uploadedUrl) {
        throw new Error('No URL returned from upload');
      }

      setCompletionData({
        ...completionData,
        photoUrl: uploadedUrl,
      });
      setMessage('✓ Photo uploaded successfully!');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Upload error details:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      setMessage(`✗ Error uploading photo: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTask = async (taskId) => {
    setLoading(true);
    try {
      const response = await apiClient.patch(`/tasks/${taskId}`, { status: 'Pending' });
      setTasks(tasks.map(t => t.id === taskId ? response.data : t));
      setMessage('✓ Task cancelled');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(`✗ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent':
        return '#d32f2f';
      case 'High':
        return '#f57c00';
      case 'Medium':
        return '#fbc02d';
      case 'Low':
        return '#388e3c';
      default:
        return '#666';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#1976d2';
      case 'In Progress':
        return '#f57c00';
      case 'Completed':
        return '#388e3c';
      default:
        return '#666';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const statusMatch = filterStatus === 'All' || task.status === filterStatus;
    const searchMatch = 
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getHorseName(task.horseId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getEmployeeName(task.assignedEmployeeId).toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });

  const getHorseName = (horseId) => {
    const horse = horses.find(h => h.id === horseId);
    return horse?.name || 'Unknown Horse';
  };

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp?.fullName || 'Unknown Employee';
  };

  return (
    <div className="tasks-page">
      <h1>📋 Tasks Management</h1>
      <p className="role-description">{getRoleTaskDescription(user?.designation)}</p>

      {message && (
        <div className={`message ${message.includes('✗') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {canCreateTasks && (
        <button 
          className="btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✕ Cancel' : '+ Create New Task'}
        </button>
      )}

      {canCreateTasks && showCreateForm && (
        <div className="task-create-form">
          <h2>Create New Task</h2>
          <form onSubmit={handleCreateTask}>
            <div className="form-group">
              <label>Task Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Feed Morning, Groom Shadow"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Task details and instructions"
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Task Type *</label>
                <select name="type" value={formData.type} onChange={handleInputChange} required>
                  {TASK_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select name="priority" value={formData.priority} onChange={handleInputChange}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Horse</label>
                <SearchableSelect
                  name="horseId"
                  value={formData.horseId}
                  onChange={handleInputChange}
                  placeholder="Select a horse (optional)"
                  options={[
                    { value: '', label: 'Select a horse (optional)' },
                    ...horses.map(h => ({ value: h.id, label: h.name }))
                  ]}
                />
              </div>

              <div className="form-group">
                <label>Assign To *</label>
                <SearchableSelect
                  name="assignedEmployeeId"
                  value={formData.assignedEmployeeId}
                  onChange={handleInputChange}
                  placeholder="Select employee"
                  required
                  options={[
                    { value: '', label: 'Select employee' },
                    ...employees.map(emp => ({ value: emp.id, label: `${emp.fullName} (${emp.designation})` }))
                  ]}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Scheduled Date & Time *</label>
                <input
                  type="datetime-local"
                  name="scheduledTime"
                  value={formData.scheduledTime}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="requiredProof"
                    checked={formData.requiredProof}
                    onChange={handleInputChange}
                  />
                  Make Photo Evidence Compulsory
                </label>
                <small style={{display: 'block', marginTop: '4px', color: '#666'}}>
                  If checked, the employee must upload a photo when completing this task
                </small>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </form>
        </div>
      )}

      <div className="task-filters">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All Tasks</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <input
          type="text"
          placeholder="🔍 Search tasks by name, type, status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="tasks-list">
        {filteredTasks.length === 0 ? (
          <p className="no-tasks">No tasks found</p>
        ) : (
          filteredTasks.map((task) => (
            <div key={task.id} className="task-card">
              <div className="task-header">
                <h3>{task.name}</h3>
                <span
                  className="priority-badge"
                  style={{ backgroundColor: getPriorityColor(task.priority) }}
                >
                  {task.priority}
                </span>
              </div>
              <div className="task-details">
                <p><strong>Type:</strong> {task.type}</p>
                <p><strong>Horse:</strong> {getHorseName(task.horseId)}</p>
                <p><strong>Assigned To:</strong> {getEmployeeName(task.assignedEmployeeId)}</p>
                <p>
                  <strong>Status:</strong>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(task.status) }}
                  >
                    {task.status}
                  </span>
                </p>
                {task.description && <p><strong>Details:</strong> {task.description}</p>}
              </div>

              {/* Action Buttons for Assigned Employee */}
              {!canCreateTasks && task.status === 'Pending' && (
                <div className="task-actions">
                  <button 
                    className="btn-start"
                    onClick={() => handleStartTask(task.id)}
                    disabled={loading}
                  >
                    ▶ Start Task
                  </button>
                </div>
              )}

              {!canCreateTasks && task.status === 'In Progress' && (
                <div className="task-actions">
                  <button 
                    className="btn-complete"
                    onClick={() => setSelectedTaskId(task.id)}
                    disabled={loading}
                  >
                    ✓ Complete Task
                  </button>
                  <button 
                    className="btn-cancel"
                    onClick={() => handleCancelTask(task.id)}
                    disabled={loading}
                  >
                    ✕ Cancel
                  </button>
                </div>
              )}

              {/* Review Button for Supervisors - Completed Tasks */}
              {CAN_REVIEW_TASKS.includes(user?.designation) && task.status === 'Completed' && (
                <div className="task-actions">
                  <button 
                    className="btn-review"
                    onClick={() => setViewingTaskId(task.id)}
                    disabled={loading}
                  >
                    👁️ View Evidence
                  </button>
                </div>
              )}

              {/* Task Completion Form */}
              {selectedTaskId === task.id && task.status === 'In Progress' && (
                <div className="task-completion-form">
                  <h4>Complete Task - Submit Evidence</h4>
                  <div className="form-group">
                    <label>
                      Photo Evidence 
                      {task.requiredProof && <span style={{color: 'red'}}> *</span>}
                      {completionData.photoUrl && <span className="photo-uploaded">✓ Photo uploaded</span>}
                    </label>
                    <div className="photo-upload-area">
                      <input
                        type="file"
                        id={`photo-${task.id}`}
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={loading}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor={`photo-${task.id}`} className="photo-upload-label">
                        <div className="upload-icon">📷</div>
                        <div className="upload-text">
                          {completionData.photoUrl ? 'Change Photo' : 'Click to Upload Photo'}
                        </div>
                        <small>JPG, PNG (Max 5MB)</small>
                      </label>
                      {completionData.photoUrl && (
                        <div className="photo-preview">
                          <img src={completionData.photoUrl} alt="Task evidence" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Completion Notes</label>
                    <textarea
                      placeholder="Add any notes about task completion..."
                      value={completionData.notes}
                      onChange={(e) => setCompletionData({...completionData, notes: e.target.value})}
                      rows="3"
                    />
                  </div>

                  <div className="form-actions">
                    <button 
                      className="btn-submit-task"
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={loading}
                    >
                      {loading ? 'Submitting...' : 'Submit for Approval'}
                    </button>
                    <button 
                      className="btn-cancel-form"
                      onClick={() => setSelectedTaskId(null)}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Task Evidence Review Modal - Rendered at Page Level */}
      {viewingTaskId && tasks.find(t => t.id === viewingTaskId)?.status === 'Completed' && (
        <div className="task-evidence-modal">
          <div className="modal-content">
            {(() => {
              const task = tasks.find(t => t.id === viewingTaskId);
              return (
                <>
                  <div className="modal-header">
                    <h3>Task Evidence Review</h3>
                    <button 
                      className="btn-close"
                      onClick={() => setViewingTaskId(null)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="modal-body">
                    <div className="evidence-section">
                      <h4>Task Information</h4>
                      <div className="info-grid">
                        <div className="info-item">
                          <label>Task Name</label>
                          <p>{task.name}</p>
                        </div>
                        <div className="info-item">
                          <label>Assigned To</label>
                          <p>{getEmployeeName(task.assignedEmployeeId)}</p>
                        </div>
                        <div className="info-item">
                          <label>Horse</label>
                          <p>{getHorseName(task.horseId)}</p>
                        </div>
                        <div className="info-item">
                          <label>Type</label>
                          <p>{task.type}</p>
                        </div>
                        <div className="info-item">
                          <label>Priority</label>
                          <p>{task.priority}</p>
                        </div>
                        <div className="info-item">
                          <label>Status</label>
                          <p>
                            <span 
                              className="status-badge"
                              style={{ backgroundColor: getStatusColor(task.status) }}
                            >
                              {task.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {task.proofImage && (
                      <div className="evidence-section">
                        <h4>📷 Evidence Photo</h4>
                        <div className="evidence-photo-container">
                          <img 
                            src={task.proofImage.startsWith('http') ? task.proofImage : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://horsestablebackend.vercel.app'}${task.proofImage}`} 
                            alt="Task evidence" 
                            className="evidence-photo"
                            onClick={() => setFullscreenImage(task.proofImage)}
                            onDoubleClick={() => setFullscreenImage(task.proofImage)}
                            style={{ cursor: 'pointer' }}
                            title="Click to view full size"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="18"%3EImage not found%3C/text%3E%3C/svg%3E'
                            }}
                          />
                        </div>
                        <p style={{fontSize: '0.8rem', color: '#999', marginTop: '0.5rem'}}>
                          Path: {task.proofImage}
                        </p>
                      </div>
                    )}

                    {task.description && (
                      <div className="evidence-section">
                        <h4>Completion Notes</h4>
                        <p className="notes-text">{task.description}</p>
                      </div>
                    )}

                    {task.completedTime && (
                      <div className="evidence-section">
                        <h4>Completion Time</h4>
                        <p>{new Date(task.completedTime).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <div className="modal-footer">
                    <button 
                      className="btn-close-modal"
                      onClick={() => setViewingTaskId(null)}
                    >
                      Close
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Fullscreen Image Viewer - Rendered at Page Level */}
      {fullscreenImage && (
        <div className="fullscreen-image-overlay">
          <button 
            className="fullscreen-close-btn"
            onClick={() => setFullscreenImage(null)}
            title="Close (ESC)"
          >
            ✕
          </button>
          <div className="fullscreen-image-container">
            <img 
              src={fullscreenImage.startsWith('http') ? fullscreenImage : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://horsestablebackend.vercel.app'}${fullscreenImage}`}
              alt="Full size view"
              className="fullscreen-image"
              onClick={() => setFullscreenImage(null)}
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
