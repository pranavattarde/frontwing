import React from 'react';

interface DataBadgeProps {
  type: 'compound' | 'delta';
  value: string;
  laps?: number;
}

const DataBadge: React.FC<DataBadgeProps> = ({ type, value, laps }) => {
  if (type === 'compound') {
    const char = value.toUpperCase().charAt(0);
    let colorClass = 'bg-[#16191E] border-[#1C2025] text-[#F3F5F7]';

    if (char === 'S') {
      colorClass = 'bg-[#FF2B49]/10 border-[#FF2B49]/35 text-[#FF2B49]';
    } else if (char === 'M') {
      colorClass = 'bg-[#FFD600]/10 border-[#FFD600]/35 text-[#FFD600]';
    } else if (char === 'I') {
      colorClass = 'bg-[#1BC944]/10 border-[#1BC944]/35 text-[#1BC944]';
    } else if (char === 'W') {
      colorClass = 'bg-[#0D6EFD]/10 border-[#0D6EFD]/35 text-[#0D6EFD]';
    }

    return (
      <div className="flex items-center gap-1.5 font-timing font-mono">
        <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full border text-[10px] font-bold ${colorClass}`}>
          {char}
        </span>
        {laps !== undefined && (
          <span className="text-[11px] text-[#8B95A5]">{laps}L</span>
        )}
      </div>
    );
  }

  // Timing Delta Formatting (e.g. +1.240, -0.320)
  const isPositive = value.startsWith('+');
  const isZero = value === '0.000' || value === '+0.000' || value === '0.0' || value === 'LEADER';
  
  let deltaColor = 'text-[#00E5FF]'; // DRS/Green-ish gain
  if (isPositive) {
    deltaColor = 'text-[#FF1801]'; // Loss
  } else if (isZero) {
    deltaColor = 'text-[#F3F5F7]';
  }

  return (
    <span className={`font-timing font-mono text-[11px] tracking-wide ${deltaColor}`}>
      {value}
    </span>
  );
};

export default DataBadge;
