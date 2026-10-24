import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QuestionBar } from "@/components/QuestionBar";
import {
  fetchHistory,
  fetchHeroCurrent,
  fetchEditorialCurrent,
} from "@/lib/api";
import { generateId } from "@/lib/utils";

const QUESTIONS = [
  [
    "Compare laps",
    "Compare Norris and Verstappen's fastest laps at the 2024 Dutch GP",
  ],
  ["Explain a result", "Why did Hamilton win the 2024 British Grand Prix?"],
  [
    "Tyre analysis",
    "Analyze Leclerc's tyre degradation at the 2024 Italian GP",
  ],
];
const clean = (value) => {
  const decoder = document.createElement("textarea");
  decoder.innerHTML = String(value || "");
  return decoder.value
    .replace(/<[^>]*(?:>|$)/g, "")
    .replace(/[\u2013\u2014]|\u0393\u00c7[\u00f4\u00f6]/g, ":")
    .trim();
};
const isStrategy = (item) =>
  item.investigation_metadata?.type === "strategy" ||
  item.session === "Strategy" ||
  item.provider_used === "strategy-planner" ||
  item.type === "strategy" ||
  item.conversation_id?.startsWith("strat-");

function Dialog({ title, onClose, children, kind = "schedule" }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector("button")?.focus();
    const keyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const controls = [
        ...panel.current.querySelectorAll('button, a[href], [tabindex="0"]'),
      ].filter(
        (element) => element.getClientRects().length && !element.disabled,
      );
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyDown);
    const otherDialogs = [
      "toggle-command-palette",
      "toggle-search-overlay",
      "frontwing-open-auth-modal",
      "frontwing-toggle-sidebar",
    ];
    otherDialogs.forEach((event) => window.addEventListener(event, onClose));
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keyDown);
      otherDialogs.forEach((event) =>
        window.removeEventListener(event, onClose),
      );
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className={`home-dialog-layer home-dialog-${kind}`}>
      <button
        className="home-dialog-scrim"
        onClick={onClose}
        aria-label={`Close ${title}`}
        tabIndex={-1}
      />
      <section
        ref={panel}
        className="home-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-dialog-title"
      >
        <header>
          <div>
            <span className="home-kicker">
              FRONTWING /{" "}
              {kind === "schedule" ? "RACE WEEKEND" : "FROM THE PADDOCK"}
            </span>
            <h2 id="home-dialog-title">{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close dialog">
            Close <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="home-dialog-content">{children}</div>
      </section>
    </div>
  );
}

function RaceContext({ race, loading, now, onSchedule, onRetry }) {
  const upcoming = (race?.sessions || [])
    .filter((session) => new Date(session.utc).getTime() > now)
    .sort((a, b) => new Date(a.utc) - new Date(b.utc));
  const next = upcoming[0];
  const remaining = next
    ? Math.max(0, Math.floor((new Date(next.utc).getTime() - now) / 1000))
    : null;
  const countdown =
    remaining !== null
      ? [
          Math.floor(remaining / 86400),
          Math.floor(remaining / 3600) % 24,
          Math.floor(remaining / 60) % 60,
          remaining % 60,
        ]
      : null;
  return (
    <aside className="home-race-context" aria-label="Current race weekend">
      {race ? (
        <>
          <button
            className="home-race-mobile"
            onClick={onSchedule}
            aria-label={`View weekend schedule for ${race.event_name}`}
          >
            <span>
              <small>This weekend</small>
              <strong>{race.event_name}</strong>
              <span>{next ? `${next.name} · ${next.ist}` : race.location}</span>
            </span>
            <span aria-hidden="true">+</span>
          </button>
          <div className="home-race-desktop">
            <div className="home-context-label">
              <span>This weekend</span>
              <span>
                {race.season} / R
                {String(race.round_number || "").padStart(2, "0")}
              </span>
            </div>
            <h2>{race.event_name}</h2>
            <p className="home-context-location">{race.location}</p>
            <div className="home-next-session">
              <span className="home-kicker">UP NEXT</span>
              <h3>{next?.name || "Weekend timetable"}</h3>
              <p>{next?.ist || "See the complete weekend schedule"}</p>
            </div>
            {countdown && (
              <div
                className="home-context-countdown"
                aria-label="Time to next session"
              >
                {countdown.map((value, index) => (
                  <span key={index}>
                    <strong>{String(value).padStart(2, "0")}</strong>
                    <small>{["Days", "Hours", "Mins", "Secs"][index]}</small>
                  </span>
                ))}
              </div>
            )}
            <button className="home-schedule-button" onClick={onSchedule}>
              Weekend schedule <span aria-hidden="true">+</span>
            </button>
            <p className="home-context-note">
              Times shown in Indian Standard Time.
            </p>
          </div>
        </>
      ) : (
        <div className="home-race-unavailable">
          <span className="home-kicker">THIS RACE WEEKEND</span>
          <h2>The race calendar</h2>
          <p role="status">
            {loading
              ? "Connecting to the race calendar…"
              : "The calendar is temporarily unavailable."}
          </p>
          <button
            className="home-schedule-button"
            disabled={loading}
            onClick={onRetry}
          >
            {loading ? "Connecting…" : "Try again"}
          </button>
        </div>
      )}
    </aside>
  );
}

export function BriefingRoom() {
  const navigate = useNavigate();
  const [race, setRace] = useState(null);
  const [editorial, setEditorial] = useState(null);
  const [raceLoading, setRaceLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  const [prefill, setPrefill] = useState(
    new URLSearchParams(window.location.search).get("q") || "",
  );
  const [authenticated, setAuthenticated] = useState(
    !!localStorage.getItem("frontwing_token"),
  );
  const [latest, setLatest] = useState(null);
  const [now, setNow] = useState(Date.now());
  const loadHistory = useCallback(async () => {
    const signedIn = !!localStorage.getItem("frontwing_token");
    setAuthenticated(signedIn);
    if (!signedIn) {
      setLatest(null);
      return;
    }
    try {
      const history = await fetchHistory({ limit: 1 });
      setLatest(history?.investigations?.[0] || null);
    } catch {
      setLatest(null);
    }
  }, []);
  const loadFeeds = useCallback(async () => {
    setRaceLoading(true);
    setNewsLoading(true);
    await Promise.all([
      fetchHeroCurrent().then((currentRace) => {
        setRace(currentRace?.event_name ? currentRace : null);
        setRaceLoading(false);
      }),
      fetchEditorialCurrent().then((news) => {
        setEditorial(news);
        setNewsLoading(false);
      }),
    ]);
  }, []);
  useEffect(() => {
    loadHistory();
    loadFeeds();
    const prefillQuery = (event) => {
      if (event.detail?.query) setPrefill(event.detail.query);
    };
    window.addEventListener("frontwing-auth-changed", loadHistory);
    window.addEventListener("frontwing-auth-unauthorized", loadHistory);
    window.addEventListener("frontwing-history-updated", loadHistory);
    window.addEventListener("frontwing-prefill-query", prefillQuery);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(clock);
      window.removeEventListener("frontwing-auth-changed", loadHistory);
      window.removeEventListener("frontwing-auth-unauthorized", loadHistory);
      window.removeEventListener("frontwing-history-updated", loadHistory);
      window.removeEventListener("frontwing-prefill-query", prefillQuery);
    };
  }, [loadHistory, loadFeeds]);
  const submit = (question) => {
    if (!question.trim()) return;
    const id = generateId();
    const investigation = {
      id,
      question,
      display_title: question,
      status: "loading",
      exchanges: [],
      timestamp: new Date().toISOString(),
      pinned: false,
      group_id: null,
    };
    localStorage.setItem(
      `frontwing_investigation_${id}`,
      JSON.stringify(investigation),
    );
    window.dispatchEvent(
      new CustomEvent("frontwing-chat-created", { detail: investigation }),
    );
    navigate(`/investigate/${id}`);
  };
  const openArchive = () =>
    window.dispatchEvent(new CustomEvent("frontwing-toggle-sidebar"));
  const news = [
    ...(editorial?.featured_stories || []),
    ...(editorial?.trending_insights || []),
  ];

  return (
    <div className="home-workspace">
      <section className="home-primary" aria-labelledby="home-heading">
        <div className="home-investigate" id="race-engineer">
          <span className="home-kicker">01 / YOUR RACE ENGINEER</span>
          <h1 id="home-heading">
            Good questions.
            <br />
            <em>Race-winning insight.</em>
          </h1>
          <p className="home-introduction">
            Understand the story behind every lap.
            <br className="home-desktop-break" /> Ask a race question and
            explore the evidence.
          </p>
          <div className="home-query">
            <label htmlFor="home-question">Ask the race engineer</label>
            <QuestionBar
              variant="hero"
              inputId="home-question"
              placeholder="A driver, a race, or a lap…"
              submitLabel="Investigate"
              prefillValue={prefill}
              onSubmit={submit}
            />
            <div className="home-question-starts">
              <span>Try a question</span>
              <div>
                {QUESTIONS.map(([label, question]) => (
                  <button
                    key={label}
                    onClick={() => {
                      setPrefill(question);
                      window.dispatchEvent(
                        new CustomEvent("frontwing-focus-input"),
                      );
                    }}
                  >
                    {label} <span aria-hidden="true">+</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="home-returning">
            {latest ? (
              <button
                onClick={() =>
                  navigate(
                    isStrategy(latest)
                      ? `/strategy?id=${latest.id}`
                      : `/investigate/${latest.id}`,
                  )
                }
              >
                <span>Continue your last investigation</span>
                <strong>{latest.display_title || latest.question}</strong>
              </button>
            ) : null}
            <button
              className="home-text-link"
              onClick={
                authenticated
                  ? openArchive
                  : () =>
                      window.dispatchEvent(
                        new CustomEvent("frontwing-open-auth-modal"),
                      )
              }
            >
              {authenticated
                ? "Open your archive"
                : "Sign in to save investigations"}{" "}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
        <RaceContext
          race={race}
          loading={raceLoading}
          now={now}
          onSchedule={() => setDialog("schedule")}
          onRetry={loadFeeds}
        />
      </section>

      <section className="home-explore" aria-labelledby="home-explore-heading">
        <div className="home-explore-heading">
          <div>
            <span className="home-kicker">A DIFFERENT QUESTION?</span>
            <h2 id="home-explore-heading">Take it to the pit wall.</h2>
          </div>
          <p>
            Two dedicated workspaces for the decisions
            <br className="home-desktop-break" /> and differences that shape a
            race.
          </p>
        </div>
        <div className="home-tool-list">
          <article className="home-tool">
            <span className="home-tool-index" aria-hidden="true">
              02
            </span>
            <div>
              <h3>Strategy Engineer</h3>
              <p>
                Change the pit lap or tyre compound. See how a different call
                could have changed the result.
              </p>
            </div>
            <Link className="home-tool-action" to="/strategy">
              Test a strategy <span aria-hidden="true">↗</span>
            </Link>
          </article>
          <article className="home-tool">
            <span className="home-tool-index" aria-hidden="true">
              03
            </span>
            <div>
              <h3>Ghost Battle</h3>
              <p>
                Put authentic laps on the same track. Discover where a driver
                gains time, corner by corner.
              </p>
            </div>
            <Link className="home-tool-action" to="/ghost-battle">
              Compare laps <span aria-hidden="true">↗</span>
            </Link>
          </article>
        </div>
        <div className="home-utility">
          <div>
            <span className="home-kicker">FROM THE PADDOCK</span>
            <p>Keep up with the race beyond the data.</p>
          </div>
          <button className="home-text-link" onClick={() => setDialog("news")}>
            News & race debriefs <span aria-hidden="true">+</span>
          </button>
        </div>
      </section>

      {dialog === "schedule" && (
        <Dialog title="The weekend schedule" onClose={closeDialog}>
          <div className="home-schedule-intro">
            <h3>{race?.event_name || "Race calendar"}</h3>
            <p>
              {race?.location} {race?.season && ` / ${race.season}`}
            </p>
          </div>
          {race?.sessions?.length ? (
            <>
              <div className="home-schedule-legend">
                <span>Session</span>
                <span>Indian Standard Time</span>
                <span>At the circuit</span>
              </div>
              <div className="home-schedule-list">
                {race.sessions.map((session, index) => (
                  <div key={`${session.name}-${index}`}>
                    <strong>{session.name}</strong>
                    <time dateTime={session.utc}>{session.ist}</time>
                    <span>{session.local}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>The schedule is currently unavailable.</p>
          )}
        </Dialog>
      )}
      {dialog === "news" && (
        <Dialog title="From the paddock" kind="news" onClose={closeDialog}>
          <p className="home-news-intro">
            Race reporting and debriefs from the original sources.
          </p>
          {news.length ? (
            <div className="home-news-list">
              {news.map((item, index) => {
                const title = clean(item.title || item.headline);
                const source = item.source_url || item.sourceUrl;
                const href = /^https?:\/\//i.test(source || "") ? source : null;
                return (
                  <article key={item.id || index}>
                    <span>
                      {item.source_outlet || item.source || "Race reporting"}
                    </span>
                    <h3>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {title} <span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        title
                      )}
                    </h3>
                    {item.summary && <p>{clean(item.summary)}</p>}
                  </article>
                );
              })}
            </div>
          ) : (
            <p role="status">
              {newsLoading
                ? "Opening the feed…"
                : "The editorial feed is temporarily unavailable."}
            </p>
          )}
          <a
            className="home-text-link"
            href="https://www.formula1.com/en/latest"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Formula 1 news <span aria-hidden="true">↗</span>
          </a>
        </Dialog>
      )}
    </div>
  );
}
