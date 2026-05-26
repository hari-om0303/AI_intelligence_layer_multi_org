import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Lightbulb, AlertTriangle, CheckCircle, Info, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const AIInsightsPanel = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAI = async () => {
      try {
        const [recRes, anoRes] = await Promise.all([
          api.get('/ai/recommendations'),
          api.get('/analytics/anomalies').catch(() => ({ data: { data: [] } })) // gracefully handle if user is not ADMIN
        ]);
        setRecommendations(recRes.data.data || []);
        setAnomalies(anoRes.data.data || []);
      } catch (error) {
        console.error('Failed to fetch AI insights');
      } finally {
        setLoading(false);
      }
    };
    fetchAI();
  }, []);

  if (loading) return null; // or a skeleton loader

  const getIcon = (type) => {
    switch (type) {
      case 'HIGH_RISK':
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'CLEANUP':
      case 'UPGRADE':
        return <Lightbulb className="w-5 h-5 text-indigo-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  if (recommendations.length === 0 && anomalies.length === 0) {
    return null; // Don't show panel if no insights
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 shadow-sm"
    >
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-indigo-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">AI Insights & Recommendations</h3>
      </div>
      
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
        {anomalies.map((ano, i) => (
          <motion.div variants={item} key={`ano-${i}`} className="flex items-start bg-white p-4 rounded-xl border border-red-100 shadow-sm">
            <div className="flex-shrink-0 mt-0.5">{getIcon(ano.type)}</div>
            <div className="ml-3">
              <h4 className="text-sm font-semibold text-gray-900">System Anomaly Detected</h4>
              <p className="text-sm text-gray-600 mt-1">{ano.message}</p>
            </div>
          </motion.div>
        ))}
        
        {recommendations.map((rec, i) => (
          <motion.div variants={item} key={`rec-${i}`} className="flex items-start bg-white p-4 rounded-xl shadow-sm border border-transparent hover:border-indigo-100 transition-colors">
            <div className="flex-shrink-0 mt-0.5">{getIcon(rec.type)}</div>
            <div className="ml-3">
              <p className="text-sm text-gray-700 font-medium leading-relaxed">{rec.text}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default AIInsightsPanel;
