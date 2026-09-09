import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Bell, FileText, Cpu, CheckCircle2, LogOut, User } from 'lucide-react';
import { checkHealth, fetchAlerts } from '../api/client';

export default function Navbar() {
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
    <header className="bg-[#0D1424] border-b border-slate-800/80 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
      <div className="px-6 py-3.5 flex items-center justify-between">
        {/* Left Branding */}
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center overflow-hidden">
            <div className="h-full w-full bg-white rounded-[10px] flex items-center justify-center p-1">
              <img src="/logo.png" alt="Maceral AI" className="h-7 w-auto object-contain" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                Maceral AI
              </h1>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
              <span>Unified Geological & Mining Platform</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300">Team BYTE MINERS</span>
            </p>
          </div>
        </div>

        {/* Right Status & Meta */}
        <div className="flex items-center space-x-4">

          {/* Backend Status */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs">
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
            <span className="text-slate-300 font-medium">{online ? 'Backend Live' : 'Connecting...'}</span>
          </div>

          {/* Alert Counter */}
          {criticalAlerts > 0 && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 animate-pulse">
              <Bell className="h-3.5 w-3.5 text-red-400" />
              <span className="font-semibold">{criticalAlerts} Active Risk Alert{criticalAlerts > 1 ? 's' : ''}</span>
            </div>
          )}

          {/* User Profile & Sign Out */}
          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="flex items-center space-x-2 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                  {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                </div>
                <span className="text-slate-200 font-medium max-w-[120px] truncate">{user.full_name || user.email}</span>
                <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-mono uppercase">
                  {user.role || 'Officer'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg border border-transparent hover:border-slate-800 transition-colors"
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
