import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn, generateId } from "@/lib/utils";
export function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const runPaletteQuery = (queryText) => {
    onClose();
    const generatedId = generateId();
    const newInvestigation = {
      id: generatedId,
      question: queryText,
      status: "loading",
      exchanges: [],
      timestamp: Date.now()
    };
    localStorage.setItem(`frontwing_investigation_${generatedId}`, JSON.stringify(newInvestigation));
    navigate(`/investigate/${generatedId}`);
  };
  const commands = [
    { id: "nav-home", label: "Go to Home / Briefing Room", category: "NAVIGATION", shortcut: "G H", action: () => navigate("/") },
    { id: "nav-briefing", label: "Go to Spielberg GP Race Briefing", category: "NAVIGATION", shortcut: "G B", action: () => navigate("/race/aut-2024") },
    { id: "nav-playground", label: "Go to Strategy Playground Simulator", category: "NAVIGATION", shortcut: "G P", action: () => navigate("/strategy/aut-2024") },
    { id: "nav-ghost", label: "Go to Piastri vs Sainz Ghost Battle", category: "NAVIGATION", shortcut: "G G", action: () => navigate("/ghost-battle/aut-2024") },
    { id: "query-sainz", label: "Why did Sainz finish P3 instead of P2?", category: "QUERIES", action: () => runPaletteQuery("Why did Sainz finish P3 instead of P2?") },
    { id: "query-norris", label: "Why did Verstappen and Norris collide?", category: "QUERIES", action: () => runPaletteQuery("Why did Verstappen and Norris collide?") },
    { id: "action-export", label: "Export active telemetry trace", category: "ACTIONS", shortcut: "\u2318E", action: () => console.log("Export PNG") },
    { id: "action-reset", label: "Reset all active what-if simulation states", category: "ACTIONS", shortcut: "\u2318R", action: () => console.log("Reset sims") }
  ];
  const filtered = commands.filter(
    (cmd) => cmd.label.toLowerCase().includes(value.toLowerCase()) || cmd.category.toLowerCase().includes(value.toLowerCase())
  );
  useEffect(() => {
    if (!isOpen) return;
    setActiveIdx(0);
    setValue("");
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[activeIdx]) {
          filtered[activeIdx].action?.();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, activeIdx, onClose]);
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const event = new CustomEvent("toggle-command-palette");
        window.dispatchEvent(event);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);
  return <AnimatePresence>{isOpen && <div className="fixed inset-0 z-[300] flex items-start justify-center p-4 pt-[15vh]">{
    /* Backdrop */
  }<motion.div
    className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  />{
    /* Panel */
  }<motion.div
    className="w-full max-w-[560px] bg-panel border border-fw-border rounded-card shadow-2xl relative z-10 overflow-hidden flex flex-col font-mono text-xs"
    initial={{ opacity: 0, scale: 0.97, y: -8 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.97, y: -8 }}
    transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
  >{
    /* Input row */
  }<div className="flex items-center px-4 py-3 border-b border-fw-border bg-canvas/20"><span className="text-text-muted mr-3 select-none">{">"}</span><input
    ref={inputRef}
    type="text"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    placeholder="Type a command or tactical query..."
    className="flex-1 bg-transparent outline-none placeholder:text-text-muted text-text-primary font-mono text-xs"
    autoFocus
  /><span className="text-text-muted text-[10px] select-none pl-3 border-l border-fw-border">
                [ESC_CLOSE]
              </span></div>{
    /* List */
  }<div className="max-h-[300px] overflow-y-auto divide-y divide-fw-border/20 p-2">{filtered.length > 0 ? filtered.map((cmd, idx) => {
    const isActive = activeIdx === idx;
    return <div
      key={cmd.id}
      onClick={() => {
        cmd.action?.();
        onClose();
      }}
      className={cn(
        "px-3 py-2.5 rounded-card flex justify-between items-center cursor-pointer transition-all duration-[80ms]",
        isActive ? "bg-drs-cyan/10 border border-drs-cyan/25" : "border border-transparent hover:bg-elevated/40"
      )}
    ><div className="flex items-center gap-3"><span className={cn(
      "text-[9px] font-semibold border px-1 rounded-sm uppercase tracking-wider",
      cmd.category === "NAVIGATION" && "text-drs-cyan border-drs-cyan/20 bg-drs-cyan/5",
      cmd.category === "ACTIONS" && "text-f1-red border-f1-red/20 bg-f1-red/5",
      cmd.category === "QUERIES" && "text-teammate-yellow border-teammate-yellow/20 bg-teammate-yellow/5"
    )}>{cmd.category}</span><span className="text-text-secondary font-medium">{cmd.label}</span></div>{cmd.shortcut && <span className="text-text-muted text-[10px]">{cmd.shortcut}</span>}</div>;
  }) : <div className="p-3 text-text-muted">
                  NO_COMMANDS_FOUND
                </div>}</div></motion.div></div>}</AnimatePresence>;
}
