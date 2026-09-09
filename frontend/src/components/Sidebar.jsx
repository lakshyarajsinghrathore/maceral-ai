import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSearch,
  Bot,
  FileSpreadsheet,
  ShieldAlert,
  Layers,
  MapPin
} from 'lucide-react';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Overview & GIS Map',
    icon: LayoutDashboard,
  },
  {
    to: '/documents',
    label: 'Document Intelligence',
    icon: FileSearch,
  },
  {
    to: '/coalgpt',
    label: 'CoalGPT Q&A (Citations)',
    icon: Bot,
  },
  {
    to: '/reports',
    label: 'Ministry Report Generator',
    icon: FileSpreadsheet,
  },
  {
    to: '/compliance',
    label: 'Compliance & Alerts',
    icon: ShieldAlert,
  },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#0B1120] border-r border-slate-800/80 flex flex-col justify-between p-4 min-h-[calc(100vh-61px)]">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Intelligence Modules
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold text-slate-300">National Target FY25</span>
            <span className="text-amber-400 font-mono font-bold">1,080 MT</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-emerald-400 h-2 rounded-full w-[88%]"></div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-mono">
            <span>YTD: 950.4 MT</span>
            <span>88% achieved</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-400 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          AI Architecture v1.0
        </p>
        <p className="text-[11px] text-slate-600">Zero recurring cloud infrastructure costs.</p>
      </div>
    </aside>
  );
}
