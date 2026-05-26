import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Building, FolderKanban, ShieldCheck, Zap, AlertTriangle, TrendingUp } from 'lucide-react';
import AIInsightsPanel from '../components/AIInsightsPanel';
import { useSocket } from '../context/SocketContext';
import ActivityFeed from '../components/ActivityFeed';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, upgradeUserPlan } = useAuth();
  const socket = useSocket();
  const [upgrading, setUpgrading] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!socket) return;
    const handleIntelligenceUpdated = () => {
      queryClient.invalidateQueries(['intelligenceRisks']);
      queryClient.invalidateQueries(['intelligenceEfficiency']);
    };
    socket.on('intelligenceUpdated', handleIntelligenceUpdated);
    return () => socket.off('intelligenceUpdated', handleIntelligenceUpdated);
  }, [socket, queryClient]);

  const { data: stats = { totalProjects: 0 }, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const { data } = await api.get('/projects?limit=1');
      return { totalProjects: data.pagination.total };
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: efficiencyData, isLoading: loadingEfficiency } = useQuery({
    queryKey: ['intelligenceEfficiency'],
    queryFn: async () => {
      const { data } = await api.get('/intelligence/efficiency');
      return data.data;
    },
  });

  const { data: risksData, isLoading: loadingRisks } = useQuery({
    queryKey: ['intelligenceRisks'],
    queryFn: async () => {
      const { data } = await api.get('/intelligence/risks');
      return data.data;
    },
  });

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await upgradeUserPlan();
      toast.success('Successfully upgraded to PRO plan! All features unlocked.');
    } catch (error) {
      toast.error('Failed to upgrade plan.');
    } finally {
      setUpgrading(false);
    }
  };

  if (loadingStats || loadingEfficiency) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-8 bg-gray-200 rounded-xl w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-64 mb-8"></div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm h-[100px] flex items-center">
              <div className="w-12 h-12 bg-gray-100 rounded-xl mr-4 flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
          <div className="xl:col-span-2 h-64 bg-gray-100 rounded-2xl"></div>
          <div className="xl:col-span-1 h-64 bg-gray-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const isPro = user?.orgId?.subscriptionPlan === 'PRO';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              user?.role === 'ORG_ADMIN' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {user?.role === 'ORG_ADMIN' ? 'Admin' : 'Read-Only Member'}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, <span className="font-medium text-gray-900">{user?.name}</span>. Here's what's happening.
          </p>
        </div>
        
        {!isPro && user?.role === 'ORG_ADMIN' && (
          <button 
            onClick={handleUpgrade}
            disabled={upgrading}
            className="mt-4 md:mt-0 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
          >
            <Zap className="w-4 h-4 mr-2" /> {upgrading ? 'Upgrading...' : 'Upgrade to PRO'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-2xl transition-all hover:shadow-md">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-50 rounded-xl p-3">
                <Building className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Organization</dt>
                  <dd>
                    <div className="text-lg font-semibold text-gray-900">{user?.orgId?.name || 'Loading...'}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-2xl transition-all hover:shadow-md">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-50 rounded-xl p-3">
                <ShieldCheck className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Current Plan</dt>
                  <dd className="flex items-center">
                    <div className="text-lg font-semibold text-gray-900">{user?.orgId?.subscriptionPlan || 'FREE'}</div>
                    {isPro && <Zap className="w-4 h-4 text-yellow-500 ml-2" />}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-2xl transition-all hover:shadow-md">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-50 rounded-xl p-3">
                <FolderKanban className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Projects</dt>
                  <dd>
                    <div className="text-lg font-semibold text-gray-900">{stats.totalProjects}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4 - Efficiency Score */}
        <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-2xl transition-all hover:shadow-md">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-50 rounded-xl p-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Efficiency Score</dt>
                  <dd className="flex items-baseline">
                    <div className="text-lg font-semibold text-gray-900">{efficiencyData?.efficiencyScore || 0}/100</div>
                    <span className="ml-2 text-sm text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                      {efficiencyData?.status || 'N/A'}
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
        <div className="xl:col-span-2 space-y-6">
          {/* Risk Alerts Panel */}
          {risksData && risksData.length > 0 && (
            <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-lg font-bold text-red-900">Risk Alerts ({risksData.length})</h3>
              </div>
              <div className="space-y-3">
                {risksData.map(risk => (
                  <div key={risk.projectId} className="bg-white p-4 rounded-xl shadow-sm border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{risk.title}</h4>
                      <p className="text-sm text-gray-600">{risk.message}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {risk.reasons.map((r, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{r}</span>
                        ))}
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${risk.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {risk.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* AI Insights Panel */}
          <AIInsightsPanel />
        </div>
        
        <div className="xl:col-span-1">
          {/* Real-time Activity Feed */}
          <ActivityFeed />
        </div>
      </div>
      
      {/* Example section showing role differences */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        {user?.role === 'ORG_ADMIN' ? (
          <p className="text-gray-600 text-sm">You are an Admin. You can manage projects and view audit logs.</p>
        ) : (
          <p className="text-gray-600 text-sm">You are a Member. You have read-only access to projects.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
