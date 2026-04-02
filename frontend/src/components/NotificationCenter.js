import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Bell, Check, CheckCheck, ClipboardList, FileText, Package } from 'lucide-react';
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  subscribeToNotifications,
} from '../services/notificationService';
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
  const navigate = useNavigate();
  const { viewNotifications } = usePermissions();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const audioContextRef = useRef(null);
  const soundEnabledRef = useRef(false);
  const unreadIdsRef = useRef(new Set());

  const playNotificationSound = useCallback(async () => {
    if (!soundEnabledRef.current || typeof window === 'undefined') return;

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.18);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.065, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch {
      // ignore sound playback failures
    }
  }, []);

  const applyNotificationState = useCallback((payload, { playSound = false } = {}) => {
    const nextNotifications = payload?.notifications || [];
    const nextUnreadCount = payload?.unreadCount ?? nextNotifications.filter((item) => !item.isRead).length;
    const nextUnreadIds = new Set(
      nextNotifications.filter((item) => !item.isRead).map((item) => item.id)
    );
    const hasNewUnread = Array.from(nextUnreadIds).some((id) => !unreadIdsRef.current.has(id));

    setNotifications(nextNotifications);
    setUnreadCount(nextUnreadCount);
    unreadIdsRef.current = nextUnreadIds;

    if (playSound && hasNewUnread) {
      playNotificationSound();
    }
  }, [playNotificationSound]);

  const fetchCount = useCallback(async () => {
    try {
      const response = await getUnreadCount();
      setUnreadCount(response.data?.data?.count || 0);
    } catch {
      // ignore count fetch failures
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getNotifications();
      applyNotificationState({ notifications: response.data?.data || [] });
    } catch {
      // ignore dropdown loading failures
    }
    setLoading(false);
  }, [applyNotificationState]);

  const resolveNotificationTarget = useCallback((notification) => {
    const combinedText = `${notification?.title || ''} ${notification?.message || ''}`.toLowerCase();

    if (notification?.type === 'task_assignment') {
      return '/my-assigned-tasks';
    }

    if (notification?.type === 'task_completion') {
      return '/pending-approvals';
    }

    if (notification?.type === 'approval_request') {
      if (combinedText.includes('your task') || combinedText.includes('task approved') || combinedText.includes('task rejected')) {
        return '/my-assigned-tasks';
      }
      return '/pending-approvals';
    }

    if (notification?.relatedTaskId) {
      return '/my-assigned-tasks';
    }

    if (notification?.type === 'inventory_threshold_alert') {
      if (combinedText.includes('feed')) return '/feed-inventory';
      if (combinedText.includes('medicine')) return '/medicine-inventory';
      if (combinedText.includes('grocery')) return '/groceries-inventory';
    }

    return '/dashboard';
  }, []);

  useEffect(() => {
    if (!viewNotifications) return undefined;

    fetchNotifications();
    fetchCount();

    const eventSource = subscribeToNotifications({
      onState: (payload) => applyNotificationState(payload, { playSound: true }),
      onError: () => {
        // keep current state on transient stream failures
      },
    });

    return () => {
      eventSource?.close();
    };
  }, [applyNotificationState, fetchCount, fetchNotifications, viewNotifications]);

  useEffect(() => {
    const enableSound = () => {
      soundEnabledRef.current = true;
    };

    window.addEventListener('pointerdown', enableSound, { once: true });
    window.addEventListener('keydown', enableSound, { once: true });

    return () => {
      window.removeEventListener('pointerdown', enableSound);
      window.removeEventListener('keydown', enableSound);
    };
  }, []);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return undefined;
    if (window.innerWidth > 768) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    fetchNotifications();
    return undefined;
  }, [open, fetchNotifications]);

  const handleMarkRead = useCallback(async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) => prev.map((item) => (
        item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
      )));
      unreadIdsRef.current.delete(id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore single mark read failure
    }
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() })));
      unreadIdsRef.current = new Set();
      setUnreadCount(0);
    } catch {
      // ignore bulk mark read failure
    }
  };

  const handleNotificationClick = useCallback(async (notification) => {
    if (!notification?.isRead) {
      await handleMarkRead(notification.id);
    }

    setOpen(false);
    navigate(resolveNotificationTarget(notification));
  }, [handleMarkRead, navigate, resolveNotificationTarget]);

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
            <div className="notification-header-main">
              <button
                className="notification-mobile-back"
                onClick={() => setOpen(false)}
                type="button"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="notification-heading">Notifications</span>
            </div>
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
                    onClick={() => handleNotificationClick(notification)}
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
