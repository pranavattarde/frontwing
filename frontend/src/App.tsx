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
import { generateId } from './lib/utils';
import { submitEngineerQuery } from './lib/api';

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

  const handleSearchResultClick = async (queryText: string) => {
    setIsSearchOpen(false);
    try {
      if (typeof (window as any).__fw_notify === 'function') {
        (window as any).__fw_notify({
          id: String(Date.now()),
          message: `Querying AI Gateway: "${queryText}"`,
          type: 'info',
          duration: 3000,
        });
      }
      const aiResponse = await submitEngineerQuery(queryText);
      const generatedId = generateId();
      const newInvestigation = {
        id: generatedId,
        question: queryText,
        response: aiResponse,
        timestamp: Date.now()
      };
      localStorage.setItem(`frontwing_investigation_${generatedId}`, JSON.stringify(newInvestigation));
      window.location.href = `/investigate/${generatedId}`;
    } catch (error: any) {
      console.error('[SearchOverlay] Query failed:', error);
      if (typeof (window as any).__fw_notify === 'function') {
        (window as any).__fw_notify({
          id: String(Date.now()),
          message: `Query failed: ${error.message}`,
          type: 'error',
          duration: 5000,
        });
      }
    }
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
