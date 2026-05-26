import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const socket = useSocket();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket || !user) return;

    const addNotification = (type, message, data) => {
      const newNotification = {
        id: Date.now().toString(),
        type,
        message,
        data,
        read: false,
        createdAt: new Date(),
      };
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    const handleProjectCreated = (project) => {
      if (project.createdBy !== user._id) {
        addNotification('PROJECT_CREATED', `New project "${project.title}" was created.`, project);
      }
    };

    const handleProjectUpdated = (project) => {
      addNotification('PROJECT_UPDATED', `Project "${project.title}" was updated.`, project);
    };

    const handleProjectDeleted = (projectId) => {
      addNotification('PROJECT_DELETED', `A project was deleted.`, { projectId });
    };

    const handleUserInvited = (newUser) => {
      if (newUser._id !== user._id) {
        addNotification('USER_INVITED', `${newUser.name} joined the organization.`, newUser);
      }
    };

    socket.on('PROJECT_CREATED', handleProjectCreated);
    socket.on('PROJECT_UPDATED', handleProjectUpdated);
    socket.on('PROJECT_DELETED', handleProjectDeleted);
    socket.on('USER_INVITED', handleUserInvited);

    return () => {
      socket.off('PROJECT_CREATED', handleProjectCreated);
      socket.off('PROJECT_UPDATED', handleProjectUpdated);
      socket.off('PROJECT_DELETED', handleProjectDeleted);
      socket.off('USER_INVITED', handleUserInvited);
    };
  }, [socket, user]);

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
