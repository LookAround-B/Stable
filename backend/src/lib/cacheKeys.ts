import { buildCacheKey, invalidateCacheByPrefix } from '@/lib/cache'

export const CACHE_TTL_SECONDS = {
  authMe: 120,
  authPermissions: 120,
  authTaskPermissions: 120,
  authTaskCapabilities: 120,
  employeesList: 120,
  employeesActive: 300,
  employeeDetail: 120,
  horsesList: 120,
  settings: 300,
  permissionsMatrix: 300,
  taskPermissionOverrides: 180,
  tasksList: 45,
  taskDetail: 45,
  myTasksList: 30,
  notificationsList: 30,
  notificationsUnreadCount: 15,
} as const

export const cacheKeys = {
  authMe: (employeeId: string) => buildCacheKey('auth:me', { employeeId }),
  authPermissionMap: (employeeId: string) =>
    buildCacheKey('auth:permission-map', { employeeId }),
  authTaskPermissionMap: (employeeId: string, designation: string) =>
    buildCacheKey('auth:task-permission-map', { employeeId, designation }),
  authTaskCapabilities: (employeeId: string, designation: string) =>
    buildCacheKey('auth:task-capabilities', { employeeId, designation }),
  employeesList: (params: Record<string, unknown>) =>
    buildCacheKey('employees:list', params),
  employeesActive: () => buildCacheKey('employees:active'),
  employeeDetail: (employeeId: string) =>
    buildCacheKey('employees:detail', { employeeId }),
  horsesList: (params: Record<string, unknown>) =>
    buildCacheKey('horses:list', params),
  settings: () => buildCacheKey('settings:all'),
  permissionsMatrix: () => buildCacheKey('permissions:matrix'),
  taskPermissionOverrides: (employeeId: string) =>
    buildCacheKey('permissions:task-overrides', { employeeId }),
  tasksList: (employeeId: string, params: Record<string, unknown>) =>
    buildCacheKey('tasks:list', { employeeId, ...params }),
  taskDetail: (taskId: string) => buildCacheKey('tasks:detail', { taskId }),
  myTasksList: (employeeId: string, params: Record<string, unknown>) =>
    buildCacheKey('tasks:my-list', { employeeId, ...params }),
  notificationsList: (
    employeeId: string,
    params: Record<string, unknown>
  ) => buildCacheKey('notifications:list', { employeeId, ...params }),
  notificationsUnreadCount: (employeeId: string) =>
    buildCacheKey('notifications:unread-count', { employeeId }),
} as const

export const invalidateEmployeeCaches = async (employeeId?: string) => {
  void employeeId
  await invalidateCacheByPrefix(
    'employees:list',
    'employees:active',
    'employees:detail',
    'permissions:matrix',
    'auth:me'
  )
}

export const invalidateHorseCaches = async () => {
  await invalidateCacheByPrefix('horses:list')
}

export const invalidateSettingsCaches = async () => {
  await invalidateCacheByPrefix('settings:all')
}

export const invalidateTaskCaches = async (taskId?: string) => {
  void taskId
  await invalidateCacheByPrefix('tasks:list', 'tasks:detail', 'tasks:my-list')
}

export const invalidatePermissionCaches = async (employeeId?: string) => {
  void employeeId
  await invalidateCacheByPrefix(
    'permissions:matrix',
    'permissions:task-overrides',
    'auth:permission-map',
    'auth:task-permission-map',
    'auth:task-capabilities',
    'auth:me'
  )
}

export const invalidateNotificationsCache = async (employeeId: string) => {
  void employeeId
  await invalidateCacheByPrefix('notifications:list', 'notifications:unread-count')
}
