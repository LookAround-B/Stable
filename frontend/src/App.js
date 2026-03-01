import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import HorsesPage from './pages/HorsesPage';
import HorseDetailPage from './pages/HorseDetailPage';
import TasksPage from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import EmployeesPage from './pages/EmployeesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AttendancePage from './pages/AttendancePage';
import DigitalAttendancePage from './pages/DigitalAttendancePage';
import TeamAttendancePage from './pages/TeamAttendancePage';
import DailyAttendancePage from './pages/DailyAttendancePage';
import GateAttendancePage from './pages/GateAttendancePage';
import GateEntryRegisterPage from './pages/GateEntryRegisterPage';
import MedicineLogsPage from './pages/MedicineLogsPage';
import GroomWorkSheetPage from './pages/GroomWorkSheetPage';
import HorseCareTeamPage from './pages/HorseCareTeamPage';
import DailyWorkRecordsPage from './pages/DailyWorkRecordsPage';
import InvoiceGenerationPage from './pages/InvoiceGenerationPage';
import HorseFeedsPage from './pages/HorseFeedsPage';
import FeedInventoryPage from './pages/FeedInventoryPage';
import MedicineInventoryPage from './pages/MedicineInventoryPage';
import GroceriesInventoryPage from './pages/GroceriesInventoryPage';
import ExpensePage from './pages/ExpensePage';
import InspectionPage from './pages/InspectionPage';
import FinePage from './pages/FinePage';
import ApprovalTasksPage from './pages/ApprovalTasksPage';
import MyAssignedTasksPage from './pages/MyAssignedTasksPage';
import MeetingPage from './pages/MeetingPage';
import NotFoundPage from './pages/NotFoundPage';
import './styles/App.css';

function App() {
  // Use a default Google Client ID - you should replace this with your actual Client ID
  // Get it from: https://console.cloud.google.com/
  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '123456789.apps.googleusercontent.com';

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile-setup" element={<ProfileSetupPage />} />
          
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/horses" element={<HorsesPage />} />
            <Route path="/horses/:id" element={<HorseDetailPage />} />
            <Route path="/tasks" element={<TasksPage />} />
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
            <Route path="/horse-care-team" element={<HorseCareTeamPage />} />
            <Route path="/daily-work-records" element={<DailyWorkRecordsPage />} />
            <Route path="/invoice-generation" element={<InvoiceGenerationPage />} />
            <Route path="/horse-feeds" element={<HorseFeedsPage />} />
            <Route path="/feed-inventory" element={<FeedInventoryPage />} />
            <Route path="/medicine-inventory" element={<MedicineInventoryPage />} />
            <Route path="/groceries-inventory" element={<GroceriesInventoryPage />} />
            <Route path="/expenses" element={<ExpensePage />} />
            <Route path="/inspections" element={<InspectionPage />} />
            <Route path="/fines" element={<FinePage />} />
            <Route path="/pending-approvals" element={<ApprovalTasksPage />} />
            <Route path="/my-assigned-tasks" element={<MyAssignedTasksPage />} />
            <Route path="/meetings" element={<MeetingPage />} />
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
    </GoogleOAuthProvider>
  );
}
export default App;