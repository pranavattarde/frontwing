import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
const ICONS = {
  info: "\u25CF",
  success: "\u2713",
  warning: "\u26A0",
  error: "\u2715"
};
const COLORS = {
  info: "text-drs-cyan border-drs-cyan/30",
  success: "text-tire-inter border-tire-inter/30",
  warning: "text-teammate-yellow border-teammate-yellow/30",
  error: "text-f1-red border-f1-red/30"
};
function NotificationToast({ notification, onDismiss }) {
  useEffect(() => {
    if (notification.duration > 0) {
      const timer = setTimeout(() => onDismiss(notification.id), notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.duration, onDismiss]);
  return <motion.div
    layout
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.95 }}
    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    role={notification.type === "error" ? "alert" : "status"}
    aria-live={notification.type === "error" ? "assertive" : "polite"}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-card bg-panel border",
      COLORS[notification.type]
    )}
  ><span className={cn("font-mono text-sm", COLORS[notification.type].split(" ")[0])}>{ICONS[notification.type]}</span><p className="text-sm text-text-primary flex-1">{notification.message}</p>{notification.action && <button
    onClick={notification.action.onClick}
    className="text-mono-meta font-mono text-drs-cyan hover:underline underline-offset-2"
  >{notification.action.label}</button>}<button
    onClick={() => onDismiss(notification.id)}
    className="text-text-muted hover:text-text-secondary ml-1"
    aria-label="Dismiss notification"
  >
        ✕
      </button></motion.div>;
}
export function NotificationContainer() {
  const [notifications, setNotifications] = useState([]);
  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  useEffect(() => {
    window.__fw_notify = (n) => {
      setNotifications((prev) => {
        const next = [...prev, n];
        return next.slice(-3);
      });
    };
    return () => {
      delete window.__fw_notify;
    };
  }, []);
  return <div className="fixed bottom-4 right-4 z-[400] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-32px)]"><AnimatePresence mode="popLayout">{notifications.map((n) => <NotificationToast key={n.id} notification={n} onDismiss={dismiss} />)}</AnimatePresence></div>;
}
