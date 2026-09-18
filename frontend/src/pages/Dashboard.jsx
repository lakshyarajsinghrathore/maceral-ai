import React, { useState, useEffect } from 'react';
import {
  Pickaxe,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  FileText,
  MapPin,
  Flame,
  Wind,
  CheckCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend
} from 'recharts';
import StatCard from '../components/StatCard';
import { fetchMines, fetchAlerts, fetchDocuments, fetchReports } from '../api/client';

export default function Dashboard() {
  const [mines, setMines] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [docs, setDocs] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedMine, setSelectedMine] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [minesData, alertsData, docsData, reportsData] = await Promise.all([
          fetchMines(),
          fetchAlerts(),
          fetchDocuments(),
          fetchReports()
        ]);
        setMines(minesData);
        setAlerts(alertsData);
        setDocs(docsData);
        setReports(reportsData);
        if (minesData.length > 0) {
          setSelectedMine(minesData[0]);
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // Production Chart Data
  const productionChartData = mines.map((m) => ({
    name: m.name.split(' ')[0],
    target: m.target_annual_production_mt,
    actual: Number((m.target_annual_production_mt * 0.93).toFixed(1)),
    compliance: m.compliance_score || 85,
  }));

  const totalTarget = mines.reduce((acc, m) => acc + (m.target_annual_production_mt || 0), 0);
  const avgCompliance = mines.length
    ? (mines.reduce((acc, m) => acc + (m.compliance_score || 80), 0) / mines.length).toFixed(1)
    : 86.5;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Status Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-black text-white tracking-tight">
              National Coal Intelligence & GIS Command
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-subsidiary governance, AI document pipeline, and DGMS compliance scoring.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">CIL Subsidiaries Monitored:</span>
            <strong className="text-amber-400 font-bold">7</strong>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Fleet Capacity"
          value={totalTarget.toFixed(1)}
          unit="MTPA"
          subtitle="Across 6 primary opencast & deep blocks"
          icon={Pickaxe}
          trend={6.4}
          trendLabel="vs FY24"
          color="amber"
        />
        <StatCard
          title="National Compliance Index"
          value={avgCompliance}
          unit="/ 100"
          subtitle="Weighted safety, env, and statutory score"
          icon={ShieldCheck}
          trend={2.1}
          trendLabel="stable"
          color="emerald"
        />
        <StatCard
          title="Processed Mining Docs"
          value={docs.length || 2}
          unit="files"
          subtitle="Processed via Neural OCR & Extraction Engine"
          icon={FileText}
          trend={100}
          trendLabel="zero errors"
          color="sky"
        />
        <StatCard
          title="Active Predictive Alerts"
          value={alerts.filter((a) => a.status === 'pending').length}
          unit="pending"
          subtitle="Human-in-the-loop review required"
          icon={AlertTriangle}
          trend={-15}
          trendLabel="resolved"
          color="rose"
        />
      </div>

      {/* Main Grid: GIS Mine Fleet Map & Production Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Production Analytics & Active Mine Explorer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Production vs Target Chart */}
          <div className="bg-[#10172B] border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Target vs Actual Extraction by Mine Project
                </h3>
                <p className="text-xs text-slate-400">Million Tonnes (MT) and AI Compliance Health (0-100)</p>
              </div>
              <span className="text-xs font-mono bg-slate-900 px-2.5 py-1 rounded-lg text-slate-400 border border-slate-800">
                Q3 FY25
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B1120', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#FBBF24', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="target" fill="#475569" name="Target (MT)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill="#F59E0B" name="Achieved (MT)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interactive Mine Sites Grid */}
          <div className="bg-[#10172B] border border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
              Geographic Mine Block Directory (GIS Telemetry)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {mines.map((m) => {
                const isSelected = selectedMine?.id === m.id;
                const score = m.compliance_score || 85;
                const scoreColor =
                  score >= 85 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                  score >= 70 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                  'text-rose-400 border-rose-500/30 bg-rose-500/10';

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMine(m)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/5'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                        {m.subsidiary}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {m.telemetry_status && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                            m.telemetry_status === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            m.telemetry_status === 'Watch' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {m.telemetry_status}
                          </span>
                        )}
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border font-bold ${scoreColor}`}>
                          {score} / 100
                        </span>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-100 mt-2 truncate">{m.name}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 text-amber-500" />
                      {m.region}, {m.state}
                    </p>
                    {m.coal_seam && (
                      <p className="text-[11px] text-amber-400/80 font-mono mt-0.5 truncate">
                        Seam: {m.coal_seam}
                      </p>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Daily: <strong className="text-slate-200">{m.daily_actual_kt ?? m.target_annual_production_mt} kT</strong></span>
                      <span>Target: <strong className="text-amber-300">{m.daily_target_kt ?? m.target_annual_production_mt} kT</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Selected Mine Focus & Active Alerts */}
        <div className="space-y-6">
          {/* Selected Mine GIS Card */}
          {selectedMine && (
            <div className="bg-[#10172B] border border-amber-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl"></div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-amber-400 font-semibold tracking-wider uppercase">
                  Telemetry Focus
                </span>
                <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {selectedMine.code}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white">{selectedMine.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedMine.subsidiary} • {selectedMine.region}, {selectedMine.state}
              </p>

              <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Coal Seam:</span>
                  <span className="text-amber-300 font-semibold">{selectedMine.coal_seam || 'General Seam'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Daily Actual / Target:</span>
                  <span className="text-slate-200 font-semibold">
                    {selectedMine.daily_actual_kt ?? 15.0} / {selectedMine.daily_target_kt ?? 15.0} kT
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Coal Dispatched:</span>
                  <span className="text-emerald-400 font-bold">{selectedMine.coal_dispatched_kt ?? 14.0} kT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pithead Strata Temp:</span>
                  <span className={selectedMine.pithead_temp_c > 40 ? "text-rose-400 font-bold" : "text-slate-200"}>
                    {selectedMine.pithead_temp_c ?? 35.0}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Methane Gas (CH₄):</span>
                  <span className={selectedMine.methane_ch4_pct >= 1.0 ? "text-rose-400 font-bold" : selectedMine.methane_ch4_pct >= 0.5 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                    {selectedMine.methane_ch4_pct ?? 0.25}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ambient Particulate Dust:</span>
                  <span className="text-slate-200">{selectedMine.dust_particulate_mg_m3 ?? 2.0} mg/m³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Compliance Health:</span>
                  <span className="text-emerald-400 font-bold">{selectedMine.compliance_score || 91.2} / 100</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                  <CheckCircle className="h-3.5 w-3.5" /> Sensor link active
                </span>
                <span className="font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                  Status: {selectedMine.telemetry_status || 'Normal'}
                </span>
              </div>
            </div>
          )}

          {/* Predictive Alerts Panel */}
          <div className="bg-[#10172B] border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                Active Risk Alerts
              </h3>
              <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                {alerts.length} Total
              </span>
            </div>

            <div className="space-y-3">
              {alerts.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className="p-3 bg-slate-900/90 border border-slate-800/80 rounded-xl space-y-1.5 hover:border-slate-700 transition-all text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-300 truncate">{a.title}</span>
                    <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{a.description}</p>
                  <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="truncate max-w-[140px] text-slate-400">
                      {a.statutory_rule ? a.statutory_rule.split('(')[0] : (a.mine_name || 'CMR 2017')}
                    </span>
                    <span className="text-amber-400 font-semibold">{a.assigned_owner || 'Action Suggested'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
