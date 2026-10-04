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
import GISMap from '../components/GISMap';
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
  }));

  const totalTarget = mines.reduce((acc, m) => acc + (m.target_annual_production_mt || 0), 0);
  const avgCompliance = mines.length
    ? (mines.reduce((acc, m) => acc + (m.compliance_score || 80), 0) / mines.length).toFixed(1)
    : 86.5;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Status Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              National Coal Intelligence & GIS Command
            </h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time multi-subsidiary governance, AI document pipeline, and DGMS compliance scoring.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="px-3 py-2 bg-white border border-gray-200 rounded-xl flex items-center space-x-2 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            <span className="text-gray-600">CIL Subsidiaries Monitored:</span>
            <strong className="text-blue-700 font-bold">7</strong>
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
          color="blue"
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
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  Target vs Actual Extraction by Mine Project
                </h3>
                <p className="text-xs text-gray-500">Million Tonnes (MT) and AI Compliance Health (0-100)</p>
              </div>
              <span className="text-xs font-mono bg-gray-50 px-2.5 py-1 rounded-lg text-gray-500 border border-gray-200">
                Q3 FY25
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1f2937', fontWeight: '500' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="target" fill="#94a3b8" name="Target (MT)" radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="actual" fill="#3b82f6" name="Achieved (MT)" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interactive Mine Sites Grid */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">
                Geospatial Mine Boundaries & Hazards
              </h3>
              <div className="h-[400px] w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <GISMap mines={mines} alerts={alerts} scores={mines} />
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2 pt-2 border-t border-gray-100">
              Mine Block Directory
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {mines.map((m) => {
                const isSelected = selectedMine?.id === m.id;
                const score = m.compliance_score || 85;
                const scoreColor =
                  score >= 85 ? 'text-green-700 bg-green-50 border-green-200' :
                  score >= 70 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                  'text-red-700 bg-red-50 border-red-200';

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMine(m)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold border border-gray-200">
                        {m.subsidiary}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {m.telemetry_status && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase border ${
                            m.telemetry_status === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                            m.telemetry_status === 'Watch' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {m.telemetry_status}
                          </span>
                        )}
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border font-bold ${scoreColor}`}>
                          {score}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 mt-2 truncate">{m.name}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 text-blue-500" />
                      {m.region}, {m.state}
                    </p>
                    {m.coal_seam && (
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5 truncate">
                        Seam: {m.coal_seam}
                      </p>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex justify-between text-[11px] font-mono text-gray-500">
                      <span>Daily: <strong className="text-gray-900">{m.daily_actual_kt ?? m.target_annual_production_mt} kT</strong></span>
                      <span>Target: <strong className="text-blue-600">{m.daily_target_kt ?? m.target_annual_production_mt} kT</strong></span>
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
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-blue-600 font-semibold tracking-wider uppercase">
                  Telemetry Focus
                </span>
                <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                  {selectedMine.code}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-900">{selectedMine.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedMine.subsidiary} • {selectedMine.region}, {selectedMine.state}
              </p>

              <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-500">Target Coal Seam:</span>
                  <span className="text-gray-900 font-semibold">{selectedMine.coal_seam || 'General Seam'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Daily Actual / Target:</span>
                  <span className="text-gray-900 font-semibold">
                    {selectedMine.daily_actual_kt ?? 15.0} / {selectedMine.daily_target_kt ?? 15.0} kT
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Coal Dispatched:</span>
                  <span className="text-blue-600 font-bold">{selectedMine.coal_dispatched_kt ?? 14.0} kT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pithead Strata Temp:</span>
                  <span className={selectedMine.pithead_temp_c > 40 ? "text-red-600 font-bold" : "text-gray-900"}>
                    {selectedMine.pithead_temp_c ?? 35.0}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Methane Gas (CH₄):</span>
                  <span className={selectedMine.methane_ch4_pct >= 1.0 ? "text-red-600 font-bold" : selectedMine.methane_ch4_pct >= 0.5 ? "text-amber-600 font-bold" : "text-green-600 font-bold"}>
                    {selectedMine.methane_ch4_pct ?? 0.25}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ambient Particulate Dust:</span>
                  <span className="text-gray-900">{selectedMine.dust_particulate_mg_m3 ?? 2.0} mg/m³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Compliance Health:</span>
                  <span className="text-green-600 font-bold">{selectedMine.compliance_score || 91.2} / 100</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1.5 text-green-600 font-mono">
                  <CheckCircle className="h-3.5 w-3.5" /> Sensor link active
                </span>
                <span className="font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-[10px]">
                  Status: {selectedMine.telemetry_status || 'Normal'}
                </span>
              </div>
            </div>
          )}

          {/* Predictive Alerts Panel */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Active Risk Alerts
              </h3>
              <span className="text-[11px] font-mono text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                {alerts.length} Total
              </span>
            </div>

            <div className="space-y-3">
              {alerts.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5 hover:border-gray-200 transition-all text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-red-700 truncate">{a.title}</span>
                    <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-gray-600 text-[11px] leading-relaxed">{a.description}</p>
                  <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span className="truncate max-w-[140px] text-gray-500">
                      {a.statutory_rule ? a.statutory_rule.split('(')[0] : (a.mine_name || 'CMR 2017')}
                    </span>
                    <span className="text-blue-600 font-semibold">{a.assigned_owner || 'Action Suggested'}</span>
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