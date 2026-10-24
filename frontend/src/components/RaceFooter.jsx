import { Link } from "react-router-dom";
export function RaceFooter() {
  return (
    <footer className="race-footer">
      <div className="footer-top">
        <span>
          INDEPENDENT INTELLIGENCE.
          <br />
          UNCONDITIONAL LOVE FOR THE RACE.
        </span>
        <a
          href="https://www.pranavattarde.in/"
          target="_blank"
          rel="noopener noreferrer"
        >
          BUILT BY PRANAV ATTARDE ↗
        </a>
      </div>
      <div className="footer-wordmark" aria-hidden="true">
        FRONTWING<span>.</span>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} FRONTWING</span>
        <nav aria-label="FrontWing information">
          <a href="/about/">ABOUT</a>
          <a href="/guides/f1-telemetry/">TELEMETRY GUIDE</a>
          <a href="/guides/f1-strategy/">STRATEGY GUIDE</a>
          <Link to="/strategy">PIT WALL</Link>
        </nav>
        <span>AN INDEPENDENT F1 PROJECT</span>
      </div>
    </footer>
  );
}
