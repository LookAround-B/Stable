import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const ADMIN_ROLES = ['Super Admin', 'Director', 'School Administrator'];

/**
 * Shared permissions hook used by both the Sidebar and individual pages.
 * 
 * Logic:
 *  1. Admins always have full access.
 *  2. If a `permissions` object exists on the user (from the DB), use it.
 *  3. Otherwise fall back to the original designation-based defaults.
 *
 * Returns an object of boolean flags matching the sidebar menu items.
 */
export default function usePermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    const designation = user?.designation;
    const isAdmin = ADMIN_ROLES.includes(designation);
    const perms = user?.permissions || null;

    // Helper: admin → true, DB row → flag, else → designation fallback
    const has = (key, fallback) => {
      if (isAdmin) return true;
      if (perms) return !!perms[key];
      return fallback;
    };

    return {
      isAdmin,

      // Dashboard
      viewDashboard: has('viewDashboard', true),

      // Organization
      viewHorses: has('viewDashboard', designation !== 'Guard'),
      manageEmployees: has('manageEmployees', true),

      // Tasks & Approvals
      manageTasks: has('manageSchedules',
        ['Stable Manager', 'Instructor', 'Ground Supervisor', 'Jamedar'].includes(designation)),
      viewApprovals: has('manageSchedules', designation === 'Stable Manager'),
      viewMeetings: has('manageSchedules', designation === 'Stable Manager'),

      // Stable Operations
      viewMedicineLogs: has('manageInventory',
        designation === 'Jamedar' || designation === 'Stable Manager'),
      viewMedicineInventory: has('manageInventory',
        ['Stable Manager', 'Jamedar'].includes(designation)),
      viewHorseFeeds: has('manageInventory',
        ['Stable Manager', 'Ground Supervisor'].includes(designation)),
      viewFeedInventory: has('manageInventory',
        ['Stable Manager', 'Ground Supervisor'].includes(designation)),
      viewFarrierShoeing: has('manageSchedules',
        ['Stable Manager', 'Farrier', 'Ground Supervisor'].includes(designation)),
      viewTackInventory: has('manageInventory',
        ['Stable Manager', 'Jamedar', 'Ground Supervisor'].includes(designation)),
      viewFarrierInventory: has('manageInventory',
        ['Stable Manager', 'Farrier', 'Ground Supervisor'].includes(designation)),

      // Ground Operations
      viewGateEntry: has('manageSchedules',
        designation === 'Guard' || ['Stable Manager', 'Ground Supervisor'].includes(designation)),
      viewDailyAttendance: has('manageSchedules',
        ['Ground Supervisor', 'Groom'].includes(designation)),
      viewTeamAttendance: has('manageSchedules',
        ['Stable Manager', 'Ground Supervisor'].includes(designation)),
      viewGroomWorksheet: has('manageSchedules', designation === 'Groom'),
      viewInspections: has('manageSchedules',
        designation === 'Jamedar' || designation === 'Stable Manager'),
      viewHousekeepingInventory: has('manageInventory',
        ['Stable Manager', 'Ground Supervisor', 'Housekeeping'].includes(designation)),
      viewEIRS: has('manageSchedules',
        ['Instructor', 'Riding Boy', 'Rider', 'Groom'].includes(designation)),

      // Restaurant
      viewGroceriesInventory: has('manageInventory',
        ['Senior Executive Admin', 'Junior Executive Admin', 'Restaurant Manager'].includes(designation)),

      // Accounts & Finance
      viewInvoiceGeneration: has('viewPayroll', designation === 'Stable Manager'),
      viewExpenses: has('viewPayroll',
        ['Senior Executive Accounts', 'Executive Accounts'].includes(designation)),
      viewFines: has('issueFines', true),

      // System
      viewReports: has('viewReports', true),
      viewPermissions: isAdmin,
    };
  }, [user]);
}
