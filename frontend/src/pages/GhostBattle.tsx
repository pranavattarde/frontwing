import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BriefingHeader } from '@/components/BriefingHeader';
import { GhostBattleViewer } from '@/components/GhostBattleViewer';
import {
  AUSTRIAN_GP,
  TELEMETRY_PIA_LAP42,
  TELEMETRY_SAI_LAP42,
  GHOST_BATTLE_NARRATIONS,
} from '@/lib/data';
import type { BreadcrumbItem } from '@/lib/types';

export function GhostBattle() {
  const navigate = useNavigate();
  const [lapNumber, setLapNumber] = useState<number>(42);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Austrian GP Briefing', href: `/race/${AUSTRIAN_GP.id}` },
    { label: 'Ghost Battle: PIA vs SAI', href: '#' },
  ];

  return (
    <div className="min-h-screen bg-canvas text-text-secondary flex flex-col font-sans selection:bg-drs-cyan/20 selection:text-drs-cyan">
      {/* Header */}
      <BriefingHeader
        breadcrumbs={breadcrumbs}
        sessionState="idle"
        onLogoClick={() => navigate('/')}
        onBreadcrumbClick={(index) => {
          if (index === 0) navigate('/');
          if (index === 1) navigate(`/race/${AUSTRIAN_GP.id}`);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Title Header */}
        <div className="border-b border-fw-border pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-mono-meta font-mono text-drs-cyan tracking-widest uppercase">
              GHOST_BATTLE // MICRO_SECTOR_ANALYZER
            </span>
            <h1 className="text-display text-text-primary mt-1">
              Oscar Piastri vs Carlos Sainz
            </h1>
            <p className="text-text-muted text-sm mt-0.5">
              Spielberg GP 2024 — Speed overlay comparison. Driver A: PIA (Neon Cyan) vs Driver B: SAI (Neon Yellow).
            </p>
          </div>

          {/* Lap Selector */}
          <div className="flex items-center gap-3 bg-panel border border-fw-border rounded-card p-2">
            <span className="text-mono-meta font-mono text-text-muted uppercase">ACTIVE_LAP:</span>
            <div className="flex gap-1">
              {[40, 41, 42, 43, 44].map((lap) => (
                <button
                  key={lap}
                  onClick={() => setLapNumber(lap)}
                  className={`px-2 py-1 font-mono text-xs rounded-button border transition-all ${
                    lapNumber === lap
                      ? 'border-drs-cyan text-drs-cyan bg-drs-cyan/5 font-semibold'
                      : 'border-fw-border text-text-muted hover:text-text-secondary'
                  }`}
                >
                  L{lap}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ghost Battle Viewer Workbench */}
        <GhostBattleViewer
          driverA={{ code: 'PIA', color: '#00E5FF', data: TELEMETRY_PIA_LAP42 }}
          driverB={{ code: 'SAI', color: '#FFD600', data: TELEMETRY_SAI_LAP42 }}
          lapNumber={lapNumber}
          trackName={AUSTRIAN_GP.circuit}
          narrations={GHOST_BATTLE_NARRATIONS}
          className="mt-2"
        />
      </main>
    </div>
  );
}
