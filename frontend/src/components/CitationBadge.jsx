import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, ExternalLink, BookmarkCheck } from 'lucide-react';

export default function CitationBadge({ citation, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-all text-xs">
      <div
        onClick={() => setExpanded(!expanded)}
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100"
      >
        <div className="flex items-center space-x-2.5 truncate">
          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-50 text-blue-700 font-mono text-[11px] font-bold border border-blue-200">
            {index + 1}
          </span>
          <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="font-semibold text-gray-800 truncate">{citation.doc_title}</span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-blue-600 font-mono shrink-0 border border-gray-200">
            Page {citation.page_number}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-gray-500">
          {citation.relevance_score && (
            <span className="text-[10px] text-green-700 font-mono bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
              Score: {citation.relevance_score}
            </span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="p-3.5 bg-gray-50 border-t border-gray-200 text-gray-700 space-y-2 font-mono">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>Section: <strong className="text-gray-900">{citation.section_title || 'General'}</strong></span>
            <span className="flex items-center gap-1 text-green-600">
              <BookmarkCheck className="h-3 w-3" /> Source Verified
            </span>
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-gray-200 text-[11px] leading-relaxed text-gray-600 italic">
            "{citation.excerpt}"
          </div>
        </div>
      )}
    </div>
  );
}