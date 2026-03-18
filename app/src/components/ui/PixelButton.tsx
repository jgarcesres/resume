import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PixelButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'cyan' | 'gold' | 'magenta';
  className?: string;
}

const variants = {
  cyan: {
    border: 'border-neon-cyan/60',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
    hover: 'hover:bg-neon-cyan/20',
    shadow: 'shadow-[3px_3px_0_rgba(0,229,255,0.3)]',
    active: 'active:shadow-[1px_1px_0_rgba(0,229,255,0.3)] active:translate-x-[2px] active:translate-y-[2px]',
  },
  gold: {
    border: 'border-neon-gold/60',
    bg: 'bg-neon-gold/10',
    text: 'text-neon-gold',
    hover: 'hover:bg-neon-gold/20',
    shadow: 'shadow-[3px_3px_0_rgba(255,215,0,0.3)]',
    active: 'active:shadow-[1px_1px_0_rgba(255,215,0,0.3)] active:translate-x-[2px] active:translate-y-[2px]',
  },
  magenta: {
    border: 'border-neon-magenta/60',
    bg: 'bg-neon-magenta/10',
    text: 'text-neon-magenta',
    hover: 'hover:bg-neon-magenta/20',
    shadow: 'shadow-[3px_3px_0_rgba(255,45,170,0.3)]',
    active: 'active:shadow-[1px_1px_0_rgba(255,45,170,0.3)] active:translate-x-[2px] active:translate-y-[2px]',
  },
};

function PixelButton({ children, onClick, disabled, variant = 'cyan', className = '' }: PixelButtonProps) {
  const v = variants[variant];

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        font-pixel text-[10px] uppercase tracking-wider
        px-5 py-3 border-2 ${v.border} ${v.bg} ${v.text}
        ${v.hover} ${v.shadow} ${v.active}
        transition-all duration-100
        disabled:opacity-40 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
}

export default PixelButton;
