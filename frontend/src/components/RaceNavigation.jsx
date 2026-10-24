import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FrontWingLogo } from "./FrontWingLogo";
import { Sidebar } from "./Sidebar";
import { getCurrentUser } from "@/lib/api";

const links = [
  ["/", "The briefing"],
  ["/strategy", "Strategy engineer"],
  ["/ghost-battle", "Ghost battle"],
];

export function RaceNavigation() {
  const location = useLocation();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(getCurrentUser());
  const [motionPaused, setMotionPaused] = useState(false);
  const drawer = useRef(null);
  const previousFocus = useRef(null);
  const closeArchive = useCallback(() => setArchiveOpen(false), []);

  useEffect(() => {
    setMenuOpen(false);
    setArchiveOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const auth = () => setUser(getCurrentUser());
    const openAuth = () => {
      setArchiveOpen(true);
      setMenuOpen(false);
    };
    const toggleArchive = () => setArchiveOpen((value) => !value);
    const archiveShortcut = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "b" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName)
      ) {
        event.preventDefault();
        setArchiveOpen((value) => !value);
      }
    };
    window.addEventListener("frontwing-auth-changed", auth);
    window.addEventListener("frontwing-auth-unauthorized", auth);
    window.addEventListener("frontwing-open-auth-modal", openAuth);
    window.addEventListener("frontwing-toggle-sidebar", toggleArchive);
    window.addEventListener("keydown", archiveShortcut);
    window.addEventListener("toggle-search-overlay", closeArchive);
    window.addEventListener("toggle-command-palette", closeArchive);
    return () => {
      window.removeEventListener("frontwing-auth-changed", auth);
      window.removeEventListener("frontwing-auth-unauthorized", auth);
      window.removeEventListener("frontwing-open-auth-modal", openAuth);
      window.removeEventListener("frontwing-toggle-sidebar", toggleArchive);
      window.removeEventListener("keydown", archiveShortcut);
      window.removeEventListener("toggle-search-overlay", closeArchive);
      window.removeEventListener("toggle-command-palette", closeArchive);
    };
  }, [closeArchive]);
  useEffect(() => {
    document.documentElement.dataset.motion = motionPaused
      ? "paused"
      : "running";
    window.dispatchEvent(
      new CustomEvent("frontwing-motion-changed", {
        detail: { paused: motionPaused },
      }),
    );
  }, [motionPaused]);
  useEffect(() => {
    if (!archiveOpen) return;
    previousFocus.current = document.activeElement;
    drawer.current?.querySelector("button")?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") setArchiveOpen(false);
      if (event.key !== "Tab") return;
      const focusable = [
        ...drawer.current.querySelectorAll(
          'button, a[href], input, select, textarea, [tabindex="0"]',
        ),
      ].filter((el) => el.getClientRects().length && !el.disabled);
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
    document.addEventListener("keydown", onKeyDown);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = oldOverflow;
      previousFocus.current?.focus();
    };
  }, [archiveOpen]);

  return (
    <>
      <a className="skip-content" href="#main-content">
        Skip to content
      </a>
      <header className="race-navigation">
        <NavLink className="brand-link" to="/" aria-label="FrontWing home">
          <FrontWingLogo size={32} />
        </NavLink>
        <nav className="desktop-navigation" aria-label="Main navigation">
          {links.map(([to, label], i) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <small>0{i + 1}</small>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="navigation-actions">
          <button
            className="motion-control"
            onClick={() => setMotionPaused((v) => !v)}
            aria-pressed={motionPaused}
            aria-label={
              motionPaused ? "Resume visual motion" : "Pause visual motion"
            }
          >
            {motionPaused ? "PLAY" : "PAUSE"}
            <span aria-hidden="true">{motionPaused ? "▷" : "Ⅱ"}</span>
          </button>
          <button
            className="archive-trigger"
            onClick={() => setArchiveOpen(true)}
          >
            Archive <span aria-hidden="true">+</span>
          </button>
          <button
            className="account-trigger"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("frontwing-open-auth-modal"))
            }
          >
            {user ? user.name?.split(" ")[0] || "Account" : "Sign in"}
          </button>
          <button
            className="mobile-menu-trigger"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>
      {menuOpen && (
        <nav
          className="mobile-navigation"
          id="mobile-navigation"
          aria-label="Mobile navigation"
        >
          {links.map(([to, label], i) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <small>0{i + 1}</small>
              {label}
            </NavLink>
          ))}
          <button
            onClick={() => {
              setMenuOpen(false);
              setArchiveOpen(true);
            }}
          >
            Your investigation archive
          </button>
          <button
            onClick={() => setMotionPaused((value) => !value)}
            aria-pressed={motionPaused}
          >
            {motionPaused ? "Resume visual motion" : "Pause visual motion"}
          </button>
        </nav>
      )}
      <div className="archive-layer" hidden={!archiveOpen}>
        <button
          className="archive-backdrop"
          aria-label="Close archive"
          tabIndex={-1}
          onClick={() => setArchiveOpen(false)}
        />
        <section
          ref={drawer}
          className="archive-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Investigation archive and account"
        >
          <div className="archive-title">
            <span>YOUR PADDOCK / ARCHIVE</span>
            <button
              onClick={() => setArchiveOpen(false)}
              aria-label="Close investigation archive"
            >
              CLOSE ×
            </button>
          </div>
          <Sidebar onNavigate={closeArchive} />
        </section>
      </div>
    </>
  );
}
