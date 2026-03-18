import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

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

export default PixelPanel;
