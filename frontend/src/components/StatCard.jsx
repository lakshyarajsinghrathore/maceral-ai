import React from 'react';

export default function StatCard({ title, value, unit, subtitle, icon: Icon, trend, trendLabel, color = 'amber' }) {
  const colorMap = {
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  const badgeClass = colorMap[color] || colorMap.amber;

  return (
    <div className="bg-[#10172B] border border-slate-800/90 rounded-2xl p-5 md:p-6 hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{title}</p>
          <div className="mt-2.5 flex items-baseline space-x-1.5 flex-wrap">
            <span className="text-2xl font-extrabold text-white tracking-tight">{value}</span>
            {unit && <span className="text-xs text-slate-400 font-mono">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl border flex-shrink-0 ${badgeClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs gap-2">
        <span className="text-slate-400 truncate text-[11px]" title={subtitle}>{subtitle}</span>
        {trend && (
          <span className={`font-semibold font-mono text-[11px] flex-shrink-0 flex items-center gap-0.5 ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend > 0 ? '↑ +' : '↓ '}{trend}% {trendLabel || ''}
          </span>
        )}
      </div>
    </div>
  );
}
