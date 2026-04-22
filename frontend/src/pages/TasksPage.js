import ReactDOM from "react-dom";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import apiClient from '../services/apiClient';
import Skeleton from '../components/Skeleton';
import SearchableSelect from '../components/SearchableSelect';
import TimePicker from '../components/shared/TimePicker';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { BarChart3, Camera, Check, Clock3, Package, Pencil, Play, Search, Thermometer, TrendingDown, Users, X } from 'lucide-react';
import {
  ACCOMMODATION_TASK_TYPE,
  BOOKING_CATEGORY_OPTIONS,
  BOOKING_DESTINATION_OPTIONS,
  BOOKING_SLOT_OPTIONS,
  BOOKING_TASK_TYPE,
  FUN_RIDE_OPTIONS,
  PAYMENT_SOURCE_OPTIONS,
  getAccommodationScheduleLabel,
  getBookingSlotLabel,
  getBookingSlotTime,
  getBookingSummary,
  isAccommodationBookingTask,
  isBookingTask,
  isRideBookingTask,
} from '../lib/taskBookings';

const TASK_TYPES = [
  'Feed',
  'Grooming',
  'Maintenance',
  'Exercise',
  'Health Check',
  'Training',
  'Cleaning',
  'Other',
  BOOKING_TASK_TYPE,
  ACCOMMODATION_TASK_TYPE,
];

const TASK_CATEGORY_MAP = {
  'Health Check': 'PRIORITY ALPHA',
  Training: 'CONDITIONING',
  Exercise: 'TRAINING RUN',
  Feed: 'FEED PROTOCOL',
  Grooming: 'GROOMING',
  Maintenance: 'MAINTENANCE',
  Cleaning: 'DAILY CHECK',
  Other: 'SPECIAL TASK',
  [BOOKING_TASK_TYPE]: 'BOOKING',
  [ACCOMMODATION_TASK_TYPE]: 'BOOKING',
};
const TASK_FILTERS = ['All Tasks', 'High Priority', 'Medication', 'Training'];

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

const formatDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatTimeInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatDateTimeLocalValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${formatDateInputValue(date)}T${formatTimeInputValue(date)}`;
};

const createDefaultTaskFormData = (taskType = 'Feed') => ({
  name: '',
  description: '',
  type: taskType,
  horseId: '',
  assignedEmployeeId: '',
  instructorId: '',
  customerName: '',
  customerPhone: '',
  paymentSource: '',
  leadPrice: '',
  isMembershipBooking: false,
  packageName: '',
  packageRideCount: '',
  packageMemberCount: '',
  packagePrice: '',
  gstAmount: '',
  bookingCategory: 'Normal Riding',
  bookingRideType: '',
  bookingDestination: '',
  bookingSlot: '',
  accommodationCheckIn: '',
  accommodationCheckOut: '',
  priority: 'Medium',
  startDate: '',
  endDate: '',
  scheduledTime: '',
  endTime: '',
  requiredProof: false,
});

const TasksPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const p = usePermissions();
  const taskCapabilities = user?.taskCapabilities || {};
  const isBookingsRoute = location.pathname === '/bookings';
  const canManageSchedules = p.isAdmin || Boolean(user?.permissions?.manageSchedules);
  const canCreateTasks = canManageSchedules || Boolean(taskCapabilities.canCreateTasks);
  const canManageBookings = canManageSchedules || Boolean(taskCapabilities.canManageBookings);
  const canCreateBookings = canCreateTasks || canManageBookings || p.manageBookings;
  const canReviewTasks = canManageSchedules || Boolean(taskCapabilities.canReviewTasks);
  const canWorkOnAssignedTasks =
    canManageSchedules || Boolean(taskCapabilities.canWorkOnAssignedTasks);
  const [tasks, setTasks] = useState([]);
  const [horses, setHorses] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All Tasks');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [viewingTaskId, setViewingTaskId] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [completionData, setCompletionData] = useState({
    photoUrl: '',
    notes: '',
  });
  
  const [formData, setFormData] = useState(() => createDefaultTaskFormData());

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

  useEffect(() => {
    let active = true;

    const loadInitialData = async () => {
      setPageLoading(true);
      await loadTasks();

      if (active) {
        setPageLoading(false);
      }

      void loadHorses();
      if (user) {
        void loadEmployees();
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

  // Page access is driven by effective task capabilities plus broad schedule access.

  useEffect(() => {
    if (!showCreateForm) return;

    if (horses.length === 0) {
      void loadHorses();
    }
    if (user && employees.length === 0) {
      void loadEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateForm, horses.length, employees.length, user?.id]);

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
      setAllEmployees(allEmployees);
      const filteredEmployees = getFilteredEmployeeList(allEmployees);
      setEmployees(filteredEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const resetTaskForm = (taskType = isBookingsRoute ? BOOKING_TASK_TYPE : 'Feed') => {
    setFormData(createDefaultTaskFormData(taskType));
    setEditingTaskId(null);
  };

  const isRideBookingFormTask = formData.type === BOOKING_TASK_TYPE;
  const isAccommodationBookingFormTask = formData.type === ACCOMMODATION_TASK_TYPE;
  const isBookingFormTask = isRideBookingFormTask || isAccommodationBookingFormTask;
  const instructorOptions = allEmployees
    .filter((emp) => emp.designation === 'Instructor' && emp.isApproved !== false)
    .map((emp) => ({ value: emp.id, label: emp.fullName }));
  const jamedharOptions = allEmployees
    .filter((emp) => emp.designation === 'Jamedar' && emp.isApproved !== false)
    .map((emp) => ({ value: emp.id, label: emp.fullName }));
  const housekeepingOptions = allEmployees
    .filter((emp) => emp.designation === 'Housekeeping' && emp.isApproved !== false)
    .map((emp) => ({ value: emp.id, label: emp.fullName }));

  const openCreateForm = () => {
    resetTaskForm(isBookingsRoute ? BOOKING_TASK_TYPE : 'Feed');
    setShowCreateForm(true);
  };

  const openEditForm = (task) => {
    const scheduledDate = task?.scheduledTime ? new Date(task.scheduledTime) : null;
    setFormData({
      name: task?.name || '',
      description: task?.description || '',
      type: task?.type || 'Feed',
      horseId: task?.horseId || '',
      assignedEmployeeId: task?.assignedEmployeeId || '',
      instructorId: task?.instructorId || '',
      customerName: task?.customerName || '',
      customerPhone: task?.customerPhone || '',
      paymentSource: task?.paymentSource || '',
      leadPrice: task?.leadPrice != null ? String(task.leadPrice) : '',
      isMembershipBooking: Boolean(task?.isMembershipBooking),
      packageName: task?.packageName || '',
      packageRideCount: task?.packageRideCount != null ? String(task.packageRideCount) : '',
      packageMemberCount: task?.packageMemberCount != null ? String(task.packageMemberCount) : '',
      packagePrice: task?.packagePrice != null ? String(task.packagePrice) : '',
      gstAmount: task?.gstAmount != null ? String(task.gstAmount) : '',
      bookingCategory: task?.bookingCategory || 'Normal Riding',
      bookingRideType: task?.bookingCategory === 'Fun Rides' ? (task?.bookingRideType || '') : '',
      bookingDestination: task?.bookingDestination || '',
      bookingSlot: task?.bookingSlot || '',
      accommodationCheckIn: formatDateTimeLocalValue(task?.accommodationCheckIn),
      accommodationCheckOut: formatDateTimeLocalValue(task?.accommodationCheckOut),
      priority: task?.priority || 'Medium',
      startDate: formatDateInputValue(scheduledDate),
      endDate: '',
      scheduledTime: formatTimeInputValue(scheduledDate),
      endTime: '',
      requiredProof: Boolean(task?.requiredProof),
    });
    setEditingTaskId(task.id);
    setShowCreateForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'type') {
      const nextIsRideBooking = value === BOOKING_TASK_TYPE;
      const nextIsAccommodationBooking = value === ACCOMMODATION_TASK_TYPE;
      const nextIsBooking = nextIsRideBooking || nextIsAccommodationBooking;
      setFormData((prev) => ({
        ...prev,
        type: value,
        name: nextIsBooking ? '' : prev.name,
        horseId: nextIsAccommodationBooking ? '' : prev.horseId,
        instructorId: nextIsRideBooking ? prev.instructorId : '',
        bookingCategory: nextIsRideBooking ? prev.bookingCategory : 'Normal Riding',
        bookingRideType: nextIsRideBooking ? prev.bookingRideType : '',
        bookingDestination: nextIsRideBooking ? prev.bookingDestination : '',
        bookingSlot: nextIsRideBooking ? prev.bookingSlot : '',
        customerName: nextIsBooking ? prev.customerName : '',
        customerPhone: nextIsBooking ? prev.customerPhone : '',
        paymentSource: nextIsBooking ? prev.paymentSource : '',
        leadPrice: nextIsBooking ? prev.leadPrice : '',
        isMembershipBooking: nextIsRideBooking ? prev.isMembershipBooking : false,
        packageName: nextIsRideBooking ? prev.packageName : '',
        packageRideCount: nextIsRideBooking ? prev.packageRideCount : '',
        packageMemberCount: nextIsRideBooking ? prev.packageMemberCount : '',
        packagePrice: nextIsRideBooking ? prev.packagePrice : '',
        gstAmount: nextIsRideBooking ? prev.gstAmount : '',
        accommodationCheckIn: nextIsAccommodationBooking ? prev.accommodationCheckIn : '',
        accommodationCheckOut: nextIsAccommodationBooking ? prev.accommodationCheckOut : '',
        requiredProof: nextIsBooking ? false : prev.requiredProof,
      }));
      return;
    }

    if (name === 'bookingCategory') {
      setFormData((prev) => ({
        ...prev,
        bookingCategory: value,
        bookingRideType: value === 'Fun Rides' ? prev.bookingRideType : '',
        bookingDestination: value === 'Fun Rides' ? prev.bookingDestination : '',
      }));
      return;
    }

    if (name === 'isMembershipBooking') {
      setFormData((prev) => ({
        ...prev,
        isMembershipBooking: checked,
        packageName: checked ? prev.packageName : '',
        packageRideCount: checked ? prev.packageRideCount : '',
        packageMemberCount: checked ? prev.packageMemberCount : '',
        packagePrice: checked ? prev.packagePrice : '',
        gstAmount: checked ? prev.gstAmount : '',
      }));
      return;
    }

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
      const trimmedCustomerName = formData.customerName.trim();
      const trimmedCustomerPhone = formData.customerPhone.trim();
      const needsMembershipFields =
        isRideBookingFormTask && Boolean(formData.isMembershipBooking);
      const needsFunRideDestination =
        isRideBookingFormTask && formData.bookingCategory === 'Fun Rides';

      if (
        !formData.assignedEmployeeId ||
        !formData.startDate ||
        (!isBookingFormTask && !formData.name) ||
        (isRideBookingFormTask &&
          (!formData.horseId ||
            !formData.instructorId ||
            !formData.bookingSlot ||
            !trimmedCustomerName ||
            !trimmedCustomerPhone ||
            !formData.paymentSource)) ||
        (isRideBookingFormTask &&
          formData.bookingCategory === 'Fun Rides' &&
          (!formData.bookingRideType || !formData.bookingDestination)) ||
        (needsMembershipFields &&
          (!formData.packageName ||
            !formData.packageRideCount ||
            !formData.packageMemberCount ||
            !formData.packagePrice ||
            formData.gstAmount === '')) ||
        (isAccommodationBookingFormTask &&
          (!trimmedCustomerName ||
            !trimmedCustomerPhone ||
            !formData.paymentSource ||
            !formData.accommodationCheckIn ||
            !formData.accommodationCheckOut))
      ) {
        setMessage('Error: Please fill in all required fields');
        setLoading(false);
        return;
      }

      const scheduledTimeValue = isRideBookingFormTask
        ? getBookingSlotTime(formData.bookingSlot)
        : (formData.scheduledTime || '09:00');

      if (!scheduledTimeValue) {
        setMessage('Error: Please select a valid booking slot');
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        ...(isBookingFormTask ? {} : { name: formData.name }),
        scheduledTime: formData.startDate ? `${formData.startDate}T${scheduledTimeValue}` : '',
        endTime: formData.endDate ? `${formData.endDate}T${formData.endTime || '17:00'}` : '',
        bookingRideType:
          isRideBookingFormTask && formData.bookingCategory === 'Normal Riding'
            ? 'Instructor Book'
            : formData.bookingRideType,
        horseId: isAccommodationBookingFormTask ? '' : formData.horseId,
        instructorId: isRideBookingFormTask ? formData.instructorId : '',
        customerName: isBookingFormTask ? trimmedCustomerName : '',
        customerPhone: isBookingFormTask ? trimmedCustomerPhone : '',
        paymentSource: isBookingFormTask ? formData.paymentSource : '',
        leadPrice: isBookingFormTask ? formData.leadPrice : '',
        isMembershipBooking: isRideBookingFormTask ? Boolean(formData.isMembershipBooking) : false,
        packageName: needsMembershipFields ? formData.packageName : '',
        packageRideCount: needsMembershipFields ? formData.packageRideCount : '',
        packageMemberCount: needsMembershipFields ? formData.packageMemberCount : '',
        packagePrice: needsMembershipFields ? formData.packagePrice : '',
        gstAmount: needsMembershipFields ? formData.gstAmount : '',
        bookingCategory: isRideBookingFormTask ? formData.bookingCategory : '',
        bookingDestination: needsFunRideDestination ? formData.bookingDestination : '',
        bookingSlot: isRideBookingFormTask ? formData.bookingSlot : '',
        accommodationCheckIn: isAccommodationBookingFormTask ? formData.accommodationCheckIn : '',
        accommodationCheckOut: isAccommodationBookingFormTask ? formData.accommodationCheckOut : '',
        requiredProof: isBookingFormTask ? false : formData.requiredProof,
      };
      const response = editingTaskId
        ? await apiClient.patch(`/tasks/${editingTaskId}`, payload)
        : await apiClient.post('/tasks', payload);

      const itemLabel = isRideBookingFormTask
        ? 'Riding booking'
        : isAccommodationBookingFormTask
          ? 'Accommodation booking'
          : 'Task';
      setMessage(`Success: ${itemLabel} ${editingTaskId ? 'updated' : 'created'} successfully`);
      setTasks((prev) => (
        editingTaskId
          ? prev.map((task) => (task.id === editingTaskId ? { ...task, ...response.data } : task))
          : [response.data, ...prev]
      ));
      setShowCreateForm(false);
      resetTaskForm();
      
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
      const response = await apiClient.patch(`/tasks/${taskId}/start`);
      const updatedTask = response.data?.data;
      setTasks(tasks.map(t => t.id === taskId ? updatedTask || t : t));
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
      const response = await apiClient.patch(`/tasks/${taskId}/submit-completion`, {
        proofImage: completionData.photoUrl,
        completionNotes: completionData.notes
      });
      const updatedTask = response.data?.data;
      setTasks(tasks.map(t => t.id === taskId ? updatedTask || t : t));
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
      const task = tasks.find((entry) => entry.id === taskId);
      const nextStatus = isBookingTask(task) ? 'Cancelled' : 'Pending';
      const response = await apiClient.patch(`/tasks/${taskId}`, { status: nextStatus });
      setTasks(tasks.map(t => t.id === taskId ? response.data : t));
      setMessage(`Success: ${isBookingTask(task) ? 'Booking cancelled' : 'Task cancelled'}`);
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTask = async (taskId) => {
    setLoading(true);
    try {
      const response = await apiClient.patch(`/tasks/${taskId}`, { status: 'Approved' });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, ...response.data } : t));
      setMessage('Success: Task approved');
      setViewingTaskId(null);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTask = async (taskId) => {
    setLoading(true);
    try {
      const response = await apiClient.patch(`/tasks/${taskId}`, { status: 'Rejected' });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, ...response.data } : t));
      setMessage('Task rejected and sent back');
      setViewingTaskId(null);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
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
      case 'Pending Review':
        return '#9c27b0';
      case 'Approved':
        return '#2e7d32';
      case 'Rejected':
        return '#c62828';
      case 'Cancelled':
        return '#64748b';
      default:
        return '#666';
    }
  };

  const visibleTasks = isBookingsRoute
    ? tasks.filter((task) => isBookingTask(task))
    : tasks;

  const filteredTasks = visibleTasks.filter(task => {
    const query = searchTerm.trim().toLowerCase();
    const filterMatch =
      isBookingsRoute ||
      activeFilter === 'All Tasks' ||
      (activeFilter === 'High Priority' && ['High', 'Urgent'].includes(task.priority)) ||
      (activeFilter === 'Medication' && ['Health Check', 'Medical'].includes(task.type)) ||
      (activeFilter === 'Training' && ['Training', 'Exercise'].includes(task.type));
    const taskId = String(task.id || '');
    const shortTaskId = taskId.slice(0, 8);
    const horseName = (task.horse?.name || '').toLowerCase();
    const bookingSummary = getBookingSummary(task).toLowerCase();
    const searchMatch =
      !query ||
      taskId.toLowerCase().includes(query) ||
      shortTaskId.toLowerCase().includes(query) ||
      horseName.includes(query) ||
      bookingSummary.includes(query) ||
      (task.name || '').toLowerCase().includes(query);
    return filterMatch && searchMatch;
  });

  const filterPills = TASK_FILTERS.map((filterKey) => ({
    key: filterKey,
    label: t(filterKey),
  }));
  const taskTypeOptions = (isBookingsRoute
    ? [BOOKING_TASK_TYPE, ACCOMMODATION_TASK_TYPE]
    : TASK_TYPES).map((type) => ({ value: type, label: type }));

  const observedStamp = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date()).toUpperCase();

  const getShiftLabel = () => {
    return shiftRange.label;
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

  const getTaskHorseName = (task) => {
    if (isAccommodationBookingTask(task)) {
      return task.customerName || 'Accommodation Guest';
    }
    return task.horse?.name || getHorseName(task.horseId);
  };

  const getHorseProfileImage = (horseId) => {
    const horse = horses.find(h => h.id === horseId);
    return horse?.profileImage || '';
  };

  const getTaskHorseProfileImage = (task) =>
    task.horse?.profileImage || getHorseProfileImage(task.horseId);

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp?.fullName || 'Unknown Employee';
  };

  const getTaskEmployeeName = (task) =>
    task.assignedEmployee?.fullName || getEmployeeName(task.assignedEmployeeId);

  const getHorseBookingHistory = (horseId) =>
    tasks
      .filter((task) =>
        isRideBookingTask(task) &&
        task.horseId === horseId &&
        task.status !== 'Cancelled'
      )
      .sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());

  const getTaskTime = (scheduledTime) => {
    if (!scheduledTime) return 'No Time Set';
    const date = new Date(scheduledTime);
    if (Number.isNaN(date.getTime())) return 'No Time Set';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTaskScheduleLabel = (task) => {
    if (isRideBookingTask(task) && task.bookingSlot) {
      return `Slot ${getBookingSlotLabel(task.bookingSlot)}`;
    }
    return getTaskTime(task.scheduledTime);
  };

  const getTaskScheduledDate = (task) => {
    const source = task?.scheduledTime || task?.scheduledDatetime || task?.scheduledDate;
    if (!source) return null;
    const date = new Date(source);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getTaskSupportInfo = (task) => {
    if (isAccommodationBookingTask(task)) {
      return getAccommodationScheduleLabel(task) || 'Accommodation booking';
    }
    if (isBookingTask(task)) return getBookingSummary(task) || 'Stable booking';
    if (task.requiredProof) return 'Evidence Required';
    if (task.priority === 'Urgent') return 'Critical Window';
    if (task.priority === 'High') return 'Supplies Ready';
    if (task.type === 'Training') return 'Arena Booked';
    if (task.type === 'Health Check') return 'Vitals Review';
    return 'Standard Flow';
  };

  const getTaskEvidenceImage = (task) => task.proofImage || task.photoUrl || '';

  const now = new Date();
  const currentHour = now.getHours();
  const shiftRange = currentHour < 12
    ? { start: 0, end: 11, label: 'MORNING ALPHA' }
    : currentHour < 17
      ? { start: 12, end: 16, label: 'AFTERNOON BRAVO' }
      : { start: 17, end: 23, label: 'EVENING CHARLIE' };

  const sameDayTasks = tasks.filter((task) => {
    const date = getTaskScheduledDate(task);
    if (!date) return false;
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  });

  const shiftTasks = sameDayTasks.filter((task) => {
    const date = getTaskScheduledDate(task);
    if (!date) return false;
    const hour = date.getHours();
    return hour >= shiftRange.start && hour <= shiftRange.end;
  });

  const shiftPendingTasks = shiftTasks.filter((task) => ['Pending', 'In Progress', 'Pending Review'].includes(task.status));
  const shiftCompletedTasks = shiftTasks.filter((task) => task.status === 'Completed');
  const shiftPriorityTasks = shiftTasks.filter((task) => ['High', 'Urgent'].includes(task.priority));
  const shiftReviewQueue = shiftTasks.filter((task) => task.status === 'Completed' || task.status === 'Pending Review');
  const shiftCompletionRate = shiftTasks.length ? Math.round((shiftCompletedTasks.length / shiftTasks.length) * 100) : 0;

  const assignedShiftTasks = shiftTasks.filter((task) => task.assignedEmployeeId).length;
  const proofRequiredShiftTasks = shiftTasks.filter((task) => task.requiredProof).length;
  const trainingShiftTasks = shiftTasks.filter((task) => ['Training', 'Exercise'].includes(task.type)).length;
  const healthShiftTasks = shiftTasks.filter((task) => ['Health Check', 'Medical'].includes(task.type)).length;
  const shiftCoverage = shiftTasks.length ? Math.round((assignedShiftTasks / shiftTasks.length) * 100) : 0;
  const syncScore = shiftTasks.length
    ? Math.max(
        34,
        Math.min(
          96,
          Math.round(
            shiftCoverage * 0.45 +
            shiftCompletionRate * 0.35 +
            ((shiftTasks.length - shiftPendingTasks.length) / shiftTasks.length) * 20
          )
        )
      )
    : 72;

  const environmentTrendUp = shiftPendingTasks.length > Math.max(2, shiftCompletedTasks.length);
  const environmentStatus = syncScore >= 80
    ? t('SHIFT FLOW ALIGNED')
    : syncScore >= 60
      ? t('MONITORING LOAD')
      : t('QUEUE PRESSURE ELEVATED');

  const focusNote = shiftTasks.length
    ? (
        shiftPriorityTasks.length > 0
          ? `${shiftPriorityTasks.length} high-priority task(s) scheduled in the current shift.`
          : shiftReviewQueue.length > 0
            ? `${shiftReviewQueue.length} task(s) awaiting review in the current shift.`
            : `Current shift schedule is stable with ${shiftPendingTasks.length} active task(s).`
      )
    : t('No live tasks scheduled in the current shift.');

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;
  const reviewingTask = tasks.find((task) => task.id === viewingTaskId) || null;
  const selectedInstructor = allEmployees.find((emp) => emp.id === formData.instructorId) || null;
  const selectedHorseBookingHistory = tasks
    .filter((task) =>
      isRideBookingTask(task) &&
      task.horseId === formData.horseId &&
      task.id !== editingTaskId &&
      task.status !== 'Cancelled'
    )
    .sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
  const bookingPreview = isAccommodationBookingFormTask
    ? [
        formData.customerName ? `Guest: ${formData.customerName}` : '',
        formData.customerPhone ? `Phone: ${formData.customerPhone}` : '',
        formData.accommodationCheckIn ? `Check-in: ${new Date(formData.accommodationCheckIn).toLocaleString()}` : '',
        formData.accommodationCheckOut ? `Check-out: ${new Date(formData.accommodationCheckOut).toLocaleString()}` : '',
        formData.leadPrice !== '' ? `Lead Price: ${formData.leadPrice}` : 'Lead Price: null',
        formData.paymentSource ? `Payment: ${formData.paymentSource}` : '',
      ].filter(Boolean).join(' | ')
    : isRideBookingFormTask
      ? [
          formData.bookingCategory,
          formData.bookingCategory === 'Fun Rides'
            ? (formData.bookingRideType || 'Select fun ride')
            : 'Instructor Book',
          formData.bookingDestination ? `Where: ${formData.bookingDestination}` : '',
          selectedInstructor?.fullName ? `Instructor: ${selectedInstructor.fullName}` : '',
          formData.customerName ? `Client: ${formData.customerName}` : '',
          formData.bookingSlot ? `Slot ${getBookingSlotLabel(formData.bookingSlot)}` : '',
          formData.leadPrice !== '' ? `Lead Price: ${formData.leadPrice}` : 'Lead Price: null',
          formData.paymentSource ? `Payment: ${formData.paymentSource}` : '',
          formData.isMembershipBooking && formData.packageName
            ? `Package: ${formData.packageName}`
            : '',
        ].filter(Boolean).join(' | ')
      : '';

  if (isBookingsRoute ? !p.manageBookings : !p.manageTasks) return <Navigate to="/dashboard" replace />;
  if (pageLoading) return <TasksPageSkeleton />;

  return (
    <div className="tasks-page lovable-page-shell space-y-6">
      <div className="tasks-page-header">
        <div>
          <div className="lovable-header-kicker">
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--lg" />
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--sm" />
            <span>{t(isBookingsRoute ? 'Booking Operations' : 'Task Operations')}</span>
          </div>
          <h1>{t(isBookingsRoute ? 'Bookings Management' : 'Tasks Management')}</h1>
          <p className="tasks-observed-line">{`OBSERVED: ${observedStamp} \u00B7 SHIFT: ${getShiftLabel()}`}</p>
        </div>
        <div className="lovable-header-actions">
          {(isBookingsRoute ? canCreateBookings : canCreateTasks) && (
            <button
              className="h-9 px-4 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-medium"
              onClick={openCreateForm}
              type="button"
            >
              + {t(isBookingsRoute ? 'Create New Booking' : 'Create New Task')}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            message.startsWith('Error:')
              ? 'bg-destructive/15 text-destructive border border-destructive/30'
              : 'bg-success/15 text-success border border-success/30'
          }`}
        >
          {message}
        </div>
      )}

      <div className="tasks-page-filters">
        {!isBookingsRoute && (
          <div className="lovable-pill-row">
            {filterPills.map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => setActiveFilter(pill.key)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === pill.key
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        )}
        <div className="task-filter-search relative w-full sm:w-72">
          <input
            type="text"
            placeholder={t(isBookingsRoute ? 'Search booking ID, horse, or client...' : 'Search task ID or horse name...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full pl-10 pr-4 rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      <div className="lovable-grid-main">
        <div className="tasks-list">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('No tasks found')}</div>
          ) : (
            filteredTasks.map((task) => {
              const horseImage = getTaskHorseProfileImage(task);
              const evidenceImage = getTaskEvidenceImage(task);
              const evidenceSrc = evidenceImage
                ? (evidenceImage.startsWith('http') ? evidenceImage : `${process.env.REACT_APP_API_URL?.replace('/api', '')}${evidenceImage}`)
                : null;
              const horseBookingHistory = isRideBookingTask(task) && task.horseId
                ? getHorseBookingHistory(task.horseId)
                : [];

              return (
                <div key={task.id} className="task-card task-card-lovable group bg-surface-container-high rounded-xl overflow-hidden edge-glow border border-primary/10 hover:border-primary/30 transition-colors">
                  <div
                    className={`task-card-media relative${evidenceSrc ? ' cursor-pointer' : ''}`}
                    onClick={evidenceSrc ? (e) => { e.stopPropagation(); setFullscreenImage(evidenceImage); } : undefined}
                    title={evidenceSrc ? 'Click to view full evidence photo' : undefined}
                  >
                    {evidenceSrc ? (
                      <>
                        <img
                          src={evidenceSrc}
                          alt="Task evidence"
                          className="task-card-image transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded leading-none">
                          Evidence
                        </span>
                      </>
                    ) : horseImage ? (
                      <img
                        src={horseImage}
                        alt={getTaskHorseName(task)}
                        className="task-card-image transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="task-card-placeholder">
                        <span>{getTaskHorseName(task).charAt(0).toUpperCase()}</span>
                        <small>{t(task.type)}</small>
                      </div>
                    )}
                  </div>

                  <div className="task-card-main">
                    <div className="task-card-content">
                      <div className="task-card-topline">
                        <span className="task-card-category">{getTaskCategory(task.type)}</span>
                        <span className="task-card-id">ID: {String(task.id).slice(0, 8).toUpperCase()}</span>
                      </div>

                      <h3 className="task-card-title">{task.name}</h3>
                      <p className="task-card-horse">{getTaskHorseName(task)}</p>
                      {isBookingTask(task) && (
                        <p className="text-xs text-muted-foreground mt-1">{getBookingSummary(task)}</p>
                      )}
                      {isRideBookingTask(task) && horseBookingHistory.length > 0 && (
                        <div className="mt-2 text-[11px] text-muted-foreground space-y-1">
                          <p>{`Outings: ${horseBookingHistory.length}`}</p>
                          <p>{horseBookingHistory.slice(0, 2).map((entry) => new Date(entry.scheduledTime).toLocaleString()).join(' | ')}</p>
                        </div>
                      )}

                      <div className="task-card-meta">
                        <span>
                          <Clock3 className="w-3.5 h-3.5 text-primary/60" />
                          {getTaskScheduleLabel(task)}
                        </span>
                        <span>
                          <Package className="w-3.5 h-3.5 text-primary/60" />
                          {getTaskSupportInfo(task)}
                        </span>
                      </div>
                    </div>

                    <div className="task-card-footer">
                      <span className="task-card-assigned">
                        {t('Assigned')}: <strong className="text-foreground">{getTaskEmployeeName(task)}</strong>
                      </span>
                      <div className="task-card-action-cluster flex gap-2 flex-wrap">
                        {canCreateBookings && task.createdById === user?.id && isBookingTask(task) && !['Cancelled', 'Approved', 'Rejected'].includes(task.status) && (
                          <>
                            <button
                              onClick={() => openEditForm(task)}
                              disabled={loading}
                              className="btn-review flex items-center gap-2"
                              type="button"
                            >
                              <Pencil className="w-3.5 h-3.5" /> {t('Edit Booking')}
                            </button>
                            <button
                              onClick={() => handleCancelTask(task.id)}
                              disabled={loading}
                              className="btn-cancel"
                              type="button"
                            >
                              {t('Cancel Booking')}
                            </button>
                          </>
                        )}
                        {!isBookingTask(task) && canWorkOnAssignedTasks && task.assignedEmployeeId === user?.id && task.status === 'Pending' && (
                          <button
                            onClick={() => handleStartTask(task.id)}
                            disabled={loading}
                            className="btn-start flex items-center gap-2"
                            type="button"
                          >
                            {t('Start Task')} <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                        {!isBookingTask(task) && canWorkOnAssignedTasks && task.assignedEmployeeId === user?.id && task.status === 'In Progress' && (
                          <>
                            <button
                              onClick={() => setSelectedTaskId(task.id)}
                              disabled={loading}
                              className="btn-complete flex items-center gap-2"
                              type="button"
                            >
                              {t('Complete')} <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancelTask(task.id)}
                              disabled={loading}
                              className="btn-cancel"
                              type="button"
                            >
                              {t('Cancel')}
                            </button>
                          </>
                        )}
                        {canReviewTasks && (task.status === 'Pending Review' || task.status === 'Completed') && (
                          <button
                            onClick={() => setViewingTaskId(task.id)}
                            disabled={loading}
                            className="btn-review"
                            type="button"
                          >
                            {t('Review Evidence')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="lovable-side-stack">
          <div className="lovable-panel task-side-widget task-side-widget--focus">
            <div className="task-side-widget-head">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3>{t('Shift Focus')}</h3>
            </div>
            <div className="space-y-3 mt-4">
              {[
                { label: t('Shift Completion'), value: `${shiftCompletionRate}%`, pct: shiftCompletionRate },
                {
                  label: t('High Priority'),
                  value: shiftPriorityTasks.length,
                  pct: shiftTasks.length ? Math.max(8, Math.round((shiftPriorityTasks.length / shiftTasks.length) * 100)) : 0,
                },
                {
                  label: t('Review Queue'),
                  value: shiftReviewQueue.length,
                  pct: shiftTasks.length ? Math.max(8, Math.round((shiftReviewQueue.length / shiftTasks.length) * 100)) : 0,
                },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{row.label}</span>
                    <span className="text-sm font-bold text-foreground">{row.value}</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-surface-container-high mt-1">
                    <div className="h-1 rounded-full bg-primary" style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              <span className="text-primary font-semibold">{t('Note')}:</span> {focusNote}
            </p>
          </div>

          <div className="lovable-panel task-side-widget task-side-widget--support">
            <div className="task-side-widget-head">
              <Users className="w-5 h-5 text-primary" />
              <h3>{t('Ground Support')}</h3>
            </div>
            <div className="space-y-3 mt-4">
              {supportMembers.length > 0 ? (
                supportMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {member.initials}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-primary">{member.role}</p>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full ${member.online ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t('No support roster available yet')}</p>
              )}
            </div>
          </div>

          <div className="lovable-panel task-side-widget task-side-widget--climate">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{t('Environmental Sync')}</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold text-foreground tracking-tight">{`${syncScore}%`}</p>
                <p className="text-xs text-primary mt-1 flex items-center gap-1">
                  <TrendingDown className={`w-3 h-3 ${environmentTrendUp ? 'rotate-180' : ''}`} /> {environmentStatus}
                </p>
              </div>
              <Thermometer className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{t('Coverage')}</p>
                <p className="text-sm font-bold text-foreground mt-1">{`${shiftCoverage}%`}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{t('Training')}</p>
                <p className="text-sm font-bold text-foreground mt-1">{trainingShiftTasks}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{t('Health')}</p>
                <p className="text-sm font-bold text-foreground mt-1">{healthShiftTasks + proofRequiredShiftTasks}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
{(isBookingsRoute ? canCreateBookings : canCreateTasks) && showCreateForm && ReactDOM.createPortal(
          <div className="efm-page-modal-overlay fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-background/80 px-4 pb-4 pt-[78px] sm:px-6 sm:pb-6 sm:pt-[92px]" onClick={() => { setShowCreateForm(false); resetTaskForm(); }}>
            <div className="my-auto flex w-full max-w-lg flex-col overflow-visible rounded-xl border border-border bg-surface-container-highest xl:max-w-5xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 sm:px-5 sm:py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground">
                  {t(
                    editingTaskId
                      ? isRideBookingFormTask
                        ? 'Edit Riding Booking'
                        : isAccommodationBookingFormTask
                          ? 'Edit Accommodation Booking'
                          : 'Edit Task'
                      : isRideBookingFormTask
                        ? 'Create Riding Booking'
                        : isAccommodationBookingFormTask
                          ? 'Create Accommodation Booking'
                          : 'Create New Task'
                  )}
                </h3>
                <button className="p-1 rounded-lg hover:bg-surface-container-high transition-colors text-muted-foreground mr-1" onClick={() => { setShowCreateForm(false); resetTaskForm(); }}><X size={18} /></button>
              </div>
              <div className="p-4 sm:px-5 sm:py-4">
                <form id="create-task-form" onSubmit={handleCreateTask} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 xl:gap-4">
                  {!isBookingFormTask && (
                  <div className="md:col-span-2 xl:col-span-3">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Task Name *")}</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Morning Feed, Groom Shadow" required className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                  )}
                  <div className="md:col-span-2 xl:col-span-3">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t(isBookingFormTask ? "Booking Notes" : "Description")}</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder={
                        isRideBookingFormTask
                          ? "Booking notes or special instructions"
                          : isAccommodationBookingFormTask
                            ? "Accommodation notes or special instructions"
                            : "Task details and instructions"
                      }
                      rows="3"
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Task Type *")}</label>
                    <SearchableSelect name="type" value={formData.type} onChange={handleInputChange} options={taskTypeOptions} placeholder={t(isBookingsRoute ? "Select booking type..." : "Select task type...")} required />
                  </div>
                  {!isAccommodationBookingFormTask && (
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t(isRideBookingFormTask ? "Horse *" : "Horse")}</label>
                      <SearchableSelect
                        name="horseId"
                        value={formData.horseId}
                        onChange={handleInputChange}
                        placeholder={t(isRideBookingFormTask ? "Select horse" : "Select a horse (optional)")}
                        options={[{ value: '', label: isRideBookingFormTask ? 'Select horse' : 'Select a horse (optional)' }, ...horses.map(h => ({ value: h.id, label: h.name }))]}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">
                      {t(isRideBookingFormTask ? "Jamedhar *" : isAccommodationBookingFormTask ? "Housekeeping *" : "Assign To *")}
                    </label>
                    <SearchableSelect
                      name="assignedEmployeeId"
                      value={formData.assignedEmployeeId}
                      onChange={handleInputChange}
                      placeholder={t(isRideBookingFormTask ? "Select Jamedhar" : isAccommodationBookingFormTask ? "Select housekeeper" : "Select employee")}
                      required
                      options={[
                        {
                          value: '',
                          label: isRideBookingFormTask
                            ? 'Select Jamedhar'
                            : isAccommodationBookingFormTask
                              ? 'Select housekeeper'
                              : 'Select employee',
                        },
                        ...(
                          isRideBookingFormTask
                            ? jamedharOptions
                            : isAccommodationBookingFormTask
                              ? housekeepingOptions
                              : employees.map(emp => ({ value: emp.id, label: `${emp.fullName} (${emp.designation})` }))
                        ),
                      ]}
                    />
                  </div>
                  {isBookingFormTask && (
                    <>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Client Name *")}</label>
                        <input type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} placeholder="Customer or guest name" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Phone Number *")}</label>
                        <input type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleInputChange} placeholder="Client phone number" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Payment Source *")}</label>
                        <SearchableSelect name="paymentSource" value={formData.paymentSource} onChange={handleInputChange} placeholder={t("Select payment source")} options={[{ value: '', label: 'Select payment source' }, ...PAYMENT_SOURCE_OPTIONS]} />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Lead Price")}</label>
                        <input type="number" min="0" step="0.01" name="leadPrice" value={formData.leadPrice} onChange={handleInputChange} placeholder="Leave empty for null" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
                      </div>
                    </>
                  )}
                  {isRideBookingFormTask && (
                    <>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Instructor *")}</label>
                        <SearchableSelect name="instructorId" value={formData.instructorId} onChange={handleInputChange} placeholder={t("Select instructor")} required options={[{ value: '', label: 'Select instructor' }, ...instructorOptions]} />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Booking Type *")}</label>
                        <SearchableSelect name="bookingCategory" value={formData.bookingCategory} onChange={handleInputChange} required options={BOOKING_CATEGORY_OPTIONS} />
                      </div>
                      {formData.bookingCategory === 'Fun Rides' && (
                        <>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Fun Ride *")}</label>
                            <SearchableSelect name="bookingRideType" value={formData.bookingRideType} onChange={handleInputChange} placeholder={t("Select ride type")} required options={[{ value: '', label: 'Select ride type' }, ...FUN_RIDE_OPTIONS]} />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Where To Go *")}</label>
                            <SearchableSelect name="bookingDestination" value={formData.bookingDestination} onChange={handleInputChange} placeholder={t("Select inside or outside")} required options={[{ value: '', label: 'Select inside or outside' }, ...BOOKING_DESTINATION_OPTIONS]} />
                          </div>
                        </>
                      )}
                      {formData.horseId && (
                        <div className="md:col-span-2 xl:col-span-3 rounded-lg border border-border bg-surface-container-high px-4 py-3 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{t('Horse Booking History')}:</span>{' '}
                          {selectedHorseBookingHistory.length === 0
                            ? 'No previous ride bookings found for this horse.'
                            : `${selectedHorseBookingHistory.length} outing(s) | ${selectedHorseBookingHistory
                                .slice(0, 5)
                                .map((entry) => new Date(entry.scheduledTime).toLocaleString())
                                .join(' | ')}`}
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer md:col-span-2 xl:col-span-3">
                        <input type="checkbox" name="isMembershipBooking" checked={formData.isMembershipBooking} onChange={handleInputChange} className="w-4 h-4 rounded accent-primary" />
                        Membership booking
                      </label>
                      {formData.isMembershipBooking && (
                        <>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Package Name *")}</label>
                            <input type="text" name="packageName" value={formData.packageName} onChange={handleInputChange} placeholder="Membership package" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("No. of Ridings *")}</label>
                            <input type="number" min="1" name="packageRideCount" value={formData.packageRideCount} onChange={handleInputChange} placeholder="Total ridings" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Members *")}</label>
                            <input type="number" min="1" name="packageMemberCount" value={formData.packageMemberCount} onChange={handleInputChange} placeholder="No. of members" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Package Price *")}</label>
                            <input type="number" min="0" step="0.01" name="packagePrice" value={formData.packagePrice} onChange={handleInputChange} placeholder="Package amount" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("GST *")}</label>
                            <input type="number" min="0" step="0.01" name="gstAmount" value={formData.gstAmount} onChange={handleInputChange} placeholder="GST amount" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
                          </div>
                        </>
                      )}
                    </>
                  )}
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t(isBookingFormTask ? "Booking Date *" : "Start Date *")}</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  {!isRideBookingFormTask ? (
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t(isAccommodationBookingFormTask ? "Booking Time *" : "Start Time")}</label>
                      <TimePicker
                        value={formData.scheduledTime}
                        onChange={(val) => setFormData(f => ({ ...f, scheduledTime: val }))}
                        placeholder={isAccommodationBookingFormTask ? "Pick booking time" : "Pick start time"}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Slot *")}</label>
                      <SearchableSelect name="bookingSlot" value={formData.bookingSlot} onChange={handleInputChange} placeholder={t("Select slot")} required options={[{ value: '', label: 'Select slot' }, ...BOOKING_SLOT_OPTIONS]} />
                    </div>
                  )}
                  {isAccommodationBookingFormTask && (
                    <>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Check-in *")}</label>
                        <input type="datetime-local" name="accommodationCheckIn" value={formData.accommodationCheckIn} onChange={handleInputChange} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Check-out *")}</label>
                        <input type="datetime-local" name="accommodationCheckOut" value={formData.accommodationCheckOut} onChange={handleInputChange} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                      </div>
                    </>
                  )}
                  {!isBookingFormTask && (
                    <>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("End Date")}</label>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData(f => ({ ...f, endDate: e.target.value }))}
                          className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("End Time")}</label>
                        <TimePicker
                          value={formData.endTime}
                          onChange={(val) => setFormData(f => ({ ...f, endTime: val }))}
                          placeholder="Pick end time"
                        />
                      </div>
                    </>
                  )}
                  {!isBookingFormTask && (
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer md:col-span-2 xl:col-span-2">
                      <input type="checkbox" name="requiredProof" checked={formData.requiredProof} onChange={handleInputChange} className="w-4 h-4 rounded accent-primary" />
                      Require photo evidence
                    </label>
                  )}
                  {isBookingFormTask && (
                    <div className="md:col-span-2 xl:col-span-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-primary">{t('Booking Summary')}:</span>{' '}
                      {bookingPreview || (isAccommodationBookingFormTask ? 'Add guest details' : 'Add booking details')}
                    </div>
                  )}
                </form>
              </div>
              <div className="p-4 sm:px-5 sm:py-4 border-t border-border flex justify-end gap-3 bg-surface-container-high/50">
                <button type="button" onClick={() => { setShowCreateForm(false); resetTaskForm(); }} disabled={loading} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-highest transition-colors">{t("Cancel")}</button>
                <button type="submit" form="create-task-form" disabled={loading} className="btn-save-primary">
                  {loading
                    ? (editingTaskId ? 'Saving...' : 'Creating...')
                    : editingTaskId
                      ? (isBookingFormTask ? 'Save Booking' : 'Save Task')
                      : (isBookingFormTask ? 'Create Booking' : 'Create Task')}
                </button>
              </div>
            </div>
          </div>,
          document.body
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
              <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t('Horse')}</p><p className="text-sm font-medium text-foreground mt-0.5">{getTaskHorseName(selectedTask)}</p></div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Photo Evidence {selectedTask.requiredProof && <span className="text-destructive">*</span>}</label>
                <input type="file" id={`photo-${selectedTask.id}`} accept="image/*" onChange={handlePhotoUpload} disabled={loading} className="hidden" />
                <label htmlFor={`photo-${selectedTask.id}`} className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-surface-container-high">
                  <Camera className="w-5 h-5 text-primary" />
                  <div><p className="text-sm font-medium text-foreground">{completionData.photoUrl ? 'Change Photo' : 'Click to Upload Photo'}</p><p className="text-xs text-muted-foreground">{t("JPG, PNG (Max 5MB)")}</p></div>
                </label>
                {completionData.photoUrl && <img src={completionData.photoUrl} alt="Task evidence" className="mt-3 max-w-[150px] max-h-[150px] rounded-lg border border-border" />}
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Completion Notes")}</label>
                <textarea placeholder={t("Add any notes about task completion...")} value={completionData.notes} onChange={(e) => setCompletionData({ ...completionData, notes: e.target.value })} rows="3" className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => handleCompleteTask(selectedTask.id)} disabled={loading} className="btn-save-primary flex-1">{loading ? 'Submitting...' : 'Submit for Approval'}</button>
                <button type="button" onClick={() => setSelectedTaskId(null)} disabled={loading} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">{t("Cancel")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewingTask && (reviewingTask.status === 'Pending Review' || reviewingTask.status === 'Completed') && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingTaskId(null)}>
          <div className="bg-surface-container-highest border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">{t("Task Evidence Review")}</h3>
              <button className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors" onClick={() => setViewingTaskId(null)}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{t("Task Information")}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Task Name', reviewingTask.name],
                    ['Assigned To', getTaskEmployeeName(reviewingTask)],
                    ['Horse', getTaskHorseName(reviewingTask)],
                    ['Type', reviewingTask.type],
                    ['Priority', reviewingTask.priority],
                  ].map(([label, val]) => (
                    <div key={label}><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p><p className="text-foreground font-medium mt-0.5">{val}</p></div>
                  ))}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t("Status")}</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border" style={{ backgroundColor: getStatusColor(reviewingTask.status) + '22', color: getStatusColor(reviewingTask.status), borderColor: getStatusColor(reviewingTask.status) + '44' }}>{t(reviewingTask.status)}</span>
                  </div>
                </div>
              </div>
              {getTaskEvidenceImage(reviewingTask) && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{t("Evidence Photo")}</p>
                  <img src={getTaskEvidenceImage(reviewingTask).startsWith('http') ? getTaskEvidenceImage(reviewingTask) : `${process.env.REACT_APP_API_URL?.replace('/api', '')}${getTaskEvidenceImage(reviewingTask)}`} alt="Task evidence" className="w-full max-h-[300px] object-contain rounded-lg border border-border cursor-pointer" onClick={() => setFullscreenImage(getTaskEvidenceImage(reviewingTask))} onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="18"%3EImage not found%3C/text%3E%3C/svg%3E'; }} />
                </div>
              )}
              {(reviewingTask.completionNotes || reviewingTask.description) && (
                <div className="p-3 rounded-lg bg-surface-container-high">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("Completion Notes")}</p>
                  <p className="text-sm text-foreground mt-1">{reviewingTask.completionNotes || reviewingTask.description}</p>
                </div>
              )}
              {reviewingTask.completedTime && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("Completion Time")}</p>
                  <p className="text-sm text-foreground mt-0.5 mono-data">{new Date(reviewingTask.completedTime).toLocaleString()}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-3">
              {(reviewingTask.status === 'Pending Review' || reviewingTask.status === 'Completed') && (
                <>
                  <button
                    onClick={() => handleApproveTask(reviewingTask.id)}
                    disabled={loading}
                    className="flex-1 h-10 rounded-lg bg-success/15 border border-success/40 text-success text-sm font-semibold hover:bg-success/25 transition-colors disabled:opacity-50"
                  >
                    ✔ Approve
                  </button>
                  <button
                    onClick={() => handleRejectTask(reviewingTask.id)}
                    disabled={loading}
                    className="flex-1 h-10 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-colors disabled:opacity-50"
                  >
                    ✗ Reject
                  </button>
                </>
              )}
              <button onClick={() => setViewingTaskId(null)} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">{t("Close")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
          onClick={() => setFullscreenImage(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setFullscreenImage(null)}
            title="Close (ESC)"
            type="button"
          >
            <X size={20} />
          </button>

          {/* Label */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <span className="bg-primary/80 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
              Task Evidence
            </span>
          </div>

          {/* Image */}
          <div
            className="relative max-w-[min(92vw,600px)] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullscreenImage.startsWith('http') ? fullscreenImage : `${process.env.REACT_APP_API_URL?.replace('/api', '')}${fullscreenImage}`}
              alt="Full size evidence"
              className="w-full h-full object-contain rounded-2xl shadow-2xl border border-white/10"
              style={{ maxHeight: '85vh' }}
              onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23222"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16" fill="%23666"%3EImage not found%3C/text%3E%3C/svg%3E'; }}
            />
            {/* Tap-to-close hint on mobile */}
            <p className="absolute -bottom-8 left-0 right-0 text-center text-white/40 text-xs sm:hidden">
              Tap outside to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
