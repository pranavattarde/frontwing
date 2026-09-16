import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BriefingRoom } from "./pages/BriefingRoom";
import { InvestigationThread } from "./pages/InvestigationThread";
import { RaceBriefing } from "./pages/RaceBriefing";
import { StrategyPlayground } from "./pages/StrategyPlayground";
import { StrategyEngineer } from "./pages/StrategyEngineer";
import { Sidebar } from "./components/Sidebar";
import { CommandPalette } from "./components/CommandPalette";
import { SearchOverlay } from "./components/SearchOverlay";
import { NotificationContainer } from "./components/Notification";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { generateId } from "./lib/utils";
import { DesignSystemShowcase } from "./pages/DesignSystemShowcase";

// Lazy-load heavy 3D Three.js dependencies so they do not bloat initial page bundle
const GhostBattle3D = lazy(() => import("./pages/GhostBattle3D"));
const GhostBattle = lazy(() => import("./pages/GhostBattle"));

export default function App() {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const trendingSearches = [
    "Could Sainz have finished P2 with an earlier pit stop?",
    "Why did Verstappen and Norris collide on Lap 64?",
    "How did Piastri achieve the lowest tire degradation?",
    "Was Russell's win a result of skill or circumstance?"
  ];
  const recentSearches = [
    "Carlos Sainz strategy optimization",
    "Piastri Turn 4 telemetry delta"
  ];

  useEffect(() => {
    const handleToggleCommand = () => setIsCommandOpen((prev) => !prev);
    const handleToggleSearch = () => setIsSearchOpen((prev) => !prev);
    window.addEventListener("toggle-command-palette", handleToggleCommand);
    window.addEventListener("toggle-search-overlay", handleToggleSearch);
    return () => {
      window.removeEventListener("toggle-command-palette", handleToggleCommand);
      window.removeEventListener("toggle-search-overlay", handleToggleSearch);
    };
  }, []);

  const handleSearchResultClick = (queryText) => {
    setIsSearchOpen(false);
    // Prefill query in console without auto-submitting (Fix AA)
    window.dispatchEvent(new CustomEvent("frontwing-prefill-query", { detail: { query: queryText } }));
    if (window.location.pathname !== "/") {
      window.location.href = `/?q=${encodeURIComponent(queryText)}`;
    }
  };

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
        <SearchOverlay
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          recentSearches={recentSearches}
          trending={trendingSearches}
          onResultClick={handleSearchResultClick}
        />
        <NotificationContainer />
        <div className="flex h-screen w-screen overflow-hidden bg-canvas">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
            <Routes>
              <Route path="/" element={<BriefingRoom />} />
              <Route path="/investigate/:id" element={<InvestigationThread />} />
              <Route path="/strategy" element={<StrategyEngineer />} />
              <Route path="/strategy-engineer" element={<StrategyEngineer />} />
              <Route path="/race/:raceId" element={<RaceBriefing />} />
              <Route path="/strategy/:raceId" element={<StrategyPlayground />} />
              <Route path="/design-system" element={<DesignSystemShowcase />} />
              <Route
                path="/ghost-battle"
                element={
                  <Suspense fallback={<div className="flex-1 flex items-center justify-center text-text-muted font-mono text-xs p-12">LOADING_3D_ENGINE // INITIALIZING_TRACK...</div>}>
                    <GhostBattle3D />
                  </Suspense>
                }
              />
              <Route
                path="/ghost-battle/:raceId"
                element={
                  <Suspense fallback={<div className="flex-1 flex items-center justify-center text-text-muted font-mono text-xs p-12">LOADING_3D_ENGINE // INITIALIZING_TRACK...</div>}>
                    <GhostBattle3D />
                  </Suspense>
                }
              />
            </Routes>
          </div>
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

