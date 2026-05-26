import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { PageLoader } from './components/SkeletonLoader';

const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Projects = React.lazy(() => import('./pages/Projects'));
const AuditLogs = React.lazy(() => import('./pages/AuditLogs'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Team = React.lazy(() => import('./pages/Team'));
const SystemMetrics = React.lazy(() => import('./pages/SystemMetrics'));

// Component to handle global events
const GlobalEventListner = () => {
  React.useEffect(() => {
    const handleRateWarning = (e) => toast.warning(`You are nearing your limit! Only ${e.detail.remaining} requests left.`);
    const handleRateExceeded = () => toast.error('Rate limit exceeded. Please try again later or upgrade your plan.');
    
    window.addEventListener('rate-limit-warning', handleRateWarning);
    window.addEventListener('rate-limit-exceeded', handleRateExceeded);
    
    return () => {
      window.removeEventListener('rate-limit-warning', handleRateWarning);
      window.removeEventListener('rate-limit-exceeded', handleRateExceeded);
    };
  }, []);
  
  return null;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <Router>
            <GlobalEventListner />
            <Toaster position="top-right" richColors />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/team" element={<Team />} />
                    
                    {/* Only ORG_ADMIN can access audit logs */}
                    <Route element={<ProtectedRoute allowedRoles={['ORG_ADMIN']} />}>
                      <Route path="/audit-logs" element={<AuditLogs />} />
                      <Route path="/system" element={<SystemMetrics />} />
                    </Route>
                  </Route>
                </Route>
                
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
