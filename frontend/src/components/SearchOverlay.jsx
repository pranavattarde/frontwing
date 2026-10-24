import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchHistory } from "@/lib/api";

const navigation = [
  {
    label: "The briefing",
    detail: "Race engineer & investigations",
    path: "/",
  },
  {
    label: "Strategy engineer",
    detail: "Pit stops, tyre choices & what-if simulations",
    path: "/strategy",
  },
  {
    label: "Ghost battle",
    detail: "Compare authentic flying laps in 3D",
    path: "/ghost-battle",
  },
];
const questions = [
  "Why did Hamilton win the 2024 British Grand Prix?",
  "Compare Norris and Verstappen at the 2024 Dutch GP",
];

export function SearchOverlay({ isOpen, onClose }) {
  const navigate = useNavigate();
  const panel = useRef(null);
  const input = useRef(null);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [active, setActive] = useState(0);
  const signedIn = !!localStorage.getItem("frontwing_token");
  const query = value.trim().toLowerCase();
  const entries = [
    ...navigation.filter((item) =>
      `${item.label} ${item.detail}`.toLowerCase().includes(query),
    ),
    ...history
      .filter((item) =>
        `${item.display_title || item.question}`.toLowerCase().includes(query),
      )
      .map((item) => ({
        label: item.display_title || item.question,
        detail: "Your investigation",
        path:
          item.investigation_metadata?.type === "strategy" ||
          item.session === "Strategy" ||
          item.provider_used === "strategy-planner" ||
          item.type === "strategy" ||
          item.conversation_id?.startsWith("strat-")
            ? `/strategy?id=${item.id}`
            : `/investigate/${item.id}`,
      })),
  ];
  const ask = (question) => {
    onClose();
    navigate(`/?q=${encodeURIComponent(question)}`);
    window.dispatchEvent(
      new CustomEvent("frontwing-prefill-query", {
        detail: { query: question },
      }),
    );
  };
  const open = (entry) => {
    onClose();
    navigate(entry.path);
  };

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    setValue("");
    setActive(0);
    setHistory([]);
    setHistoryError(false);
    input.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let mounted = true;
    if (signedIn) {
      setLoading(true);
      fetchHistory({ limit: 50 })
        .then((data) => {
          if (mounted) setHistory(data?.investigations || []);
        })
        .catch(() => {
          if (mounted) setHistoryError(true);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }
    const key = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = [
        ...panel.current.querySelectorAll("button, input, a[href]"),
      ].filter((el) => !el.disabled);
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      mounted = false;
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [isOpen, signedIn, onClose]);

  if (!isOpen) return null;
  return (
    <div className="search-layer">
      <button
        className="search-backdrop"
        aria-label="Close search"
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        ref={panel}
        className="search-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-heading"
      >
        <div className="search-panel-header">
          <h2 id="search-heading">FIND YOUR NEXT INSIGHT.</h2>
          <button onClick={onClose} aria-label="Close search dialog">
            ESC ×
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (entries[active]) open(entries[active]);
            else if (value.trim()) ask(value.trim());
          }}
        >
          <label htmlFor="paddock-search" className="sr-only">
            Search pages and investigations
          </label>
          <input
            id="paddock-search"
            ref={input}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((i) => (i + 1) % Math.max(1, entries.length));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive(
                  (i) =>
                    (i - 1 + Math.max(1, entries.length)) %
                    Math.max(1, entries.length),
                );
              }
            }}
            placeholder="Search pages, investigations or ask a question…"
            autoComplete="off"
          />
        </form>
        <div className="search-results">
          <span className="eyebrow">
            {value ? "MATCHING RESULTS" : "GO STRAIGHT TO"}
          </span>
          {entries.map((entry, i) => (
            <button
              key={entry.path}
              className={i === active ? "active" : ""}
              onClick={() => open(entry)}
            >
              <span>
                <strong>{entry.label}</strong>
                <small>{entry.detail}</small>
              </span>
              <span aria-hidden="true">↗</span>
            </button>
          ))}
          {!entries.length && <p>No matching pages or saved investigations.</p>}
          {value.trim() && (
            <button className="search-ask" onClick={() => ask(value.trim())}>
              <span>
                <strong>Ask the race engineer</strong>
                <small>{value}</small>
              </span>
              <span aria-hidden="true">+</span>
            </button>
          )}
          {loading && <p role="status">Opening your investigation archive…</p>}
          {historyError && (
            <p role="status">Your saved archive is currently unavailable.</p>
          )}
          {!query && (
            <>
              <span className="eyebrow search-suggestions-label">
                QUESTIONS TO EXPLORE
              </span>
              {questions.map((question) => (
                <button key={question} onClick={() => ask(question)}>
                  <span>
                    <small>{question}</small>
                  </span>
                  <span aria-hidden="true">+</span>
                </button>
              ))}
            </>
          )}
        </div>
        <div className="search-panel-footer">
          <span>↑ ↓ TO NAVIGATE / ENTER TO OPEN</span>
          <span>FRONTWING / PADDOCK SEARCH</span>
        </div>
      </section>
    </div>
  );
}
