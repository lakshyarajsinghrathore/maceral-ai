import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DocumentIntelligence from './pages/DocumentIntelligence';
import CoalGPT from './pages/CoalGPT';
import ReportGenerator from './pages/ReportGenerator';
import ComplianceOverview from './pages/ComplianceOverview';
import AuthPage from './pages/AuthPage';

// Protected layout wrapper containing Dashboard Navbar and Sidebar
function ProtectedLayout() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#090D16]">
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
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
