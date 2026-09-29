import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Bell, FileText, Cpu, CheckCircle2, LogOut, User, Menu } from 'lucide-react';
import { checkHealth, fetchAlerts } from '../api/client';

export default function Navbar({ onMenuClick }) {
  const [online, setOnline] = useState(false);
  const [groqReady, setGroqReady] = useState(false);
  const [criticalAlerts, setCriticalAlerts] = useState(0);

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  useEffect(() => {
    const getStatus = async () => {
      try {
        const h = await checkHealth();
        setOnline(h.status === 'healthy');
        setGroqReady(h.groq_configured);
      } catch (e) {
        setOnline(false);
      }

      try {
        const alerts = await fetchAlerts('pending');
        const crit = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;
        setCriticalAlerts(crit);
      } catch (e) {}
    };

    getStatus();
    const timer = setInterval(getStatus, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="px-4 md:px-6 py-3.5 flex items-center justify-between">
        {/* Left Branding */}
        <div className="flex items-center space-x-3.5">
          <button
            onClick={onMenuClick}
            className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="h-10 w-10 rounded-xl bg-gray-50 border border-gray-100 p-0.5 flex items-center justify-center overflow-hidden">
            <div className="h-full w-full bg-white rounded-[10px] flex items-center justify-center p-1">
              <img src="/logo.png" alt="Maceral AI" className="h-7 w-auto object-contain" />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-gray-900 tracking-wide">
                Maceral AI
              </h1>
            </div>
          </div>
        </div>

        {/* Right Status & Meta */}
        <div className="flex items-center space-x-3 md:space-x-4">

          {/* Alert Counter */}
          {criticalAlerts > 0 && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <Bell className="h-3.5 w-3.5 text-red-500" />
              <span className="font-semibold hidden sm:inline">{criticalAlerts} Active Risk Alert{criticalAlerts > 1 ? 's' : ''}</span>
              <span className="font-semibold sm:hidden">{criticalAlerts}</span>
            </div>
          )}

          {/* User Profile & Sign Out */}
          {user && (
            <div className="flex items-center space-x-2 md:pl-2 md:border-l border-gray-200">
              <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                  {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                </div>
                <span className="text-gray-700 font-medium max-w-[120px] truncate">{user.full_name || user.email}</span>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono uppercase">
                  {user.role || 'Officer'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg border border-transparent transition-colors focus:outline-none"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}