import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, ShieldAlert, X, PieChart, Users, Terminal } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handlePrefetch = (path) => {
    if (path === '/projects') {
      queryClient.prefetchQuery({
        queryKey: ['projects', '', false, 'ALL', 'newest'],
        queryFn: async () => {
          const { data } = await api.get('/projects/insights?status=ALL&sortBy=newest');
          return data.data;
        },
        staleTime: 5 * 60 * 1000
      });
    } else if (path === '/dashboard') {
      queryClient.prefetchQuery({
        queryKey: ['dashboardStats'],
        queryFn: async () => {
          const { data } = await api.get('/projects?limit=1');
          return { totalProjects: data.pagination.total };
        },
        staleTime: 5 * 60 * 1000
      });
    } else if (path === '/analytics' && user?.orgId?.subscriptionPlan === 'PRO') {
      queryClient.prefetchQuery({
        queryKey: ['analytics'],
        queryFn: async () => {
          const res = await api.get('/analytics/dashboard');
          return res.data.data;
        },
        staleTime: 5 * 60 * 1000
      });
    }
  };

  const links = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', to: '/analytics', icon: PieChart },
    { name: 'Projects', to: '/projects', icon: FolderKanban },
    { name: 'Team', to: '/team', icon: Users },
    ...(user?.role === 'ORG_ADMIN' ? [
      { name: 'Audit Logs', to: '/audit-logs', icon: ShieldAlert },
      { name: 'System', to: '/system', icon: Terminal }
    ] : []),
  ];

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={`fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 bg-indigo-600 text-white">
          <span className="text-2xl font-bold tracking-tight">SaaSify</span>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto">
          <nav className="flex-1 px-4 py-6 space-y-2">
            {links.map((link) => (
              <NavLink
                key={link.name}
                to={link.to}
                onMouseEnter={() => handlePrefetch(link.to)}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors duration-200 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <link.icon className="w-5 h-5 mr-3" />
                {link.name}
              </NavLink>
            ))}
          </nav>

          {user?.orgId?.subscriptionPlan !== 'PRO' && (
            <div className="p-4 m-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg">
              <h4 className="font-semibold mb-1">Upgrade to PRO</h4>
              <p className="text-xs text-indigo-100 mb-3">Get unlimited access and premium features.</p>
              <button 
                className="w-full py-2 bg-white text-indigo-600 rounded-lg text-sm font-bold shadow hover:bg-gray-50 transition"
              >
                Upgrade Plan
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
