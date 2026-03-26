import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import SearchableSelect from '../components/SearchableSelect';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import * as XLSX from 'xlsx';
import { BarChart3, Camera, Check, Clock3, Download, Package, Play, SlidersHorizontal, Thermometer, TrendingDown, Users, X } from 'lucide-react';

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

const getRoleTaskDescription = (role, t) => {
  if (CAN_CREATE_TASKS.includes(role)) {
    return t('Create and manage tasks - You can assign tasks to team members');
  }
  return t('View and complete your assigned tasks');
};

const TASK_CATEGORY_MAP = {
  'Health Check': 'PRIORITY ALPHA',
  Training: 'CONDITIONING',
  Exercise: 'TRAINING RUN',
  Feed: 'FEED PROTOCOL',
  Grooming: 'GROOMING',
  Maintenance: 'MAINTENANCE',
  Cleaning: 'DAILY CHECK',
  Other: 'SPECIAL TASK',
};

const TasksPageSkeleton = () => (
  <div className="tasks-page lovable-page-shell task-page-skeleton">
    <div className="page-header">
      <div>
        <Skeleton variant="text" width={180} height={28} />
        <Skeleton variant="text" width={240} height={10} style={{ marginTop: 10 }} />
        <Skeleton variant="text" width={320} height={12} style={{ marginTop: 12 }} />
      </div>
      <div className="lovable-header-actions">
        <Skeleton variant="rounded" width={156} height={40} />
        <Skeleton variant="rounded" width={86} height={40} />
        <div className="lovable-command-chip">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="lovable-command-copy">
            <Skeleton variant="text" width={134} height={12} />
            <Skeleton variant="text" width={96} height={10} />
          </div>
        </div>
      </div>
    </div>

    <div className="lovable-metric-strip">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="lovable-metric-card" key={index}>
          <Skeleton variant="text" width="54%" height={11} />
          <Skeleton variant="text" width="28%" height={30} style={{ marginTop: 12 }} />
          <Skeleton variant="text" width="82%" height={10} style={{ marginTop: 12 }} />
        </div>
      ))}
    </div>

    <div className="task-filters">
      <div className="lovable-pill-row">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" width={118} height={38} />
        ))}
      </div>
      <div className="task-filter-search">
        <Skeleton variant="rounded" width="100%" height={42} />
      </div>
    </div>

    <div className="lovable-grid-main">
      <div className="tasks-list task-skeleton-list">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="task-card task-card-lovable task-card-skeleton">
            <div className="task-card-media">
              <Skeleton variant="rectangular" width="100%" height="100%" />
            </div>
            <div className="task-card-main">
              <div className="task-card-topline">
                <Skeleton variant="rounded" width={112} height={24} />
                <Skeleton variant="text" width={82} height={10} />
              </div>
              <Skeleton variant="text" width="54%" height={18} style={{ marginTop: 14 }} />
              <Skeleton variant="text" width="34%" height={12} style={{ marginTop: 8 }} />
              <div className="task-card-meta" style={{ marginTop: 16 }}>
                <Skeleton variant="text" width={110} height={11} />
                <Skeleton variant="text" width={118} height={11} />
              </div>
              <div className="task-card-state-row" style={{ marginTop: 16 }}>
                <Skeleton variant="rounded" width={86} height={24} />
                <Skeleton variant="rounded" width={76} height={24} />
              </div>
              <Skeleton variant="text" width="88%" height={11} style={{ marginTop: 16 }} />
              <Skeleton variant="text" width="64%" height={11} style={{ marginTop: 8 }} />
              <div className="task-card-footer" style={{ marginTop: 18 }}>
                <Skeleton variant="text" width={132} height={11} />
                <Skeleton variant="rounded" width={126} height={38} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="lovable-side-stack">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="lovable-panel task-side-widget" key={index}>
            <div className="task-side-widget-head">
              <Skeleton variant="rounded" width={18} height={18} />
              <Skeleton variant="text" width={128} height={14} />
            </div>
            <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
              <Skeleton variant="text" width="100%" height={12} />
              <Skeleton variant="rounded" width="100%" height={8} />
              <Skeleton variant="text" width="82%" height={12} />
              <Skeleton variant="rounded" width="100%" height={8} />
              <Skeleton variant="text" width="76%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const TasksPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const [tasks, setTasks] = useState([]);
  const [horses, setHorses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
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
    let active = true;

    const loadInitialData = async () => {
      setPageLoading(true);
      await Promise.all([
        loadTasks(),
        loadHorses(),
        user ? loadEmployees() : Promise.resolve(),
      ]);

      if (active) {
        setPageLoading(false);
      }
    };

    loadInitialData();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
        setMessage('Error: Please fill in all required fields');
        setLoading(false);
        return;
      }

      const response = await apiClient.post('/tasks', formData);
      
      setMessage('Success: Task created successfully');
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
      setMessage(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskId) => {
    setLoading(true);
    try {
      const response = await apiClient.patch(`/tasks/${taskId}`, { status: 'In Progress' });
      setTasks(tasks.map(t => t.id === taskId ? response.data : t));
      setMessage('Success: Task started');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    // Find the task to check if proof is required
    const task = tasks.find(t => t.id === taskId);
    
    // If task requires proof, photo must be provided
    if (task?.requiredProof && !completionData.photoUrl) {
      setMessage('Error: Photo evidence is required for this task');
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
      setMessage('Success: Task completed and submitted for approval');
      setCompletionData({ photoUrl: '', notes: '' });
      setSelectedTaskId(null);
      setCompletionData({ photoUrl: '', notes: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('Error: Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Error: File size must be less than 5MB');
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
      setMessage('Success: Photo uploaded successfully');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Upload error details:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      setMessage(`Error uploading photo: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTask = async (taskId) => {
    setLoading(true);
    try {
      const response = await apiClient.patch(`/tasks/${taskId}`, { status: 'Pending' });
      setTasks(tasks.map(t => t.id === taskId ? response.data : t));
      setMessage('Success: Task cancelled');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
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

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'Completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;
  const pendingTasks = tasks.filter(task => task.status === 'Pending').length;
  const highPriorityTasks = tasks.filter(task => ['High', 'Urgent'].includes(task.priority)).length;
  const reviewReadyTasks = completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const statusPills = [
    { key: 'All', label: t('All Tasks'), count: totalTasks },
    { key: 'Pending', label: t('Pending'), count: pendingTasks },
    { key: 'In Progress', label: t('In Progress'), count: inProgressTasks },
    { key: 'Completed', label: t('Completed'), count: completedTasks },
  ];

  const observedStamp = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date()).toUpperCase();

  const getShiftLabel = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'MORNING ALPHA';
    if (hour < 17) return 'AFTERNOON BRAVO';
    return 'EVENING CHARLIE';
  };

  const supportMembers = employees.slice(0, 3).map((emp) => ({
    id: emp.id,
    initials: (emp.fullName || 'U')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
    name: emp.fullName,
    role: (emp.designation || 'Staff').toUpperCase(),
    online: emp.isApproved !== false,
  }));

  const getTaskCategory = (taskType) => TASK_CATEGORY_MAP[taskType] || (taskType || 'TASK').toUpperCase();

  const getHorseName = (horseId) => {
    const horse = horses.find(h => h.id === horseId);
    return horse?.name || 'Unknown Horse';
  };

  const getHorseProfileImage = (horseId) => {
    const horse = horses.find(h => h.id === horseId);
    return horse?.profileImage || '';
  };

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp?.fullName || 'Unknown Employee';
  };

  const getTaskTime = (scheduledTime) => {
    if (!scheduledTime) return 'No Time Set';
    const date = new Date(scheduledTime);
    if (Number.isNaN(date.getTime())) return 'No Time Set';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTaskSupportInfo = (task) => {
    if (task.requiredProof) return 'Evidence Required';
    if (task.priority === 'Urgent') return 'Critical Window';
    if (task.priority === 'High') return 'Supplies Ready';
    if (task.type === 'Training') return 'Arena Booked';
    if (task.type === 'Health Check') return 'Vitals Review';
    return 'Standard Flow';
  };

  const getTaskEvidenceImage = (task) => task.proofImage || task.photoUrl || '';

  const handleDownloadExcel = () => {
    if (!filteredTasks.length) { alert('No data to download'); return; }
    const data = filteredTasks.map(task => ({
      'Task Name': task.name,
      'Type': task.type,
      'Priority': task.priority,
      'Status': task.status,
      'Assigned To': getEmployeeName(task.assignedEmployeeId),
      'Horse': getHorseName(task.horseId),
      'Scheduled Time': task.scheduledTime || '',
      'Description': task.description || '',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, `Tasks_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;
  const reviewingTask = tasks.find((task) => task.id === viewingTaskId) || null;

  if (!p.manageTasks) return <Navigate to="/" replace />;
  if (pageLoading) return <TasksPageSkeleton />;

  return (
    <div className="tasks-page lovable-page-shell">
      <div className="page-header">
        <div>
          <div className="lovable-header-kicker">
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--lg" />
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--sm" />
            <span>{t('Operations Core')}</span>
          </div>
          <h1>{t('Tasks Management')}</h1>
          <p className="tasks-observed-line">{`OBSERVED: ${observedStamp} - SHIFT: ${getShiftLabel()}`}</p>
          <p className="role-description">{getRoleTaskDescription(user?.designation, t)}</p>
        </div>
        <div className="lovable-header-actions">
          {canCreateTasks && (
            <button 
              className="btn-primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Close Task Composer' : '+ Create New Task'}
            </button>
          )}
          <button className="btn-download" onClick={handleDownloadExcel}><Download size={14} />Excel</button>
          <div className="lovable-command-chip">
            <div className="lovable-command-ring">{completionRate}%</div>
            <div className="lovable-command-copy">
              <strong>{t('Operational Efficiency')}</strong>
              <span>{t('Progress Matrix')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lovable-metric-strip">
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Total Tasks')}</div>
          <div className="lovable-metric-card-value">{totalTasks}</div>
          <div className="lovable-metric-card-sub">{t('Current task load across the system')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('High Priority')}</div>
          <div className="lovable-metric-card-value">{highPriorityTasks}</div>
          <div className="lovable-metric-card-sub">{t('Tasks requiring close attention')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('In Motion')}</div>
          <div className="lovable-metric-card-value">{inProgressTasks}</div>
          <div className="lovable-metric-card-sub">{t('Tasks actively being worked right now')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Review Queue')}</div>
          <div className="lovable-metric-card-value">{reviewReadyTasks}</div>
          <div className="lovable-metric-card-sub">{t('Completions waiting for verification')}</div>
        </div>
      </div>

      {message && (
        <div className={`message ${message.startsWith('Error:') ? 'error' : 'success'}`}> 
          {message}
        </div>
      )}

      <div className="task-filters">
        <div className="lovable-pill-row">
          {statusPills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              className={`lovable-pill ${filterStatus === pill.key ? 'active' : ''}`}
              onClick={() => setFilterStatus(pill.key)}
            >
              <span>{pill.label}</span>
              <span className="lovable-pill-count">{pill.count}</span>
            </button>
          ))}
        </div>
        <div className="search-input task-filter-search">
          <span className="search-icon">
            <SlidersHorizontal size={16} />
          </span>
          <input
            type="text"
            placeholder={t('Filter task ID or horse name...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="lovable-grid-main">
        <div className="tasks-list">
          {filteredTasks.length === 0 ? (
            <p className="no-tasks">{t('No tasks found')}</p>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id} className="task-card task-card-lovable">
                <div className="task-card-media">
                  {getHorseProfileImage(task.horseId) ? (
                    <img
                      src={getHorseProfileImage(task.horseId)}
                      alt={getHorseName(task.horseId)}
                      className="task-card-image"
                    />
                  ) : (
                    <div className="task-card-placeholder">
                      <span>{getHorseName(task.horseId).charAt(0).toUpperCase()}</span>
                      <small>{t(task.type)}</small>
                    </div>
                  )}
                </div>

                <div className="task-card-main">
                  <div className="task-card-topline">
                    <span className="task-card-category">{getTaskCategory(task.type)}</span>
                    <span className="task-card-id">ID: {String(task.id).slice(0, 8).toUpperCase()}</span>
                  </div>

                  <h3 className="task-card-title">{task.name}</h3>
                  <p className="task-card-horse">{getHorseName(task.horseId)}</p>

                  <div className="task-card-meta">
                    <span><Clock3 size={14} /> {getTaskTime(task.scheduledTime)}</span>
                    <span><Package size={14} /> {getTaskSupportInfo(task)}</span>
                  </div>

                  <div className="task-card-state-row">
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(task.status) }}
                    >
                      {t(task.status)}
                    </span>
                    <span
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(task.priority) }}
                    >
                      {task.priority}
                    </span>
                  </div>

                  {task.description && (
                    <p className="task-card-copy">{task.description}</p>
                  )}

                  <div className="task-card-footer">
                    <span className="task-card-assigned">{t('Assigned')}: {getEmployeeName(task.assignedEmployeeId)}</span>

                    <div className="task-actions task-card-action-cluster">
                      {!canCreateTasks && task.status === 'Pending' && (
                        <button
                          className="btn-start"
                          onClick={() => handleStartTask(task.id)}
                          disabled={loading}
                        >
                          Start Task <Play size={14} />
                        </button>
                      )}

                      {!canCreateTasks && task.status === 'In Progress' && (
                        <>
                          <button
                            className="btn-complete"
                            onClick={() => setSelectedTaskId(task.id)}
                            disabled={loading}
                          >
                            Complete Task <Check size={14} />
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => handleCancelTask(task.id)}
                            disabled={loading}
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {CAN_REVIEW_TASKS.includes(user?.designation) && task.status === 'Completed' && (
                        <button
                          className="btn-review"
                          onClick={() => setViewingTaskId(task.id)}
                          disabled={loading}
                        >
                          Review Evidence
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lovable-side-stack">
          <div className="lovable-panel task-side-widget">
            <div className="task-side-widget-head">
              <BarChart3 size={18} />
              <h3>{t('Shift Focus')}</h3>
            </div>
            <div className="lovable-progress-row" style={{ marginTop: '16px' }}>
              <div className="lovable-progress-head">
                <span>{t('Completion')}</span>
                <strong>{completionRate}%</strong>
              </div>
              <div className="lovable-progress-bar"><span style={{ width: `${completionRate}%` }} /></div>
            </div>
            <div className="lovable-progress-row" style={{ marginTop: '14px' }}>
              <div className="lovable-progress-head">
                <span>{t('High Priority')}</span>
                <strong>{highPriorityTasks}</strong>
              </div>
              <div className="lovable-progress-bar"><span style={{ width: `${totalTasks ? Math.max(8, Math.round((highPriorityTasks / totalTasks) * 100)) : 0}%` }} /></div>
            </div>
            <div className="lovable-progress-row" style={{ marginTop: '14px' }}>
              <div className="lovable-progress-head">
                <span>{t('Review Queue')}</span>
                <strong>{reviewReadyTasks}</strong>
              </div>
              <div className="lovable-progress-bar"><span style={{ width: `${totalTasks ? Math.max(8, Math.round((reviewReadyTasks / totalTasks) * 100)) : 0}%` }} /></div>
            </div>
            <p className="task-side-note"><span>{t('Note')}:</span> {t('Heavy traffic in Arena B scheduled for 11:00.')}</p>
          </div>

          <div className="lovable-panel task-side-widget">
            <div className="task-side-widget-head">
              <Users size={18} />
              <h3>{t('Ground Support')}</h3>
            </div>
            <div className="task-support-list">
              {supportMembers.length > 0 ? supportMembers.map((member) => (
                <div key={member.id} className="task-support-person">
                  <div className="task-support-avatar">{member.initials}</div>
                  <div className="task-support-copy">
                    <strong>{member.name}</strong>
                    <span>{member.role}</span>
                  </div>
                  <i className={`task-support-dot ${member.online ? 'online' : ''}`} />
                </div>
              )) : (
                <div className="task-support-empty">{t('No support roster available yet')}</div>
              )}
            </div>
          </div>

          <div className="lovable-panel task-side-widget task-climate-widget">
            <p className="task-side-caption">{t('Environmental Sync')}</p>
            <div className="task-climate-row">
              <div>
                <p className="task-climate-temp">18.4C</p>
                <p className="task-climate-copy"><TrendingDown size={13} /> {t('Stable stasis optimal')}</p>
              </div>
              <Thermometer size={30} />
            </div>
          </div>
        </div>
      </div>

      {canCreateTasks && showCreateForm && (
        <Modal isOpen={showCreateForm} onClose={() => setShowCreateForm(false)}>
          <div className="modal-header">
            <h3>{t('Create New Task')}</h3>
            <button className="btn-close" onClick={() => setShowCreateForm(false)}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreateTask} className="modal-form">
            <div className="form-group">
              <label>Task Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Morning Feed, Groom Shadow"
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
                <SearchableSelect
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  options={TASK_TYPES.map(type => ({ value: type, label: type }))}
                  placeholder="Select task type..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Priority</label>
                <SearchableSelect
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  options={[
                    { value: 'Low', label: 'Low' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'High', label: 'High' },
                    { value: 'Urgent', label: 'Urgent' },
                  ]}
                  placeholder="Select priority..."
                />
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
                Require photo evidence
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedTask && selectedTask.status === 'In Progress' && (
        <Modal isOpen={Boolean(selectedTask)} onClose={() => setSelectedTaskId(null)}>
          <div className="modal-header">
            <h3>{t('Submit Task Evidence')}</h3>
            <button className="btn-close" onClick={() => setSelectedTaskId(null)}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-form">
            <div className="task-modal-context">
              <div>
                <label>{t('Task')}</label>
                <p>{selectedTask.name}</p>
              </div>
              <div>
                <label>{t('Horse')}</label>
                <p>{getHorseName(selectedTask.horseId)}</p>
              </div>
            </div>

            <div className="form-group">
              <label>
                Photo Evidence
                {selectedTask.requiredProof && <span className="task-required-mark"> *</span>}
              </label>
              <div className="photo-upload-area">
                <input
                  type="file"
                  id={`photo-${selectedTask.id}`}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
                <label htmlFor={`photo-${selectedTask.id}`} className="photo-upload-label">
                  <div className="upload-icon"><Camera size={20} /></div>
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
                onChange={(e) => setCompletionData({ ...completionData, notes: e.target.value })}
                rows="3"
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setSelectedTaskId(null)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-submit-task"
                onClick={() => handleCompleteTask(selectedTask.id)}
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {reviewingTask && reviewingTask.status === 'Completed' && (
        <Modal isOpen={Boolean(reviewingTask)} onClose={() => setViewingTaskId(null)} className="task-evidence-review-modal">
          <div className="modal-header">
            <h3>Task Evidence Review</h3>
            <button
              className="btn-close"
              onClick={() => setViewingTaskId(null)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="modal-body">
            <div className="evidence-section">
              <h4>Task Information</h4>
              <div className="info-grid">
                <div className="info-item">
                  <label>Task Name</label>
                  <p>{reviewingTask.name}</p>
                </div>
                <div className="info-item">
                  <label>Assigned To</label>
                  <p>{getEmployeeName(reviewingTask.assignedEmployeeId)}</p>
                </div>
                <div className="info-item">
                  <label>Horse</label>
                  <p>{getHorseName(reviewingTask.horseId)}</p>
                </div>
                <div className="info-item">
                  <label>Type</label>
                  <p>{reviewingTask.type}</p>
                </div>
                <div className="info-item">
                  <label>Priority</label>
                  <p>{reviewingTask.priority}</p>
                </div>
                <div className="info-item">
                  <label>Status</label>
                  <p>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(reviewingTask.status) }}
                    >
                      {t(reviewingTask.status)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {getTaskEvidenceImage(reviewingTask) && (
              <div className="evidence-section">
                <h4>Evidence Photo</h4>
                <div className="evidence-photo-container">
                  <img
                    src={getTaskEvidenceImage(reviewingTask).startsWith('http') ? getTaskEvidenceImage(reviewingTask) : `${process.env.REACT_APP_API_URL?.replace('/api', '')}${getTaskEvidenceImage(reviewingTask)}`}
                    alt="Task evidence"
                    className="evidence-photo"
                    onClick={() => setFullscreenImage(getTaskEvidenceImage(reviewingTask))}
                    onDoubleClick={() => setFullscreenImage(getTaskEvidenceImage(reviewingTask))}
                    style={{ cursor: 'pointer' }}
                    title="Click to view full size"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="18"%3EImage not found%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              </div>
            )}

            {(reviewingTask.completionNotes || reviewingTask.description) && (
              <div className="evidence-section">
                <h4>Completion Notes</h4>
                <p className="notes-text">{reviewingTask.completionNotes || reviewingTask.description}</p>
              </div>
            )}

            {reviewingTask.completedTime && (
              <div className="evidence-section">
                <h4>Completion Time</h4>
                <p>{new Date(reviewingTask.completedTime).toLocaleString()}</p>
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
        </Modal>
      )}

      {/* Fullscreen Image Viewer - Rendered at Page Level */}
      {fullscreenImage && (
        <div className="fullscreen-image-overlay">
          <button 
            className="fullscreen-close-btn"
            onClick={() => setFullscreenImage(null)}
            title="Close (ESC)"
          >
            <X size={18} />
          </button>
          <div className="fullscreen-image-container">
            <img 
              src={fullscreenImage.startsWith('http') ? fullscreenImage : `${process.env.REACT_APP_API_URL?.replace('/api', '')}${fullscreenImage}`}
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

