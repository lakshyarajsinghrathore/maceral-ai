import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Cpu,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Flame,
  Activity,
  Trees,
  ShieldAlert,
  Copy,
  Check,
  Eye,
  Loader2,
  Trash2
} from 'lucide-react';
import { uploadDocument, fetchDocuments, fetchDocumentDetails, deleteDocument, fetchMines } from '../api/client';

export default function DocumentIntelligence() {
  const [documents, setDocuments] = useState([]);
  const [mines, setMines] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docDetails, setDocDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('structured'); // 'structured', 'json', 'chunks', 'raw'

  // Upload Form state
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [mineId, setMineId] = useState('');
  const [docCategory, setDocCategory] = useState('Production & Safety');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [docsData, minesData] = await Promise.all([fetchDocuments(), fetchMines()]);
      setDocuments(docsData);
      setMines(minesData);
      if (docsData.length > 0) {
        selectDocument(docsData[0]);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const selectDocument = async (doc) => {
    setSelectedDoc(doc);
    try {
      const details = await fetchDocumentDetails(doc.id);
      setDocDetails(details);
    } catch (err) {
      console.error('Error loading doc details:', err);
    }
  };

  const handleDeleteDocument = async (e, doc) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const confirmMsg = `Are you sure you want to delete "${doc.title}"?\n\nThis will permanently remove the file, extracted JSON, and all ${doc.chunk_count || 0} RAG citations from the platform.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setDeletingId(doc.id);
    try {
      await deleteDocument(doc.id);
      const remaining = documents.filter((d) => d.id !== doc.id);
      setDocuments(remaining);

      // If the deleted document was currently active in the viewer
      if (selectedDoc?.id === doc.id) {
        if (remaining.length > 0) {
          selectDocument(remaining[0]);
        } else {
          setSelectedDoc(null);
          setDocDetails(null);
        }
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      alert(err.response?.data?.detail || 'Failed to delete document. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setStatusMsg('Running multi-format parsing & Neural AI extraction...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('doc_category', docCategory);
      if (mineId) formData.append('mine_id', mineId);

      const newDoc = await uploadDocument(formData);
      setStatusMsg('Extraction completed successfully!');
      setFile(null);
      setTitle('');
      await loadData();
      await selectDocument(newDoc);
    } catch (err) {
      console.error('Upload failed:', err);
      setStatusMsg('Upload or extraction failed. Please check backend.');
    } finally {
      setUploading(false);
      setTimeout(() => setStatusMsg(''), 4000);
    }
  };

  const handleCopyJson = () => {
    if (docDetails?.extracted_payload) {
      navigator.clipboard.writeText(JSON.stringify(docDetails.extracted_payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const payload = docDetails?.extracted_payload || selectedDoc?.extracted_summary || {};
  const prod = payload.production_metrics || {};
  const geo = payload.geological_metrics || {};
  const safety = payload.safety_and_health || {};
  const env = payload.environmental_and_statutory || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              AI Document Intelligence Engine
            </h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Automated multi-format OCR, table extraction, and deep semantic mining parameter extraction powered by OpenAI GPT-OSS 120B.
          </p>
        </div>
      </div>

      {/* Top Section: Upload Box & Processed Document List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-blue-600" />
            Upload Document for Extraction
          </h3>

          <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Select File (PDF, Scanned, XLSX, DOCX)</label>
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.docx,.doc"
                onChange={handleFileChange}
                className="w-full text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer border border-gray-200 rounded-xl p-1 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1 font-medium">Document Title</label>
              <input
                type="text"
                placeholder="e.g. Gevra Q3 Production & Safety Statement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Mine Block</label>
                <select
                  value={mineId}
                  onChange={(e) => setMineId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-gray-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Auto-Detect</option>
                  {mines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.subsidiary})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-gray-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="Production & Safety">Production & Safety</option>
                  <option value="Geological Report">Geological Report</option>
                  <option value="Statutory DGMS Audit">Statutory DGMS Audit</option>
                  <option value="Environmental CPCB">Environmental CPCB</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className={`w-full py-2.5 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all ${
                uploading || !file
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing with Neural AI Engine...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Extract Mining Parameters</span>
                </>
              )}
            </button>

            {statusMsg && (
              <p className="text-center text-xs font-mono text-blue-600 animate-pulse">{statusMsg}</p>
            )}
          </form>
        </div>

        {/* Ingested Documents List */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Ingested Documents Repository ({documents.length})
              </h3>
              <span className="text-xs font-mono text-gray-500">Click to inspect extraction</span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {documents.map((d) => {
                const isSelected = selectedDoc?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => selectDocument(d)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="p-2 rounded-lg bg-gray-100 text-blue-600 shrink-0">
                        {d.file_type.includes('xlsx') ? (
                          <FileSpreadsheet className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-gray-800 truncate">{d.title}</h4>
                        <p className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5 font-mono">
                          <span>{d.mine_name || 'Multi-Block'}</span>
                          <span>•</span>
                          <span>{d.doc_category}</span>
                          <span>•</span>
                          <span>{d.chunk_count} RAG chunks</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 ml-3">
                      {d.ocr_applied && (
                        <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-600 text-[10px] font-mono border border-sky-200">
                          OCR Applied
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDocument(e, d)}
                        disabled={deletingId === d.id}
                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 hover:text-red-600 text-[11px] font-mono border border-red-200 hover:border-red-300 transition-all flex items-center gap-1.5 group disabled:opacity-50"
                        title={`Delete "${d.title}"`}
                      >
                        {deletingId === d.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="h-3 w-3 text-red-500 group-hover:scale-110 transition-transform" />
                        )}
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 text-[11px] text-gray-400 font-mono">
            <span>RAG Chunks indexed with page-level lineage</span>
          </div>
        </div>
      </div>

      {/* Selected Document Extraction Viewer */}
      {selectedDoc && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Header of viewer */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-lg font-bold text-gray-900">{selectedDoc.title}</h3>
                <button
                  type="button"
                  onClick={(e) => handleDeleteDocument(e, selectedDoc)}
                  disabled={deletingId === selectedDoc.id}
                  className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 text-xs font-mono border border-red-200 hover:border-red-300 flex items-center gap-1.5 transition-all ml-2 disabled:opacity-50"
                  title={`Delete "${selectedDoc.title}"`}
                >
                  {deletingId === selectedDoc.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span>Delete Document</span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                Period: <span className="text-gray-800">{payload.reporting_period || 'Current'}</span> • Mine: <span className="text-gray-800">{selectedDoc.mine_name || payload.mine_identification?.mine_name || 'N/A'}</span>
              </p>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center space-x-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs font-medium">
              <button
                onClick={() => setActiveTab('structured')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'structured'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                KPI Dashboard
              </button>
              <button
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'json'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Structured JSON
              </button>
              <button
                onClick={() => setActiveTab('chunks')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'chunks'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                RAG Chunks ({docDetails?.chunks?.length || selectedDoc.chunk_count})
              </button>
            </div>
          </div>

          {/* TAB 1: Structured KPI Cards */}
          {activeTab === 'structured' && (
            <div className="space-y-6">
              {/* Executive Summary */}
              {payload.document_summary && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> AI Executive Summary
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed font-sans">{payload.document_summary}</p>
                </div>
              )}

              {/* 4 Category Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Production Metrics */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-blue-600" /> Production KPI
                    </h4>
                    <span className="text-[10px] font-mono text-blue-600">MT</span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gross Extraction:</span>
                      <strong className="text-blue-600">{prod.gross_production_mt || 0} MT</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Target Production:</span>
                      <strong className="text-gray-600">{prod.target_production_mt || 0} MT</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Target Variance:</span>
                      <strong className={(prod.variance_percentage || 0) >= 0 ? 'text-green-600' : 'text-red-500'}>
                        {prod.variance_percentage || 0}%
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Overburden (OBR):</span>
                      <strong className="text-gray-600">{prod.overburden_removal_mcum || 0} MCuM</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Stripping Ratio:</span>
                      <strong className="text-gray-600">{prod.stripping_ratio || 0}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Geological & Seam Quality */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-orange-600" /> Geological Quality
                    </h4>
                    <span className="text-[10px] font-mono text-orange-600">Grade</span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Coal Grade:</span>
                      <strong className="text-orange-600">{geo.coal_grade || 'G11'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">GCV (Calorific):</span>
                      <strong className="text-gray-800">{geo.gcv_kcal_per_kg || 0} kcal/kg</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ash Content:</span>
                      <strong className="text-gray-600">{geo.ash_content_percentage || 0}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Inherent Moisture:</span>
                      <strong className="text-gray-600">{geo.moisture_percentage || 0}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Seam / Thickness:</span>
                      <strong className="text-gray-600">{geo.working_thickness_meters || 0} m</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Safety & DGMS Health */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-green-600" /> DGMS Safety
                    </h4>
                    <span className="text-[10px] font-mono text-green-600">Statutory</span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fatal Accidents:</span>
                      <strong className={safety.fatalities_count > 0 ? 'text-red-500 font-bold' : 'text-green-600'}>
                        {safety.fatalities_count || 0}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Near Misses:</span>
                      <strong className="text-gray-600">{safety.near_misses_count || 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Peak Methane CH4:</span>
                      <strong className="text-gray-800">{safety.methane_ch4_peak_percentage || 0}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">CO Concentration:</span>
                      <strong className="text-gray-600">{safety.carbon_monoxide_co_ppm || 0} ppm</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ventilation Status:</span>
                      <strong className="text-green-600">{safety.ventilation_status || 'Adequate'}</strong>
                    </div>
                  </div>
                </div>

                {/* 4. Environmental & Clearances */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Trees className="h-3.5 w-3.5 text-sky-600" /> Environment
                    </h4>
                    <span className="text-[10px] font-mono text-sky-600">CPCB</span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ambient PM10:</span>
                      <strong className={(env.pm10_ug_per_m3 || 0) > 100 ? 'text-red-500' : 'text-green-600'}>
                        {env.pm10_ug_per_m3 || 0} µg/m³
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ambient PM2.5:</span>
                      <strong className="text-gray-800">{env.pm25_ug_per_m3 || 0} µg/m³</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Water Discharge pH:</span>
                      <strong className="text-gray-600">{env.water_discharge_ph || 7.0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Forest Clearance:</span>
                      <strong className="text-sky-700">{env.forest_clearance_status || 'Stage-II'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">EC Cap Approved:</span>
                      <strong className="text-gray-600">{env.ec_capacity_approved_mtpa || 0} MTPA</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Automated Word Cloud and Topic Identification Module */}
              <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Automated Word Cloud & Geological Topic Identification Module
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      AI semantic clustering identifying core mining themes, geological grade parameters, and terminology across CMPDI/CIL document archives.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Identified Topics & Keywords */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-500 font-medium block mb-1.5 font-mono text-[11px]">Primary Identified Topics:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(payload.topic_identification?.primary_topics || [
                          "Geological Seam Analysis",
                          "DGMS Mine Safety",
                          "Quarterly Production",
                          "Overburden Stripping"
                        ]).map((t, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-mono text-[11px] font-semibold">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium block mb-1.5 font-mono text-[11px]">Geological & Mining Domain Keywords:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(payload.topic_identification?.geological_domain_keywords || [
                          "GCV",
                          "Ash Content",
                          "Firedamp Methane",
                          "Strata Control",
                          "Longwall Shearer"
                        ]).map((k, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg font-mono text-[11px]">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Interactive Word Cloud Visualizer */}
                  <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-500 font-mono text-[11px]">Semantic Frequency Cloud:</span>
                      <span className="text-[10px] text-gray-400 font-mono">Weighted by Document Occurrence</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 p-3 min-h-[90px]">
                      {(payload.topic_identification?.word_frequencies || [
                        { text: "Production", value: 34 },
                        { text: "Overburden", value: 26 },
                        { text: "GCV", value: 22 },
                        { text: "Dispatch", value: 20 },
                        { text: "Stripping", value: 18 },
                        { text: "Seam", value: 16 },
                        { text: "Ash", value: 15 },
                        { text: "Radar", value: 12 },
                        { text: "Rail", value: 11 },
                        { text: "Safety", value: 10 }
                      ]).map((w, idx) => {
                        const colors = ['text-blue-600', 'text-sky-600', 'text-green-600', 'text-orange-600', 'text-purple-600', 'text-amber-600', 'text-cyan-600'];
                        return (
                          <span
                            key={idx}
                            style={{ fontSize: `${Math.max(11, Math.min(22, 10 + (w.value / 34) * 12))}px` }}
                            className={`${colors[idx % colors.length]} font-bold font-mono hover:scale-110 transition-transform cursor-pointer px-1.5`}
                            title={`${w.text}: ${w.value} mentions`}
                          >
                            {w.text} <sub className="text-[9px] text-gray-400 font-normal">({w.value})</sub>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Pure JSON */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-gray-500">Extracted JSON Payload</span>
                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-100 text-gray-800 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-green-600 font-mono text-xs overflow-x-auto max-h-96 leading-relaxed">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          )}

          {/* TAB 3: Chunks & Citations */}
          {activeTab === 'chunks' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-mono">
                Indexed chunks available for CoalGPT RAG queries with page-level lineage:
              </p>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {(docDetails?.chunks || []).map((chunk, idx) => (
                  <div key={idx} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between text-gray-500 font-mono text-[11px]">
                      <span className="text-blue-600 font-bold">Chunk #{chunk.index + 1}</span>
                      <span>Page {chunk.page} • Section: {chunk.section}</span>
                    </div>
                    <p className="text-gray-600 font-sans leading-relaxed">{chunk.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
