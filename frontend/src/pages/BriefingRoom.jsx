import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QuestionBar } from "@/components/QuestionBar";
import { getCircuitByTrackName } from "@/lib/circuitTracks";
import { generateId } from "@/lib/utils";
import {
  fetchHistory,
  deleteHistory,
  fetchHeroCurrent,
  fetchEditorialCurrent,
} from "@/lib/api";

const QUESTIONS = [
  "Compare Norris and Verstappen's fastest laps at the 2024 Dutch GP",
  "Why did Hamilton win the 2024 British Grand Prix?",
  "Analyze Leclerc's tyre degradation at the 2024 Italian GP",
];
const PANELS = [
  ["tools", "Race tools"],
  ["recent", "Recent"],
  ["saved", "Saved"],
  ["news", "Paddock feed"],
];
const clean = (text) => {
  const decoder = document.createElement("textarea");
  decoder.innerHTML = String(text || "");
  return decoder.value
    .replace(/<[^>]*(?:>|$)/g, "")
    .replace(/\u2014|\u0393\u00c7\u00f6/g, ":")
    .trim();
};
const isStrategy = (item) =>
  item.investigation_metadata?.type === "strategy" ||
  item.session === "Strategy" ||
  item.provider_used === "strategy-planner" ||
  item.type === "strategy" ||
  item.conversation_id?.startsWith("strat-");

function RaceWeekend({ hero, loading, reload, now }) {
  const circuit = hero
    ? getCircuitByTrackName(hero.circuit_key, hero.location)
    : null;
  const track =
    hero?.track_geometry || (circuit?.hasTelemetry ? circuit : null);
  const nextSession = hero?.sessions?.find(
    (session) => new Date(session.utc).getTime() > now,
  );
  const advertised = new Date(hero?.countdown_target).getTime();
  const target =
    advertised > now ? advertised : new Date(nextSession?.utc).getTime();
  const seconds = Math.max(0, Math.floor((target - now) / 1000));
  const countdown =
    Number.isFinite(seconds) && seconds > 0
      ? [
          Math.floor(seconds / 86400),
          Math.floor(seconds / 3600) % 24,
          Math.floor(seconds / 60) % 60,
          seconds % 60,
        ]
      : null;
  return (
    <section className="weekend-deck" aria-labelledby="weekend-heading">
      {hero ? (
        <>
          <div className="weekend-deck-top">
            <span className="eyebrow">THE CURRENT RACE WEEKEND</span>
            <span className="eyebrow">
              {hero.season} / ROUND {hero.round_number}
            </span>
          </div>
          <div className="weekend-deck-main">
            <div className="weekend-event">
              <h2 id="weekend-heading">{hero.event_name}</h2>
              <p>{hero.location}</p>
              <div className="weekend-next">
                <span>
                  {nextSession ? `NEXT / ${nextSession.name}` : "RACE WEEKEND"}
                </span>
                {countdown ? (
                  <strong
                    aria-label="Time to next session"
                    className="weekend-clock"
                  >
                    {countdown.map((value, i) => (
                      <span key={i}>
                        {String(value).padStart(2, "0")}
                        <small>{["D", "H", "M", "S"][i]}</small>
                      </span>
                    ))}
                  </strong>
                ) : (
                  <strong>
                    {nextSession?.ist || "Follow the session timetable"}
                  </strong>
                )}
              </div>
            </div>
            <div className="weekend-relief" aria-hidden="true">
              {track?.trackPath ? (
                <svg viewBox={track.viewBox || "0 0 480 260"} fill="none">
                  <path d={track.trackPath} />
                  <path
                    className="relief-trace"
                    d={track.trackPath}
                    pathLength="100"
                  />
                </svg>
              ) : (
                <>
                  <span>ROUND</span>
                  <strong>
                    {String(hero.round_number || "").padStart(2, "0")}
                  </strong>
                  <small>{hero.location?.split(",")[0]}</small>
                </>
              )}
            </div>
          </div>
          <div className="weekend-agenda" aria-label="Session timetable in IST">
            {hero.sessions?.map((session, i) => (
              <div
                key={`${session.name}-${i}`}
                className={session === nextSession ? "is-next" : ""}
              >
                <span>{session.name.replace("Practice ", "FP")}</span>
                <time>{session.ist}</time>
              </div>
            ))}
          </div>
          <span className="weekend-timezone">
            ALL TIMES IST
            {nextSession?.local
              ? ` / NEXT AT TRACK: ${nextSession.local}`
              : " / OFFICIAL EVENT CALENDAR"}
          </span>
        </>
      ) : (
        <div className="weekend-unavailable">
          <span className="eyebrow">THE CURRENT RACE WEEKEND</span>
          <h2 id="weekend-heading">THE CALENDAR</h2>
          <p role="status">
            {loading
              ? "Connecting to the race calendar…"
              : "The race calendar is temporarily unavailable."}
          </p>
          <button onClick={reload} disabled={loading}>
            {loading ? "CONNECTING" : "RETRY CONNECTION"} +
          </button>
        </div>
      )}
    </section>
  );
}

function RaceTools() {
  return (
    <div className="compact-tools">
      <article className="compact-tool">
        <div className="tool-caption">
          <span className="eyebrow">02 / STRATEGY ENGINEER</span>
          <span>WHAT IF?</span>
        </div>
        <div className="compact-tool-body">
          <div>
            <h3>
              CHANGE THE CALL.
              <br />
              <em>SEE THE OUTCOME.</em>
            </h3>
            <p>
              Move the pit stop. Switch the compound. Compare the projected
              result with the race that happened.
            </p>
          </div>
          <div className="strategy-relief" aria-hidden="true">
            <div>
              <span>ACTUAL</span>
              <i />
              <i />
            </div>
            <div>
              <span>WHAT IF</span>
              <i />
              <i />
            </div>
            <strong>BOX.</strong>
          </div>
        </div>
        <Link className="console-action" to="/strategy">
          OPEN STRATEGY ENGINEER <span aria-hidden="true">↗</span>
        </Link>
      </article>
      <article className="compact-tool">
        <div className="tool-caption">
          <span className="eyebrow">03 / GHOST BATTLE</span>
          <span>LAP VS LAP</span>
        </div>
        <div className="compact-tool-body">
          <div>
            <h3>
              SAME TRACK.
              <br />
              <em>DIFFERENT LIMITS.</em>
            </h3>
            <p>
              Replay authentic laps together. Compare up to 22 drivers and find
              where the difference is made.
            </p>
          </div>
          <div className="ghost-relief" aria-hidden="true">
            <span>3D</span>
            <i />
            <i />
            <i />
          </div>
        </div>
        <Link className="console-action" to="/ghost-battle">
          ENTER GHOST BATTLE <span aria-hidden="true">↗</span>
        </Link>
      </article>
    </div>
  );
}

function PaddockFeed({ editorial, loading }) {
  const news = [
    ...(editorial?.featured_stories || []),
    ...(editorial?.trending_insights || []),
  ];
  return (
    <div className="compact-feed">
      <div className="console-section-label">
        <span>05 / FROM THE PADDOCK</span>
        <a
          href="https://www.formula1.com/en/latest"
          target="_blank"
          rel="noopener noreferrer"
        >
          ALL F1 NEWS ↗
        </a>
      </div>
      {news.length ? (
        <div className="compact-news-list">
          {news.map((item, index) => {
            const title = clean(item.title || item.headline);
            const sourceUrl = item.source_url || item.sourceUrl;
            const href = /^https?:\/\//i.test(sourceUrl || "")
              ? sourceUrl
              : null;
            return (
              <article key={item.id || index}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <small>
                    {item.source_outlet || item.source || "FROM THE PADDOCK"}
                  </small>
                  <h3>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {title}
                      </a>
                    ) : (
                      title
                    )}
                  </h3>
                </div>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Read ${title}`}
                  >
                    <span aria-hidden="true">↗</span>
                  </a>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="console-message" role="status">
          {loading
            ? "Opening the editorial feed…"
            : "The editorial feed is unavailable. Visit Formula 1 for the latest reporting."}
        </p>
      )}
    </div>
  );
}

export function BriefingRoom() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState([]);
  const [authenticated, setAuthenticated] = useState(
    !!localStorage.getItem("frontwing_token"),
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [prefill, setPrefill] = useState(
    new URLSearchParams(window.location.search).get("q") || "",
  );
  const [hero, setHero] = useState(null);
  const [editorial, setEditorial] = useState(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [activePanel, setActivePanel] = useState("tools");
  const panelTabs = useRef([]);
  const [now, setNow] = useState(Date.now());
  const [deleting, setDeleting] = useState(null);
  const deleteDialog = useRef(null);
  const loadHistory = useCallback(async () => {
    const signedIn = !!localStorage.getItem("frontwing_token");
    setAuthenticated(signedIn);
    if (!signedIn) {
      setRecent([]);
      return;
    }
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const data = await fetchHistory({ limit: 10 });
      setRecent(data?.investigations || []);
    } catch {
      setHistoryError("Your archive could not be reached. Try again shortly.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);
  const loadFeeds = useCallback(async () => {
    setFeedLoading(true);
    const [race, news] = await Promise.all([
      fetchHeroCurrent(),
      fetchEditorialCurrent(),
    ]);
    setHero(race?.event_name ? race : null);
    setEditorial(news);
    setFeedLoading(false);
  }, []);
  useEffect(() => {
    loadHistory();
    loadFeeds();
    const prefillQuery = (event) => {
      if (!event.detail?.query) return;
      setPrefill(event.detail.query);
      document
        .getElementById("race-engineer")
        ?.scrollIntoView({
          behavior:
            document.documentElement.dataset.motion === "paused" ||
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
        });
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
  useEffect(() => {
    if (!deleting) return;
    const previous = document.activeElement;
    deleteDialog.current?.querySelector("button")?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") setDeleting(null);
      if (event.key !== "Tab") return;
      const buttons = deleteDialog.current.querySelectorAll("button");
      if (event.shiftKey && document.activeElement === buttons[0]) {
        event.preventDefault();
        buttons[1].focus();
      }
      if (!event.shiftKey && document.activeElement === buttons[1]) {
        event.preventDefault();
        buttons[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [deleting]);
  const submit = (query) => {
    if (!query.trim()) return;
    const id = generateId();
    const investigation = {
      id,
      question: query,
      display_title: query,
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
  const remove = async () => {
    if (!deleting) return;
    try {
      if (!(await deleteHistory(deleting.id))) throw new Error();
      localStorage.removeItem(`frontwing_investigation_${deleting.id}`);
      window.dispatchEvent(new CustomEvent("frontwing-history-updated"));
      setDeleting(null);
    } catch {
      setHistoryError(
        "The investigation could not be deleted. Please try again.",
      );
      setDeleting(null);
    }
  };
  const visibleHistory =
    activePanel === "saved" ? recent.filter((item) => item.is_saved) : recent;
  const openAuth = () =>
    window.dispatchEvent(new CustomEvent("frontwing-open-auth-modal"));

  return (
    <div className="briefing-page compact-briefing">
      <section className="pitwall-overview" aria-labelledby="pitwall-heading">
        <div className="pitwall-intro">
          <span className="eyebrow">
            FRONTWING / YOUR RACE INTELLIGENCE WORKSPACE
          </span>
          <h1 id="pitwall-heading">
            UNDERSTAND
            <br />
            <em>THE RACE.</em>
          </h1>
          <p>
            Ask what happened. Find out why. Explore the telemetry, test a
            pit-wall decision, or compare laps in 3D.
          </p>
          <div className="pitwall-principles">
            <span>REAL RACE DATA</span>
            <span>EVIDENCE YOU CAN EXPLORE</span>
          </div>
        </div>
        <RaceWeekend
          hero={hero}
          loading={feedLoading}
          reload={loadFeeds}
          now={now}
        />
      </section>

      <section
        className="engineer-section"
        id="race-engineer"
        aria-labelledby="engineer-heading"
      >
        <div className="compact-engineer-copy">
          <span className="eyebrow">01 / THE INVESTIGATION ROOM</span>
          <h2 id="engineer-heading">
            GOOD QUESTIONS.
            <br />
            <em>RACE-WINNING INSIGHT.</em>
          </h2>
          <p>
            Your direct line to the race engineer. Pick a driver, question a
            decision, follow the evidence.
          </p>
          <button
            className="compact-search"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("toggle-search-overlay"))
            }
          >
            SEARCH YOUR ARCHIVE <kbd>CTRL K</kbd>
          </button>
        </div>
        <div className="engineer-workbench">
          <div className="workbench-title">
            <span>ASK THE RACE ENGINEER</span>
            <span>RADIO / OPEN</span>
          </div>
          <QuestionBar
            variant="hero"
            placeholder="What do you want to know about the race?"
            onSubmit={submit}
            prefillValue={prefill}
          />
          <div className="question-examples">
            <span>OR START HERE</span>
            {QUESTIONS.map((question, i) => (
              <button
                key={question}
                onClick={() => {
                  setPrefill(question);
                  window.dispatchEvent(
                    new CustomEvent("frontwing-focus-input"),
                  );
                }}
              >
                <small>0{i + 1}</small>
                {question}
                <span aria-hidden="true">+</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="paddock-console" aria-labelledby="paddock-heading">
        <div className="paddock-console-header">
          <div>
            <span className="eyebrow">YOUR NEXT MOVE</span>
            <h2 id="paddock-heading">THE PIT WALL.</h2>
          </div>
          <div
            className="paddock-tabs"
            role="tablist"
            aria-label="Pit wall workspace"
          >
            {PANELS.map(([id, label], index) => (
              <button
                key={id}
                ref={(element) => {
                  panelTabs.current[index] = element;
                }}
                id={`paddock-tab-${id}`}
                role="tab"
                aria-selected={activePanel === id}
                aria-controls="paddock-panel"
                tabIndex={activePanel === id ? 0 : -1}
                onClick={() => setActivePanel(id)}
                onKeyDown={(event) => {
                  let next;
                  if (event.key === "ArrowRight")
                    next = (index + 1) % PANELS.length;
                  else if (event.key === "ArrowLeft")
                    next = (index + PANELS.length - 1) % PANELS.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = PANELS.length - 1;
                  if (next !== undefined) {
                    event.preventDefault();
                    setActivePanel(PANELS[next][0]);
                    panelTabs.current[next]?.focus();
                  }
                }}
              >
                {label}
                {id === "saved" && authenticated && (
                  <small>{recent.filter((item) => item.is_saved).length}</small>
                )}
              </button>
            ))}
          </div>
        </div>
        <div
          key={activePanel}
          className="paddock-panel"
          id="paddock-panel"
          role="tabpanel"
          aria-labelledby={`paddock-tab-${activePanel}`}
          tabIndex={0}
        >
          {activePanel === "tools" ? (
            <RaceTools />
          ) : activePanel === "news" ? (
            <PaddockFeed editorial={editorial} loading={feedLoading} />
          ) : (
            <div className="compact-history">
              <div className="console-section-label">
                <span>
                  04 / YOUR {activePanel === "saved" ? "SAVED" : "RECENT"}{" "}
                  INVESTIGATIONS
                </span>
                <button
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("frontwing-toggle-sidebar"),
                    )
                  }
                >
                  OPEN FULL ARCHIVE +
                </button>
              </div>
              {!authenticated ? (
                <div className="console-empty">
                  <div>
                    <h3>
                      YOUR RACE HISTORY.
                      <br />
                      <em>READY WHEN YOU ARE.</em>
                    </h3>
                    <p>
                      Sign in to save investigations, pin a question and pick up
                      where you left off.
                    </p>
                  </div>
                  <button className="console-action" onClick={openAuth}>
                    SIGN IN TO YOUR PADDOCK <span aria-hidden="true">↗</span>
                  </button>
                </div>
              ) : historyLoading ? (
                <p className="console-message" role="status">
                  Opening your archive…
                </p>
              ) : historyError ? (
                <p className="console-message" role="alert">
                  {historyError} <button onClick={loadHistory}>Retry</button>
                </p>
              ) : visibleHistory.length ? (
                <div className="compact-history-list">
                  {visibleHistory.map((item, index) => (
                    <div key={item.id}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <button
                        onClick={() =>
                          navigate(
                            isStrategy(item)
                              ? `/strategy?id=${item.id}`
                              : `/investigate/${item.id}`,
                          )
                        }
                      >
                        {item.display_title || item.question}
                      </button>
                      <time>
                        {new Date(
                          item.timestamp || item.created_at,
                        ).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </time>
                      <button
                        aria-label={`Delete ${item.display_title || item.question}`}
                        onClick={() => setDeleting(item)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="console-empty">
                  <div>
                    <h3>
                      START WITH
                      <br />
                      <em>A QUESTION.</em>
                    </h3>
                    <p>
                      {activePanel === "saved"
                        ? "Save an investigation to find it here."
                        : "Your first investigation starts with the race engineer above."}
                    </p>
                  </div>
                  <a className="console-action" href="#race-engineer">
                    ASK THE RACE ENGINEER <span aria-hidden="true">↗</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="console-bottom">
          <span>ONE WORKSPACE. EVERY ANGLE OF THE RACE.</span>
          <span>TELEMETRY / STRATEGY / 3D REPLAY</span>
        </div>
      </section>
      {deleting && (
        <div className="confirmation-backdrop">
          <section
            ref={deleteDialog}
            className="confirmation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <span className="eyebrow">YOUR ARCHIVE</span>
            <h2 id="delete-title">Delete investigation?</h2>
            <p>{deleting.display_title || deleting.question}</p>
            <p>This will permanently remove this investigation.</p>
            <div>
              <button
                className="race-button race-button-outline"
                onClick={() => setDeleting(null)}
              >
                CANCEL
              </button>
              <button className="race-button" onClick={remove}>
                DELETE
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
