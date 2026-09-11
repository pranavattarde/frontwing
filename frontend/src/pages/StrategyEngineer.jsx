import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BriefingHeader } from "@/components/BriefingHeader";
import { StrategyReportCard } from "@/components/StrategyReportCard";
import { WhatIfSimulationCard } from "@/components/WhatIfSimulationCard";
import { submitStrategyQuery } from "@/lib/api";

const PRESET_QUERIES = [
  {
    category: "STRATEGY ANALYSIS",
    queries: [
      "Why did Verstappen finish P2 at the 2024 Dutch GP?",
      "What went wrong with Leclerc's strategy at the 2024 British GP?",
      "Why did Russell finish P3 at the 2026 Miami Grand Prix?"
    ]
  },
  {
    category: "WHAT-IF COUNTERFACTUALS",
    queries: [
      "What if Piastri pitted on lap 18 on hard tires at the 2024 Qatar GP?",
      "What if Hamilton pitted 5 laps earlier at the 2024 Dutch GP?",
      "What if Verstappen had late braking into Turn 1 at Dutch GP?"
    ]
  }
];

export function StrategyEngineer() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [strategyResponse, setStrategyResponse] = useState(null);

  const handleExecuteQuery = async (queryText) => {
    const textToSubmit = queryText || question;
    if (!textToSubmit.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setStrategyResponse(null);

    try {
      const data = await submitStrategyQuery(textToSubmit);
      setStrategyResponse(data);
    } catch (err) {
      console.error("[StrategyEngineer] Query error:", err);
      setError(err.message || "Failed to execute strategy query. Please verify backend service.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    handleExecuteQuery(question);
  };

  return (
    <div className="min-h-screen bg-canvas text-text-secondary flex flex-col font-sans selection:bg-drs-cyan/20 selection:text-drs-cyan">
      {/* Top Header */}
      <BriefingHeader
        breadcrumbs={[{ label: "STRATEGY ENGINEER" }]}
        sessionState={isLoading ? "loading" : "idle"}
        onLogoClick={() => navigate("/")}
        onBreadcrumbClick={() => navigate("/strategy")}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Page Banner */}
        <div className="border border-fw-border rounded-card bg-panel p-6 relative overflow-hidden shadow-card">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-drs-cyan to-teammate-yellow" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase bg-drs-cyan text-canvas rounded-sm">
                  F1 PIT WALL
                </span>
                <span className="text-mono-meta font-mono text-text-muted">
                  STRATEGY ENGINEER • ISOLATED WORKSPACE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-text-primary">
                Pit Stop Diagnostics & What-If Simulations
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">
                Analyze why drivers finished where they did with stint breakdowns and scoring cost factors, or run counterfactual pit stop simulations backed by real data.
              </p>
            </div>

            {/* Quick Navigation Toggle */}
            <div className="flex items-center gap-2 border border-fw-border rounded bg-canvas/80 p-1">
              <button
                onClick={() => navigate("/")}
                className="px-3 py-1 text-xs font-mono text-text-muted hover:text-text-primary transition-colors"
              >
                INVESTIGATION
              </button>
              <button
                className="px-3 py-1 text-xs font-mono font-bold text-drs-cyan bg-panel rounded border border-drs-cyan/30 shadow-sm"
              >
                STRATEGY
              </button>
            </div>
          </div>
        </div>

        {/* Dedicated Strategy Query Input Bar */}
        <div className="rounded-card border border-fw-border bg-panel p-4 shadow-card">
          <form onSubmit={handleSubmitForm} className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center pointer-events-none">
              <span className="text-drs-cyan font-mono text-sm font-bold tracking-wider">
                STRATEGY &gt;
              </span>
            </div>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a strategy question (e.g. 'Why did Verstappen finish P2 at Dutch GP?' or 'What if Piastri pitted on lap 18 at Qatar?')"
              className="w-full bg-canvas border border-fw-border rounded-input pl-32 pr-28 py-3 text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-drs-cyan focus:ring-1 focus:ring-drs-cyan transition-all font-sans"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="absolute right-2 px-4 py-1.5 text-xs font-mono font-bold tracking-wider uppercase bg-drs-cyan text-canvas hover:bg-drs-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-all"
            >
              {isLoading ? "RUNNING..." : "ANALYZE"}
            </button>
          </form>

          {/* Preset Suggested Query Pills */}
          <div className="mt-4 pt-3 border-t border-fw-border flex flex-col gap-2">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
              SUGGESTED STRATEGY QUERIES:
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_QUERIES.flatMap((cat) => cat.queries).map((presetQuery) => (
                <button
                  key={presetQuery}
                  onClick={() => {
                    setQuestion(presetQuery);
                    handleExecuteQuery(presetQuery);
                  }}
                  disabled={isLoading}
                  className="px-2.5 py-1 text-xs font-mono rounded-full bg-canvas border border-fw-border hover:border-drs-cyan/50 hover:text-text-primary transition-all text-left truncate max-w-full"
                >
                  {presetQuery}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-card border border-fw-border bg-panel p-8 text-center"
            >
              <div className="inline-flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-drs-cyan border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-sm font-bold text-text-primary tracking-wider uppercase">
                  SIMULATING STRATEGY & EVALUATING COUNTERFACTUALS...
                </span>
              </div>
              <p className="text-xs font-mono text-text-muted mt-2">
                Running PostgreSQL lap timing queries, calculating scoring models, and projecting pit stop outcomes.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-card border-2 border-[#FF1801]/40 bg-[#FF1801]/5 p-4 text-[#FF1801]"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold uppercase">ERROR EXECUTING STRATEGY QUERY</span>
            </div>
            <p className="text-sm font-mono">{error}</p>
          </motion.div>
        )}

        {/* Strategy Results */}
        {strategyResponse && !isLoading && (
          <div className="space-y-6">
            {strategyResponse.query_type === "strategy_analysis" && strategyResponse.strategy_report && (
              <StrategyReportCard
                report={strategyResponse.strategy_report}
                driverName={strategyResponse.driver_name}
                grandPrix={strategyResponse.grand_prix}
                season={strategyResponse.season}
                latencyMs={strategyResponse.latency_ms}
              />
            )}

            {strategyResponse.query_type === "strategy_whatif" && strategyResponse.whatif_simulation && (
              <WhatIfSimulationCard
                simulation={strategyResponse.whatif_simulation}
                driverName={strategyResponse.driver_name}
                grandPrix={strategyResponse.grand_prix}
                season={strategyResponse.season}
                latencyMs={strategyResponse.latency_ms}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
