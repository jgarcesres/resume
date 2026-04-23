import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

interface StatBarProps {
  label: string;
  level: number;
  maxLevel?: number;
  color?: 'green' | 'blue' | 'gold' | 'magenta' | 'cyan';
  delay?: number;
}

const colorMap = {
  green: { fill: '#39ff14', bg: '#0a2e06', glow: 'rgba(57,255,20,0.2)', glowStrong: 'rgba(57,255,20,0.4)' },
  blue: { fill: '#4d8cff', bg: '#0a1a3e', glow: 'rgba(77,140,255,0.2)', glowStrong: 'rgba(77,140,255,0.4)' },
  gold: { fill: '#ffd700', bg: '#2e2a06', glow: 'rgba(255,215,0,0.2)', glowStrong: 'rgba(255,215,0,0.4)' },
  magenta: { fill: '#ff2daa', bg: '#2e0620', glow: 'rgba(255,45,170,0.2)', glowStrong: 'rgba(255,45,170,0.4)' },
  cyan: { fill: '#00e5ff', bg: '#062e33', glow: 'rgba(0,229,255,0.2)', glowStrong: 'rgba(0,229,255,0.4)' },
};

function StatBar({ label, level, maxLevel = 100, color = 'green', delay = 0 }: StatBarProps) {
  const { isRpg } = useTheme();
  const c = colorMap[color];
  const pct = Math.min((level / maxLevel) * 100, 100);
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotion();

  if (!isRpg) {
    // Editorial row: label on left, LED dot + fill bar, tabular numerals right.
    return (
      <div className="group">
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <span className="font-sans text-[14px] text-pro-ink flex items-center gap-2">
            <span
              className="pro-led"
              style={{ color: '#3FD771', backgroundColor: '#3FD771' }}
              aria-hidden
            />
            {label}
          </span>
          <span className="font-mono text-[11px] text-pro-muted pro-tabular tracking-wider">
            {String(level).padStart(2, '0')} / {maxLevel}
          </span>
        </div>
        <div
          className="h-[3px] w-full relative overflow-hidden"
          style={{ backgroundColor: '#22261F' }}
          role="progressbar"
          aria-valuenow={level}
          aria-valuemin={0}
          aria-valuemax={maxLevel}
          aria-label={label}
        >
          <motion.div
            initial={reducedMotion ? { width: `${pct}%` } : { width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
            style={{ backgroundColor: '#5FA97B', boxShadow: '0 0 4px rgba(95,169,123,0.35)' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-1 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-body text-sm text-rpg-text">{label}</span>
        <motion.span
          className="font-pixel text-[9px]"
          animate={{
            color: hovered ? c.fill : '#6b7fa3',
            textShadow: hovered ? `0 0 8px ${c.glow}` : '0 0 0px transparent',
          }}
          transition={{ duration: 0.2 }}
        >
          Lv.{level}
        </motion.span>
      </div>
      <div
        className="h-4 relative border border-rpg-border overflow-hidden transition-all duration-200"
        style={{
          backgroundColor: c.bg,
          boxShadow: hovered ? `0 0 12px ${c.glowStrong}, inset 0 0 8px ${c.glow}` : 'none',
        }}
        role="progressbar"
        aria-valuenow={level}
        aria-valuemin={0}
        aria-valuemax={maxLevel}
        aria-label={label}
      >
        <motion.div
          initial={reducedMotion ? { width: `${pct}%` } : { width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, margin: '-40px' }}
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
        {/* Hover notch markers */}
        {hovered && (
          <div className="absolute inset-0 pointer-events-none">
            {[25, 50, 75].map((mark) => (
              <motion.div
                key={mark}
                className="absolute top-0 h-full w-px"
                style={{ left: `${mark}%`, backgroundColor: `${c.fill}33` }}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ duration: 0.15, delay: (mark / 100) * 0.1 }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatBar;
