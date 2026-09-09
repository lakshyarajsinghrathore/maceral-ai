import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, ExternalLink, BookmarkCheck } from 'lucide-react';

export default function CitationBadge({ citation, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden hover:border-amber-500/40 transition-all text-xs">
      <div
        onClick={() => setExpanded(!expanded)}
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer bg-slate-900/50 hover:bg-slate-850"
      >
        <div className="flex items-center space-x-2.5 truncate">
          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/30">
            {index + 1}
          </span>
          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-200 truncate">{citation.doc_title}</span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono shrink-0">
            Page {citation.page_number}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-slate-400">
          {citation.relevance_score && (
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Score: {citation.relevance_score}
            </span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 text-slate-300 space-y-2 font-mono">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Section: <strong className="text-slate-200">{citation.section_title || 'General'}</strong></span>
            <span className="flex items-center gap-1 text-emerald-400">
              <BookmarkCheck className="h-3 w-3" /> Source Verified
            </span>
          </div>
          <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80 text-[11px] leading-relaxed text-slate-300 italic">
            "{citation.excerpt}"
          </div>
        </div>
      )}
    </div>
  );
}
