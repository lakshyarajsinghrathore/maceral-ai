import React from 'react';

export default function StatCard({ title, value, unit, subtitle, icon: Icon, trend, trendLabel, color = 'blue' }) {
  const colorMap = {
    amber: 'text-amber-600 bg-amber-50 border-amber-200',
    emerald: 'text-green-600 bg-green-50 border-green-200',
    sky: 'text-sky-600 bg-sky-50 border-sky-200',
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    rose: 'text-red-600 bg-red-50 border-red-200',
  };

  const badgeClass = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 hover:border-gray-300 transition-all shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">{title}</p>
          <div className="mt-2.5 flex items-baseline space-x-1.5 flex-wrap">
            <span className="text-2xl font-extrabold text-gray-900 tracking-tight">{value}</span>
            {unit && <span className="text-xs text-gray-500 font-mono">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl border flex-shrink-0 ${badgeClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs gap-2">
        <span className="text-gray-500 truncate text-[11px]" title={subtitle}>{subtitle}</span>
        {trend && (
          <span className={`font-semibold font-mono text-[11px] flex-shrink-0 flex items-center gap-0.5 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '↑ +' : '↓ '}{trend}% {trendLabel || ''}
          </span>
        )}
      </div>
    </div>
  );
}