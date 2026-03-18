import { motion } from 'framer-motion';

interface StatBarProps {
  label: string;
  level: number;
  maxLevel?: number;
  color?: 'green' | 'blue' | 'gold' | 'magenta' | 'cyan';
  delay?: number;
}

const colorMap = {
  green: { fill: '#39ff14', bg: '#0a2e06', glow: 'rgba(57,255,20,0.2)' },
  blue: { fill: '#4d8cff', bg: '#0a1a3e', glow: 'rgba(77,140,255,0.2)' },
  gold: { fill: '#ffd700', bg: '#2e2a06', glow: 'rgba(255,215,0,0.2)' },
  magenta: { fill: '#ff2daa', bg: '#2e0620', glow: 'rgba(255,45,170,0.2)' },
  cyan: { fill: '#00e5ff', bg: '#062e33', glow: 'rgba(0,229,255,0.2)' },
};

function StatBar({ label, level, maxLevel = 100, color = 'green', delay = 0 }: StatBarProps) {
  const c = colorMap[color];
  const pct = Math.min((level / maxLevel) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="font-body text-sm text-rpg-text">{label}</span>
        <span className="font-pixel text-[9px] text-rpg-text-dim">
          Lv.{level}
        </span>
      </div>
      <div
        className="h-4 relative border border-rpg-border overflow-hidden"
        style={{ backgroundColor: c.bg }}
        role="progressbar"
        aria-valuenow={level}
        aria-valuemin={0}
        aria-valuemax={maxLevel}
        aria-label={label}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay, ease: 'easeOut' }}
          className="h-full stat-shimmer relative"
          style={{
            backgroundColor: c.fill,
            boxShadow: `0 0 8px ${c.glow}`,
          }}
        />
        {/* Pixel grid overlay on bar */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.3) 3px, rgba(0,0,0,0.3) 4px)',
          }}
        />
      </div>
    </div>
  );
}

export default StatBar;
