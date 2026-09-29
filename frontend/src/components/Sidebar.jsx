import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSearch,
  Bot,
  FileSpreadsheet,
  ShieldAlert,
  MapPin,
  X
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
  {
    to: '/inspection',
    label: 'Field Reporting (PWA)',
    icon: MapPin,
  },
];

export default function Sidebar({ className, onClose }) {
  return (
    <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col justify-between p-4 ${className || ''}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between md:hidden">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Navigation
          </p>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!className && (
           <p className="hidden md:block px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
             Intelligence Modules
           </p>
        )}

        <div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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

        <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span className="font-semibold text-gray-700">National Target FY25</span>
            <span className="text-blue-700 font-mono font-bold">1,080 MT</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-500 h-2 rounded-full w-[88%]"></div>
          </div>
          <div className="flex justify-between text-[11px] text-gray-500 mt-1 font-mono">
            <span>YTD: 950.4 MT</span>
            <span>88% achieved</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-700 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
          AI Architecture v1.0
        </p>
        <p className="text-[11px] text-gray-500">Cloud infrastructure optimized.</p>
      </div>
    </aside>
  );
}