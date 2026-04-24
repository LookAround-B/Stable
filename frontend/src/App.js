import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import PrivateRoute from './components/PrivateRoute';
import { Toaster } from './components/ui/sonner';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const SplashPage = lazy(() => import('./pages/SplashPage'));
const ProfileSetupPage = lazy(() => import('./pages/ProfileSetupPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const HorsesPage = lazy(() => import('./pages/HorsesPage'));
const HorseDetailPage = lazy(() => import('./pages/HorseDetailPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const DigitalAttendancePage = lazy(() => import('./pages/DigitalAttendancePage'));
const TeamAttendancePage = lazy(() => import('./pages/TeamAttendancePage'));
const DailyAttendancePage = lazy(() => import('./pages/DailyAttendancePage'));
const GateAttendancePage = lazy(() => import('./pages/GateAttendancePage'));
const GateEntryRegisterPage = lazy(() => import('./pages/GateEntryRegisterPage'));
const MedicineLogsPage = lazy(() => import('./pages/MedicineLogsPage'));
const GroomWorkSheetPage = lazy(() => import('./pages/GroomWorkSheetPage'));
const WorkRecordPage = lazy(() => import('./pages/WorkRecordPage'));
const FarrierShoeingPage = lazy(() => import('./pages/FarrierShoeingPage'));
const HorseCareTeamPage = lazy(() => import('./pages/HorseCareTeamPage'));
const DailyWorkRecordsPage = lazy(() => import('./pages/DailyWorkRecordsPage'));
const InvoiceGenerationPage = lazy(() => import('./pages/InvoiceGenerationPage'));
const HorseFeedsPage = lazy(() => import('./pages/HorseFeedsPage'));
const GrassBeddingPage = lazy(() => import('./pages/GrassBeddingPage'));
const FeedInventoryPage = lazy(() => import('./pages/FeedInventoryPage'));
const MedicineInventoryPage = lazy(() => import('./pages/MedicineInventoryPage'));
const GroceriesInventoryPage = lazy(() => import('./pages/GroceriesInventoryPage'));
const ExpensePage = lazy(() => import('./pages/ExpensePage'));
const InspectionPage = lazy(() => import('./pages/InspectionPage'));
const FinePage = lazy(() => import('./pages/FinePage'));
const ApprovalTasksPage = lazy(() => import('./pages/ApprovalTasksPage'));
const MyAssignedTasksPage = lazy(() => import('./pages/MyAssignedTasksPage'));
const MeetingPage = lazy(() => import('./pages/MeetingPage'));
const PermissionsPage = lazy(() => import('./pages/PermissionsPage'));
const TackInventoryPage = lazy(() => import('./pages/TackInventoryPage'));
const HousekeepingInventoryPage = lazy(() => import('./pages/HousekeepingInventoryPage'));
const FarrierInventoryPage = lazy(() => import('./pages/FarrierInventoryPage'));
const InstructorIncentivesPage = lazy(() => import('./pages/InstructorIncentivesPage'));
const EntityMapPage = lazy(() => import('./pages/EntityMapPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
    Loading...
  </div>
);

function App() {
  // Use a default Google Client ID - you should replace this with your actual Client ID
  // Get it from: https://console.cloud.google.com/
  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '123456789.apps.googleusercontent.com';

  return (
    <I18nProvider>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<SplashPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/profile-setup" element={<ProfileSetupPage />} />
              
              <Route element={<PrivateRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/horses" element={<HorsesPage />} />
                <Route path="/horses/:id" element={<HorseDetailPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/bookings" element={<TasksPage />} />
                <Route path="/tasks/:id" element={<TaskDetailPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/digital-attendance" element={<DigitalAttendancePage />} />
                <Route path="/team-attendance" element={<TeamAttendancePage />} />
                <Route path="/daily-attendance" element={<DailyAttendancePage />} />
                <Route path="/gate-attendance" element={<GateAttendancePage />} />
                <Route path="/gate-entry" element={<GateEntryRegisterPage />} />
                <Route path="/medicine-logs" element={<MedicineLogsPage />} />
                <Route path="/groom-worksheet" element={<GroomWorkSheetPage />} />
                <Route path="/farrier-shoeing" element={<FarrierShoeingPage />} />
                <Route path="/work-records" element={<WorkRecordPage />} />
                <Route path="/horse-care-team" element={<HorseCareTeamPage />} />
                <Route path="/daily-work-records" element={<DailyWorkRecordsPage />} />
                <Route path="/invoice-generation" element={<InvoiceGenerationPage />} />
                <Route path="/horse-feeds" element={<HorseFeedsPage />} />
                <Route path="/grass-bedding" element={<GrassBeddingPage />} />
                <Route path="/feed-inventory" element={<FeedInventoryPage />} />
                <Route path="/medicine-inventory" element={<MedicineInventoryPage />} />
                <Route path="/groceries-inventory" element={<GroceriesInventoryPage />} />
                <Route path="/expenses" element={<ExpensePage />} />
                <Route path="/inspections" element={<InspectionPage />} />
                <Route path="/fines" element={<FinePage />} />
                <Route path="/pending-approvals" element={<ApprovalTasksPage />} />
                <Route path="/my-assigned-tasks" element={<MyAssignedTasksPage />} />
                <Route path="/meetings" element={<MeetingPage />} />
                <Route path="/permissions" element={<PermissionsPage />} />
                <Route path="/tack-inventory" element={<TackInventoryPage />} />
                <Route path="/housekeeping-inventory" element={<HousekeepingInventoryPage />} />
                <Route path="/farrier-inventory" element={<FarrierInventoryPage />} />
                <Route path="/instructor-incentives" element={<InstructorIncentivesPage />} />
                <Route path="/entity-map" element={<EntityMapPage />} />
              </Route>
              
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        <Toaster position="top-right" richColors closeButton theme="system" />
      </Router>
    </AuthProvider>
    </GoogleOAuthProvider>
    </I18nProvider>
  );
}
export default App;
