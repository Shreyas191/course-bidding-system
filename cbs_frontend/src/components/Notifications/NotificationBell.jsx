import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, Trash2 } from 'lucide-react';
import websocketService from '../../services/websocketService';
import { toast } from 'react-toastify';

const NotificationBell = ({ userProfile }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    if (!userProfile?.studentId) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8080/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        const unread = data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8080/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`http://localhost:8080/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.notificationId === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      await fetch('http://localhost:8080/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    } finally {
      setLoading(false);
    }
  };

  // Handle real-time notification
  const handleRealtimeNotification = (notification) => {
    console.log('📬 Real-time notification:', notification);
    
    // Add to notifications list
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show toast notification
    const icon = notification.type === 'bid_result' 
      ? (notification.title.includes('Won') ? '🎉' : '❌')
      : '📢';
    
    toast.info(
      <div>
        <strong>{icon} {notification.title}</strong>
        <p className="text-sm mt-1">{notification.message}</p>
      </div>,
      {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      }
    );
  };

  // Initialize WebSocket and fetch notifications
  useEffect(() => {
    // Only proceed if userProfile exists and has studentId
    
    if (!userProfile?.studentId) {
      return;
    }    // Connect to WebSocket
    websocketService.connect(
      userProfile.studentId,
      () => {
        console.log('✅ WebSocket connected for notifications');
        fetchNotifications();
      },
      (error) => {
        console.error('❌ WebSocket connection error:', error);
      }
    );

    // Register notification handler
    websocketService.onNotification(handleRealtimeNotification);
    websocketService.onBroadcast(handleRealtimeNotification);

    // Fetch initial data
    fetchNotifications();
    fetchUnreadCount();

    // Cleanup on unmount
    return () => {
      console.log('🔌 Disconnecting WebSocket');
      websocketService.offNotification(handleRealtimeNotification);
      websocketService.offBroadcast(handleRealtimeNotification);
    };
  }, [userProfile?.studentId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get notification icon
  const getNotificationIcon = (type, title) => {
    if (type === 'bid_result') {
      return title.includes('Won') ? '🎉' : '❌';
    }
    if (type === 'info') return '📢';
    if (type === 'warning') return '⚠️';
    return '🔔';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 rounded-xl transition-all"
      >
        <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-cyan-600' : 'text-gray-700'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-cyan-50 to-teal-50">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Notifications</h3>
              <p className="text-xs text-gray-600">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold flex items-center gap-1 hover:bg-white px-3 py-1 rounded-lg transition-all"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.notificationId}
                    className={`p-4 hover:bg-gray-50 transition-all cursor-pointer ${
                      !notification.isRead ? 'bg-cyan-50' : ''
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification.notificationId)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type, notification.title)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className={`text-sm font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Navigate to notifications page if needed
                }}
                className="w-full text-center text-sm text-cyan-600 hover:text-cyan-700 font-semibold"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
