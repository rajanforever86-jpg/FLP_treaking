import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Team from './pages/Team';
import Analysis from './pages/Analysis';
import Training from './pages/Training';
import Settings from './pages/Settings';
import About from './pages/About';
import Followup from './pages/Followup';
import Signups from './pages/Signups';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if ((this as any).state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
          <h1 className="font-syne font-black text-white text-[32px] mb-4">Something went wrong.</h1>
          <p className="font-dm text-gray-500 mb-8 max-w-md">TRAKZY AI encountered a critical error. Please refresh the page or try again later.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-8 py-4 bg-blue-600 rounded-full font-syne font-bold text-white shadow-lg shadow-blue-900/40"
          >
            Restart Application
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <Navigate to="/login" />;
  
  return <>{children}</>;
};

import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';

import { ReminderProvider } from './context/ReminderContext';

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <ReminderProvider>
              <AppContent />
            </ReminderProvider>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const showSidebar = !!user && !loading;

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <div className="flex bg-[var(--bg)] min-h-screen">
      {showSidebar && <Sidebar />}
      <div className={`flex-1 ${showSidebar ? "lg:pl-[240px] pb-32 lg:pb-12" : ""}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/about" element={<About />} />
          
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route path="/leads" element={<PrivateRoute><Leads /></PrivateRoute>} />
          <Route path="/team" element={<PrivateRoute><Team /></PrivateRoute>} />
          <Route path="/analysis" element={<PrivateRoute><Analysis /></PrivateRoute>} />
          <Route path="/training" element={<PrivateRoute><Training /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/followup" element={<PrivateRoute><Followup /></PrivateRoute>} />
          <Route path="/signups" element={<PrivateRoute><Signups /></PrivateRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
      {showSidebar && <BottomNav />}
    </div>
  );
}
