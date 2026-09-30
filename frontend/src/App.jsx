import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DocumentIntelligence from './pages/DocumentIntelligence';
import CoalGPT from './pages/CoalGPT';
import ReportGenerator from './pages/ReportGenerator';
import ComplianceOverview from './pages/ComplianceOverview';
import MobileInspection from './pages/MobileInspection';
import ContractorsAudit from './pages/ContractorsAudit';
import AuthPage from './pages/AuthPage';

// Resilient Error Boundary to prevent any sub-route error from blanking out the app layout
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Maceral AI] Route render error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-2xl border border-red-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
            !
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Notice: Component Reload Needed</h3>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            A temporary component error occurred while rendering this view. You can reload this view or navigate to other tabs using the sidebar.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Retry Loading View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Protected layout wrapper containing Dashboard Navbar and Sidebar
function ProtectedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const token = localStorage.getItem('auth_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="h-screen bg-[#F5F3EE] text-gray-900 flex flex-col font-sans overflow-hidden">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out absolute z-20 md:relative h-full shrink-0`} onClose={() => setSidebarOpen(false)} />

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-900/50 z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto bg-[#F5F3EE] w-full">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/documents" element={<DocumentIntelligence />} />
          <Route path="/coalgpt" element={<CoalGPT />} />
          <Route path="/reports" element={<ReportGenerator />} />
          <Route path="/compliance" element={<ComplianceOverview />} />
          <Route path="/contractors" element={<ContractorsAudit />} />
          <Route path="/inspection" element={<MobileInspection />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
