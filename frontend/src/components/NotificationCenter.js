import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Package, AlertTriangle, ClipboardList, FileText } from 'lucide-react';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../services/notificationService';
import usePermissions from '../hooks/usePermissions';

const TYPE_META = {
  inventory_threshold_alert: { icon: Package, color: '#ff922b', label: 'Inventory' },
  task_assignment:           { icon: ClipboardList, color: '#4dabf7', label: 'Task' },
  approval_request:          { icon: Check, color: '#69db7c', label: 'Approval' },
  task_completion:           { icon: CheckCheck, color: '#00ffd0', label: 'Task' },
  report_filed:              { icon: FileText, color: '#f783ac', label: 'Report' },
  farrier_reminder:          { icon: AlertTriangle, color: '#ffd43b', label: 'Farrier' },
  general:                   { icon: Bell, color: '#868e96', label: 'General' },
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
      const res = await getUnreadCount();
      setUnreadCount(res.data?.data?.count || 0);
    } catch { /* silent */ }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(res.data?.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    if (!viewNotifications) return;
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [viewNotifications, fetchCount]);

  // Load full list when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  if (!viewNotifications) return null;

  const displayCount = unreadCount > 4 ? '4+' : unreadCount;

  return (
    <div className="notification-center" ref={ref}>
      <button
        className="notification-icon"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">{displayCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
            {unreadCount > 0 && (
              <button className="notification-mark-all" onClick={handleMarkAllRead}>
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={28} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 8 }} />
                <span>No notifications yet</span>
              </div>
            ) : (
              notifications.map(n => {
                const meta = TYPE_META[n.type] || TYPE_META.general;
                const Icon = meta.icon;
                return (
                  <div
                    key={n.id}
                    className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                    onClick={() => !n.isRead && handleMarkRead(n.id)}
                  >
                    <div className="notification-type-icon" style={{ color: meta.color }}>
                      <Icon size={16} />
                    </div>
                    <div className="notification-content">
                      <div className="notification-message">{n.title}</div>
                      <div className="notification-detail">{n.message}</div>
                      <div className="notification-time">{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.isRead && <div className="notification-unread-dot" />}
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
