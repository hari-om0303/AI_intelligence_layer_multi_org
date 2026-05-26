import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Folder, Search, Sparkles } from 'lucide-react';
import KanbanBoard from '../components/kanban/KanbanBoard';
import ProjectDrawer from '../components/ProjectDrawer';

const Projects = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState(null); // null for create, object for edit
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'Medium', type: 'Feature', dueDate: '', githubIssueUrl: '' });
  const [isTriaging, setIsTriaging] = useState(false);
  
  // AI Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);

  // Filters & Sorting
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  const { data: projects = [], isLoading: loading } = useQuery({
    queryKey: ['projects', searchQuery, isAiMode, filterStatus, sortBy],
    queryFn: async () => {
      if (searchQuery) {
        if (isAiMode) {
          const { data } = await api.post('/ai/query', { query: searchQuery });
          setPagination({ page: 1, pages: 1, total: data.data.length });
          return data.data;
        } else {
          const { data } = await api.get(`/projects/search?q=${searchQuery}`);
          setPagination({ page: 1, pages: 1, total: data.data.length });
          return data.data;
        }
      } else {
        const { data } = await api.get(`/projects/insights?status=${filterStatus}&sortBy=${sortBy}`);
        setPagination({ page: 1, pages: 1, total: data.data.length });
        return data.data;
      }
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000
  });

  useEffect(() => {
    if (!socket) return;
    const queryKey = ['projects', searchQuery, isAiMode, filterStatus, sortBy];

    const handleCreated = (newProject) => {
      queryClient.setQueryData(queryKey, (old) => old ? [newProject, ...old] : [newProject]);
      if (newProject.createdBy !== user._id) {
        toast.info(`New project created: ${newProject.title}`);
      }
    };

    const handleUpdated = (updatedProject) => {
      queryClient.setQueryData(queryKey, (old) => 
        old ? old.map(p => p._id === updatedProject._id ? updatedProject : p) : old
      );
    };

    const handleDeleted = (projectId) => {
      queryClient.setQueryData(queryKey, (old) => 
        old ? old.filter(p => p._id !== projectId) : old
      );
    };

    socket.on('PROJECT_CREATED', handleCreated);
    socket.on('PROJECT_UPDATED', handleUpdated);
    socket.on('PROJECT_DELETED', handleDeleted);

    return () => {
      socket.off('PROJECT_CREATED', handleCreated);
      socket.off('PROJECT_UPDATED', handleUpdated);
      socket.off('PROJECT_DELETED', handleDeleted);
    };
  }, [socket, user._id, queryClient, searchQuery, isAiMode, filterStatus, sortBy]);

  const handleOpenModal = (project = null) => {
    if (project) {
      setCurrentProject(project);
      setIsModalOpen(true);
    } else {
      setCurrentProject(null);
      setFormData({ title: '', description: '', priority: 'Medium', type: 'Feature', dueDate: '', githubIssueUrl: '' });
      setIsCreateModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsCreateModalOpen(false);
    setCurrentProject(null);
  };

  const createMutation = useMutation({
    mutationFn: (newProject) => api.post('/projects', newProject),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Project created');
      handleCloseModal();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Action failed')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Project deleted');
    },
    onError: () => toast.error('Failed to delete project')
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/projects/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      const queryKey = ['projects', searchQuery, isAiMode, filterStatus, sortBy];
      await queryClient.cancelQueries(queryKey);
      
      const previousProjects = queryClient.getQueryData(queryKey);
      
      if (previousProjects) {
        queryClient.setQueryData(
          queryKey,
          previousProjects.map((p) => p._id === id ? { ...p, status } : p)
        );
      }
      return { previousProjects, queryKey };
    },
    onError: (err, variables, context) => {
      toast.error('Failed to update project status');
      if (context?.previousProjects) {
        queryClient.setQueryData(context.queryKey, context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries(['projects']);
    }
  });

  const handleAITriage = async () => {
    if (!formData.description) {
      toast.error('Please enter a description first');
      return;
    }
    setIsTriaging(true);
    try {
      const { data } = await api.post('/ai/triage', { description: formData.description });
      setFormData(prev => ({ ...prev, priority: data.data.priority, type: data.data.type }));
      toast.success('AI applied Priority & Type');
    } catch (error) {
      toast.error('AI Triage failed');
    } finally {
      setIsTriaging(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteMutation.mutate(id);
    }
  };

  const updateProjectStatus = (projectId, status) => {
    statusMutation.mutate({ id: projectId, status });
  };

  const isAdmin = user?.role === 'ORG_ADMIN';
  const isFreePlan = user?.orgId?.subscriptionPlan === 'FREE';
  const limitReached = isFreePlan && pagination.total >= 5;

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">Manage your organization's projects</p>
          {!isAdmin && (
            <p className="text-xs font-medium text-amber-600 mt-1">
              You have read-only MEMBER access. Contact an admin to create projects.
            </p>
          )}
          {isFreePlan && (
            <p className="text-xs font-medium text-amber-600 mt-1">
              FREE Plan Limit: {pagination.total} / 5 Projects Used
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex flex-col items-end">
            <button
              onClick={() => handleOpenModal()}
              disabled={limitReached}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg shadow-sm focus:outline-none transition-colors ${
                limitReached 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </button>
            {limitReached && (
              <span className="text-xs text-red-500 mt-1 mr-1">Project limit reached. Please upgrade to PRO.</span>
            )}
          </div>
        )}
      </div>
      
      {/* Search Bar & Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center transition-all">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isAiMode ? <Sparkles className="h-5 w-5 text-indigo-500" /> : <Search className="h-5 w-5 text-gray-400" />}
          </div>
          <input
            type="text"
            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-xl p-3 bg-gray-50/50"
            placeholder={isAiMode ? "Ask AI: 'Show me inactive projects'..." : "Search projects..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto flex-shrink-0">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white font-medium text-gray-700"
          >
            <option value="ALL">All Status</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white font-medium text-gray-700"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="health">Highest Health</option>
            <option value="risk">Highest Risk</option>
          </select>
        </div>

        <button
          onClick={() => setIsAiMode(!isAiMode)}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-xl border transition-colors flex items-center ${
            isAiMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Sparkles className={`w-4 h-4 mr-2 ${isAiMode ? 'text-indigo-600' : 'text-gray-400'}`} />
          {isAiMode ? 'AI Mode' : 'AI Search'}
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <div className="flex space-x-4 mb-8 border-b border-gray-100 pb-4">
              <div className="w-1/3 h-10 bg-gray-100 rounded-xl animate-pulse"></div>
              <div className="w-1/3 h-10 bg-gray-100 rounded-xl animate-pulse"></div>
              <div className="w-1/3 h-10 bg-gray-100 rounded-xl animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((col) => (
                <div key={col} className="bg-gray-50 p-4 rounded-2xl min-h-[500px]">
                  <div className="w-24 h-6 bg-gray-200 rounded-lg mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="w-full h-32 bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse"></div>
                    <div className="w-full h-32 bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="bg-indigo-50 p-5 rounded-full mb-5">
              <Folder className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No projects found</h3>
            <p className="max-w-sm text-sm text-gray-500 leading-relaxed">
              {isAdmin 
                ? "Get started by creating a new project or adjust your search filters if you're looking for something specific." 
                : "There are currently no active projects. Contact an Organization Admin to create one."}
            </p>
          </div>
        ) : (
          <div className="p-6">
            <KanbanBoard
              projects={projects}
              setProjects={() => {}} // Remove local state mutation as React Query handles cache
              updateProjectStatus={updateProjectStatus}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
            />
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-100">
            <p className="text-sm text-gray-700">
              Showing page <span className="font-medium">{pagination.page}</span> of <span className="font-medium">{pagination.pages}</span>
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => fetchProjects(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchProjects(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">New Project</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <button
                    type="button"
                    onClick={handleAITriage}
                    disabled={isTriaging}
                    className="flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {isTriaging ? 'Predicting...' : 'AI Predict'}
                  </button>
                </div>
                <textarea
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Bug">Bug</option>
                    <option value="Feature">Feature</option>
                    <option value="Tech Debt">Tech Debt</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Issue URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://github.com/org/repo/issues/1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  value={formData.githubIssueUrl}
                  onChange={(e) => setFormData({ ...formData, githubIssueUrl: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-70 flex items-center"
                >
                  {createMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProjectDrawer 
        project={currentProject} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onUpdate={() => {
          queryClient.invalidateQueries(['projects']);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default Projects;
