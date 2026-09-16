import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions = [],
  size = "md"
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
  const sizeClasses = {
    sm: "max-w-[400px]",
    md: "max-w-[560px]",
    lg: "max-w-[768px]"
  };
  return <AnimatePresence>{isOpen && <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">{
    /* Backdrop blur overlay */
  }<motion.div
    className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  />{
    /* Modal Container */
  }<motion.div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    className={cn(
      "w-full bg-surface-raised border border-border-strong rounded-card shadow-2xl relative z-10 overflow-hidden flex flex-col",
      sizeClasses[size]
    )}
    initial={{ opacity: 0, scale: 0.95, y: 8 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: 8 }}
    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
  >{
    /* Header */
  }<div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center"><h3 id="modal-title" className="text-text-primary text-sm font-semibold uppercase font-mono tracking-wider">{title}</h3><button
    onClick={onClose}
    className="text-text-muted hover:text-text-secondary text-sm font-mono"
    aria-label="Close modal"
  >
                [ESC]
              </button></div>{
    /* Content Body */
  }<div className="px-5 py-4 flex-1 text-sm text-text-secondary leading-relaxed max-h-[70vh] overflow-y-auto">{children}</div>{
    /* Actions Footer */
  }{actions.length > 0 && <div className="px-5 py-3 border-t border-border-subtle bg-surface-base/50 flex justify-end gap-2">{actions.map((act, idx) => <button
    key={idx}
    onClick={act.onClick}
    className={cn(
      "px-3 py-1.5 font-mono text-xs rounded-badge border transition-all duration-[80ms]",
      act.variant === "primary" && "bg-accent-primary text-white border-accent-primary hover:brightness-110 font-bold",
      act.variant === "danger" && "bg-accent-danger/15 text-accent-danger border-accent-danger/30 hover:bg-accent-danger/25",
      (act.variant === "secondary" || !act.variant) && "bg-surface-base text-text-secondary border-border-subtle hover:border-border-strong hover:text-text-primary"
    )}
  >{act.label.toUpperCase()}</button>)}</div>}</motion.div></div>}</AnimatePresence>;
}
