import React, { useState } from 'react';
import { Users, AlertCircle, Link as LinkIcon, ShieldCheck, CheckCircle2, ChevronDown, Download, Hash } from 'lucide-react';
import StatCard from '../components/StatCard';

const mockContractors = [
  { id: 'C-001', name: 'M/s L&T Heavy Engineering', role: 'Overburden Removal', mine: 'Gevra OCP', status: 'Active', compliance: 94, workers: 450, issueRate: 'Low' },
  { id: 'C-002', name: 'BEML Mining Services', role: 'Dragline Maintenance', mine: 'Nigahi OCP', status: 'Active', compliance: 98, workers: 120, issueRate: 'Low' },
  { id: 'C-005', name: 'Alpha Logistics Tech', role: 'Coal Transport', mine: 'Kusmunda OCP', status: 'Warning', compliance: 76, workers: 210, issueRate: 'Medium' },
  { id: 'C-007', name: 'DeepExcavations Pvt Ltd', role: 'Underground Support', mine: 'Moonidih UG', status: 'Critical', compliance: 62, workers: 85, issueRate: 'High' }
];

const mockGrievances = [
  { id: 'G-2409-11', type: 'Safety Gear', contractor: 'DeepExcavations Pvt Ltd', status: 'Open', desc: 'Insufficient reflective vests provided to night shift workers at Longwall Panel 3.', date: '2026-09-29', priority: 'High' },
  { id: 'G-2409-10', type: 'Wage Dispute', contractor: 'Alpha Logistics Tech', status: 'Investigating', desc: 'Delay in overtime dispersed for September festive holidays.', date: '2026-09-28', priority: 'Medium' },
  { id: 'G-2409-08', type: 'Health', contractor: 'M/s L&T Heavy Engineering', status: 'Resolved', desc: 'Lack of RO drinking water points near Bench 4 OB dumps.', date: '2026-09-25', priority: 'Low' }
];

const mockAuditTrail = [
  { action: 'Form 3 Statutory Return Submitted', user: 'SECL Inspector Alpha', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4', target: 'Gevra OCP', timestamp: '2026-09-30 08:14:22' },
  { action: 'Compliance Score Modified (82 → 79)', user: 'AI Compliance Engine', hash: 'b1a23c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', target: 'Kusmunda OCP', timestamp: '2026-09-29 16:45:00' },
  { action: 'Contractor Penalty Triggered (₹50k)', user: 'DGMS Automated Workflow', hash: '8a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0d', target: 'DeepExcavations Pvt Ltd', timestamp: '2026-09-29 14:12:11' },
  { action: 'Alert Resolved: CH4 Spike', user: 'BCCL Ventilation Mgr', hash: '7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y', target: 'Moonidih UG', timestamp: '2026-09-28 22:10:05' }
];

export default function ContractorsAudit() {
  const [activeTab, setActiveTab] = useState('contractors');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Contractors, Grievances & Audit Trails
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Complete lifecycle management of third-party workforce and tamper-proof blockchain-linked action logs (SIH26024).
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() => setActiveTab('contractors')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all ${activeTab === 'contractors' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
        >
          <Users className="w-4 h-4" />
          <span>Vendor & Grievance Tracking</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all ${activeTab === 'audit' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Tamper-Proof Audit Trails</span>
        </button>
      </div>

      {activeTab === 'contractors' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Active Mining Contractors" value="142" unit="" subtitle="Across 7 subsidiaries" icon={Users} color="blue" />
            <StatCard title="Open Labor Grievances" value="12" unit="" subtitle="8 resolved this week" icon={AlertCircle} trend={-15} trendLabel="vs last week" color="amber" />
            <StatCard title="Avg Vendor Compliance" value="88" unit="/ 100" subtitle="AI statutory rating" icon={CheckCircle2} color="emerald" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vendor List */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-sm tracking-wider uppercase text-gray-800">Critical Vendor Registry</h3>
              </div>
              <div className="p-0 overflow-x-auto flex-1">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 text-xs">
                    <tr>
                      <th className="px-4 py-3 font-semibold uppercase">Contractor</th>
                      <th className="px-4 py-3 font-semibold uppercase">Role/Site</th>
                      <th className="px-4 py-3 font-semibold uppercase">Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mockContractors.map(c => (
                      <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-4">
                          <p className="font-bold text-gray-900">{c.name}</p>
                          <p className="text-[10px] uppercase font-mono text-gray-500 mt-0.5">{c.id} • {c.workers} Workers</p>
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          <p className="font-medium">{c.role}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{c.mine}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded inline-flex font-mono text-[11px] font-bold border ${c.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : c.status === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {c.compliance}/100
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grievances */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-sm tracking-wider uppercase text-gray-800">Live Worker Grievances</h3>
                <span className="text-[10px] font-mono bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">Attention Req</span>
              </div>
              <div className="p-4 space-y-3">
                {mockGrievances.map(g => (
                  <div key={g.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50 hover:border-gray-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border uppercase ${g.priority === 'High' ? 'bg-red-100 text-red-700 border-red-200' : g.priority === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>{g.status}</span>
                       <span className="text-[10px] font-mono text-gray-400">{g.date}</span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">{g.type}</h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{g.desc}</p>
                    <div className="mt-2 pt-2 border-t border-gray-200 text-[11px] font-mono text-blue-600 font-semibold">
                      Contractor: {g.contractor}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm text-emerald-900">
            <h3 className="font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5"/> Secure Audit Subsystem (Blockchain-backed)</h3>
            <p className="text-sm mt-1 text-emerald-700">Every statutory form upload, AI extraction, compliance adjustment, and penalty issuance is cryptographically hashed and appended to an indelible audit log. This ensures 100% accountability and tamper-proof electronic records for DGMS verification.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
               <h3 className="font-bold text-sm tracking-wider uppercase text-gray-800">Unified Crypto Action Log</h3>
               <button className="text-xs flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                 <Download className="w-3.5 h-3.5" /> Export Ledger (.csv)
               </button>
            </div>

            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 text-[11px] uppercase font-bold">
                  <tr>
                    <th className="px-5 py-3">Timestamp (UTC)</th>
                    <th className="px-5 py-3">Action Description</th>
                    <th className="px-5 py-3">Initiator</th>
                    <th className="px-5 py-3">Target Entity</th>
                    <th className="px-5 py-3">SHA-256 Ledger Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                   {mockAuditTrail.map((log, i) => (
                     <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                       <td className="px-5 py-4 font-mono text-gray-500">{log.timestamp}</td>
                       <td className="px-5 py-4 font-semibold text-gray-800">{log.action}</td>
                       <td className="px-5 py-4 text-gray-600 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gray-400"/> {log.user}</td>
                       <td className="px-5 py-4 font-mono text-gray-600">{log.target}</td>
                       <td className="px-5 py-4">
                         <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded px-2 py-1 max-w-[200px]">
                           <Hash className="w-3 h-3 text-emerald-500 shrink-0" />
                           <span className="font-mono text-[9px] text-gray-500 truncate">{log.hash}</span>
                         </div>
                       </td>
                     </tr>
                   ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}