import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface PixelPanelProps {
  children: ReactNode;
  title?: string;
  glow?: 'cyan' | 'magenta' | 'gold' | 'none';
  className?: string;
  delay?: number;
}

const glowClasses = {
  cyan: 'rpg-border rpg-border-glow-cyan',
  magenta: 'rpg-border rpg-border-glow-magenta',
  gold: 'rpg-border rpg-border-glow-gold',
  none: 'rpg-border',
};

function PixelPanel({ children, title, glow = 'none', className = '', delay = 0 }: PixelPanelProps) {
  const { isRpg } = useTheme();

  if (isRpg) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className={`${glowClasses[glow]} p-5 relative ${className}`}
      >
        {title && (
          <div className="absolute -top-3 left-4 px-3 bg-rpg-deep">
            <span className="font-pixel text-[10px] uppercase tracking-wider text-neon-cyan">
              {title}
            </span>
          </div>
        )}
        {children}
      </motion.div>
    );
  }

  // Professional: editorial panel with small-caps title above a hairline rule
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className={`relative ${className}`}
    >
      {title && (
        <header className="mb-3 flex items-baseline gap-3">
          <span className="pro-label">{title}</span>
          <span className="flex-1 pro-rule" aria-hidden />
        </header>
      )}
      <div className="pro-panel px-6 py-5">{children}</div>
    </motion.section>
  );
}

export default PixelPanel;
