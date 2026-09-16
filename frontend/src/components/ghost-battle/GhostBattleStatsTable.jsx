import React from "react";

export function GhostBattleStatsTable({ drivers, currentTime }) {
  if (!drivers || drivers.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded border border-border-subtle bg-surface-base p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
          <span className="font-mono text-xs text-text-primary uppercase tracking-wider font-bold">
            OFFICIAL FASTEST LAP CLASSIFICATION & TELEMETRY DELTAS
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-muted uppercase">
          FASTF1 VERIFIED FLYING LAPS
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-text-muted text-[10px] uppercase">
              <th className="py-2 px-2 text-center w-8">POS</th>
              <th className="py-2 px-3">DRIVER</th>
              <th className="py-2 px-3">TEAM</th>
              <th className="py-2 px-3 text-right">LAP TIME</th>
              <th className="py-2 px-3 text-right">DELTA</th>
              <th className="py-2 px-3 text-right">SECTOR 1</th>
              <th className="py-2 px-3 text-right">SECTOR 2</th>
              <th className="py-2 px-3 text-right">SECTOR 3</th>
              <th className="py-2 px-3 text-right">TOP SPEED</th>
              <th className="py-2 px-3 text-center">STATUS</th>
            </tr>
          </thead>
          <tbody className="type-tabular">
            {drivers.map((d) => {
              const isFinished = currentTime >= d.lap_time_s;
              return (
                <tr
                  key={d.code}
                  className="border-b border-border-subtle/40 hover:bg-surface-raised transition-colors"
                >
                  <td className="py-2.5 px-2 text-center font-bold text-text-muted">
                    {d.rank || 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: d.team_color || "#E10600" }}
                      />
                      <span className="font-bold text-text-primary">{d.name}</span>
                      <span className="text-[10px] text-text-muted">({d.code})</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-text-secondary text-[11px]">
                    {d.team_name}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-text-primary">
                    {d.lap_time_str}
                  </td>
                  <td className="py-2.5 px-3 text-right text-text-muted">
                    <span className={d.delta === "FASTEST" ? "text-timing-green font-bold" : "text-text-muted"}>
                      {d.delta}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-text-muted">
                    {d.sector_1 || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right text-text-muted">
                    {d.sector_2 || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right text-text-muted">
                    {d.sector_3 || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right text-text-primary font-bold">
                    {d.top_speed ? `${d.top_speed} km/h` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {isFinished ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-timing-green/15 text-timing-green border border-timing-green/30">
                        FINISHED
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-medium bg-surface-raised text-text-muted border border-border-subtle">
                        ON TRACK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

