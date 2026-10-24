import { useEffect } from "react";
import { SearchOverlay } from "./SearchOverlay";

export function CommandPalette({ isOpen, onClose }) {
  useEffect(() => {
    const open = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-command-palette"));
      }
    };
    window.addEventListener("keydown", open);
    return () => window.removeEventListener("keydown", open);
  }, []);
  return <SearchOverlay isOpen={isOpen} onClose={onClose} />;
}
