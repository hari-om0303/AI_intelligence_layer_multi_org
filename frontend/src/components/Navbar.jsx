import React from 'react';
import { Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';

const Navbar = ({ setSidebarOpen }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <div className="flex items-center">
        <button
          className="text-gray-500 focus:outline-none lg:hidden mr-4"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <NotificationDropdown />

        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.role === 'ORG_ADMIN' ? 'Admin' : 'Member'}</p>
        </div>
        
        <div className="relative group cursor-pointer">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md">
            <User className="w-5 h-5" />
          </div>
          
          {/* Hover Tooltip for Mobile/Tablet */}
          <div className="absolute right-0 top-full mt-2 w-max min-w-[120px] bg-white border border-gray-100 rounded-xl shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 md:hidden">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{user?.role === 'ORG_ADMIN' ? 'Admin' : 'Member'}</p>
          </div>
        </div>

        <button 
          onClick={logout}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 rounded-full"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
