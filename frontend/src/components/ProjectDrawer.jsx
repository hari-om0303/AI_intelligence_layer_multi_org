import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Activity, Zap, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const ProjectDrawer = ({ project, isOpen, onClose, onUpdate, onDelete }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ORG_ADMIN';
  
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', status: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project && isOpen) {
      setFormData({ 
        title: project.title, 
        description: project.description || '',
        status: project.status || 'TODO'
      });
      setEditMode(false);
      
      // Fetch history
      setLoadingHistory(true);
      api.get(`/projects/${project._id}/history`)
        .then(res => setHistory(res.data.data))
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }
  }, [project, isOpen]);

  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const res = await api.put(`/projects/${project._id}`, {
        title: formData.title,
        description: formData.description
      });
      let updatedProject = res.data.data;
      if (formData.status !== project.status) {
        await api.patch(`/projects/${project._id}/status`, { status: formData.status });
        updatedProject.status = formData.status;
      }
      onUpdate(updatedProject);
      setEditMode(false);
      toast.success('Project updated');
    } catch (error) {
      toast.error('Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!isAdmin) return;
    if (window.confirm("Are you sure you want to delete this project?")) {
      onDelete(project._id);
      onClose();
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
      case 'DONE': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && project && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[201] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 truncate pr-4">Project Details</h2>
              <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-8">
                
                {/* Details Section */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Overview</h3>
                    {isAdmin && !editMode && (
                      <button onClick={() => setEditMode(true)} className="text-indigo-600 text-sm font-medium hover:text-indigo-700 flex items-center">
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                      </button>
                    )}
                  </div>

                  {editMode ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                        <input 
                          value={formData.title} 
                          onChange={e => setFormData({...formData, title: e.target.value})}
                          className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                        <textarea 
                          value={formData.description} 
                          onChange={e => setFormData({...formData, description: e.target.value})}
                          className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          rows="3"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select 
                          value={formData.status} 
                          onChange={e => setFormData({...formData, status: e.target.value})}
                          className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="DONE">Done</option>
                        </select>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700">
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button onClick={() => setEditMode(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(project.status || 'TODO')}`}>
                          {(project.status || 'TODO').replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">{project.description || 'No description provided.'}</p>
                      
                      <div className="mt-4 flex items-center text-xs text-gray-500 gap-4">
                        <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> {new Date(project.createdAt).toLocaleDateString()}</span>
                        <span className="flex items-center"><Activity className="w-3.5 h-3.5 mr-1" /> Health: {project.activityScore || 100}%</span>
                      </div>
                    </div>
                  )}
                </section>

                <hr className="border-gray-100" />

                {/* AI Insights Section */}
                <section>
                   <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                     <Zap className="w-4 h-4 mr-1.5 text-yellow-500" /> AI Insights
                   </h3>
                   <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                     {project.riskScore > 50 ? (
                       <p className="text-sm text-red-700 flex items-start">
                         <ShieldAlert className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                         This project is showing high risk. It hasn't been updated in a while. Consider moving it to Done or archiving it.
                       </p>
                     ) : (
                       <p className="text-sm text-indigo-700 flex items-start">
                         <Zap className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-indigo-500" />
                         This project is active and healthy. Keep up the good work!
                       </p>
                     )}
                   </div>
                </section>

                <hr className="border-gray-100" />

                {/* Activity History Section */}
                <section>
                   <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Activity History</h3>
                   {loadingHistory ? (
                     <div className="animate-pulse space-y-3">
                       <div className="h-12 bg-gray-100 rounded-xl"></div>
                       <div className="h-12 bg-gray-100 rounded-xl"></div>
                     </div>
                   ) : history.length === 0 ? (
                     <p className="text-sm text-gray-500">No recent activity.</p>
                   ) : (
                     <div className="space-y-3">
                        {history.map(log => (
                          <div key={log._id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                             <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-400 flex-shrink-0"></div>
                             <div>
                                <div className="text-sm font-medium text-gray-900">{log.action.replace(/_/g, ' ')}</div>
                                <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                  <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                                  <span className="mx-2">•</span>
                                  <span>{log.userId?.name || 'Unknown'}</span>
                                </div>
                             </div>
                          </div>
                        ))}
                     </div>
                   )}
                </section>

              </div>
            </div>

            {/* Footer Actions */}
            {isAdmin && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button 
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Project
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProjectDrawer;
