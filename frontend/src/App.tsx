import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/Shell';
import LandingPage from './pages/Landing';

// Feature placeholders to satisfy routing
const DriverPlaceholder = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] border border-[#1C2025] bg-[#0E1013] rounded p-8">
    <h2 className="text-xl mb-2">Driver Analytics Index</h2>
    <p className="text-sm text-[#8B95A5] font-mono">Status: DEFERRED TO V2 IMPLEMENTATION</p>
  </div>
);

const TeamPlaceholder = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] border border-[#1C2025] bg-[#0E1013] rounded p-8">
    <h2 className="text-xl mb-2">Constructor Performance Index</h2>
    <p className="text-sm text-[#8B95A5] font-mono">Status: DEFERRED TO V2 IMPLEMENTATION</p>
  </div>
);

const SimulatePlaceholder = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] border border-[#1C2025] bg-[#0E1013] rounded p-8">
    <h2 className="text-xl mb-2">What-If Strategy Simulator</h2>
    <p className="text-sm text-[#8B95A5] font-mono">Status: DEFERRED TO V2 IMPLEMENTATION</p>
  </div>
);

const BattlePlaceholder = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] border border-[#1C2025] bg-[#0E1013] rounded p-8">
    <h2 className="text-xl mb-2">Ghost Telemetry Battle Console</h2>
    <p className="text-sm text-[#8B95A5] font-mono">Status: DEFERRED TO V2 IMPLEMENTATION</p>
  </div>
);

function App() {
  return (
    <Router>
      <AppShell>
        <Suspense fallback={
          <div className="flex items-center justify-center h-[50vh]">
            <div className="h-1 w-48 bg-[#16191E] overflow-hidden relative rounded">
              <div className="h-full bg-[#00E5FF] animate-pulse w-full"></div>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/driver" element={<DriverPlaceholder />} />
            <Route path="/team" element={<TeamPlaceholder />} />
            <Route path="/simulate" element={<SimulatePlaceholder />} />
            <Route path="/battle" element={<BattlePlaceholder />} />
          </Routes>
        </Suspense>
      </AppShell>
    </Router>
  );
}

export default App;
