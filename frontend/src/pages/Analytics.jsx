import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../services/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Lock, Zap, AlertTriangle } from 'lucide-react';

const Analytics = () => {
  const { user, upgradeUserPlan } = useAuth();
  const [upgrading, setUpgrading] = useState(false);
  
  const isPro = user?.orgId?.subscriptionPlan === 'PRO';

  const { data, isLoading: loading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await api.get('/analytics/dashboard');
      return res.data.data;
    },
    enabled: isPro,
    staleTime: 5 * 60 * 1000
  });

  const { data: risksData, isLoading: loadingRisks } = useQuery({
    queryKey: ['intelligenceRisks'],
    queryFn: async () => {
      const { data } = await api.get('/intelligence/risks');
      return data.data;
    },
    enabled: isPro,
  });

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await upgradeUserPlan();
      toast.success('Upgraded to PRO! Analytics unlocked.');
    } catch (error) {
      toast.error('Failed to upgrade.');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading AI Analytics...</div>;
  
  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics is a PRO Feature</h2>
        <p className="text-gray-500 max-w-md mb-8">
          Upgrade your organization to the PRO plan to unlock AI-powered insights, deep analytics, and unlimited projects.
        </p>
        <button 
          onClick={handleUpgrade}
          disabled={upgrading}
          className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50"
        >
          <Zap className="w-5 h-5 mr-2" /> {upgrading ? 'Upgrading...' : 'Upgrade to PRO Now'}
        </button>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-gray-500">No data available</div>;

  const pieData = [
    { name: 'Active', value: data.activeProjects },
    { name: 'Inactive', value: data.inactiveProjects },
  ];
  const COLORS = ['#4F46E5', '#E5E7EB'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Analytics</h1>
        <p className="text-sm text-gray-500">Intelligent insights into your organization's performance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Growth Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Growth (6 Months)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.projectGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="projects" 
                  stroke="#4F46E5" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#4F46E5' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active vs Inactive Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Activity Ratio</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Risk Alerts Panel */}
      {risksData && risksData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 mt-6">
          <div className="flex items-center mb-6">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
            <h3 className="text-xl font-bold text-gray-900">Active Risks Identified ({risksData.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {risksData.map(risk => (
              <div key={risk.projectId} className="bg-red-50 p-5 rounded-xl border border-red-100 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900">{risk.title}</h4>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${risk.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {risk.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{risk.message}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {risk.reasons.map((r, i) => (
                    <span key={i} className="text-xs bg-white text-gray-600 px-2 py-1 rounded-md border border-red-100">{r}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
