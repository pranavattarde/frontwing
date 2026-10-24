import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QuestionBar } from "@/components/QuestionBar";
import { RaceStoryCard } from "@/components/RaceStoryCard";
import { InsightCard } from "@/components/InsightCard";
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

export function BriefingRoom() {
  const navigate = useNavigate();
  const root = useRef(null);
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
  const [countdown, setCountdown] = useState(null);
  const [historyFilter, setHistoryFilter] = useState("recent");
  const [deleting, setDeleting] = useState(null);
  const deleteDialog = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = null;
    const travel = () => {
      if (
        frame !== null ||
        document.documentElement.dataset.motion === "paused"
      )
        return;
      frame = requestAnimationFrame(() => {
        if (root.current) {
          const progress = Math.min(
            1,
            Math.max(0, -root.current.getBoundingClientRect().top / 600),
          );
          root.current.style.setProperty("--hero-travel", progress.toFixed(3));
        }
        frame = null;
      });
    };
    window.addEventListener("scroll", travel, { passive: true });
    travel();
    return () => {
      window.removeEventListener("scroll", travel);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

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
      if (event.detail?.query) {
        setPrefill(event.detail.query);
        document.getElementById("race-engineer")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      }
    };
    window.addEventListener("frontwing-auth-changed", loadHistory);
    window.addEventListener("frontwing-auth-unauthorized", loadHistory);
    window.addEventListener("frontwing-prefill-query", prefillQuery);
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.dataset.visible = "true";
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    root.current
      ?.querySelectorAll("[data-reveal]")
      .forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      window.removeEventListener("frontwing-auth-changed", loadHistory);
      window.removeEventListener("frontwing-auth-unauthorized", loadHistory);
      window.removeEventListener("frontwing-prefill-query", prefillQuery);
    };
  }, [loadHistory, loadFeeds]);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const upcomingSessions = (hero?.sessions || [])
        .map((session) => new Date(session.utc).getTime())
        .filter((time) => time > now);
      const advertisedTarget = new Date(hero?.countdown_target).getTime();
      const target =
        advertisedTarget > now
          ? advertisedTarget
          : Math.min(...upcomingSessions);
      if (!Number.isFinite(target)) {
        setCountdown(null);
        return;
      }
      const seconds = Math.max(0, Math.floor((target - now) / 1000));
      setCountdown(
        seconds > 0
          ? [
              Math.floor(seconds / 86400),
              Math.floor(seconds / 3600) % 24,
              Math.floor(seconds / 60) % 60,
              seconds % 60,
            ]
          : null,
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [hero]);

  useEffect(() => {
    if (!deleting) return;
    const previous = document.activeElement;
    deleteDialog.current?.querySelector("button")?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") setDeleting(null);
      if (event.key === "Tab") {
        const buttons = deleteDialog.current.querySelectorAll("button");
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault();
          buttons[1].focus();
        }
        if (!event.shiftKey && document.activeElement === buttons[1]) {
          event.preventDefault();
          buttons[0].focus();
        }
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
      const ok = await deleteHistory(deleting.id);
      if (!ok) throw new Error();
      localStorage.removeItem(`frontwing_investigation_${deleting.id}`);
      window.dispatchEvent(new CustomEvent("frontwing-history-updated"));
      setDeleting(null);
      loadHistory();
    } catch {
      setHistoryError(
        "The investigation could not be deleted. Please try again.",
      );
      setDeleting(null);
    }
  };
  const circuit = hero
    ? getCircuitByTrackName(hero.circuit_key, hero.location)
    : null;
  const track =
    hero?.track_geometry || (circuit?.hasTelemetry ? circuit : null);
  const stories = editorial?.featured_stories || [];
  const insights = editorial?.trending_insights || [];
  const visibleHistory =
    historyFilter === "saved" ? recent.filter((item) => item.is_saved) : recent;

  return (
    <div ref={root} className="briefing-page">
      <section className="race-hero" aria-labelledby="hero-heading">
        <div className="hero-meta">
          <span>INDEPENDENT FORMULA 1 INTELLIGENCE</span>
          <span className="hero-edition">
            <span className="start-lights" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>{" "}
            BUILT FOR THE OBSESSED
          </span>
        </div>
        <div className="hero-stage">
          <div className="hero-red-plane" aria-hidden="true" />
          <span className="hero-outline" aria-hidden="true">
            F/W
          </span>
          <h1 id="hero-heading">
            <span>READ</span>
            <span>
              THE RACE<span className="title-period">.</span>
            </span>
          </h1>
          <div className="hero-car">
            <img
              src="/images/race-car.png"
              alt="Oracle Red Bull Racing Formula 1 car in profile"
              fetchpriority="high"
              width="2172"
              height="724"
            />
          </div>
          <span className="hero-side-label">
            LESS GUESSWORK. MORE RACECRAFT.
          </span>
          <span className="car-caption">
            THE MACHINE IS ONLY HALF THE STORY.
          </span>
        </div>
        <div className="hero-bottom">
          <p>
            Go beyond the chequered flag.
            <br />
            Every lap. Every decision. Every what-if.
          </p>
          <a className="race-button" href="#race-engineer">
            ENTER THE PIT WALL <span aria-hidden="true">↗</span>
          </a>
          <div className="hero-bottom-note">
            <span>TELEMETRY / STRATEGY / SIMULATION</span>
            <span>YOUR RACE ENGINEER. ON DEMAND.</span>
          </div>
        </div>
        <div className="hero-running-line" aria-hidden="true">
          <span>RACING IS MEASURED IN THOUSANDTHS.</span>
          <span>UNDERSTANDING IT CHANGES EVERYTHING.</span>
          <span>FRONTWING / F1 INTELLIGENCE</span>
        </div>
      </section>

      <section
        className="engineer-section"
        id="race-engineer"
        aria-labelledby="engineer-heading"
      >
        <div className="section-index">
          <span>01 / THE INVESTIGATION ROOM</span>
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("toggle-search-overlay"))
            }
          >
            SEARCH THE ARCHIVE <kbd>CTRL K</kbd>
          </button>
        </div>
        <div className="engineer-heading" data-reveal>
          <h2 id="engineer-heading">
            GOOD QUESTIONS.
            <br />
            <em>RACE-WINNING INSIGHT.</em>
          </h2>
          <p>
            Pick a driver. Question a decision.
            <br />
            Follow the evidence all the way
            <br />
            from the pit wall to the podium.
          </p>
        </div>
        <div className="engineer-workbench" data-reveal>
          <div className="workbench-title">
            <span>YOUR DIRECT LINE TO THE RACE ENGINEER</span>
            <span>RADIO / OPEN</span>
          </div>
          <QuestionBar
            variant="hero"
            placeholder="What do you want to know about the race?"
            onSubmit={submit}
            prefillValue={prefill}
          />
          <div className="question-examples">
            <span>START WITH A QUESTION</span>
            {QUESTIONS.map((q, i) => (
              <button
                key={q}
                onClick={() => {
                  setPrefill(q);
                  window.dispatchEvent(
                    new CustomEvent("frontwing-focus-input"),
                  );
                }}
              >
                <small>0{i + 1}</small>
                {q}
                <span aria-hidden="true">+</span>
              </button>
            ))}
          </div>
          <div className="workbench-footnote">
            <span>REAL TELEMETRY. EXPLAINED WITH EVIDENCE.</span>
            <span>ENTER TO INVESTIGATE</span>
          </div>
        </div>
      </section>

      <section
        className={`weekend-section ${hero ? "has-event" : ""}`}
        aria-label="Race weekend"
      >
        {hero ? (
          <>
            <div className="weekend-copy">
              <span className="eyebrow">
                THE RACE WEEKEND / ROUND {hero.round_number || ""}
              </span>
              <h2>{hero.event_name}</h2>
              <p>
                {hero.location}
                {hero.season ? ` / ${hero.season}` : ""}
              </p>
              {countdown && (
                <div
                  className="race-countdown"
                  aria-label="Time to next session"
                >
                  {countdown.map((value, i) => (
                    <div key={i}>
                      <strong>{String(value).padStart(2, "0")}</strong>
                      <span>{["DAYS", "HRS", "MIN", "SEC"][i]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {track?.trackPath ? (
              <svg
                className="weekend-track"
                viewBox={track.viewBox || "0 0 480 260"}
                role="img"
                aria-label={`${circuit?.name || hero.event_name} circuit from telemetry`}
              >
                <path className="track-outline" d={track.trackPath} />
                <path
                  className="track-trace"
                  d={track.trackPath}
                  pathLength="100"
                />
              </svg>
            ) : (
              <div className="track-pending">
                <span className="eyebrow">THE CIRCUIT</span>
                <strong>{hero.location?.split(",")[0]}</strong>
                <span>
                  TRACK GEOMETRY WILL APPEAR WHEN TELEMETRY IS AVAILABLE
                </span>
              </div>
            )}
            {!!hero.sessions?.length && (
              <div className="weekend-sessions">
                <div className="session-legend">
                  SESSION TIMETABLE <span>IST / TRACK LOCAL</span>
                </div>
                {hero.sessions.map((session, i) => (
                  <div key={`${session.name}-${i}`}>
                    <span>{session.name}</span>
                    <strong>{session.ist}</strong>
                    <small>{session.local}</small>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="feed-status">
            <span className="eyebrow">THE RACE WEEKEND</span>
            <p role="status">
              {feedLoading
                ? "Connecting to the race calendar…"
                : "Race calendar unavailable. Explore any past race in the investigation room."}
            </p>
            <button onClick={loadFeeds} disabled={feedLoading}>
              {feedLoading ? "CONNECTING" : "RETRY CONNECTION"}
              <span aria-hidden="true">+</span>
            </button>
          </div>
        )}
      </section>

      <section className="race-tools" aria-label="Explore the race tools">
        <Link to="/strategy" className="tool-row strategy-tool" data-reveal>
          <span className="tool-number">02</span>
          <div>
            <span className="eyebrow">THE STRATEGY ENGINEER</span>
            <h2>
              CHANGE
              <br />
              <em>THE OUTCOME.</em>
            </h2>
            <p>
              Move the pit stop. Switch the compound.
              <br />
              See what a different call could have changed.
            </p>
          </div>
          <div className="tool-art pit-art" aria-hidden="true">
            <span>
              BOX
              <br />
              BOX.
            </span>
            <div className="stint-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <span className="tool-link">
            OPEN STRATEGY ENGINEER <span aria-hidden="true">↗</span>
          </span>
        </Link>
        <Link to="/ghost-battle" className="tool-row ghost-tool" data-reveal>
          <span className="tool-number">03</span>
          <div>
            <span className="eyebrow">THE GHOST BATTLE</span>
            <h2>
              SAME TRACK.
              <br />
              <em>DIFFERENT LIMITS.</em>
            </h2>
            <p>
              Put the grid on the same piece of asphalt.
              <br />
              Replay authentic laps. Find the difference.
            </p>
          </div>
          <div className="tool-art ghost-art" aria-hidden="true">
            <span className="ghost-word">VS</span>
            <span className="ghost-lane lane-one" />
            <span className="ghost-lane lane-two" />
          </div>
          <span className="tool-link">
            ENTER THE 3D BATTLE <span aria-hidden="true">↗</span>
          </span>
        </Link>
      </section>

      <section className="archive-section" aria-labelledby="archive-heading">
        <div className="section-index">
          <span>04 / YOUR INVESTIGATIONS</span>
          <div className="history-tabs">
            <button
              aria-pressed={historyFilter === "recent"}
              onClick={() => setHistoryFilter("recent")}
            >
              RECENT
            </button>
            <button
              aria-pressed={historyFilter === "saved"}
              onClick={() => setHistoryFilter("saved")}
            >
              SAVED
            </button>
          </div>
        </div>
        <div className="archive-heading">
          <h2 id="archive-heading">
            PICK UP
            <br />
            <em>WHERE YOU LEFT OFF.</em>
          </h2>
          <span>
            {authenticated
              ? `${visibleHistory.length} INVESTIGATIONS`
              : "YOUR PERSONAL PADDOCK"}
          </span>
        </div>
        {!authenticated ? (
          <div className="archive-empty">
            <p>
              Your best questions deserve a second look.
              <br />
              Sign in to save, pin and organise your investigations.
            </p>
            <button
              className="race-button race-button-outline"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("frontwing-open-auth-modal"),
                )
              }
            >
              SIGN IN TO YOUR PADDOCK <span aria-hidden="true">↗</span>
            </button>
          </div>
        ) : historyLoading ? (
          <p role="status">Opening your archive…</p>
        ) : historyError ? (
          <p role="alert">
            {historyError} <button onClick={loadHistory}>Retry</button>
          </p>
        ) : visibleHistory.length ? (
          <div className="investigation-list">
            {visibleHistory.map((item, i) => (
              <div key={item.id}>
                <span>{String(i + 1).padStart(2, "0")}</span>
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
          <div className="archive-empty">
            <p>
              {historyFilter === "saved"
                ? "No saved investigations yet. Save a race analysis to find it here."
                : "Your archive starts with a question. Ask the race engineer above."}
            </p>
            <a href="#race-engineer">START AN INVESTIGATION +</a>
          </div>
        )}
      </section>

      <section
        className="editorial-section"
        aria-labelledby="editorial-heading"
      >
        <div className="section-index">
          <span>05 / FROM THE PADDOCK</span>
          <span>NEWS & RACE DEBRIEFS</span>
        </div>
        <div className="editorial-heading">
          <h2 id="editorial-heading">
            THE RACE
            <br />
            <em>KEEPS GOING.</em>
          </h2>
          <a
            href="https://www.formula1.com/en/latest"
            target="_blank"
            rel="noopener noreferrer"
          >
            OFFICIAL F1 NEWS ↗
          </a>
        </div>
        {stories.length ? (
          <div className="editorial-stories">
            {stories.map((story, i) => (
              <RaceStoryCard
                key={story.id || i}
                title={clean(story.title)}
                summary={clean(story.summary)}
                sourceUrl={story.source_url}
                sourceOutlet={story.source_outlet}
                keyMoments={story.keyMoments || []}
                variant="featured"
              />
            ))}
          </div>
        ) : (
          <p className="editorial-empty" role="status">
            {feedLoading
              ? "Opening the editorial feed…"
              : "The editorial feed is currently unavailable. Visit Formula 1 for the latest reporting."}
          </p>
        )}
        {!!insights.length && (
          <div className="editorial-insights">
            {insights.map((insight, i) => (
              <InsightCard
                key={insight.id || i}
                insight={{
                  ...insight,
                  headline: clean(insight.headline || insight.title),
                  source: insight.source_outlet || insight.source,
                }}
                variant="featured"
                showMetric={false}
              />
            ))}
          </div>
        )}
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
