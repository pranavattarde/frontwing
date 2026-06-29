import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BriefingRoom } from './pages/BriefingRoom';
import { InvestigationThread } from './pages/InvestigationThread';
import { RaceBriefing } from './pages/RaceBriefing';
import { StrategyPlayground } from './pages/StrategyPlayground';
import { GhostBattle } from './pages/GhostBattle';

export default function App() {
  return (
    <BrowserRouter>
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
