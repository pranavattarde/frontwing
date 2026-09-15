import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  fetchHistory,
  deleteHistory,
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
  getMe
} from "@/lib/api";
import { FrontWingLogo } from "./FrontWingLogo";

export function Sidebar({ className }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(getCurrentUser());
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false); // Collapsed or expanded auth form when logged out
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Load user profile on mount
  useEffect(() => {
    let isMounted = true;
    getMe().then((profile) => {
      if (isMounted && profile) {
        setUser(profile);
      }
    });

    const handleAuthChanged = (e) => {
      setUser(e.detail);
      setAuthError("");
      loadUserHistory();
    };

    const handleUnauthorized = () => {
      setUser(null);
      setHistoryItems([]);
      setIsAuthOpen(true);
      setAuthError("Session expired. Please sign in.");
    };

    const handleOpenAuth = () => {
      setIsAuthOpen(true);
    };

    window.addEventListener("frontwing-auth-changed", handleAuthChanged);
    window.addEventListener("frontwing-auth-unauthorized", handleUnauthorized);
    window.addEventListener("frontwing-open-auth-modal", handleOpenAuth);

    return () => {
      isMounted = false;
      window.removeEventListener("frontwing-auth-changed", handleAuthChanged);
      window.removeEventListener("frontwing-auth-unauthorized", handleUnauthorized);
      window.removeEventListener("frontwing-open-auth-modal", handleOpenAuth);
    };
  }, []);

  // Fetch real investigations from GET /history
  const loadUserHistory = useCallback(async () => {
    const token = localStorage.getItem("frontwing_token");
    if (!token) {
      setHistoryItems([]);
      return;
    }

    setIsLoadingHistory(true);
    try {
      const data = await fetchHistory({ limit: 20 });
      if (data && Array.isArray(data.investigations)) {
        setHistoryItems(data.investigations);
      } else {
        setHistoryItems([]);
      }
    } catch (err) {
      console.warn("[Sidebar] History fetch warning:", err.message);
      setHistoryItems([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadUserHistory();
  }, [loadUserHistory, user]);

  // Handle Login / Register submit
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setIsSubmittingAuth(true);

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error("Email and password are required.");
      }

      if (authMode === "register") {
        await registerUser(email.trim(), password, name.trim());
      } else {
        await loginUser(email.trim(), password);
      }

      setEmail("");
      setPassword("");
      setName("");
      setIsAuthOpen(false);
    } catch (err) {
      setAuthError(err.message || "Authentication failed.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setHistoryItems([]);
    navigate("/");
  };

  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteHistory(id);
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.warn("[Sidebar] Delete history error:", err.message);
    }
  };

  const isCurrentRoute = (path) => {
    if (path === "/") return location.pathname === "/" || location.pathname.startsWith("/investigate");
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    const handleToggle = () => setIsMobileOpen((prev) => !prev);
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  return (
    <>

      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        />
      )}

      {/* Main Left Sidebar */}
      <aside
        className={cn(
          "w-64 sm:w-72 bg-surface-base border-r border-border-medium flex flex-col justify-between shrink-0 select-none z-40 transition-transform duration-200 ease-in-out",
          "fixed lg:static inset-y-0 left-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        {/* Top Header & Navigation Links */}
        <div className="flex flex-col gap-4 p-3.5 border-b border-border-subtle">
          {/* Logo Branding */}
          <div className="flex items-center justify-between">
            <div
              onClick={() => {
                navigate("/");
                setIsMobileOpen(false);
              }}
              className="cursor-pointer group flex items-center"
            >
              <FrontWingLogo variant="full" size="md" />
            </div>

            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden text-text-muted hover:text-text-primary p-1 rounded hover:bg-surface-raised"
            >
              ✕
            </button>
          </div>

          {/* New Investigation Button */}
          <button
            onClick={() => {
              navigate("/");
              setIsMobileOpen(false);
            }}
            className="btn-f1-primary w-full py-2.5 text-xs tracking-wider shadow-sm"
          >
            <span className="text-sm font-bold">+</span> NEW INVESTIGATION
          </button>

          {/* Quick Search Action in Sidebar */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("toggle-search-overlay"));
              setIsMobileOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-sm bg-surface-raised hover:bg-surface-overlay border border-border-subtle hover:border-border-strong text-text-muted hover:text-text-primary text-xs font-mono transition-all"
            aria-label="Open search palette"
          >
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-accent-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <span>SEARCH</span>
            </div>
            <kbd className="text-[10px] font-mono text-text-muted bg-surface-canvas px-1.5 py-0.5 rounded border border-border-subtle">
              ⌘K
            </kbd>
          </button>

          {/* Primary Navigation Links */}
          <div className="flex flex-col gap-1 text-xs font-mono">
            <button
              onClick={() => {
                navigate("/");
                setIsMobileOpen(false);
              }}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-sm transition-colors text-left",
                isCurrentRoute("/")
                  ? "bg-surface-raised text-text-primary border-l-2 border-accent-primary font-bold shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-raised/50"
              )}
            >
              <span>🏎️</span>
              <span>INVESTIGATION ROOM</span>
            </button>

            <button
              onClick={() => {
                navigate("/strategy");
                setIsMobileOpen(false);
              }}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-sm transition-colors text-left",
                isCurrentRoute("/strategy")
                  ? "bg-surface-raised text-text-primary border-l-2 border-accent-primary font-bold shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-raised/50"
              )}
            >
              <span>📊</span>
              <span>STRATEGY ENGINEER</span>
            </button>

            <button
              onClick={() => {
                navigate("/ghost-battle");
                setIsMobileOpen(false);
              }}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-sm transition-colors text-left",
                isCurrentRoute("/ghost-battle")
                  ? "bg-surface-raised text-text-primary border-l-2 border-accent-primary font-bold shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-raised/50"
              )}
            >
              <span>⚡</span>
              <span>GHOST BATTLE</span>
            </button>
          </div>
        </div>

        {/* Center: Real User Recent Investigation History */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3.5 gap-2">
          <div className="flex items-center justify-between text-mono-meta font-mono text-[10px] text-text-muted uppercase tracking-wider pb-1">
            <span>RECENT_INVESTIGATIONS</span>
            {isLoadingHistory && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-ping" />
            )}
          </div>

          {!user ? (
            <div className="p-3 rounded-md border border-border-subtle bg-surface-canvas text-center font-mono text-[11px] text-text-muted flex flex-col gap-2 my-auto">
              <span className="text-accent-primary font-bold">🔒 AUTHENTICATION REQUIRED</span>
              <p className="text-[10px] leading-relaxed text-text-secondary">
                Sign in to save and access your investigation history across sessions.
              </p>
              <button
                onClick={() => setIsAuthOpen(true)}
                className="text-[10px] text-accent-primary underline font-bold hover:text-text-primary"
              >
                Sign In / Register Below ↓
              </button>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="p-3 text-center font-mono text-[11px] text-text-muted my-auto">
              {isLoadingHistory ? (
                <span>Loading investigation logs...</span>
              ) : (
                <span className="italic">// No investigations recorded yet</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 overflow-y-auto">
              {historyItems.map((item) => {
                const questionText = item.question || "Race telemetry investigation";
                const isSelected = location.pathname === `/investigate/${item.id}`;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      navigate(`/investigate/${item.id}`);
                      setIsMobileOpen(false);
                    }}
                    className={cn(
                      "group flex items-center justify-between p-2.5 rounded border text-xs font-mono cursor-pointer transition-all duration-100",
                      isSelected
                        ? "border-accent-primary/40 bg-accent-primary/10 text-text-primary border-l-2 border-l-accent-primary font-semibold"
                        : "border-border-subtle bg-surface-canvas hover:bg-surface-raised hover:border-border-medium text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate text-[11px] leading-tight font-medium">
                        {questionText}
                      </span>
                      <span className="text-[9px] text-text-muted truncate mt-0.5 type-tabular">
                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Recent"}
                        {item.session ? ` • ${item.session}` : ""}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteHistory(e, item.id)}
                      title="Delete from history"
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-primary p-1 transition-opacity shrink-0 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom: Standard Chat App Auth Widget */}
        <div className="p-3 border-t border-border-subtle bg-surface-base/90 flex flex-col gap-2.5">
          {user ? (
            /* Logged In State */
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-accent-primary/20 border border-accent-primary/50 text-accent-primary font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : user.email.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-xs font-bold text-text-primary truncate">
                    {user.name || user.email.split("@")[0]}
                  </span>
                  <span className="font-mono text-[10px] text-text-muted truncate">
                    {user.email}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sign out of FrontWing"
                className="px-2 py-1 rounded bg-surface-raised hover:bg-accent-danger/20 border border-border-subtle hover:border-accent-danger/40 text-text-muted hover:text-accent-danger font-mono text-[10px] uppercase transition-colors shrink-0"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            /* Logged Out State: Minimal F1 Auth Widget */
            <div className="flex flex-col gap-2">
              {!isAuthOpen ? (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="btn-f1-primary w-full py-2 px-3 text-xs tracking-wider"
                >
                  SIGN IN / REGISTER
                </button>
              ) : (
                <form onSubmit={handleAuthSubmit} className="flex flex-col gap-2 font-mono">
                  {/* Mode Selector */}
                  <div className="flex border border-border-subtle rounded-sm overflow-hidden text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthError("");
                      }}
                      className={cn(
                        "flex-1 py-1 text-center font-bold transition-colors",
                        authMode === "login"
                          ? "bg-accent-primary text-text-primary"
                          : "bg-surface-raised text-text-muted hover:text-text-primary"
                      )}
                    >
                      LOGIN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setAuthError("");
                      }}
                      className={cn(
                        "flex-1 py-1 text-center font-bold transition-colors",
                        authMode === "register"
                          ? "bg-accent-primary text-text-primary"
                          : "bg-surface-raised text-text-muted hover:text-text-primary"
                      )}
                    >
                      REGISTER
                    </button>
                  </div>

                  {/* Name field (Register only) */}
                  {authMode === "register" && (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name (optional)"
                      className="input-f1 w-full px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted/60"
                    />
                  )}

                  {/* Email field */}
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@team.com"
                    className="input-f1 w-full px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted/60"
                  />

                  {/* Password field */}
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-f1 w-full px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted/60"
                  />

                  {/* Error Message */}
                  {authError && (
                    <span className="text-[10px] text-accent-danger bg-accent-danger/10 border border-accent-danger/30 px-2 py-1 rounded-sm">
                      {authError}
                    </span>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-1.5 mt-0.5">
                    <button
                      type="submit"
                      disabled={isSubmittingAuth}
                      className="btn-f1-primary flex-1 py-1.5 text-xs tracking-wider disabled:opacity-50"
                    >
                      {isSubmittingAuth ? "PROCESSING..." : authMode === "login" ? "SIGN IN" : "REGISTER"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAuthOpen(false);
                        setAuthError("");
                      }}
                      className="btn-f1-secondary px-2 py-1.5 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
