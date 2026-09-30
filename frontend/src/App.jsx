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
          <Outlet />
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
