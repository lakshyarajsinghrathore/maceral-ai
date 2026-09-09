import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Sparkles,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Layers
} from 'lucide-react';
import { generateMinistryReport, fetchReports, fetchMines, getFileUrl } from '../api/client';

const REPORT_TEMPLATES = [
  {
    type: 'Ministry_Monthly_Executive',
    title: 'Ministry Monthly Executive Briefing',
    desc: 'Official high-level synthesis of gross production, OBR, railway siding dispatch, and revenue KPIs.',
    badge: 'Ministry Standard'
  },
  {
    type: 'Safety_Audit',
    title: 'DGMS & Mine Safety Compliance Dossier',
    desc: 'Detailed log of gas levels (CH4/CO), ventilation status, reportable near-misses, and statutory notices.',
    badge: 'DGMS Audit'
  },
  {
    type: 'Parliament_Query_Docket',
    title: 'Parliamentary Query Response Dossier',
    desc: 'Official certified answers with source lineage and data citations for Lok Sabha / Rajya Sabha questions.',
    badge: 'Parliamentary'
  },
  {
    type: 'Quarterly_Production',
    title: 'Quarterly Production & Stripping Summary',
    desc: 'Deep-dive into geological seam quality, GCV grade breakdown, ash content, and dragline metrics.',
    badge: 'Operations'
  }
];

export default function ReportGenerator() {
  const [reports, setReports] = useState([]);
  const [mines, setMines] = useState([]);
  const [selectedType, setSelectedType] = useState('Ministry_Monthly_Executive');
  const [reportTitle, setReportTitle] = useState('National Coal Fleet Executive Intelligence Briefing');
  const [mineId, setMineId] = useState('');
  const [period, setPeriod] = useState('Q3 FY 2024-25');
  const [format, setFormat] = useState('pdf');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const [reps, mns] = await Promise.all([fetchReports(), fetchMines()]);
      setReports(reps);
      setMines(mns);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const resp = await generateMinistryReport({
        report_title: reportTitle,
        report_type: selectedType,
        reporting_period: period,
        mine_id: mineId || null,
        file_format: format,
        custom_notes: notes || null
      });
      setGeneratedReport(resp);
      await loadReports();
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedType(template.type);
    setReportTitle(template.title);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-black text-white tracking-tight">
              One-Click Ministry Report Generator
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Replaces 3–4 days of manual compilation with certified PDF/DOCX reports generated in under 15 seconds.
          </p>
        </div>
      </div>

      {/* Grid: Template Selector & Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates Selection */}
        <div className="bg-[#10172B] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
            1. Select Report Template
          </h3>
          <div className="space-y-2.5">
            {REPORT_TEMPLATES.map((tpl) => {
              const isSelected = selectedType === tpl.type;
              return (
                <div
                  key={tpl.type}
                  onClick={() => handleTemplateSelect(tpl)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/15 shadow-sm'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-100">{tpl.title}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-purple-500/20">
                      {tpl.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{tpl.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Configuration Form */}
        <div className="lg:col-span-2 bg-[#10172B] border border-slate-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            2. Report Parameters & Scope
          </h3>

          <form onSubmit={handleGenerate} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Report Title</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Mine Block / Fleet</label>
                <select
                  value={mineId}
                  onChange={(e) => setMineId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">National Coal Fleet (All)</option>
                  {mines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.subsidiary})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Reporting Period</label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="e.g. Q3 FY 2024-25"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Output Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                >
                  <option value="pdf">Official PDF Document</option>
                  <option value="docx">Word Document (.docx)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Custom Directives / Special Audit Focus</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include any specific instructions (e.g. 'Highlight East-West railway dispatch capacity and DGMS slope stability compliance')..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={generating}
              className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all ${
                generating
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-slate-950 shadow-md shadow-purple-500/20'
              }`}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Synthesizing Metrics & Rendering Document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Certified Ministry Report</span>
                </>
              )}
            </button>
          </form>

          {/* Recently generated success callout */}
          {generatedReport && (
            <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs">
              <div className="space-y-1 truncate pr-3">
                <p className="font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  Report Generated Successfully!
                </p>
                <p className="text-slate-300 truncate font-mono">{generatedReport.report_title}</p>
              </div>
              <a
                href={getFileUrl(generatedReport.file_url)}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg flex items-center gap-1.5 shrink-0 transition-all shadow-sm font-mono"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download {generatedReport.file_format.toUpperCase()}</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Generated Reports Archive */}
      <div className="bg-[#10172B] border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-purple-400" />
          Certified Reports Archive ({reports.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Report Title</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Scope</th>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3">Format</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-200">{r.report_title}</td>
                  <td className="py-3 px-3 font-mono text-purple-400">{r.report_type.replace(/_/g, ' ')}</td>
                  <td className="py-3 px-3 text-slate-400">{r.mine_name || 'National Fleet'}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">{r.reporting_period}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] uppercase">
                      {r.file_format}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <a
                      href={getFileUrl(r.file_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium font-mono"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
