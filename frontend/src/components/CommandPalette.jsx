import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Folder, Users, BarChart2, Activity, Settings, Plus, UserPlus, Sparkles } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ORG_ADMIN';

  const STATIC_ACTIONS = [
    { id: 'nav-dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" />, action: () => navigate('/dashboard') },
    { id: 'nav-projects', label: 'Projects', icon: <Folder className="w-4 h-4" />, action: () => navigate('/projects') },
    { id: 'nav-analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" />, action: () => navigate('/analytics') },
    { id: 'nav-team', label: 'Team', icon: <Users className="w-4 h-4" />, action: () => navigate('/team') },
  ];

  if (isAdmin) {
    STATIC_ACTIONS.push({ id: 'nav-system', label: 'System Metrics', icon: <Settings className="w-4 h-4" />, action: () => navigate('/system') });
    STATIC_ACTIONS.push({ id: 'action-create-project', label: 'Create New Project', icon: <Plus className="w-4 h-4" />, action: () => { navigate('/projects?action=create'); } });
    STATIC_ACTIONS.push({ id: 'action-invite-user', label: 'Invite User', icon: <UserPlus className="w-4 h-4" />, action: () => navigate('/team?action=invite') });
  }

  // Filter static actions
  const filteredStatic = STATIC_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  // Fetch projects debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        api.get(`/projects/search?q=${query}`)
           .then(res => setProjects(res.data.data))
           .catch(() => {});
      } else {
        setProjects([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const allItems = [
    ...filteredStatic,
    ...projects.map(p => ({
      id: `project-${p._id}`,
      label: p.title,
      icon: <Folder className="w-4 h-4 text-indigo-500" />,
      action: () => { navigate(`/projects?projectId=${p._id}`); setIsOpen(false); }
    })),
    ...(query.trim() ? [{
      id: 'ai-ask',
      label: `Ask AI: "${query}"`,
      icon: <Sparkles className="w-4 h-4 text-purple-500" />,
      action: () => { navigate(`/projects?ai=${encodeURIComponent(query)}`); setIsOpen(false); }
    }] : [])
  ];

  // Handle Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle open focus and reset
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Handle arrows
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
        setIsOpen(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden z-[101] border border-gray-100"
          >
            <div className="flex items-center px-4 py-3 border-b border-gray-100">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input
                ref={inputRef}
                className="w-full bg-transparent text-lg text-gray-900 placeholder-gray-400 focus:outline-none"
                placeholder="Search projects, navigation, or Ask AI..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
              />
              <div className="flex items-center space-x-1 text-xs text-gray-400 font-medium ml-3 bg-gray-50 px-2 py-1 rounded">
                <span>ESC</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
              {allItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  No results found for "{query}"
                </div>
              ) : (
                <ul className="px-2">
                  {allItems.map((item, index) => (
                    <li
                      key={item.id}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => {
                        item.action();
                        setIsOpen(false);
                      }}
                      className={`flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        index === selectedIndex
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`mr-3 ${index === selectedIndex ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {item.icon}
                      </div>
                      <span className="font-medium text-sm">{item.label}</span>
                      {index === selectedIndex && (
                        <div className="ml-auto flex items-center space-x-1 text-xs text-indigo-400">
                          <span className="bg-white px-1.5 py-0.5 rounded border border-indigo-100 shadow-sm">↵</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center text-xs text-gray-500">
              <span className="flex items-center"><Search className="w-3 h-3 mr-1" /> Type to search</span>
              <span className="mx-3 border-l h-3 border-gray-300"></span>
              <span>Use <span className="font-semibold">↑</span> <span className="font-semibold">↓</span> to navigate</span>
              <span className="mx-3 border-l h-3 border-gray-300"></span>
              <span>Press <span className="font-semibold">Enter</span> to select</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
