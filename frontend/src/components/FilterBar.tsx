import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterItem {
  id: string;
  label: string;
  options: FilterOption[];
  selected: string[];
}

interface FilterBarProps {
  filters: FilterItem[];
  onFilterChange?: (filterId: string, selectedValues: string[]) => void;
  className?: string;
}

export function FilterBar({ filters, onFilterChange, className }: FilterBarProps) {
  const handleToggle = (filterId: string, optionValue: string, isSelected: boolean) => {
    const filter = filters.find((f) => f.id === filterId);
    if (!filter) return;

    let nextSelected;
    if (isSelected) {
      nextSelected = filter.selected.filter((v) => v !== optionValue);
    } else {
      nextSelected = [...filter.selected, optionValue];
    }
    onFilterChange?.(filterId, nextSelected);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-4 bg-panel border border-fw-border rounded-card p-3 select-none', className)}>
      {filters.map((filter) => (
        <div key={filter.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Filter Group Label */}
          <span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider shrink-0">
            {filter.label}:
          </span>

          {/* Option Chips */}
          <div className="flex flex-wrap gap-1.5">
            {filter.options.map((opt) => {
              const isSelected = filter.selected.includes(opt.value);

              return (
                <button
                  key={opt.value}
                  onClick={() => handleToggle(filter.id, opt.value, isSelected)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-mono rounded-button border transition-all duration-[80ms]',
                    isSelected
                      ? 'bg-drs-cyan/15 text-drs-cyan border-drs-cyan/35 font-medium'
                      : 'bg-canvas text-text-secondary border-fw-border hover:border-fw-border-active hover:text-text-primary'
                  )}
                >
                  {opt.label}
                  {isSelected && <span className="ml-1 text-[9px] font-semibold">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
