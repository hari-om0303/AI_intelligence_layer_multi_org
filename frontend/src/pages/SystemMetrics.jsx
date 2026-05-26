import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Server, Zap, Database, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const SystemMetrics = () => {
  const [history, setHistory] = useState([]);

  const { data: metrics, isLoading: loading } = useQuery({
    queryKey: ['systemMetrics'],
    queryFn: async () => {
      const { data } = await api.get('/system/metrics');
      const newMetrics = data.data;
      
      const timeLabel = new Date(newMetrics.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      setHistory(prev => {
        const newHistory = [...prev, {
          time: timeLabel,
          cpu: newMetrics.cpuLoad,
          memory: newMetrics.memory.percent,
          latency: newMetrics.api.avgResponseTimeMs,
          rpm: newMetrics.api.requestsPerMinute
        }];
        return newHistory.slice(-15);
      });
      
      return newMetrics;
    },
    refetchInterval: 3000,
    staleTime: 2000
  });

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const statCards = [
    { name: 'API Latency', value: `${metrics.api.avgResponseTimeMs} ms`, icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { name: 'Active WebSockets', value: metrics.websockets.activeConnections, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Redis Cache Hit Rate', value: `${metrics.redis.hitRate}%`, icon: Database, color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'CPU Load (1m)', value: metrics.cpuLoad, icon: Server, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Server className="w-6 h-6 mr-2 text-indigo-600" /> System Metrics
        </h1>
        <p className="text-sm text-gray-500 mt-1">Real-time observability and health dashboard.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Latency Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">API Latency (ms)</h3>
            <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
              Live
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="time" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="latency" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorLatency)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Requests Per Minute */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Requests Per Minute</h3>
            <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
              Live
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorRpm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="time" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="rpm" stroke="#0891b2" strokeWidth={3} fillOpacity={1} fill="url(#colorRpm)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hardware / Environment Details */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center">
          <Database className="w-5 h-5 text-gray-500 mr-2" />
          <h3 className="font-bold text-gray-900">Infrastructure Details</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">System Memory (RAM)</p>
            <div className="flex items-center">
              <div className="text-2xl font-bold text-gray-900">{metrics.memory.used} GB</div>
              <div className="text-gray-400 mx-2">/</div>
              <div className="text-gray-500">{metrics.memory.total} GB</div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
              <div className={`h-2 rounded-full ${metrics.memory.percent > 85 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${metrics.memory.percent}%` }}></div>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Redis Keyspace</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.redis.keys.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">Total active keys in cache</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Status</p>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <span className="font-bold text-green-600 text-lg">All Systems Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple CheckCircle icon for the status
const CheckCircle = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default SystemMetrics;
