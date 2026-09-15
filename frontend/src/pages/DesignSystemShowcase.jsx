import React, { useState } from "react";
import { FrontWingLogo } from "../components/FrontWingLogo";

export function DesignSystemShowcase() {
  const [activeTab, setActiveTab] = useState("all");
  const [inputValue, setInputValue] = useState("VERSTAPPEN // SECTOR 2 ANALYSIS");

  return (
    <div className="min-h-screen bg-surface-canvas text-text-primary p-6 md:p-10 font-body">
      {/* ====================================================================
          PAGE HEADER
          ==================================================================== */}
      <div className="max-w-7xl mx-auto mb-10 pb-6 border-b border-border-medium">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <FrontWingLogo variant="mark" size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="type-h1 text-text-primary tracking-wide">
                  FRONTWING BROADCAST DESIGN SYSTEM
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-accent-primary/15 text-accent-primary border border-accent-primary/40 rounded">
                  v2.0 REBUILD
                </span>
              </div>
              <p className="type-caption text-text-muted mt-0.5">
                SPECIFICATION // FORMULA 1 BROADCAST PALETTE, CONDENSED TYPOGRAPHY, ORIGINAL FW MARK &amp; MECHANICAL MOTION
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="type-caption text-text-muted">STATUS:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-timing-green/15 text-timing-green border border-timing-green/40 font-mono text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-timing-green animate-pulse" />
              TOKENS_VERIFIED
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-12">
        {/* ====================================================================
            SECTION 1: ORIGINAL FRONTWING LOGO SUITE
            ==================================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="type-h3 text-text-primary flex items-center gap-2">
              <span className="w-2 h-2 bg-accent-primary rounded-sm" />
              01 // ORIGINAL FRONTWING LOGO SUITE
            </h2>
            <span className="type-caption text-text-muted">
              CONNECTED FW SPEED MARK &bull; 100% ORIGINAL GEOMETRY
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Connected FW Mark Variant */}
            <div className="bg-surface-base border border-border-medium rounded-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="type-caption text-text-muted">VARIANT: 'MARK' // COMPACT</span>
                <span className="text-[11px] font-mono text-accent-primary">--accent-primary</span>
              </div>
              <div className="bg-surface-canvas border border-border-subtle rounded p-6 flex items-center justify-around gap-4 flex-wrap">
                <div className="flex flex-col items-center gap-2">
                  <FrontWingLogo variant="mark" size="sm" />
                  <span className="type-caption text-text-muted">SM (20PX)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <FrontWingLogo variant="mark" size="md" />
                  <span className="type-caption text-text-muted">MD (28PX)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <FrontWingLogo variant="mark" size="lg" />
                  <span className="type-caption text-text-muted">LG (40PX)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <FrontWingLogo variant="mark" size="xl" />
                  <span className="type-caption text-text-muted">XL (56PX)</span>
                </div>
              </div>
              <p className="type-body-sm text-text-secondary">
                Connected aerodynamic wing geometry slanted forward 13°. The upper blade flows forward while the middle plane merges directly into the W cascade.
              </p>
            </div>

            {/* Full Wordmark Variant */}
            <div className="bg-surface-base border border-border-medium rounded-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="type-caption text-text-muted">VARIANT: 'FULL' // HEADER &amp; SIDEBAR</span>
                <span className="text-[11px] font-mono text-text-primary">VECTOR + CONDENSED</span>
              </div>
              <div className="bg-surface-canvas border border-border-subtle rounded p-6 flex flex-col items-center justify-center gap-6">
                <div className="w-full flex items-center justify-between border-b border-border-subtle pb-3">
                  <FrontWingLogo variant="full" size="sm" />
                  <span className="type-caption text-text-muted">SM (20PX)</span>
                </div>
                <div className="w-full flex items-center justify-between border-b border-border-subtle pb-3">
                  <FrontWingLogo variant="full" size="md" />
                  <span className="type-caption text-text-muted">MD (28PX)</span>
                </div>
                <div className="w-full flex items-center justify-between border-b border-border-subtle pb-3">
                  <FrontWingLogo variant="full" size="lg" />
                  <span className="type-caption text-text-muted">LG (40PX)</span>
                </div>
                <div className="w-full flex items-center justify-between">
                  <FrontWingLogo variant="full" size="xl" />
                  <span className="type-caption text-text-muted">XL (56PX)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            SECTION 2: SURFACE & BACKGROUND TOKENS
            ==================================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="type-h3 text-text-primary flex items-center gap-2">
              <span className="w-2 h-2 bg-text-secondary rounded-sm" />
              02 // SEMANTIC SURFACE TOKENS
            </h2>
            <span className="type-caption text-text-muted">
              NEAR-BLACK ASPHALT &bull; F1 CARBON DARK SLATE &bull; ELEVATED LAYERS
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-surface-canvas border border-border-medium rounded-md p-4 space-y-2">
              <div className="h-14 w-full rounded bg-surface-canvas border border-border-strong flex items-center justify-center">
                <span className="font-mono text-xs text-text-muted">#0B0C10</span>
              </div>
              <div>
                <p className="type-caption text-text-primary">--surface-canvas</p>
                <p className="text-[11px] text-text-muted">Root Page Canvas</p>
              </div>
            </div>

            <div className="bg-surface-base border border-border-medium rounded-md p-4 space-y-2">
              <div className="h-14 w-full rounded bg-surface-base border border-border-strong flex items-center justify-center">
                <span className="font-mono text-xs text-text-secondary">#15151E</span>
              </div>
              <div>
                <p className="type-caption text-text-primary">--surface-base</p>
                <p className="text-[11px] text-text-muted">F1 Carbon Slate (Cards)</p>
              </div>
            </div>

            <div className="bg-surface-raised border border-border-medium rounded-md p-4 space-y-2">
              <div className="h-14 w-full rounded bg-surface-raised border border-border-strong flex items-center justify-center">
                <span className="font-mono text-xs text-text-secondary">#1C1D29</span>
              </div>
              <div>
                <p className="type-caption text-text-primary">--surface-raised</p>
                <p className="text-[11px] text-text-muted">Step 1 Elevated (Headers)</p>
              </div>
            </div>

            <div className="bg-surface-overlay border border-border-medium rounded-md p-4 space-y-2">
              <div className="h-14 w-full rounded bg-surface-overlay border border-border-strong flex items-center justify-center">
                <span className="font-mono text-xs text-text-primary">#252738</span>
              </div>
              <div>
                <p className="type-caption text-text-primary">--surface-overlay</p>
                <p className="text-[11px] text-text-muted">Step 2 Elevated (Modals)</p>
              </div>
            </div>

            <div className="bg-surface-base border border-border-medium rounded-md p-4 space-y-2">
              <div className="h-14 w-full rounded bg-white/[0.03] border border-border-strong flex items-center justify-center">
                <span className="font-mono text-xs text-text-muted">rgba(255,255,255,0.03)</span>
              </div>
              <div>
                <p className="type-caption text-text-primary">--surface-subtle</p>
                <p className="text-[11px] text-text-muted">Row Striping &amp; Washes</p>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            SECTION 3: TIMING CONVENTIONS & PIRELLI TYRE TOKENS
            ==================================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="type-h3 text-text-primary flex items-center gap-2">
              <span className="w-2 h-2 bg-timing-purple rounded-sm" />
              03 // TIMING CONVENTIONS &amp; PIRELLI TYRE COMPOUNDS
            </h2>
            <span className="type-caption text-text-muted">
              OFFICIAL BROADCAST HUD CODING &bull; ZERO COLOR AMBIGUITY
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timing Conventions */}
            <div className="bg-surface-base border border-border-medium rounded-md p-6 space-y-4">
              <h3 className="type-caption text-text-muted">TIMING TOWER STATUSES</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded bg-surface-canvas border border-border-subtle">
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-timing-purple border border-timing-purple-border" />
                    <div>
                      <p className="type-caption text-text-primary">PURPLE // SESSION BEST</p>
                      <p className="text-[11px] text-text-muted font-mono">--timing-purple (#B138DD)</p>
                    </div>
                  </div>
                  <span className="badge-sector-purple px-2.5 py-0.5 rounded font-mono text-xs font-bold">
                    26.412s
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded bg-surface-canvas border border-border-subtle">
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-timing-green border border-timing-green-border" />
                    <div>
                      <p className="type-caption text-text-primary">GREEN // PERSONAL BEST</p>
                      <p className="text-[11px] text-text-muted font-mono">--timing-green (#00D26A)</p>
                    </div>
                  </div>
                  <span className="badge-sector-green px-2.5 py-0.5 rounded font-mono text-xs font-bold">
                    26.789s
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded bg-surface-canvas border border-border-subtle">
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-timing-yellow border border-timing-yellow-border" />
                    <div>
                      <p className="type-caption text-text-primary">YELLOW // SLOWER / CAUTION</p>
                      <p className="text-[11px] text-text-muted font-mono">--timing-yellow (#FFD600)</p>
                    </div>
                  </div>
                  <span className="badge-sector-yellow px-2.5 py-0.5 rounded font-mono text-xs font-bold">
                    27.104s
                  </span>
                </div>
              </div>
            </div>

            {/* Tyre Compounds */}
            <div className="bg-surface-base border border-border-medium rounded-md p-6 space-y-4">
              <h3 className="type-caption text-text-muted">PIRELLI TYRE COMPOUND CODES</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex items-center justify-between p-2.5 rounded bg-surface-canvas border border-border-subtle">
                  <span className="badge-tyre-soft px-2 py-0.5 rounded font-display text-xs font-bold">
                    [S] SOFT
                  </span>
                  <span className="font-mono text-xs text-text-muted">#FF1801</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-surface-canvas border border-border-subtle">
                  <span className="badge-tyre-medium px-2 py-0.5 rounded font-display text-xs font-bold">
                    [M] MEDIUM
                  </span>
                  <span className="font-mono text-xs text-text-muted">#FFD600</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-surface-canvas border border-border-subtle">
                  <span className="badge-tyre-hard px-2 py-0.5 rounded font-display text-xs font-bold">
                    [H] HARD
                  </span>
                  <span className="font-mono text-xs text-text-muted">#FFFFFF</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-surface-canvas border border-border-subtle">
                  <span className="badge-tyre-inter px-2 py-0.5 rounded font-display text-xs font-bold">
                    [I] INTER
                  </span>
                  <span className="font-mono text-xs text-text-muted">#00D26A</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-surface-canvas border border-border-subtle sm:col-span-2">
                  <span className="badge-tyre-wet px-2 py-0.5 rounded font-display text-xs font-bold">
                    [W] WET
                  </span>
                  <span className="font-mono text-xs text-text-muted">#0090FF</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            SECTION 4: BROADCAST TYPOGRAPHY SCALE & TABULAR NUMBERS
            ==================================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="type-h3 text-text-primary flex items-center gap-2">
              <span className="w-2 h-2 bg-accent-primary rounded-sm" />
              04 // BROADCAST TYPOGRAPHY &amp; TABULAR FIGURES
            </h2>
            <span className="type-caption text-text-muted">
              BARLOW CONDENSED &bull; INTER &bull; JETBRAINS MONO TABULAR FIGURES
            </span>
          </div>

          <div className="bg-surface-base border border-border-medium rounded-md p-6 space-y-6">
            <div className="space-y-4 pb-6 border-b border-border-subtle">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <span className="type-caption text-text-muted w-36">DISPLAY (36PX / ITALIC):</span>
                <p className="type-display flex-1">
                  VERSTAPPEN // 341.2 KM/H SPEED TRAP // P1
                </p>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <span className="type-caption text-text-muted w-36">H1 (28PX / ITALIC):</span>
                <p className="type-h1 flex-1">
                  2024 DUTCH GRAND PRIX RACE DEBRIEF &amp; VERDICT
                </p>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <span className="type-caption text-text-muted w-36">H2 (22PX / ITALIC):</span>
                <p className="type-h2 flex-1">
                  HEAD-TO-HEAD TELEMETRY COMPARISON &amp; GAP TO LEADER
                </p>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <span className="type-caption text-text-muted w-36">H3 (18PX / BOLD):</span>
                <p className="type-h3 flex-1">
                  TIRE WEAR DEGRADATION SLOPE &amp; UNDERCUT PROJECTION
                </p>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <span className="type-caption text-text-muted w-36">H4 (15PX / SEMIBOLD):</span>
                <p className="type-h4 flex-1">
                  CORNER 4 ENTRY APEX &bull; THROTTLE PROGRESSION
                </p>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <span className="type-caption text-text-muted w-36">BODY (14PX / REGULAR):</span>
                <p className="type-body flex-1 text-text-secondary">
                  Norris executed an optimal two-stop strategy, pitting on lap 28 for hard tyres and managing thermal degradation across the final 32 laps to seal victory over Verstappen.
                </p>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <span className="type-caption text-text-muted w-36">CAPTION (11PX / TRACKING):</span>
                <p className="type-caption flex-1 text-text-muted">
                  SESSION ID // 2024_DUTCH_GP_RACE // TELEMETRY TRACE BUFFER 838 PTS
                </p>
              </div>
            </div>

            {/* Tabular Numerals Alignment Verification Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="type-caption text-text-muted">
                  TABULAR DIGIT ALIGNMENT TEST (DECIMAL &amp; COLON ALIGNMENT IN COLUMNS)
                </h3>
                <span className="px-2 py-0.5 rounded bg-surface-raised border border-border-subtle font-mono text-[11px] text-accent-primary">
                  font-variant-numeric: tabular-nums
                </span>
              </div>

              <div className="overflow-x-auto border border-border-medium rounded bg-surface-canvas">
                <table className="f1-table">
                  <thead>
                    <tr>
                      <th>POS</th>
                      <th>DRIVER</th>
                      <th>TEAM</th>
                      <th>TYRE</th>
                      <th className="text-right">LAP TIME</th>
                      <th className="text-right">DELTA TO P1</th>
                      <th className="text-right">S1 TIME</th>
                      <th className="text-right">S2 TIME</th>
                      <th className="text-right">S3 TIME</th>
                      <th className="text-right">TOP SPEED</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-mono text-accent-primary font-bold">1</td>
                      <td className="font-display font-bold italic">NOR</td>
                      <td className="text-text-secondary">McLaren</td>
                      <td><span className="badge-tyre-hard px-1.5 py-0.2 rounded text-[10px] font-bold">HARD</span></td>
                      <td className="text-right type-tabular font-bold text-text-primary">1:13.817</td>
                      <td className="text-right type-tabular text-timing-purple font-bold">LEADER</td>
                      <td className="text-right type-tabular text-timing-purple">24.112s</td>
                      <td className="text-right type-tabular text-timing-green">26.398s</td>
                      <td className="text-right type-tabular text-timing-purple">23.307s</td>
                      <td className="text-right type-tabular">339.4 km/h</td>
                    </tr>
                    <tr>
                      <td className="font-mono text-text-muted">2</td>
                      <td className="font-display font-bold italic">VER</td>
                      <td className="text-text-secondary">Red Bull Racing</td>
                      <td><span className="badge-tyre-hard px-1.5 py-0.2 rounded text-[10px] font-bold">HARD</span></td>
                      <td className="text-right type-tabular font-bold text-text-primary">1:14.093</td>
                      <td className="text-right type-tabular text-timing-yellow">+0.276s</td>
                      <td className="text-right type-tabular text-timing-green">24.189s</td>
                      <td className="text-right type-tabular text-timing-purple">26.355s</td>
                      <td className="text-right type-tabular text-timing-yellow">23.549s</td>
                      <td className="text-right type-tabular">341.2 km/h</td>
                    </tr>
                    <tr>
                      <td className="font-mono text-text-muted">3</td>
                      <td className="font-display font-bold italic">LEC</td>
                      <td className="text-text-secondary">Ferrari</td>
                      <td><span className="badge-tyre-medium px-1.5 py-0.2 rounded text-[10px] font-bold">MED</span></td>
                      <td className="text-right type-tabular font-bold text-text-primary">1:14.301</td>
                      <td className="text-right type-tabular text-timing-yellow">+0.484s</td>
                      <td className="text-right type-tabular text-timing-yellow">24.290s</td>
                      <td className="text-right type-tabular text-timing-yellow">26.490s</td>
                      <td className="text-right type-tabular text-timing-yellow">23.521s</td>
                      <td className="text-right type-tabular">337.8 km/h</td>
                    </tr>
                    <tr>
                      <td className="font-mono text-text-muted">4</td>
                      <td className="font-display font-bold italic">PIA</td>
                      <td className="text-text-secondary">McLaren</td>
                      <td><span className="badge-tyre-hard px-1.5 py-0.2 rounded text-[10px] font-bold">HARD</span></td>
                      <td className="text-right type-tabular font-bold text-text-primary">1:14.498</td>
                      <td className="text-right type-tabular text-timing-yellow">+0.681s</td>
                      <td className="text-right type-tabular text-timing-yellow">24.318s</td>
                      <td className="text-right type-tabular text-timing-yellow">26.541s</td>
                      <td className="text-right type-tabular text-timing-green">23.639s</td>
                      <td className="text-right type-tabular">338.9 km/h</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            SECTION 5: INTERACTION & MOTION STATES PLAYGROUND
            ==================================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="type-h3 text-text-primary flex items-center gap-2">
              <span className="w-2 h-2 bg-accent-primary rounded-sm" />
              05 // MOTION &amp; INTERACTIVE STATES PLAYGROUND
            </h2>
            <span className="type-caption text-text-muted">
              HOVER &bull; FOCUS-VISIBLE BEACON &bull; ACTIVE &bull; DISABLED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Button States */}
            <div className="bg-surface-base border border-border-medium rounded-md p-6 space-y-4">
              <h3 className="type-caption text-text-muted">INTERACTIVE BUTTON STATES</h3>
              <div className="flex flex-col gap-3">
                <button className="btn-f1-primary w-full">
                  PRIMARY CTA // HOVER ME
                </button>
                <button className="btn-f1-secondary w-full">
                  SECONDARY // OUTLINE ACTION
                </button>
                <button className="btn-f1-ghost w-full">
                  GHOST // TEXT BUTTON
                </button>
                <button disabled className="btn-f1-primary w-full">
                  DISABLED STATE (LOCKED)
                </button>
              </div>
            </div>

            {/* Input States */}
            <div className="bg-surface-base border border-border-medium rounded-md p-6 space-y-4">
              <h3 className="type-caption text-text-muted">INPUT &amp; FOCUS-VISIBLE STATES</h3>
              <div className="space-y-3">
                <div>
                  <label className="type-caption text-text-muted mb-1 block">
                    TELEMETRY QUERY (TRY TAB / FOCUS):
                  </label>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="input-f1"
                  />
                </div>

                <div>
                  <label className="type-caption text-text-muted mb-1 block">
                    DISABLED INPUT:
                  </label>
                  <input
                    type="text"
                    disabled
                    value="LOCKED_SESSION_PARAMETERS"
                    className="input-f1"
                  />
                </div>

                <div className="p-3 bg-surface-canvas border border-border-subtle rounded text-xs text-text-secondary">
                  Focus ring uses <code className="text-accent-primary font-mono font-bold">outline: 2px solid var(--border-focus)</code> with 2px offset for guaranteed broadcast accessibility.
                </div>
              </div>
            </div>

            {/* Interactive Card Hover */}
            <div className="bg-surface-base border border-border-medium rounded-md p-6 space-y-4">
              <h3 className="type-caption text-text-muted">MECHANICAL CARD LIFT</h3>
              <div tabIndex={0} className="card-interactive p-4 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="type-caption text-accent-primary">TELEMETRY MODULE</span>
                  <span className="text-[10px] font-mono text-text-muted">120MS MECHANICAL</span>
                </div>
                <h4 className="type-h4 text-text-primary mb-1">HOVER THIS CARD</h4>
                <p className="type-body-sm text-text-secondary">
                  Smooth 120ms mechanical lift with high-contrast border brightening and elevation shadow.
                </p>
              </div>

              <div className="p-3 bg-surface-canvas border border-border-subtle rounded text-xs text-text-muted font-mono">
                TRANSITIONS: 120ms (Hover) &bull; 240ms (Panel) &bull; 400ms (Route)
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default DesignSystemShowcase;
