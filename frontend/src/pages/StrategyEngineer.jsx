import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BriefingHeader } from "@/components/BriefingHeader";
import { StrategyReportCard } from "@/components/StrategyReportCard";
import { WhatIfSimulationCard } from "@/components/WhatIfSimulationCard";
import { submitStrategyQuery } from "@/lib/api";
import { generateId, cn } from "@/lib/utils";

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
  const [conversationId, setConversationId] = useState(() => `strat-conv-${generateId()}`);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeContext, setActiveContext] = useState({});
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of conversation on new messages or loading
  useEffect(() => {
    if (chatHistory.length > 0 || isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isLoading]);

  const handleNewChat = () => {
    setConversationId(`strat-conv-${generateId()}`);
    setChatHistory([]);
    setActiveContext({});
    setQuestion("");
    setError(null);
    inputRef.current?.focus();
  };

  const handleExecuteQuery = async (queryText) => {
    const textToSubmit = (queryText || question || "").trim();
    if (!textToSubmit || isLoading) return;

    setIsLoading(true);
    setError(null);
    setQuestion("");

    // Optimistic user turn placeholder or tracking
    const currentConvId = conversationId;
    const currentContext = { ...activeContext };

    try {
      const data = await submitStrategyQuery(textToSubmit, currentConvId, currentContext);
      
      const newTurn = {
        id: `turn-${Date.now()}-${generateId()}`,
        question: textToSubmit,
        response: data,
        timestamp: Date.now()
      };

      setChatHistory((prev) => [...prev, newTurn]);

      // Update active thread context from latest response
      if (data && data.status === "success") {
        setActiveContext((prev) => ({
          ...prev,
          driver_id: data.driver_id || prev.driver_id,
          driver_name: data.driver_name || prev.driver_name,
          session_id: data.session_id || prev.session_id,
          grand_prix: data.grand_prix || prev.grand_prix,
          season: data.season || prev.season,
          query_type: data.query_type || prev.query_type
        }));
      }
    } catch (err) {
      console.error("[StrategyEngineer] Query error:", err);
      setError(err.message || "Failed to execute strategy query. Please verify backend service.");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    handleExecuteQuery(question);
  };

  // Generate dynamic contextual follow-up suggestions based on active context
  const getContextualSuggestions = () => {
    if (!activeContext.driver_name) return [];
    const drv = activeContext.driver_name;
    const gp = activeContext.grand_prix ? `at ${activeContext.grand_prix}` : "";
    return [
      `What if ${drv} pitted 3 laps earlier ${gp}?`,
      `What if he pitted on lap 18 on hard tires?`,
      `What if ${drv} switched to softs for the final stint?`,
      `What if he pitted 5 laps later instead?`
    ];
  };

  return (
    <div className="min-h-screen bg-canvas text-text-secondary flex flex-col font-sans selection:bg-accent-primary/20 selection:text-accent-primary">
      {/* Top Header */}
      <BriefingHeader
        breadcrumbs={[{ label: "STRATEGY ENGINEER" }]}
        sessionState={isLoading ? "loading" : "idle"}
        onLogoClick={() => navigate("/")}
        onBreadcrumbClick={() => navigate("/strategy")}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Page Banner & Chat Controls */}
        <div className="border border-border-subtle rounded bg-surface-base p-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-accent-primary" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase bg-accent-primary text-text-primary rounded-sm">
                  F1 PIT WALL
                </span>
                <span className="text-xs font-mono text-text-muted">
                  STRATEGY ENGINEER • MULTI-TURN THREADED WORKSPACE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-text-primary">
                Pit Stop Diagnostics & What-If Simulations
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">
                Analyze why drivers finished where they did, and continue in the same chat with counterfactual pit stop scenarios and undercut projections.
              </p>
            </div>

            {/* Actions: New Chat & Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewChat}
                className="btn-f1-primary text-xs flex items-center gap-1.5 py-2 px-3"
                title="Discard current strategy chat and start fresh"
              >
                <span className="text-sm leading-none">+</span> NEW CHAT
              </button>

              <div className="flex items-center gap-1 border border-border-subtle rounded bg-surface-base p-1">
                <button
                  onClick={() => navigate("/")}
                  className="px-3 py-1 text-xs font-mono text-text-muted hover:text-text-primary transition-colors"
                >
                  INVESTIGATION
                </button>
                <button
                  className="px-3 py-1 text-xs font-mono font-bold text-accent-primary bg-surface-raised rounded border border-border-medium shadow-sm"
                >
                  STRATEGY
                </button>
              </div>
            </div>
          </div>

          {/* Active Conversation Context Bar */}
          {activeContext.driver_name && (
            <div className="mt-4 pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2 text-xs font-mono type-tabular">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-timing-green animate-pulse" />
                <span className="text-text-muted">ACTIVE STRATEGY THREAD:</span>
                <span className="text-accent-primary font-bold">{activeContext.driver_name}</span>
                <span className="text-text-muted">•</span>
                <span className="text-timing-yellow font-bold">
                  {activeContext.grand_prix} {activeContext.season || ""}
                </span>
                <span className="text-text-muted">
                  ({chatHistory.length} {chatHistory.length === 1 ? "query" : "queries"})
                </span>
              </div>
              <button
                onClick={handleNewChat}
                className="text-[11px] text-text-muted hover:text-accent-primary hover:underline transition-colors"
              >
                Start different driver/session
              </button>
            </div>
          )}
        </div>

        {/* Initial Empty State Preset Query Suggestions */}
        {chatHistory.length === 0 && !isLoading && (
          <div className="rounded border border-border-subtle bg-surface-base p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <span className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-primary" />
                SUGGESTED STRATEGY SCENARIOS TO START:
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                Click any scenario or enter your own below
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRESET_QUERIES.map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <span className="text-[11px] font-mono font-bold text-accent-primary tracking-wider uppercase">
                    {cat.category}
                  </span>
                  <div className="flex flex-col gap-2">
                    {cat.queries.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleExecuteQuery(preset)}
                        className="p-3 text-left text-xs font-mono rounded bg-surface-raised border border-border-subtle hover:border-border-medium hover:bg-surface-overlay text-text-secondary hover:text-text-primary transition-all group flex items-center justify-between gap-2 shadow-sm"
                      >
                        <span>{preset}</span>
                        <span className="text-text-muted group-hover:text-accent-primary transition-colors">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Threaded Conversation Messages Stream */}
        {chatHistory.length > 0 && (
          <div className="space-y-8">
            {chatHistory.map((turn, index) => (
              <div key={turn.id} className="space-y-4">
                {/* User Query Banner */}
                <div className="flex items-center gap-3 p-3.5 rounded bg-surface-raised border border-border-subtle shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center text-xs font-mono font-bold text-accent-primary shrink-0">
                    Q{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                        RACE ENGINEER INQUIRY
                      </span>
                      <span className="text-[10px] font-mono text-text-muted type-tabular">
                        {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm font-sans font-bold text-text-primary mt-0.5 break-words">
                      "{turn.question}"
                    </p>
                  </div>
                </div>

                {/* Assistant Strategy Report / Simulation Card */}
                {turn.response && (
                  <div className="pl-0 sm:pl-3 space-y-4">
                    {turn.response.query_type === "strategy_analysis" && turn.response.strategy_report && (
                      <StrategyReportCard
                        report={turn.response.strategy_report}
                        driverName={turn.response.driver_name}
                        grandPrix={turn.response.grand_prix}
                        season={turn.response.season}
                        latencyMs={turn.response.latency_ms}
                      />
                    )}

                    {turn.response.query_type === "strategy_whatif" && turn.response.whatif_simulation && (
                      <WhatIfSimulationCard
                        simulation={turn.response.whatif_simulation}
                        driverName={turn.response.driver_name}
                        grandPrix={turn.response.grand_prix}
                        season={turn.response.season}
                        latencyMs={turn.response.latency_ms}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading Indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded border border-border-subtle bg-surface-base p-6 text-center shadow-sm"
            >
              <div className="inline-flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
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
            className="rounded border border-accent-danger/40 bg-accent-danger/10 p-4 text-accent-danger"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold uppercase">ERROR EXECUTING STRATEGY QUERY</span>
            </div>
            <p className="text-sm font-mono">{error}</p>
          </motion.div>
        )}

        {/* Dynamic Contextual Follow-up Suggestions for Existing Thread */}
        {chatHistory.length > 0 && !isLoading && (
          <div className="p-3 rounded border border-border-subtle bg-surface-base flex flex-col gap-2">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-accent-primary font-bold">💬</span> CONTINUATION SUGGESTIONS IN THIS CHAT:
            </span>
            <div className="flex flex-wrap gap-2">
              {getContextualSuggestions().map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleExecuteQuery(suggestion)}
                  disabled={isLoading}
                  className="btn-f1-secondary text-xs px-3 py-1.5 rounded text-left truncate max-w-full"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dedicated Chat Input Bar */}
        <div className="sticky bottom-4 z-30 rounded border border-border-subtle bg-surface-base/95 backdrop-blur-md p-3.5 shadow-xl">
          <form onSubmit={handleSubmitForm} className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center pointer-events-none">
              <span className="text-accent-primary font-mono text-xs font-bold tracking-wider">
                {activeContext.driver_name ? `${activeContext.driver_name.split(" ").pop().toUpperCase()} >` : "STRATEGY >"}
              </span>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                chatHistory.length > 0
                  ? `Ask follow-up (e.g. 'what if he pitted on lap 18 instead?' or 'what if he switched to softs?')`
                  : "Ask strategy question (e.g. 'Why did Hamilton finish P3 at Silverstone?' or 'What if Piastri pitted on lap 18 at Qatar?')"
              }
              className="w-full bg-surface-raised border border-border-subtle rounded pl-32 sm:pl-36 pr-28 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all font-sans"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="absolute right-2 btn-f1-primary px-4 py-2 text-xs uppercase"
            >
              {isLoading ? "RUNNING..." : "ANALYZE"}
            </button>
          </form>
        </div>

        <div ref={messagesEndRef} />
      </main>
    </div>
  );
}
