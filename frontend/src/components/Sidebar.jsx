import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  fetchHistory,
  deleteHistory,
  updateInvestigation,
  fetchGroups,
  createGroup,
  deleteGroup,
  renameGroup,
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
  const [groups, setGroups] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Menu & action states
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingItem, setDeletingItem] = useState(null);
  const [movingItemId, setMovingItemId] = useState(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Group inline editing / deleting
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [deletingGroupItem, setDeletingGroupItem] = useState(null);

  // Auth modal states
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuRef = useRef(null);

  // Helper to sort history items: pinned first, then newest timestamp
  const sortHistory = useCallback((items) => {
    return [...items].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
      const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }, []);

  // Fetch groups from GET /history/groups
  const loadGroups = useCallback(async () => {
    const token = localStorage.getItem("frontwing_token");
    if (!token) {
      setGroups([]);
      return;
    }
    try {
      const data = await fetchGroups();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("[Sidebar] Groups fetch error:", err.message);
      setGroups([]);
    }
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
      const [histData, grpData] = await Promise.all([
        fetchHistory({ limit: 50 }),
        fetchGroups()
      ]);
      if (histData && Array.isArray(histData.investigations)) {
        setHistoryItems(sortHistory(histData.investigations));
      } else {
        setHistoryItems([]);
      }
      setGroups(Array.isArray(grpData) ? grpData : []);
    } catch (err) {
      console.warn("[Sidebar] History fetch warning:", err.message);
      setHistoryItems([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [sortHistory]);

  // Close context menus on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
        setMovingItemId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveMenuId(null);
        setMovingItemId(null);
        setEditingId(null);
        setDeletingItem(null);
        setDeletingGroupItem(null);
        setIsCreatingGroup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Load user profile and set up real-time event listeners on mount
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
      setGroups([]);
      setIsAuthOpen(true);
      setAuthError("Session expired. Please sign in.");
    };

    const handleOpenAuth = () => {
      setIsAuthOpen(true);
    };

    // Real-time optimistic update: immediately insert newly initiated chat
    const handleChatCreated = (e) => {
      const newItem = e.detail;
      if (!newItem || !newItem.id) return;
      setHistoryItems((prev) => {
        if (prev.some((it) => it.id === newItem.id)) return prev;
        return sortHistory([newItem, ...prev]);
      });
    };

    // Real-time sync update: replace optimistic temp item with real backend data
    const handleChatSynced = (e) => {
      const { tempId, realItem } = e.detail || {};
      if (!realItem) return;
      setHistoryItems((prev) => {
        const idx = prev.findIndex((it) => it.id === tempId || it.id === realItem.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...realItem };
          return sortHistory(next);
        }
        return sortHistory([realItem, ...prev]);
      });
      loadGroups();
    };

    // History refresh trigger
    const handleHistoryUpdated = () => {
      loadUserHistory();
    };

    window.addEventListener("frontwing-auth-changed", handleAuthChanged);
    window.addEventListener("frontwing-auth-unauthorized", handleUnauthorized);
    window.addEventListener("frontwing-open-auth-modal", handleOpenAuth);
    window.addEventListener("frontwing-chat-created", handleChatCreated);
    window.addEventListener("frontwing-chat-synced", handleChatSynced);
    window.addEventListener("frontwing-history-updated", handleHistoryUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("frontwing-auth-changed", handleAuthChanged);
      window.removeEventListener("frontwing-auth-unauthorized", handleUnauthorized);
      window.removeEventListener("frontwing-open-auth-modal", handleOpenAuth);
      window.removeEventListener("frontwing-chat-created", handleChatCreated);
      window.removeEventListener("frontwing-chat-synced", handleChatSynced);
      window.removeEventListener("frontwing-history-updated", handleHistoryUpdated);
    };
  }, [loadUserHistory, sortHistory, loadGroups]);

  useEffect(() => {
    loadUserHistory();
  }, [loadUserHistory, user]);

  // Auth Submit
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
    setGroups([]);
    navigate("/");
  };

  // --- Investigation Actions (Pin, Rename, Delete, Move) ---

  const handleTogglePin = async (e, item) => {
    e.stopPropagation();
    setActiveMenuId(null);
    const nextPinned = !item.pinned;

    // Optimistic UI update
    setHistoryItems((prev) =>
      sortHistory(prev.map((it) => (it.id === item.id ? { ...it, pinned: nextPinned } : it)))
    );

    try {
      await updateInvestigation(item.id, { pinned: nextPinned });
    } catch (err) {
      console.error("[Sidebar] Failed to update pin status:", err);
      loadUserHistory();
    }
  };

  const handleStartRename = (e, item) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setEditingId(item.id);
    setEditTitle(item.display_title || item.question || "");
  };

  const handleSaveRename = async (e, item) => {
    e?.stopPropagation();
    const clean = editTitle.trim();
    if (!clean) {
      setEditingId(null);
      return;
    }

    // Optimistic UI update
    setHistoryItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, display_title: clean } : it))
    );
    setEditingId(null);

    try {
      await updateInvestigation(item.id, { display_title: clean });
    } catch (err) {
      console.error("[Sidebar] Failed to rename investigation:", err);
      loadUserHistory();
    }
  };

  const handleCancelRename = (e) => {
    e?.stopPropagation();
    setEditingId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    const { id } = deletingItem;

    // Optimistic UI update
    setHistoryItems((prev) => prev.filter((it) => it.id !== id));
    setDeletingItem(null);

    try {
      await deleteHistory(id);
      localStorage.removeItem(`frontwing_investigation_${id}`);
      if (location.pathname === `/investigate/${id}`) {
        navigate("/");
      }
      loadGroups();
    } catch (err) {
      console.error("[Sidebar] Failed to delete investigation:", err);
      loadUserHistory();
    }
  };

  const handleMoveToGroup = async (e, item, targetGroupId) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setMovingItemId(null);

    const targetGroup = groups.find((g) => g.id === targetGroupId);

    // Optimistic UI update
    setHistoryItems((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? {
              ...it,
              group_id: targetGroupId || null,
              group_name: targetGroup ? targetGroup.name : null
            }
          : it
      )
    );

    try {
      await updateInvestigation(item.id, { group_id: targetGroupId || null });
      loadGroups();
    } catch (err) {
      console.error("[Sidebar] Failed to move investigation:", err);
      loadUserHistory();
    }
  };

  const handleCreateGroupAndMove = async (e, item) => {
    e.stopPropagation();
    const trimmed = newGroupName.trim();
    if (!trimmed) return;

    try {
      const created = await createGroup(trimmed);
      setNewGroupName("");
      setIsCreatingGroup(false);
      setGroups((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));

      if (item) {
        await handleMoveToGroup(e, item, created.id);
      }
    } catch (err) {
      console.error("[Sidebar] Failed to create group:", err);
    }
  };

  // --- Group Management (Create, Rename, Delete) ---

  const handleToggleGroupCollapse = (groupId) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleConfirmDeleteGroup = async () => {
    if (!deletingGroupItem) return;
    const { id } = deletingGroupItem;

    // Optimistic: unassign group from local items and remove group
    setHistoryItems((prev) =>
      prev.map((it) => (it.group_id === id ? { ...it, group_id: null, group_name: null } : it))
    );
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setDeletingGroupItem(null);

    try {
      await deleteGroup(id);
    } catch (err) {
      console.error("[Sidebar] Failed to delete group:", err);
      loadUserHistory();
    }
  };

  const handleSaveRenameGroup = async (groupId) => {
    const clean = editingGroupName.trim();
    if (!clean) {
      setEditingGroupId(null);
      return;
    }

    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name: clean } : g))
    );
    setEditingGroupId(null);

    try {
      await renameGroup(groupId, clean);
    } catch (err) {
      console.error("[Sidebar] Failed to rename group:", err);
      loadGroups();
    }
  };

  const isCurrentRoute = (path) => location.pathname === path;

  // Split history into Pinned, Grouped, and Ungrouped
  const pinnedItems = historyItems.filter((it) => it.pinned);
  const unpinnedItems = historyItems.filter((it) => !it.pinned);

  // Group unpinned items by group_id
  const groupedItemsMap = {};
  const ungroupedItems = [];

  unpinnedItems.forEach((it) => {
    if (it.group_id) {
      if (!groupedItemsMap[it.group_id]) {
        groupedItemsMap[it.group_id] = [];
      }
      groupedItemsMap[it.group_id].push(it);
    } else {
      ungroupedItems.push(it);
    }
  });

  // Render an individual history item
  const renderHistoryItem = (item) => {
    const isSelected = location.pathname === `/investigate/${item.id}`;
    const isEditing = editingId === item.id;
    const isMenuOpen = activeMenuId === item.id;
    const isMoving = movingItemId === item.id;
    const displayTitle = item.display_title || item.question || "Race telemetry investigation";

    return (
      <div
        key={item.id}
        className="relative group"
        onClick={() => {
          if (!isEditing) {
            navigate(`/investigate/${item.id}`);
            setIsMobileOpen(false);
          }
        }}
      >
        <div
          className={cn(
            "flex items-center justify-between p-2.5 rounded border text-xs font-mono cursor-pointer transition-all duration-100",
            isSelected
              ? "border-accent-primary/50 bg-accent-primary/10 text-text-primary border-l-2 border-l-accent-primary font-semibold"
              : "border-border-subtle bg-surface-canvas hover:bg-surface-raised hover:border-border-medium text-text-secondary hover:text-text-primary"
          )}
        >
          <div className="flex flex-col min-w-0 pr-2 flex-1">
            {isEditing ? (
              <div
                className="flex items-center gap-1.5 w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveRename(e, item);
                    if (e.key === "Escape") handleCancelRename(e);
                  }}
                  autoFocus
                  className="bg-surface-base border border-accent-primary text-text-primary text-[11px] px-2 py-0.5 rounded w-full outline-none"
                />
                <button
                  onClick={(e) => handleSaveRename(e, item)}
                  title="Save title"
                  className="px-1.5 py-0.5 rounded bg-accent-primary text-white text-[10px] hover:bg-accent-primary/80"
                >
                  ✓
                </button>
                <button
                  onClick={handleCancelRename}
                  title="Cancel"
                  className="px-1.5 py-0.5 rounded border border-border-subtle text-text-muted text-[10px] hover:text-text-primary"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 min-w-0">
                  {item.pinned && (
                    <span className="text-[10px] text-accent-primary shrink-0" title="Pinned to top">
                      📌
                    </span>
                  )}
                  <span className="truncate text-[11px] leading-tight font-medium text-text-primary">
                    {displayTitle}
                  </span>
                </div>
                <span className="text-[9px] text-text-muted truncate mt-0.5 type-tabular">
                  {item.timestamp
                    ? new Date(item.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric"
                      })
                    : "Recent"}
                  {item.session ? ` • ${item.session}` : ""}
                  {item.group_name && !item.pinned ? ` • 📁 ${item.group_name}` : ""}
                </span>
              </>
            )}
          </div>

          {/* Three-dot context menu trigger button */}
          {!isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(isMenuOpen ? null : item.id);
                setMovingItemId(null);
              }}
              title="Chat Options"
              className={cn(
                "p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors shrink-0 text-sm font-bold",
                isMenuOpen ? "opacity-100 text-text-primary bg-surface-raised" : "opacity-0 group-hover:opacity-100"
              )}
            >
              ⋮
            </button>
          )}
        </div>

        {/* Three-dot Context Dropdown Menu */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-2 top-8 z-50 w-48 rounded border border-border-subtle bg-surface-raised shadow-xl py-1 text-xs font-mono animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Pin / Unpin */}
            <button
              onClick={(e) => handleTogglePin(e, item)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-text-secondary hover:text-text-primary hover:bg-surface-canvas transition-colors"
            >
              <span>{item.pinned ? "📌" : "📍"}</span>
              <span>{item.pinned ? "Unpin Chat" : "Pin to Top"}</span>
            </button>

            {/* Rename */}
            <button
              onClick={(e) => handleStartRename(e, item)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-text-secondary hover:text-text-primary hover:bg-surface-canvas transition-colors"
            >
              <span>✏️</span>
              <span>Rename</span>
            </button>

            {/* Move to Group/Folder */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMovingItemId(isMoving ? null : item.id);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-left text-text-secondary hover:text-text-primary hover:bg-surface-canvas transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>📁</span>
                  <span>Move to Group</span>
                </div>
                <span className="text-[9px] text-text-muted">▶</span>
              </button>

              {/* Group Submenu */}
              {isMoving && (
                <div className="pl-4 pr-1 py-1 border-t border-b border-border-subtle bg-surface-canvas flex flex-col gap-1 max-h-48 overflow-y-auto">
                  <span className="text-[9px] uppercase tracking-wider text-text-muted font-bold px-1">
                    Select Group
                  </span>

                  {/* Move to Ungrouped */}
                  {item.group_id && (
                    <button
                      onClick={(e) => handleMoveToGroup(e, item, null)}
                      className="text-left text-[11px] px-2 py-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
                    >
                      ✕ Remove from group
                    </button>
                  )}

                  {/* Existing groups list */}
                  {groups.map((grp) => (
                    <button
                      key={grp.id}
                      onClick={(e) => handleMoveToGroup(e, item, grp.id)}
                      className={cn(
                        "text-left text-[11px] px-2 py-1 rounded transition-colors flex items-center justify-between",
                        item.group_id === grp.id
                          ? "bg-accent-primary/10 text-accent-primary font-bold"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"
                      )}
                    >
                      <span className="truncate">📁 {grp.name}</span>
                      {item.group_id === grp.id && <span>✓</span>}
                    </button>
                  ))}

                  {/* Create New Group Inline */}
                  {isCreatingGroup ? (
                    <div
                      className="flex items-center gap-1 p-1 mt-1 border-t border-border-subtle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        placeholder="Group name..."
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateGroupAndMove(e, item);
                          if (e.key === "Escape") setIsCreatingGroup(false);
                        }}
                        autoFocus
                        className="bg-surface-base border border-border-subtle text-text-primary text-[10px] px-1.5 py-0.5 rounded w-full outline-none focus:border-accent-primary"
                      />
                      <button
                        onClick={(e) => handleCreateGroupAndMove(e, item)}
                        className="px-1.5 py-0.5 rounded bg-accent-primary text-white text-[10px]"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCreatingGroup(true);
                      }}
                      className="text-left text-[10px] text-accent-primary font-semibold hover:underline px-2 py-1 mt-1 border-t border-border-subtle"
                    >
                      + New Group...
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-border-subtle my-1" />

            {/* Delete (Requires Confirmation) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(null);
                setDeletingItem(item);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-accent-danger hover:bg-accent-danger/10 transition-colors"
            >
              <span>🗑️</span>
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-sm bg-surface-raised border border-border-subtle text-text-primary shadow-md"
        aria-label="Toggle Navigation"
      >
        <span className="text-sm">☰</span>
      </button>

      {/* Main Sidebar Shell */}
      <aside
        className={cn(
          "w-64 h-screen border-r border-border-subtle bg-surface-base flex flex-col justify-between shrink-0 z-40 transition-transform duration-200",
          "fixed top-0 left-0 lg:static lg:translate-x-0",
          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          className
        )}
      >
        {/* Top: Branding & Primary Navigation */}
        <div className="flex flex-col border-b border-border-subtle">
          <div className="p-4 flex items-center justify-between">
            <FrontWingLogo />
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden text-text-muted hover:text-text-primary p-1"
            >
              ✕
            </button>
          </div>

          <div className="px-3 pb-3 flex flex-col gap-1 text-xs font-mono">
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
              <span>🏁</span>
              <span>Briefing Room</span>
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
              <span>Strategy Engineer</span>
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
              <span>Ghost Battle</span>
            </button>
          </div>
        </div>

        {/* Center: Real User Investigation History & Groups */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3 gap-2">
          {/* History Header & Add Group Button */}
          <div className="flex items-center justify-between text-mono-meta font-mono text-[10px] text-text-muted tracking-wider pb-1">
            <div className="flex items-center gap-1.5">
              <span>Investigations</span>
              {isLoadingHistory && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-ping" />
              )}
            </div>

            {user && (
              <button
                onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                title="Create Group"
                className="hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded border border-border-subtle bg-surface-canvas hover:bg-surface-raised transition-colors"
              >
                + Group
              </button>
            )}
          </div>

          {/* Inline Create Group Box */}
          {isCreatingGroup && (
            <div className="p-2 border border-border-subtle rounded bg-surface-raised flex flex-col gap-1.5 mb-1 font-mono text-xs animate-slide-down">
              <span className="text-[10px] font-bold text-text-secondary">New Group</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. Monza 2024, Telemetry Drills..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateGroupAndMove(e, null);
                    if (e.key === "Escape") setIsCreatingGroup(false);
                  }}
                  autoFocus
                  className="flex-1 bg-surface-base border border-border-subtle text-text-primary text-[11px] px-2 py-1 rounded outline-none focus:border-accent-primary"
                />
                <button
                  onClick={(e) => handleCreateGroupAndMove(e, null)}
                  className="px-2 py-1 rounded bg-accent-primary text-white text-[11px] font-semibold hover:bg-accent-primary/80"
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreatingGroup(false)}
                  className="px-2 py-1 rounded border border-border-subtle text-text-muted hover:text-text-primary text-[11px]"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {!user ? (
            <div className="p-3 rounded-md border border-border-subtle bg-surface-canvas text-center font-mono text-[11px] text-text-muted flex flex-col gap-2 my-auto">
              <span className="text-accent-primary font-bold">🔒 Sign In Required</span>
              <p className="text-[10px] leading-relaxed text-text-secondary">
                Sign in to save and access your telemetry investigations, pin queries, and organize into groups.
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
            <div className="flex flex-col gap-3 overflow-y-auto pr-1">
              {/* SECTION 1: PINNED CHATS */}
              {pinnedItems.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-accent-primary uppercase tracking-wider font-semibold px-1">
                    <span>📌</span>
                    <span>Pinned Chats</span>
                    <span className="text-[9px] text-text-muted font-normal">({pinnedItems.length})</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {pinnedItems.map(renderHistoryItem)}
                  </div>
                </div>
              )}

              {/* SECTION 2: GROUPS / FOLDERS */}
              {groups.length > 0 && (
                <div className="flex flex-col gap-2">
                  {groups.map((group) => {
                    const isCollapsed = !!collapsedGroups[group.id];
                    const itemsInGroup = groupedItemsMap[group.id] || [];
                    const isEditingGroup = editingGroupId === group.id;

                    return (
                      <div key={group.id} className="flex flex-col rounded border border-border-subtle/70 bg-surface-canvas/50">
                        {/* Group Header */}
                        <div
                          onClick={() => handleToggleGroupCollapse(group.id)}
                          className="flex items-center justify-between p-2 cursor-pointer hover:bg-surface-raised rounded-t transition-colors text-xs font-mono"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-[9px] text-text-muted transition-transform">
                              {isCollapsed ? "▶" : "▼"}
                            </span>
                            <span className="text-xs">📁</span>
                            {isEditingGroup ? (
                              <div
                                className="flex items-center gap-1 flex-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={editingGroupName}
                                  onChange={(e) => setEditingGroupName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveRenameGroup(group.id);
                                    if (e.key === "Escape") setEditingGroupId(null);
                                  }}
                                  autoFocus
                                  className="bg-surface-base border border-accent-primary text-text-primary text-[11px] px-1.5 py-0.5 rounded w-full outline-none"
                                />
                                <button
                                  onClick={() => handleSaveRenameGroup(group.id)}
                                  className="text-[10px] px-1 py-0.5 bg-accent-primary text-white rounded"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => setEditingGroupId(null)}
                                  className="text-[10px] px-1 py-0.5 border border-border-subtle rounded text-text-muted"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <span className="truncate text-[11px] font-semibold text-text-primary">
                                {group.name}
                              </span>
                            )}
                          </div>

                          {!isEditingGroup && (
                            <div
                              className="flex items-center gap-1 shrink-0 ml-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[9px] text-text-muted font-mono bg-surface-raised px-1.5 py-0.5 rounded">
                                {itemsInGroup.length}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingGroupId(group.id);
                                  setEditingGroupName(group.name);
                                }}
                                title="Rename group"
                                className="opacity-0 group-hover:opacity-100 hover:text-text-primary text-[10px] text-text-muted px-1"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => setDeletingGroupItem(group)}
                                title="Delete group (ungroups chats)"
                                className="hover:text-accent-danger text-[10px] text-text-muted px-1"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Group Children */}
                        {!isCollapsed && (
                          <div className="flex flex-col gap-1 p-1.5 pt-0 border-t border-border-subtle/30">
                            {itemsInGroup.length === 0 ? (
                              <div className="py-2 px-3 text-[10px] text-text-muted italic">
                                No chats in this group
                              </div>
                            ) : (
                              itemsInGroup.map(renderHistoryItem)
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SECTION 3: UNGROUPED / RECENT */}
              {(ungroupedItems.length > 0 || groups.length === 0) && (
                <div className="flex flex-col gap-1">
                  {groups.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted uppercase tracking-wider font-semibold px-1 pt-1">
                      <span>📂</span>
                      <span>Ungrouped</span>
                      <span className="text-[9px] font-normal">({ungroupedItems.length})</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    {ungroupedItems.map(renderHistoryItem)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal (Item) */}
        {deletingItem && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setDeletingItem(null)}
          >
            <div
              className="bg-surface-raised border border-border-subtle rounded-lg max-w-sm w-full p-4 flex flex-col gap-3 font-mono shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-accent-danger font-bold text-sm">
                <span>⚠️</span>
                <span>Confirm Deletion</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Are you sure you want to delete this investigation? This action cannot be undone.
              </p>
              <div className="p-2.5 rounded bg-surface-base border border-border-subtle text-xs text-text-primary line-clamp-2 italic">
                "{deletingItem.display_title || deletingItem.question}"
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                <button
                  onClick={() => setDeletingItem(null)}
                  className="px-3 py-1.5 rounded text-xs text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-surface-canvas transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-3 py-1.5 rounded text-xs bg-accent-danger text-white hover:bg-accent-danger/80 transition-colors font-bold"
                >
                  Delete Investigation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal (Group) */}
        {deletingGroupItem && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setDeletingGroupItem(null)}
          >
            <div
              className="bg-surface-raised border border-border-subtle rounded-lg max-w-sm w-full p-4 flex flex-col gap-3 font-mono shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-accent-danger font-bold text-sm">
                <span>⚠️</span>
                <span>Delete Group</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Delete group <strong className="text-text-primary">"{deletingGroupItem.name}"</strong>? Chats inside will not be deleted; they will be moved to Ungrouped.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                <button
                  onClick={() => setDeletingGroupItem(null)}
                  className="px-3 py-1.5 rounded text-xs text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-surface-canvas transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteGroup}
                  className="px-3 py-1.5 rounded text-xs bg-accent-danger text-white hover:bg-accent-danger/80 transition-colors font-bold"
                >
                  Delete Group
                </button>
              </div>
            </div>
          </div>
        )}

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
                  <span className="text-xs font-semibold text-text-primary truncate">
                    {user.name || "Pit Wall Engineer"}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted truncate">
                    {user.email}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded border border-border-subtle text-text-muted hover:text-accent-danger hover:border-accent-danger/40 transition-colors text-xs font-mono"
              >
                Sign Out
              </button>
            </div>
          ) : (
            /* Logged Out / Collapsible Auth State */
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsAuthOpen(!isAuthOpen)}
                className="btn-f1-primary w-full py-2 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2"
              >
                <span>🔑</span>
                <span>Sign In / Register</span>
                <span className="text-[10px] ml-auto">{isAuthOpen ? "▲" : "▼"}</span>
              </button>

              {isAuthOpen && (
                <form
                  onSubmit={handleAuthSubmit}
                  className="flex flex-col gap-2 p-2.5 rounded border border-border-subtle bg-surface-canvas font-mono text-xs animate-slide-down"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
                      {authMode === "login" ? "Account Sign In" : "New Account"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode(authMode === "login" ? "register" : "login");
                        setAuthError("");
                      }}
                      className="text-[10px] text-accent-primary underline hover:text-text-primary"
                    >
                      {authMode === "login" ? "Need account?" : "Already registered?"}
                    </button>
                  </div>

                  {authError && (
                    <div className="p-1.5 rounded bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-[10px]">
                      {authError}
                    </div>
                  )}

                  {authMode === "register" && (
                    <input
                      type="text"
                      placeholder="Engineer Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-surface-base border border-border-subtle text-text-primary text-[11px] px-2 py-1 rounded outline-none focus:border-accent-primary"
                    />
                  )}

                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-surface-base border border-border-subtle text-text-primary text-[11px] px-2 py-1 rounded outline-none focus:border-accent-primary"
                  />

                  <input
                    type="password"
                    placeholder="Password (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-surface-base border border-border-subtle text-text-primary text-[11px] px-2 py-1 rounded outline-none focus:border-accent-primary"
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="w-full mt-1 py-1.5 rounded bg-accent-primary text-white text-[11px] font-bold tracking-wider hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isSubmittingAuth ? "Processing..." : authMode === "login" ? "Sign In" : "Register"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
