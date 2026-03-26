import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
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
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t('Task')} <span className="text-primary">{t('Management')}</span></h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            {`OBSERVED: ${observedStamp}`} &nbsp;·&nbsp; {`SHIFT: ${getShiftLabel()}`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{getRoleTaskDescription(user?.designation, t)}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {canCreateTasks && (
            <button className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all" onClick={() => setShowCreateForm(!showCreateForm)}>
              {showCreateForm ? '✕ Close' : '+ Create Task'}
            </button>
          )}
          <button className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2" onClick={handleDownloadExcel}><Download size={14} /> Excel</button>
          <div className="bg-surface-container-highest rounded-xl p-4 edge-glow flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">{completionRate}%</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t('Operational Efficiency')}</p>
              <p className="text-lg font-bold text-foreground">{t('Progress Matrix')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('Total Tasks'), value: totalTasks, sub: t('Current task load across the system') },
          { label: t('High Priority'), value: highPriorityTasks, sub: t('Tasks requiring close attention') },
          { label: t('In Motion'), value: inProgressTasks, sub: t('Tasks actively being worked right now') },
          { label: t('Review Queue'), value: reviewReadyTasks, sub: t('Completions waiting for verification') },
        ].map(k => (
          <div key={k.label} className="bg-surface-container-highest rounded-xl p-4 sm:p-5 edge-glow">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">{k.label}</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground mt-2 mono-data">{k.value}</p>
            <p className="text-xs mt-1 text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.startsWith('Error:') ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>
          {message}
        </div>
      )}

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {statusPills.map((pill) => (
            <button
              key={pill.key}
              type="button"
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
          <input
            type="text"
            placeholder={t('Filter task ID or horse name...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full px-4 pr-10 rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
          <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('No tasks found')}</div>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id} className="bg-surface-container-high rounded-xl overflow-hidden edge-glow border border-primary/10 hover:border-primary/30 transition-all duration-300 group">
                <div className="flex flex-col sm:flex-row">
                  <div className="relative w-full sm:w-44 h-48 sm:h-44 shrink-0 overflow-hidden">
                    {getHorseProfileImage(task.horseId) ? (
                      <img src={getHorseProfileImage(task.horseId)} alt={getHorseName(task.horseId)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-surface-container-highest flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-muted-foreground/30">{getHorseName(task.horseId).charAt(0).toUpperCase()}</span>
                        <small className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{t(task.type)}</small>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent sm:hidden" />
                  </div>

                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-primary/30 text-primary bg-primary/10">{getTaskCategory(task.type)}</span>
                        <span className="text-[10px] text-muted-foreground font-mono opacity-60">ID: {String(task.id).slice(0, 8).toUpperCase()}</span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground leading-tight">{task.name}</h3>
                      <p className="text-sm text-primary/90 mt-1 font-medium">{getHorseName(task.horseId)}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5 text-primary/60" /> {getTaskTime(task.scheduledTime)}</span>
                        <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-primary/60" /> {getTaskSupportInfo(task)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border" style={{ backgroundColor: getStatusColor(task.status) + '22', color: getStatusColor(task.status), borderColor: getStatusColor(task.status) + '44' }}>{t(task.status)}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border" style={{ backgroundColor: getPriorityColor(task.priority) + '22', color: getPriorityColor(task.priority), borderColor: getPriorityColor(task.priority) + '44' }}>{task.priority}</span>
                      </div>
                    </div>
                    {task.description && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{task.description}</p>}
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-muted-foreground">{t('Assigned')}: <strong className="text-foreground">{getEmployeeName(task.assignedEmployeeId)}</strong></span>
                      <div className="flex gap-2">
                        {!canCreateTasks && task.status === 'Pending' && (
                          <button onClick={() => handleStartTask(task.id)} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/20 bg-primary/5 text-sm font-semibold text-foreground hover:bg-primary/20 hover:border-primary/40 hover:text-primary transition-all active:scale-95">
                            Start Task <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                        {!canCreateTasks && task.status === 'In Progress' && (
                          <>
                            <button onClick={() => setSelectedTaskId(task.id)} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/15 text-success text-sm font-semibold hover:bg-success/25 transition-all">
                              Complete <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleCancelTask(task.id)} disabled={loading} className="px-3 py-2 rounded-lg bg-destructive/15 text-destructive text-xs font-medium hover:bg-destructive/25 transition-all">Cancel</button>
                          </>
                        )}
                        {CAN_REVIEW_TASKS.includes(user?.designation) && task.status === 'Completed' && (
                          <button onClick={() => setViewingTaskId(task.id)} disabled={loading} className="px-4 py-2 rounded-lg bg-primary/15 text-primary text-sm font-semibold hover:bg-primary/25 transition-all">Review Evidence</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
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
            <div className="space-y-3">
              {[
                { label: t('Completion'), value: completionRate, pct: completionRate },
                { label: t('High Priority'), value: highPriorityTasks, pct: totalTasks ? Math.max(8, Math.round((highPriorityTasks / totalTasks) * 100)) : 0 },
                { label: t('Review Queue'), value: reviewReadyTasks, pct: totalTasks ? Math.max(8, Math.round((reviewReadyTasks / totalTasks) * 100)) : 0 },
              ].map(row => (
                <div key={row.label}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{row.label}</span>
                    <span className="text-sm font-bold text-foreground">{typeof row.value === 'number' && row.label.includes('Completion') ? `${row.value}%` : row.value}</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-surface-container-high mt-1">
                    <div className="h-1 rounded-full bg-primary" style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground"><span className="text-primary font-semibold">{t('Note')}:</span> {t('Heavy traffic in Arena B scheduled for 11:00.')}</p>
          </div>

          {/* Ground Support */}
          <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">{t('Ground Support')}</h3>
            </div>
            <div className="space-y-3">
              {supportMembers.length > 0 ? supportMembers.map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-sm font-bold text-muted-foreground">{s.initials}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-primary">{s.role}</p>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full ${s.online ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">{t('No support roster available yet')}</p>
              )}
            </div>
          </div>

          {/* Environmental Sync */}
          <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{t('Environmental Sync')}</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold text-foreground tracking-tight">18.4°C</p>
                <p className="text-xs text-primary mt-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> {t('STABLE STASIS OPTIMAL')}</p>
              </div>
              <Thermometer className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </div>
        </div>
      </div>

      {canCreateTasks && showCreateForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateForm(false)}>
          <div className="bg-surface-container-highest border border-border rounded-xl p-7 w-full max-w-[560px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-foreground">{t('Create New Task')}</h3>
              <button className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowCreateForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Task Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Morning Feed, Groom Shadow" required className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Task details and instructions" rows="3" className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Task Type *</label>
                  <SearchableSelect name="type" value={formData.type} onChange={handleInputChange} options={TASK_TYPES.map(type => ({ value: type, label: type }))} placeholder="Select task type..." required />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Priority</label>
                  <SearchableSelect name="priority" value={formData.priority} onChange={handleInputChange} options={[{ value: 'Low', label: 'Low' }, { value: 'Medium', label: 'Medium' }, { value: 'High', label: 'High' }, { value: 'Urgent', label: 'Urgent' }]} placeholder="Select priority..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Horse</label>
                  <SearchableSelect name="horseId" value={formData.horseId} onChange={handleInputChange} placeholder="Select a horse (optional)" options={[{ value: '', label: 'Select a horse (optional)' }, ...horses.map(h => ({ value: h.id, label: h.name }))]} />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Assign To *</label>
                  <SearchableSelect name="assignedEmployeeId" value={formData.assignedEmployeeId} onChange={handleInputChange} placeholder="Select employee" required options={[{ value: '', label: 'Select employee' }, ...employees.map(emp => ({ value: emp.id, label: `${emp.fullName} (${emp.designation})` }))]} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Scheduled Date & Time *</label>
                <input type="datetime-local" name="scheduledTime" value={formData.scheduledTime} onChange={handleInputChange} required className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" name="requiredProof" checked={formData.requiredProof} onChange={handleInputChange} className="w-4 h-4 rounded accent-primary" />
                Require photo evidence
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 h-10 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase">{loading ? 'Creating...' : 'Create Task'}</button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTask && selectedTask.status === 'In Progress' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTaskId(null)}>
          <div className="bg-surface-container-highest border border-border rounded-xl p-7 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-foreground">{t('Submit Task Evidence')}</h3>
              <button className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSelectedTaskId(null)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-surface-container-high border border-border mb-4">
              <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t('Task')}</p><p className="text-sm font-medium text-foreground mt-0.5">{selectedTask.name}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t('Horse')}</p><p className="text-sm font-medium text-foreground mt-0.5">{getHorseName(selectedTask.horseId)}</p></div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Photo Evidence {selectedTask.requiredProof && <span className="text-destructive">*</span>}</label>
                <input type="file" id={`photo-${selectedTask.id}`} accept="image/*" onChange={handlePhotoUpload} disabled={loading} className="hidden" />
                <label htmlFor={`photo-${selectedTask.id}`} className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-surface-container-high">
                  <Camera className="w-5 h-5 text-primary" />
                  <div><p className="text-sm font-medium text-foreground">{completionData.photoUrl ? 'Change Photo' : 'Click to Upload Photo'}</p><p className="text-xs text-muted-foreground">JPG, PNG (Max 5MB)</p></div>
                </label>
                {completionData.photoUrl && <img src={completionData.photoUrl} alt="Task evidence" className="mt-3 max-w-[150px] max-h-[150px] rounded-lg border border-border" />}
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Completion Notes</label>
                <textarea placeholder="Add any notes about task completion..." value={completionData.notes} onChange={(e) => setCompletionData({ ...completionData, notes: e.target.value })} rows="3" className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => handleCompleteTask(selectedTask.id)} disabled={loading} className="flex-1 h-10 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase">{loading ? 'Submitting...' : 'Submit for Approval'}</button>
                <button type="button" onClick={() => setSelectedTaskId(null)} disabled={loading} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewingTask && reviewingTask.status === 'Completed' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingTaskId(null)}>
          <div className="bg-surface-container-highest border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">Task Evidence Review</h3>
              <button className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors" onClick={() => setViewingTaskId(null)}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Task Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Task Name', reviewingTask.name],
                    ['Assigned To', getEmployeeName(reviewingTask.assignedEmployeeId)],
                    ['Horse', getHorseName(reviewingTask.horseId)],
                    ['Type', reviewingTask.type],
                    ['Priority', reviewingTask.priority],
                  ].map(([label, val]) => (
                    <div key={label}><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p><p className="text-foreground font-medium mt-0.5">{val}</p></div>
                  ))}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border" style={{ backgroundColor: getStatusColor(reviewingTask.status) + '22', color: getStatusColor(reviewingTask.status), borderColor: getStatusColor(reviewingTask.status) + '44' }}>{t(reviewingTask.status)}</span>
                  </div>
                </div>
              </div>
              {getTaskEvidenceImage(reviewingTask) && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Evidence Photo</p>
                  <img src={getTaskEvidenceImage(reviewingTask).startsWith('http') ? getTaskEvidenceImage(reviewingTask) : `${process.env.REACT_APP_API_URL?.replace('/api', '')}${getTaskEvidenceImage(reviewingTask)}`} alt="Task evidence" className="w-full max-h-[300px] object-contain rounded-lg border border-border cursor-pointer" onClick={() => setFullscreenImage(getTaskEvidenceImage(reviewingTask))} onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="18"%3EImage not found%3C/text%3E%3C/svg%3E'; }} />
                </div>
              )}
              {(reviewingTask.completionNotes || reviewingTask.description) && (
                <div className="p-3 rounded-lg bg-surface-container-high">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Completion Notes</p>
                  <p className="text-sm text-foreground mt-1">{reviewingTask.completionNotes || reviewingTask.description}</p>
                </div>
              )}
              {reviewingTask.completedTime && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Completion Time</p>
                  <p className="text-sm text-foreground mt-0.5 mono-data">{new Date(reviewingTask.completedTime).toLocaleString()}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border">
              <button onClick={() => setViewingTaskId(null)} className="w-full h-10 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center" onClick={() => setFullscreenImage(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" onClick={() => setFullscreenImage(null)} title="Close (ESC)"><X size={18} /></button>
          <img src={fullscreenImage.startsWith('http') ? fullscreenImage : `${process.env.REACT_APP_API_URL?.replace('/api', '')}${fullscreenImage}`} alt="Full size view" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" onClick={() => setFullscreenImage(null)} onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E'; }} />
        </div>
      )}
    </div>
  );
};

export default TasksPage;
