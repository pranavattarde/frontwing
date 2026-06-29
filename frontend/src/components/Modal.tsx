import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions = [],
  size = 'md',
}: ModalProps) {
  // Focus trapping and Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-[400px]',
    md: 'max-w-[560px]',
    lg: 'max-w-[768px]',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop blur overlay */}
          <motion.div
            className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={cn(
              'w-full bg-panel border border-fw-border rounded-card shadow-2xl relative z-10 overflow-hidden flex flex-col',
              sizeClasses[size]
            )}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-fw-border flex justify-between items-center">
              <h3 id="modal-title" className="text-text-primary text-sm font-semibold uppercase font-mono tracking-wider">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-secondary text-sm font-mono"
                aria-label="Close modal"
              >
                [ESC]
              </button>
            </div>

            {/* Content Body */}
            <div className="px-5 py-4 flex-1 text-sm text-text-secondary leading-relaxed max-h-[70vh] overflow-y-auto">
              {children}
            </div>

            {/* Actions Footer */}
            {actions.length > 0 && (
              <div className="px-5 py-3 border-t border-fw-border bg-canvas/30 flex justify-end gap-2">
                {actions.map((act, idx) => (
                  <button
                    key={idx}
                    onClick={act.onClick}
                    className={cn(
                      'px-3 py-1.5 font-mono text-xs rounded-button border transition-all duration-[80ms]',
                      act.variant === 'primary' && 'bg-drs-cyan/15 text-drs-cyan border-drs-cyan/30 hover:bg-drs-cyan/25',
                      act.variant === 'danger' && 'bg-f1-red/15 text-f1-red border-f1-red/30 hover:bg-f1-red/25',
                      (act.variant === 'secondary' || !act.variant) && 'bg-canvas text-text-secondary border-fw-border hover:border-fw-border-active'
                    )}
                  >
                    {act.label.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
