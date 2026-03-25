import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, Check, CheckCheck, ClipboardList, FileText, Package } from 'lucide-react';
import { getNotifications, getUnreadCount, markAllAsRead, markAsRead } from '../services/notificationService';
import usePermissions from '../hooks/usePermissions';

const TYPE_META = {
  inventory_threshold_alert: { icon: Package, color: '#ff922b', label: 'Inventory' },
  task_assignment: { icon: ClipboardList, color: '#4dabf7', label: 'Task' },
  approval_request: { icon: Check, color: '#69db7c', label: 'Approval' },
  task_completion: { icon: CheckCheck, color: '#00ffd0', label: 'Task' },
  report_filed: { icon: FileText, color: '#f783ac', label: 'Report' },
  farrier_reminder: { icon: AlertTriangle, color: '#ffd43b', label: 'Farrier' },
  general: { icon: Bell, color: '#868e96', label: 'General' },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const NotificationCenter = () => {
  const { viewNotifications } = usePermissions();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const response = await getUnreadCount();
      setUnreadCount(response.data?.data?.count || 0);
    } catch {
      // ignore sidebar polling failures
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getNotifications();
      setNotifications(response.data?.data || []);
    } catch {
      // ignore dropdown loading failures
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!viewNotifications) return undefined;
    fetchCount();
    const interval = window.setInterval(fetchCount, 30000);
    return () => window.clearInterval(interval);
  }, [viewNotifications, fetchCount]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) => prev.map((item) => (
        item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
      )));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore single mark read failure
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // ignore bulk mark read failure
    }
  };

  if (!viewNotifications) {
    return null;
  }

  const displayCount = unreadCount > 4 ? '4+' : unreadCount;

  return (
    <div className="notification-center" ref={ref}>
      <button className="notification-icon" onClick={() => setOpen((prev) => !prev)} aria-label="Notifications" type="button">
        <Bell size={16} />
        {unreadCount > 0 && <span className="notification-badge">{displayCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span className="notification-heading">Notifications</span>
            {unreadCount > 0 && (
              <button className="notification-mark-all" onClick={handleMarkAllRead} type="button">
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={28} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 8 }} />
                <span>No notifications yet</span>
              </div>
            ) : (
              notifications.map((notification) => {
                const meta = TYPE_META[notification.type] || TYPE_META.general;
                const Icon = meta.icon;
                return (
                  <div
                    key={notification.id}
                    className={`notification-item ${notification.isRead ? '' : 'unread'}`}
                    onClick={() => !notification.isRead && handleMarkRead(notification.id)}
                  >
                    <div className="notification-type-icon" style={{ color: meta.color }}>
                      <Icon size={16} />
                    </div>
                    <div className="notification-content">
                      <div className="notification-message">{notification.title}</div>
                      <div className="notification-detail">{notification.message}</div>
                      <div className="notification-time">{timeAgo(notification.createdAt)}</div>
                    </div>
                    {!notification.isRead && <div className="notification-unread-dot" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
