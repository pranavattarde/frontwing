import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SourceMeta {
  type: 'fastf1' | 'ergast' | 'scoring_engine' | 'simulation';
  identifier: string;
  timestamp: string;
}

interface SourceViewerProps {
  source: SourceMeta;
  rawData: any;
  formattedExplanation: string;
  className?: string;
}

export function SourceViewer({
  source,
  rawData,
  formattedExplanation,
  className,
}: SourceViewerProps) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className={cn('bg-panel border border-fw-border rounded-card p-4 flex flex-col gap-3 select-none w-full', className)}>
      {/* Header Ticker */}
      <div className="flex justify-between items-center border-b border-fw-border pb-2.5 mb-1 font-mono text-mono-meta">
        <div className="flex items-center gap-2">
          <span className="text-drs-cyan font-semibold uppercase">SOURCE_EVIDENCE_LOG</span>
          <span className="text-text-muted">TYPE: {source.type.toUpperCase()}</span>
        </div>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-drs-cyan hover:underline"
        >
          {showRaw ? '[VIEW_SUMMARY]' : '[INSPECT_RAW_JSON]'}
        </button>
      </div>

      {/* Narrative Explanation */}
      {!showRaw ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-secondary leading-relaxed">
            {formattedExplanation}
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-fw-border/60 font-mono text-[9px] text-text-muted">
            <div>
              IDENTIFIER: <span className="text-text-primary">{source.identifier}</span>
            </div>
            <div>
              TIMESTAMP: <span className="text-text-primary">{source.timestamp}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Raw Preformatted Monospace Output */
        <div className="bg-canvas border border-fw-border rounded-card p-3 max-h-[160px] overflow-y-auto">
          <pre className="font-mono text-[10px] text-text-secondary leading-normal overflow-x-auto whitespace-pre-wrap select-all">
            {JSON.stringify(rawData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
