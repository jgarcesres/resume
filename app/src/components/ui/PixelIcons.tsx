import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';

interface PixelIconProps {
  className?: string;
  style?: CSSProperties;
}

/** Rotating pixel art Triforce for Gaming — always gold */
export function TriforceIcon({ className, style }: PixelIconProps) {
  const gold = '#ffd700';
  return (
    <motion.svg
      viewBox="0 0 48 44"
      className={className}
      style={{ ...style, color: gold, filter: `drop-shadow(0 0 6px ${gold}40)`, imageRendering: 'pixelated' }}
      animate={{ rotateY: [0, 360] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    >
      {/* Top triangle — thicker, bolder */}
      <polygon points="24,0 36,20 12,20" fill={gold} stroke={gold} strokeWidth="1.5" />
      {/* Bottom-left triangle */}
      <polygon points="12,22 24,42 0,42" fill={gold} stroke={gold} strokeWidth="1.5" />
      {/* Bottom-right triangle */}
      <polygon points="36,22 48,42 24,42" fill={gold} stroke={gold} strokeWidth="1.5" />
      {/* Inner void — the negative space triangle */}
      <polygon points="24,22 30,32 18,32" fill="#0a0e1a" />
    </motion.svg>
  );
}

/** Pixel art cooking pan with flame for Cooking */
export function PixelPotIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} style={{ ...style, imageRendering: 'pixelated' }}>
      {/* Pan group — wobbles like sizzling */}
      <motion.g
        animate={{ x: [0, 0.5, -0.5, 0.3, 0], y: [0, -0.5, 0, -0.3, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Steam wisps */}
        <motion.g
          animate={{ y: [0, -2, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="11" y="1" width="2" height="2" fill="currentColor" opacity="0.4" />
          <rect x="15" y="0" width="2" height="2" fill="currentColor" opacity="0.3" />
          <rect x="19" y="1" width="2" height="2" fill="currentColor" opacity="0.5" />
        </motion.g>
        {/* Pan handle */}
        <rect x="24" y="10" width="7" height="3" fill="currentColor" opacity="0.7" />
        <rect x="29" y="9" width="2" height="5" fill="currentColor" opacity="0.5" />
        {/* Pan rim */}
        <rect x="4" y="7" width="22" height="3" fill="currentColor" />
        {/* Pan body */}
        <rect x="5" y="10" width="20" height="10" fill="currentColor" opacity="0.85" />
        {/* Food inside */}
        <rect x="7" y="10" width="16" height="4" fill="currentColor" />
      </motion.g>
      {/* Flame below — stays still, just flickers */}
      <rect x="9" y="22" width="3" height="4" fill="#ff3333" opacity="0.8" />
      <rect x="14" y="21" width="3" height="5" fill="#ffd700" opacity="0.9" />
      <rect x="19" y="22" width="3" height="4" fill="#ff3333" opacity="0.8" />
      <motion.g animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1, repeat: Infinity }}>
        <rect x="11" y="23" width="2" height="3" fill="#ffd700" opacity="0.6" />
        <rect x="17" y="23" width="2" height="3" fill="#ffd700" opacity="0.6" />
      </motion.g>
      {/* Stove grate */}
      <rect x="6" y="20" width="18" height="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/** Pixel art server rack with blinking LEDs for Homelabbing */
export function PixelServerIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ ...style, imageRendering: 'pixelated' }}>
      {/* Rack frame */}
      <rect x="4" y="2" width="16" height="20" fill="currentColor" opacity="0.8" />
      {/* Server units */}
      <rect x="6" y="4" width="12" height="3" fill="#0a0e1a" />
      <rect x="6" y="9" width="12" height="3" fill="#0a0e1a" />
      <rect x="6" y="14" width="12" height="3" fill="#0a0e1a" />
      {/* Blinking LEDs */}
      <motion.rect
        x="7" y="5" width="2" height="1"
        fill="#39ff14"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
      />
      <motion.rect
        x="7" y="10" width="2" height="1"
        fill="#39ff14"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
      />
      <motion.rect
        x="7" y="15" width="2" height="1"
        fill="#4d8cff"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
      />
      {/* Drive bays */}
      <rect x="11" y="5" width="5" height="1" fill="currentColor" opacity="0.3" />
      <rect x="11" y="10" width="5" height="1" fill="currentColor" opacity="0.3" />
      <rect x="11" y="15" width="5" height="1" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/** Pixel art airplane for Traveling — clearer than compass */
export function PixelCompassIcon({ className, style }: PixelIconProps) {
  return (
    <motion.svg
      viewBox="0 0 32 32"
      className={className}
      style={{ ...style, imageRendering: 'pixelated' }}
      animate={{ y: [0, -3, 0], rotate: [0, 2, -2, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Fuselage */}
      <rect x="14" y="4" width="4" height="20" fill="currentColor" />
      <rect x="13" y="6" width="6" height="14" fill="currentColor" />
      {/* Nose */}
      <rect x="15" y="2" width="2" height="2" fill="currentColor" />
      {/* Wings */}
      <rect x="4" y="12" width="24" height="4" fill="currentColor" />
      <rect x="6" y="11" width="20" height="2" fill="currentColor" opacity="0.7" />
      {/* Tail wings */}
      <rect x="10" y="22" width="12" height="3" fill="currentColor" />
      {/* Tail fin */}
      <rect x="15" y="20" width="2" height="6" fill="currentColor" />
      {/* Windows */}
      <rect x="15" y="7" width="2" height="1" fill="#00e5ff" opacity="0.8" />
      <rect x="15" y="9" width="2" height="1" fill="#00e5ff" opacity="0.6" />
      <rect x="15" y="11" width="2" height="1" fill="#00e5ff" opacity="0.4" />
      {/* Engine glow */}
      <motion.rect
        x="14" y="26" width="4" height="2"
        fill="#ff3333"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      />
    </motion.svg>
  );
}

/** Pixel art coffee cup with steam for Coffee */
export function PixelCoffeeIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 28 28" className={className} style={{ ...style, imageRendering: 'pixelated' }}>
      {/* Steam wisps */}
      <motion.g
        animate={{ y: [0, -2, 0], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="8" y="2" width="2" height="3" fill="currentColor" opacity="0.4" />
        <rect x="12" y="0" width="2" height="3" fill="currentColor" opacity="0.3" />
        <rect x="16" y="1" width="2" height="3" fill="currentColor" opacity="0.5" />
      </motion.g>
      {/* Cup body */}
      <rect x="4" y="7" width="16" height="13" fill="currentColor" />
      {/* Handle */}
      <rect x="20" y="9" width="4" height="2" fill="currentColor" />
      <rect x="22" y="11" width="2" height="4" fill="currentColor" />
      <rect x="20" y="15" width="4" height="2" fill="currentColor" />
      {/* Coffee inside */}
      <rect x="6" y="10" width="12" height="8" fill="#0a0e1a" opacity="0.4" />
      {/* Coffee surface */}
      <rect x="6" y="10" width="12" height="2" fill="#d97706" opacity="0.5" />
      {/* Saucer */}
      <rect x="2" y="20" width="20" height="3" fill="currentColor" opacity="0.8" />
      <rect x="4" y="23" width="16" height="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** Pixel art open book for Reading */
export function PixelBookIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 28 24" className={className} style={{ ...style, imageRendering: 'pixelated' }}>
      {/* Left page */}
      <rect x="1" y="3" width="12" height="17" fill="currentColor" />
      {/* Right page */}
      <rect x="15" y="3" width="12" height="17" fill="currentColor" />
      {/* Spine */}
      <rect x="13" y="2" width="2" height="19" fill="currentColor" opacity="0.6" />
      {/* Left page text lines */}
      <rect x="3" y="6" width="8" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="3" y="8" width="7" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="3" y="10" width="8" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="3" y="12" width="5" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="3" y="14" width="7" height="1" fill="#0a0e1a" opacity="0.5" />
      {/* Right page text lines */}
      <rect x="17" y="6" width="8" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="17" y="8" width="6" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="17" y="10" width="8" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="17" y="12" width="7" height="1" fill="#0a0e1a" opacity="0.5" />
      {/* Animated reading sparkle */}
      <motion.rect
        x="18" y="14" width="2" height="2"
        fill="#ffd700"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
      />
      {/* Cover edges for depth */}
      <rect x="0" y="2" width="1" height="19" fill="currentColor" opacity="0.4" />
      <rect x="27" y="2" width="1" height="19" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
