import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Flame,
  Trees,
  Layers,
  FileCheck,
  CheckCircle,
  ArrowUpRight,
  Send,
  Loader2
} from 'lucide-react';
import { fetchComplianceScores, fetchAlerts, handleAlertAction, fetchMines } from '../api/client';

export default function ComplianceOverview() {
  const [scores, setScores] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [mines, setMines] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sc, al, mn] = await Promise.all([
        fetchComplianceScores(),
        fetchAlerts(),
        fetchMines()
      ]);
      setScores(sc);
      setAlerts(al);
      setMines(mn);
    } catch (err) {
      console.error('Error fetching compliance data:', err);
    }
  };

  const handleAction = async (alertId, action) => {
    setActionLoading(alertId);
    try {
      await handleAlertAction(alertId, action, '', 'Ministry Safety Directorate');
      await loadData();
    } catch (err) {
      console.error('Alert action failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Compliance Governance & Risk Intelligence
            </h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Automated statutory adherence scoring (0–100), environmental limits, and human-in-the-loop escalation workflows.
          </p>
        </div>
      </div>

      {/* Grid: Compliance Scorecards & Alerts Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Mine Scorecards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                Mine Compliance Health Scorecards (0–100)
              </h3>
              <span className="text-xs font-mono text-gray-500">DGMS & CPCB Benchmark</span>
            </div>

            <div className="space-y-3">
              {scores.map((sc) => {
                const isHigh = sc.overall_score >= 85;
                const isMod = sc.overall_score >= 70 && sc.overall_score < 85;
                const badgeColor = isHigh
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : isMod
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-red-50 text-red-700 border-red-200';

                return (
                  <div
                    key={sc.id}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 transition-all space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{sc.mine_name || 'Mine Block'}</h4>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                          Evaluated: {sc.evaluated_period}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${badgeColor}`}>
                          {sc.overall_score} / 100 ({sc.risk_level} Risk)
                        </span>
                      </div>
                    </div>

                    {/* Weighted Sub-Scores */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <span className="text-gray-500 block text-[10px]">Safety (30%)</span>
                        <strong className="text-green-600 text-sm">{sc.safety_score.toFixed(1)}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <span className="text-gray-500 block text-[10px]">Environment (25%)</span>
                        <strong className="text-sky-600 text-sm">{sc.environmental_score.toFixed(1)}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <span className="text-gray-500 block text-[10px]">Production (20%)</span>
                        <strong className="text-amber-600 text-sm">{sc.production_variance_score.toFixed(1)}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <span className="text-gray-500 block text-[10px]">Statutory (25%)</span>
                        <strong className="text-purple-600 text-sm">{sc.statutory_adherence_score.toFixed(1)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Human-in-the-Loop Alerts Escalation Center */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                Human-in-the-Loop Escalation Center
              </h3>
              <span className="text-xs font-mono text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                {alerts.filter((a) => a.status === 'pending').length} Pending
              </span>
            </div>

            <div className="space-y-3.5">
              {alerts.map((alert) => {
                const isPending = alert.status === 'pending';
                const isEscalated = alert.status === 'escalated';

                return (
                  <div
                    key={alert.id}
                    className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5 text-xs shadow-sm hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 truncate">{alert.title}</span>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                        {alert.severity}
                      </span>
                    </div>

                    {alert.statutory_rule && (
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                          📜 {alert.statutory_rule}
                        </span>
                        {alert.target_resolution_date && (
                          <span className="text-gray-500">
                            Due: <strong className="text-red-500">{alert.target_resolution_date}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-gray-700 text-[11px] leading-relaxed font-sans">{alert.description}</p>

                    {alert.suggested_action && (
                      <div className="p-2 bg-white rounded-lg border border-gray-200 text-[11px] text-blue-700 font-mono">
                        💡 <strong>Suggested Directive:</strong> {alert.suggested_action}
                      </div>
                    )}

                    {alert.assigned_owner && (
                      <div className="text-[10px] font-mono text-gray-500">
                        Assigned Owner: <strong className="text-gray-900">{alert.assigned_owner}</strong>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between font-mono text-[10px]">
                      <span className="text-gray-500">
                        Status:{' '}
                        <strong className={isEscalated ? 'text-amber-600 uppercase' : 'text-gray-700 uppercase'}>
                          {alert.status}
                        </strong>
                      </span>

                      {isPending && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleAction(alert.id, 'escalate')}
                            disabled={actionLoading === alert.id}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-1 transition-all"
                          >
                            {actionLoading === alert.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            <span>Escalate</span>
                          </button>
                          <button
                            onClick={() => handleAction(alert.id, 'resolve')}
                            disabled={actionLoading === alert.id}
                            className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all"
                          >
                            Resolve
                          </button>
                        </div>
                      )}

                      {isEscalated && (
                        <span className="text-green-600 font-bold flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Sent to Ministry
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}