import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BriefingRoom } from './pages/BriefingRoom';
import { InvestigationThread } from './pages/InvestigationThread';
import { RaceBriefing } from './pages/RaceBriefing';
import { StrategyPlayground } from './pages/StrategyPlayground';
import { GhostBattle } from './pages/GhostBattle';
import { CommandPalette } from './components/CommandPalette';
import { SearchOverlay } from './components/SearchOverlay';
import { NotificationContainer } from './components/Notification';

export default function App() {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Suggested search parameters matching real data
  const trendingSearches = [
    'Could Sainz have finished P2 with an earlier pit stop?',
    'Why did Verstappen and Norris collide on Lap 64?',
    'How did Piastri achieve the lowest tire degradation?',
    'Was Russell\'s win a result of skill or circumstance?',
  ];

  const recentSearches = [
    'Carlos Sainz strategy optimization',
    'Piastri Turn 4 telemetry delta',
  ];

  useEffect(() => {
    const handleToggleCommand = () => setIsCommandOpen((prev) => !prev);
    const handleToggleSearch = () => setIsSearchOpen((prev) => !prev);

    window.addEventListener('toggle-command-palette', handleToggleCommand);
    window.addEventListener('toggle-search-overlay', handleToggleSearch);

    return () => {
      window.removeEventListener('toggle-command-palette', handleToggleCommand);
      window.removeEventListener('toggle-search-overlay', handleToggleSearch);
    };
  }, []);

  const handleSearchResultClick = () => {
    setIsSearchOpen(false);
    // Custom window notification helper
    if (typeof (window as any).__fw_notify === 'function') {
      (window as any).__fw_notify({
        id: String(Date.now()),
        message: `Query matches Austrian GP. Loading engineer context...`,
        type: 'info',
        duration: 3000,
      });
    }
    // Route to demo thread
    window.location.href = `/investigate/msg-1`;
  };

  return (
    <BrowserRouter>
      {/* Global Overlays */}
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        recentSearches={recentSearches}
        trending={trendingSearches}
        onResultClick={handleSearchResultClick}
      />
      <NotificationContainer />

      <Routes>
        <Route path="/" element={<BriefingRoom />} />
        <Route path="/investigate/:id" element={<InvestigationThread />} />
        <Route path="/race/:raceId" element={<RaceBriefing />} />
        <Route path="/strategy/:raceId" element={<StrategyPlayground />} />
        <Route path="/ghost-battle/:raceId" element={<GhostBattle />} />
      </Routes>
    </BrowserRouter>
  );
}
