import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Link,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { BriefingRoom } from "./pages/BriefingRoom";
import { InvestigationThread } from "./pages/InvestigationThread";
import { RaceBriefing } from "./pages/RaceBriefing";
import { StrategyPlayground } from "./pages/StrategyPlayground";
import { StrategyEngineer } from "./pages/StrategyEngineer";
import { RaceNavigation } from "./components/RaceNavigation";
import { RaceFooter } from "./components/RaceFooter";
import { CommandPalette } from "./components/CommandPalette";
import { SearchOverlay } from "./components/SearchOverlay";
import { NotificationContainer } from "./components/Notification";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DesignSystemShowcase } from "./pages/DesignSystemShowcase";
import { PageMetadata } from "./components/PageMetadata";

// The 3D engine is fetched only when the user opens Ghost Battle.
const GhostBattle3D = lazy(() => import("./pages/GhostBattle3D"));
const loadingBattle = (
  <div className="p-12 font-mono text-xs text-text-muted" role="status">
    OPENING THE 3D BATTLE / INITIALISING TRACK GEOMETRY…
  </div>
);

function RoutePosition() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function App() {
  const [searchMode, setSearchMode] = useState(null);
  const closeSearch = useCallback(() => setSearchMode(null), []);
  useEffect(() => {
    const command = () =>
      setSearchMode((mode) => (mode === "command" ? null : "command"));
    const search = () =>
      setSearchMode((mode) => (mode === "search" ? null : "search"));
    window.addEventListener("toggle-command-palette", command);
    window.addEventListener("toggle-search-overlay", search);
    return () => {
      window.removeEventListener("toggle-command-palette", command);
      window.removeEventListener("toggle-search-overlay", search);
    };
  }, []);
  return (
    <BrowserRouter>
      <PageMetadata />
      <RoutePosition />
      <ErrorBoundary>
        <CommandPalette
          isOpen={searchMode === "command"}
          onClose={closeSearch}
        />
        <SearchOverlay isOpen={searchMode === "search"} onClose={closeSearch} />
        <NotificationContainer />
        <div className="race-app bg-canvas">
          <RaceNavigation />
          <div id="main-content" tabIndex={-1} className="race-content">
            <Routes>
              <Route path="/" element={<BriefingRoom />} />
              <Route
                path="/investigate/:id"
                element={<InvestigationThread />}
              />
              <Route path="/strategy" element={<StrategyEngineer />} />
              <Route path="/strategy-engineer" element={<StrategyEngineer />} />
              <Route path="/race/:raceId" element={<RaceBriefing />} />
              <Route
                path="/strategy/:raceId"
                element={<StrategyPlayground />}
              />
              <Route path="/design-system" element={<DesignSystemShowcase />} />
              <Route
                path="/ghost-battle"
                element={
                  <Suspense fallback={loadingBattle}>
                    <GhostBattle3D />
                  </Suspense>
                }
              />
              <Route
                path="/ghost-battle/:raceId"
                element={
                  <Suspense fallback={loadingBattle}>
                    <GhostBattle3D />
                  </Suspense>
                }
              />
              <Route
                path="*"
                element={
                  <section className="workspace-banner p-12">
                    <div>
                      <div className="eyebrow">404 / OFF THE RACING LINE</div>
                      <h1>
                        BACK TO
                        <br />
                        <em>THE PADDOCK.</em>
                      </h1>
                      <p>This page could not be found.</p>
                      <Link className="race-button mt-6" to="/">
                        RETURN TO THE BRIEFING ↗
                      </Link>
                    </div>
                  </section>
                }
              />
            </Routes>
            <RaceFooter />
          </div>
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
