import React from 'react';
import DataBadge from './DataBadge';

export interface LeaderboardRow {
  position: number;
  driver: string;
  code: string;
  team: string;
  gap: string;
  interval: string;
  tireCompound: 'SOFT' | 'MEDIUM' | 'HARD' | 'INTER' | 'WET';
  tireAge: number;
  lastLap: string;
  sector1: string;
  sector2: string;
  sector3: string;
  drsActive: boolean;
}

interface TimingGridProps {
  rows: LeaderboardRow[];
}

const TimingGrid: React.FC<TimingGridProps> = ({ rows }) => {
  return (
    <div className="w-full overflow-x-auto border border-[#1C2025] bg-[#0E1013] rounded">
      <table className="w-full min-w-[800px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#1C2025] bg-[#16191E]/50 text-[10px] uppercase font-mono font-semibold tracking-wider text-[#8B95A5]">
            <th className="py-2.5 px-3.5 text-center w-12">Pos</th>
            <th className="py-2.5 px-3">Driver</th>
            <th className="py-2.5 px-3">Constructor</th>
            <th className="py-2.5 px-3">Gap</th>
            <th className="py-2.5 px-3">Interval</th>
            <th className="py-2.5 px-3 text-center">Tire Stint</th>
            <th className="py-2.5 px-3">Last Lap</th>
            <th className="py-2.5 px-3 text-center w-16">Sector 1</th>
            <th className="py-2.5 px-3 text-center w-16">Sector 2</th>
            <th className="py-2.5 px-3 text-center w-16">Sector 3</th>
            <th className="py-2.5 px-3 text-center w-14">DRS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1C2025]/50 text-xs">
          {rows.map((row) => (
            <tr
              key={row.code}
              className={`hover:bg-[#16191E]/30 transition-colors duration-75 ${
                row.drsActive ? 'bg-[#00E5FF]/[0.015]' : ''
              }`}
            >
              {/* Position */}
              <td className="py-3 px-3.5 text-center font-timing font-mono font-medium text-[#F3F5F7]">
                {row.position}
              </td>

              {/* Driver code */}
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#F3F5F7]">{row.driver}</span>
                  <span className="text-[10px] font-mono text-[#8B95A5] uppercase tracking-wider bg-[#16191E] px-1.5 py-0.5 rounded border border-[#1C2025]">
                    {row.code}
                  </span>
                </div>
              </td>

              {/* Constructor */}
              <td className="py-3 px-3 text-[#8B95A5] font-medium">
                {row.team}
              </td>

              {/* Gap to leader */}
              <td className="py-3 px-3">
                <DataBadge type="delta" value={row.gap} />
              </td>

              {/* Interval to car ahead */}
              <td className="py-3 px-3">
                <DataBadge type="delta" value={row.interval} />
              </td>

              {/* Tire Compound & Age */}
              <td className="py-3 px-3 flex justify-center">
                <DataBadge type="compound" value={row.tireCompound} laps={row.tireAge} />
              </td>

              {/* Last Lap Time */}
              <td className="py-3 px-3 font-timing font-mono text-[#F3F5F7]">
                {row.lastLap}
              </td>

              {/* Sector Splits */}
              <td className="py-3 px-3 text-center font-timing font-mono text-[11px] text-[#8B95A5]">
                {row.sector1}
              </td>
              <td className="py-3 px-3 text-center font-timing font-mono text-[11px] text-[#8B95A5]">
                {row.sector2}
              </td>
              <td className="py-3 px-3 text-center font-timing font-mono text-[11px] text-[#8B95A5]">
                {row.sector3}
              </td>

              {/* DRS Pill Indicator */}
              <td className="py-3 px-3 text-center">
                {row.drsActive ? (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/25 text-[#00E5FF] font-mono text-[9px] font-bold tracking-wider select-none animate-pulse">
                    DRS
                  </span>
                ) : (
                  <span className="inline-block h-1 w-4 rounded bg-[#16191E] mx-auto"></span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimingGrid;
