import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Folder, Zap, UserPlus, Trash2, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getIcon = (type) => {
  switch (type) {
    case 'PROJECT_CREATED': return <Folder className="w-4 h-4 text-blue-500" />;
    case 'PROJECT_UPDATED': return <Zap className="w-4 h-4 text-amber-500" />;
    case 'PROJECT_DELETED': return <Trash2 className="w-4 h-4 text-red-500" />;
    case 'USER_INVITED': return <UserPlus className="w-4 h-4 text-green-500" />;
    default: return <Activity className="w-4 h-4 text-gray-500" />;
  }
};

const ActivityFeed = () => {
  const { notifications } = useNotifications();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
      <div className="flex items-center space-x-2 mb-6">
        <Activity className="w-5 h-5 text-indigo-500" />
        <h3 className="text-lg font-medium text-gray-900">Live Activity</h3>
        <span className="relative flex h-2 w-2 ml-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 max-h-[400px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
             <Activity className="w-8 h-8 mb-2 opacity-20" />
             <p className="text-sm">Listening for real-time events...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {notifications.map((notif) => (
                <motion.div 
                  key={notif.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                >
                  <div className="flex-shrink-0 mt-1 p-2 bg-white rounded-full shadow-sm border border-gray-100">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium truncate">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
