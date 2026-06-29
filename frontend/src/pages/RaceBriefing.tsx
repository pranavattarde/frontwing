import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BriefingHeader } from '@/components/BriefingHeader';
import { RaceTimeline } from '@/components/RaceTimeline';
import { FilterBar } from '@/components/FilterBar';
import { DriverCard } from '@/components/DriverCard';
import { TeamCard } from '@/components/TeamCard';
import {
  AUSTRIAN_GP,
  RACE_RESULTS,
  RACE_PHASES,
  RACE_INCIDENTS,
  TEAM_METRICS,
} from '@/lib/data';
import type { BreadcrumbItem } from '@/lib/types';

export function RaceBriefing() {
  const navigate = useNavigate();
  const [selectedTeams, setSelectedTeams] = useState<string[]>(['mclaren', 'redbull', 'mercedes', 'ferrari']);
  const [sortKey, setSortKey] = useState<'composite' | 'pace' | 'tire' | 'strategy'>('composite');

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Austrian GP Briefing', href: '#' },
  ];

  // Filtering Teams logic
  const handleFilterChange = (filterId: string, selected: string[]) => {
    if (filterId === 'teams') setSelectedTeams(selected);
  };

  // Filtered and Sorted Driver Standings
  const sortedDrivers = RACE_RESULTS.filter((item) => {
    const key = item.driver.teamName.toLowerCase().replace(/\s/g, '');
    const isMclaren = key.includes('mclaren') && selectedTeams.includes('mclaren');
    const isRedBull = key.includes('redbull') && selectedTeams.includes('redbull');
    const isMercedes = key.includes('mercedes') && selectedTeams.includes('mercedes');
    const isFerrari = key.includes('ferrari') && selectedTeams.includes('ferrari');
    return isMclaren || isRedBull || isMercedes || isFerrari;
  }).sort((a, b) => b.scores[sortKey] - a.scores[sortKey]);

  const teamFilter = {
    id: 'teams',
    label: 'FILTER_TEAMS',
    options: [
      { value: 'mclaren', label: 'McLaren' },
      { value: 'redbull', label: 'Red Bull' },
      { value: 'mercedes', label: 'Mercedes' },
      { value: 'ferrari', label: 'Ferrari' },
    ],
    selected: selectedTeams,
  };

  return (
    <div className="min-h-screen bg-canvas text-text-secondary flex flex-col font-sans selection:bg-drs-cyan/20 selection:text-drs-cyan">
      {/* Header */}
      <BriefingHeader
        breadcrumbs={breadcrumbs}
        sessionState="idle"
        onLogoClick={() => navigate('/')}
        onBreadcrumbClick={(index) => {
          if (index === 0) navigate('/');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns (Span 2): Summary, Details & Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Circuit Title Header */}
          <div className="border-b border-fw-border pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-mono-meta font-mono text-drs-cyan tracking-widest uppercase">
                GP_BRIEFING // DEBRIEF_PORTAL
              </span>
              <h1 className="text-display text-text-primary mt-1">
                {AUSTRIAN_GP.name}
              </h1>
              <p className="text-text-muted text-sm mt-0.5">
                {AUSTRIAN_GP.circuit} — {AUSTRIAN_GP.date}
              </p>
            </div>
            <button
              onClick={() => navigate(`/strategy/${AUSTRIAN_GP.id}`)}
              className="px-4 py-2 border border-drs-cyan/30 bg-drs-cyan/5 text-drs-cyan hover:bg-drs-cyan/15 rounded-card font-mono text-xs tracking-wider transition-all duration-[80ms]"
            >
              LAUNCH_STRATEGY_PLAYGROUND [WHAT-IF]
            </button>
          </div>

          {/* AI Race Narrative */}
          <section className="bg-panel border border-fw-border rounded-card p-5">
            <span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider block mb-2">
              AI_RACE_DEBRIEF
            </span>
            <p className="text-body text-text-secondary leading-relaxed mb-4">
              The 2024 Austrian GP was a battle defined by the late-race collision between Verstappen and Norris on Lap 64. Up to that point, Red Bull and McLaren were locked in a chess match of stint extensions, with Piastri executing the lowest degradation of the weekend on his hard stint. George Russell benefited from a +12.4s safety buffer, inheriting P1 to take an unexpected victory.
            </p>
            <div className="grid grid-cols-3 gap-4 border-t border-fw-border pt-4 text-mono-meta font-mono text-text-muted">
              <div>
                WEATHER: <span className="text-text-primary">{AUSTRIAN_GP.weather}</span>
              </div>
              <div>
                TOTAL_LAPS: <span className="text-text-primary">{AUSTRIAN_GP.totalLaps}</span>
              </div>
              <div>
                FASTEST_LAP: <span className="text-text-primary">NOR (1:07.773)</span>
              </div>
            </div>
          </section>

          {/* Race Timeline */}
          <section className="flex flex-col gap-3">
            <span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider">
              RACE_STINTS // EVENT_TIMELINE
            </span>
            <RaceTimeline
              phases={RACE_PHASES}
              incidents={RACE_INCIDENTS}
              orientation="vertical"
              onPhaseClick={() => navigate('/investigate/msg-1')}
            />
          </section>
        </div>

        {/* Right Column: Standings & Scores */}
        <div className="flex flex-col gap-6">
          <span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider block">
            CONSTRUCTOR_STATIONS
          </span>

          {/* Team cards horizontal stack */}
          <div className="flex flex-col gap-3">
            {TEAM_METRICS.slice(0, 2).map((teamMetrics) => (
              <TeamCard
                key={teamMetrics.team.name}
                metrics={teamMetrics}
                variant="summary"
                onClick={() => navigate('/investigate/msg-1')}
              />
            ))}
          </div>

          <div className="border-t border-fw-border pt-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider">
                DRIVER_INTELLIGENCE_METRICS
              </span>

              {/* Sort Selector */}
              <div className="flex gap-1.5 font-mono text-[9px]">
                {(['composite', 'pace', 'tire', 'strategy'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSortKey(key)}
                    className={`px-1.5 py-0.5 border rounded-sm transition-all uppercase ${
                      sortKey === key
                        ? 'border-drs-cyan text-drs-cyan bg-drs-cyan/5 font-semibold'
                        : 'border-fw-border text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Bar */}
            <FilterBar filters={[teamFilter]} onFilterChange={handleFilterChange} />

            {/* Driver cards list */}
            <div className="flex flex-col gap-3">
              {sortedDrivers.map((item) => (
                <DriverCard
                  key={item.driver.code}
                  driver={item.driver}
                  scores={item.scores}
                  position={item.position}
                  gridPosition={item.gridPosition}
                  status={item.status}
                  variant="detailed"
                  onCompare={() => navigate(`/ghost-battle/${AUSTRIAN_GP.id}`)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
