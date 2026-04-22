import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const ADMIN_ROLES = ['Super Admin', 'Director', 'School Administrator'];
const BOOKING_ROLES = [
  'Junior Executive Admin',
  'Executive Admin',
  'Senior Executive Admin',
];

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
    const isBookingRole = BOOKING_ROLES.includes(designation);
    const perms = user?.permissions || null;
    const taskCapabilities = user?.taskCapabilities || {};

    const has = (key, fallback) => {
      if (isAdmin) return true;
      if (perms && Object.prototype.hasOwnProperty.call(perms, key)) return !!perms[key];
      return fallback;
    };

    const hasAny = (keys, fallback) => {
      if (isAdmin) return true;
      if (perms) {
        return keys.some((key) => Object.prototype.hasOwnProperty.call(perms, key) && !!perms[key]);
      }
      return fallback;
    };

    return {
      isAdmin,

      // Dashboard
      viewDashboard: true,

      // Organization
      viewHorses: hasAny(
        ['manageEmployees', 'manageSchedules', 'manageInventory'],
        designation !== 'Guard'
      ) || isBookingRole || !!taskCapabilities.canManageBookings,
      manageEmployees: has('manageEmployees', true),
      manageHorseTeams: hasAny(
        ['manageEmployees', 'manageSchedules'],
        designation === 'Stable Manager'
      ) || !!taskCapabilities.canManageHorseTeams,

      // Tasks & Approvals
      manageTasks:
        has(
          'manageSchedules',
          ['Stable Manager', 'Instructor', 'Ground Supervisor', 'Jamedar'].includes(designation)
        ) ||
        !!taskCapabilities.canViewTasks ||
        !!taskCapabilities.canCreateTasks ||
        !!taskCapabilities.canReviewTasks ||
        !!taskCapabilities.canWorkOnAssignedTasks,
      manageBookings:
        isBookingRole ||
        has('manageSchedules', false) ||
        !!taskCapabilities.canManageBookings ||
        !!taskCapabilities.canCreateTasks ||
        !!taskCapabilities.canViewTasks,
      viewApprovals:
        has('manageSchedules', designation === 'Stable Manager') ||
        !!taskCapabilities.canReviewTasks,
      viewMeetings: has('manageSchedules', designation === 'Stable Manager'),

      // Stable Operations
      viewMedicineLogs:
        has(
          'manageInventory',
          designation === 'Jamedar' || designation === 'Stable Manager'
        ) ||
        !!taskCapabilities.canViewMedicineLogs ||
        !!taskCapabilities.canRecordMedicineLogs ||
        !!taskCapabilities.canApproveMedicineLogs,
      viewMedicineInventory: has(
        'manageInventory',
        ['Stable Manager', 'Jamedar'].includes(designation)
      ),
      viewHorseFeeds: has(
        'manageInventory',
        ['Stable Manager', 'Ground Supervisor'].includes(designation)
      ) || !!taskCapabilities.canViewHorseFeeds || !!taskCapabilities.canRecordHorseFeeds,
      viewFeedInventory: has(
        'manageInventory',
        ['Stable Manager', 'Ground Supervisor'].includes(designation)
      ),
      viewFarrierShoeing: has(
        'manageSchedules',
        ['Stable Manager', 'Farrier', 'Ground Supervisor'].includes(designation)
      ) || !!taskCapabilities.canViewFarrierShoeing || !!taskCapabilities.canRecordFarrierShoeing,
      viewTackInventory: has(
        'manageInventory',
        ['Stable Manager', 'Jamedar', 'Ground Supervisor'].includes(designation)
      ),
      viewGrassAndBedding: has(
        'manageInventory',
        ['Stable Manager', 'Instructor', 'Ground Supervisor', 'Jamedar'].includes(designation)
      ),
      viewFarrierInventory: has(
        'manageInventory',
        ['Stable Manager', 'Farrier', 'Ground Supervisor'].includes(designation)
      ),

      // Ground Operations
      viewGateEntry: has(
        'manageSchedules',
        designation === 'Guard' || ['Stable Manager', 'Ground Supervisor'].includes(designation)
      ),
      viewDailyAttendance: has(
        'manageSchedules',
        ['Ground Supervisor', 'Groom'].includes(designation)
      ),
      viewTeamAttendance: has(
        'manageSchedules',
        ['Stable Manager', 'Ground Supervisor'].includes(designation)
      ),
      viewGroomWorksheet: has('manageSchedules', designation === 'Groom'),
      viewInspections: has(
        'manageSchedules',
        designation === 'Jamedar' || designation === 'Stable Manager'
      ) ||
        !!taskCapabilities.canViewInspections ||
        !!taskCapabilities.canViewAllInspections ||
        !!taskCapabilities.canCreateInspections ||
        !!taskCapabilities.canResolveInspections ||
        !!taskCapabilities.canViewTeamRoundChecks ||
        !!taskCapabilities.canUpdateOwnRoundChecks,
      viewHousekeepingInventory: has(
        'manageInventory',
        ['Stable Manager', 'Ground Supervisor', 'Housekeeping'].includes(designation)
      ),
      viewEIRS: has(
        'manageSchedules',
        ['Instructor', 'Riding Boy', 'Rider', 'Groom'].includes(designation)
      ),

      // Restaurant
      viewGroceriesInventory: has(
        'manageInventory',
        ['Senior Executive Admin', 'Junior Executive Admin', 'Restaurant Manager'].includes(designation)
      ),

      // Accounts & Finance
      viewInvoiceGeneration: has('viewPayroll', designation === 'Stable Manager'),
      viewExpenses: has(
        'viewPayroll',
        ['Senior Executive Accounts', 'Executive Accounts'].includes(designation)
      ),
      viewFines: has('issueFines', true),

      // System
      viewReports: has('viewReports', true),
      viewPermissions: isAdmin,
      viewNotifications: true,
    };
  }, [user]);
}
