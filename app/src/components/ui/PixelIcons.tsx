import { motion } from 'framer-motion';
import type { CSSProperties, ComponentType } from 'react';

export interface PixelIconProps {
  className?: string;
  style?: CSSProperties;
}

const px = { imageRendering: 'pixelated' as const };

// ─── HOBBY ICONS (existing) ─────────────────────────────────────────────────

/** Rotating pixel art Triforce for Gaming — always gold */
export function TriforceIcon({ className, style }: PixelIconProps) {
  const gold = '#ffd700';
  return (
    <motion.svg
      viewBox="0 0 48 44"
      className={className}
      style={{ ...style, color: gold, filter: `drop-shadow(0 0 6px ${gold}40)`, ...px }}
      aria-hidden="true"
      animate={{ rotateY: [0, 360] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    >
      <polygon points="24,0 36,20 12,20" fill={gold} stroke={gold} strokeWidth="1.5" />
      <polygon points="12,22 24,42 0,42" fill={gold} stroke={gold} strokeWidth="1.5" />
      <polygon points="36,22 48,42 24,42" fill={gold} stroke={gold} strokeWidth="1.5" />
      <polygon points="24,22 30,32 18,32" fill="#0a0e1a" />
    </motion.svg>
  );
}

/** Pixel art cooking pan with flame for Cooking */
export function PixelPotIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} style={{ ...style, ...px }} aria-hidden="true">
      <motion.g
        animate={{ x: [0, 0.5, -0.5, 0.3, 0], y: [0, -0.5, 0, -0.3, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.g
          animate={{ y: [0, -2, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="11" y="1" width="2" height="2" fill="currentColor" opacity="0.4" />
          <rect x="15" y="0" width="2" height="2" fill="currentColor" opacity="0.3" />
          <rect x="19" y="1" width="2" height="2" fill="currentColor" opacity="0.5" />
        </motion.g>
        <rect x="24" y="10" width="7" height="3" fill="currentColor" opacity="0.7" />
        <rect x="29" y="9" width="2" height="5" fill="currentColor" opacity="0.5" />
        <rect x="4" y="7" width="22" height="3" fill="currentColor" />
        <rect x="5" y="10" width="20" height="10" fill="currentColor" opacity="0.85" />
        <rect x="7" y="10" width="16" height="4" fill="currentColor" />
      </motion.g>
      <rect x="9" y="22" width="3" height="4" fill="#ff3333" opacity="0.8" />
      <rect x="14" y="21" width="3" height="5" fill="#ffd700" opacity="0.9" />
      <rect x="19" y="22" width="3" height="4" fill="#ff3333" opacity="0.8" />
      <motion.g animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1, repeat: Infinity }}>
        <rect x="11" y="23" width="2" height="3" fill="#ffd700" opacity="0.6" />
        <rect x="17" y="23" width="2" height="3" fill="#ffd700" opacity="0.6" />
      </motion.g>
      <rect x="6" y="20" width="18" height="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/** Pixel art server rack with blinking LEDs for Homelabbing */
export function PixelServerIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ ...style, ...px }} aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" fill="currentColor" opacity="0.8" />
      <rect x="6" y="4" width="12" height="3" fill="#0a0e1a" />
      <rect x="6" y="9" width="12" height="3" fill="#0a0e1a" />
      <rect x="6" y="14" width="12" height="3" fill="#0a0e1a" />
      <motion.rect x="7" y="5" width="2" height="1" fill="#39ff14"
        animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
      <motion.rect x="7" y="10" width="2" height="1" fill="#39ff14"
        animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }} />
      <motion.rect x="7" y="15" width="2" height="1" fill="#4d8cff"
        animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }} />
      <rect x="11" y="5" width="5" height="1" fill="currentColor" opacity="0.3" />
      <rect x="11" y="10" width="5" height="1" fill="currentColor" opacity="0.3" />
      <rect x="11" y="15" width="5" height="1" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/** Pixel art airplane for Traveling */
export function PixelPlaneIcon({ className, style }: PixelIconProps) {
  return (
    <motion.svg
      viewBox="0 0 32 32" className={className}
      style={{ ...style, ...px }}
      aria-hidden="true"
      animate={{ y: [0, -3, 0], rotate: [0, 2, -2, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <rect x="14" y="4" width="4" height="20" fill="currentColor" />
      <rect x="13" y="6" width="6" height="14" fill="currentColor" />
      <rect x="15" y="2" width="2" height="2" fill="currentColor" />
      <rect x="4" y="12" width="24" height="4" fill="currentColor" />
      <rect x="6" y="11" width="20" height="2" fill="currentColor" opacity="0.7" />
      <rect x="10" y="22" width="12" height="3" fill="currentColor" />
      <rect x="15" y="20" width="2" height="6" fill="currentColor" />
      <rect x="15" y="7" width="2" height="1" fill="#00e5ff" opacity="0.8" />
      <rect x="15" y="9" width="2" height="1" fill="#00e5ff" opacity="0.6" />
      <rect x="15" y="11" width="2" height="1" fill="#00e5ff" opacity="0.4" />
      <motion.rect x="14" y="26" width="4" height="2" fill="#ff3333"
        animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 0.6, repeat: Infinity }} />
    </motion.svg>
  );
}

/** Pixel art coffee cup with steam for Coffee */
export function PixelCoffeeIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 28 28" className={className} style={{ ...style, ...px }} aria-hidden="true">
      <motion.g
        animate={{ y: [0, -2, 0], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="8" y="2" width="2" height="3" fill="currentColor" opacity="0.4" />
        <rect x="12" y="0" width="2" height="3" fill="currentColor" opacity="0.3" />
        <rect x="16" y="1" width="2" height="3" fill="currentColor" opacity="0.5" />
      </motion.g>
      <rect x="4" y="7" width="16" height="13" fill="currentColor" />
      <rect x="20" y="9" width="4" height="2" fill="currentColor" />
      <rect x="22" y="11" width="2" height="4" fill="currentColor" />
      <rect x="20" y="15" width="4" height="2" fill="currentColor" />
      <rect x="6" y="10" width="12" height="8" fill="#0a0e1a" opacity="0.4" />
      <rect x="6" y="10" width="12" height="2" fill="#d97706" opacity="0.5" />
      <rect x="2" y="20" width="20" height="3" fill="currentColor" opacity="0.8" />
      <rect x="4" y="23" width="16" height="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** Pixel art open book for Reading */
export function PixelBookIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 28 24" className={className} style={{ ...style, ...px }} aria-hidden="true">
      <rect x="1" y="3" width="12" height="17" fill="currentColor" />
      <rect x="15" y="3" width="12" height="17" fill="currentColor" />
      <rect x="13" y="2" width="2" height="19" fill="currentColor" opacity="0.6" />
      <rect x="3" y="6" width="8" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="3" y="8" width="7" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="3" y="10" width="8" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="3" y="12" width="5" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="3" y="14" width="7" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="17" y="6" width="8" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="17" y="8" width="6" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="17" y="10" width="8" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="17" y="12" width="7" height="1" fill="#0a0e1a" opacity="0.5" />
      <motion.rect x="18" y="14" width="2" height="2" fill="#ffd700"
        animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
      <rect x="0" y="2" width="1" height="19" fill="currentColor" opacity="0.4" />
      <rect x="27" y="2" width="1" height="19" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

// ─── NAV ICONS ───────────────────────────────────────────────────────────────

/** Crossed swords for Quests/Projects */
export function CrossedSwordsIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Left sword blade */}
      <rect x="2" y="2" width="2" height="2" fill="currentColor" />
      <rect x="4" y="4" width="2" height="2" fill="currentColor" />
      <rect x="6" y="6" width="2" height="2" fill="currentColor" />
      {/* Left sword guard */}
      <rect x="6" y="8" width="4" height="2" fill="currentColor" opacity="0.8" />
      {/* Left sword handle */}
      <rect x="8" y="10" width="2" height="2" fill="#d97706" />
      <rect x="9" y="12" width="2" height="2" fill="#d97706" opacity="0.7" />
      {/* Right sword blade */}
      <rect x="12" y="2" width="2" height="2" fill="currentColor" />
      <rect x="10" y="4" width="2" height="2" fill="currentColor" />
      {/* Right sword guard */}
      <rect x="6" y="8" width="4" height="2" fill="currentColor" opacity="0.8" />
      {/* Right sword handle */}
      <rect x="6" y="10" width="2" height="2" fill="#d97706" />
      <rect x="5" y="12" width="2" height="2" fill="#d97706" opacity="0.7" />
      {/* Blade shine */}
      <rect x="3" y="2" width="1" height="1" fill="currentColor" opacity="0.5" />
      <rect x="12" y="2" width="1" height="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** Pixel tree for Talents/Skill Tree */
export function SkillTreeIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Canopy layers */}
      <rect x="6" y="1" width="4" height="2" fill="currentColor" />
      <rect x="4" y="3" width="8" height="2" fill="currentColor" />
      <rect x="3" y="5" width="10" height="2" fill="currentColor" opacity="0.9" />
      <rect x="4" y="7" width="8" height="2" fill="currentColor" opacity="0.8" />
      {/* Trunk */}
      <rect x="7" y="9" width="2" height="4" fill="#d97706" />
      {/* Roots */}
      <rect x="5" y="13" width="6" height="2" fill="#d97706" opacity="0.6" />
      {/* Sparkle nodes on the tree */}
      <motion.rect x="5" y="4" width="1" height="1" fill="#ffd700"
        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.rect x="10" y="6" width="1" height="1" fill="#ffd700"
        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.7 }} />
      <motion.rect x="7" y="3" width="1" height="1" fill="#ffd700"
        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 1.3 }} />
    </svg>
  );
}

/** Sparkle stars for Skills/Hobbies */
export function SparklesIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Large star center */}
      <rect x="7" y="2" width="2" height="2" fill="currentColor" />
      <rect x="5" y="4" width="6" height="2" fill="currentColor" />
      <rect x="7" y="6" width="2" height="2" fill="currentColor" />
      {/* Star arms */}
      <rect x="7" y="1" width="2" height="1" fill="currentColor" opacity="0.6" />
      <rect x="4" y="4" width="1" height="2" fill="currentColor" opacity="0.6" />
      <rect x="11" y="4" width="1" height="2" fill="currentColor" opacity="0.6" />
      <rect x="7" y="8" width="2" height="1" fill="currentColor" opacity="0.6" />
      {/* Small sparkle bottom-left */}
      <motion.g animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
        <rect x="2" y="10" width="1" height="3" fill="currentColor" opacity="0.7" />
        <rect x="1" y="11" width="3" height="1" fill="currentColor" opacity="0.7" />
      </motion.g>
      {/* Small sparkle bottom-right */}
      <motion.g animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}>
        <rect x="12" y="9" width="1" height="3" fill="currentColor" opacity="0.7" />
        <rect x="11" y="10" width="3" height="1" fill="currentColor" opacity="0.7" />
      </motion.g>
    </svg>
  );
}

/** Pixel scroll for Stats/Resume */
export function ScrollIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Top roll */}
      <rect x="3" y="1" width="10" height="3" fill="currentColor" />
      <rect x="2" y="2" width="1" height="2" fill="currentColor" opacity="0.7" />
      <rect x="13" y="2" width="1" height="2" fill="currentColor" opacity="0.7" />
      {/* Scroll body */}
      <rect x="4" y="4" width="8" height="8" fill="currentColor" opacity="0.85" />
      {/* Bottom roll */}
      <rect x="3" y="12" width="10" height="3" fill="currentColor" />
      <rect x="2" y="12" width="1" height="2" fill="currentColor" opacity="0.7" />
      <rect x="13" y="12" width="1" height="2" fill="currentColor" opacity="0.7" />
      {/* Text lines */}
      <rect x="5" y="5" width="6" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="5" y="7" width="5" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="5" y="9" width="6" height="1" fill="#0a0e1a" opacity="0.5" />
      <rect x="5" y="11" width="4" height="1" fill="#0a0e1a" opacity="0.5" />
    </svg>
  );
}

/** Pixel castle for Base/Homelab */
export function CastleIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Turret crenellations */}
      <rect x="1" y="1" width="2" height="3" fill="currentColor" />
      <rect x="5" y="1" width="2" height="3" fill="currentColor" />
      <rect x="9" y="1" width="2" height="3" fill="currentColor" />
      <rect x="13" y="1" width="2" height="3" fill="currentColor" />
      {/* Upper wall */}
      <rect x="1" y="4" width="14" height="3" fill="currentColor" opacity="0.9" />
      {/* Lower wall */}
      <rect x="2" y="7" width="12" height="6" fill="currentColor" opacity="0.8" />
      {/* Gate */}
      <rect x="6" y="9" width="4" height="4" fill="#0a0e1a" />
      <rect x="7" y="9" width="2" height="1" fill="#0a0e1a" />
      {/* Gate arch */}
      <rect x="7" y="8" width="2" height="1" fill="currentColor" opacity="0.5" />
      {/* Windows */}
      <motion.rect x="3" y="8" width="2" height="2" fill="#ffd700" opacity="0.6"
        animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 3, repeat: Infinity }} />
      <motion.rect x="11" y="8" width="2" height="2" fill="#ffd700" opacity="0.6"
        animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 3, repeat: Infinity, delay: 1.5 }} />
      {/* Base */}
      <rect x="1" y="13" width="14" height="2" fill="currentColor" />
    </svg>
  );
}

/** Pixel party member silhouette */
export function PartyMemberIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 10 14" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Head */}
      <rect x="3" y="0" width="4" height="4" fill="currentColor" />
      {/* Neck */}
      <rect x="4" y="4" width="2" height="1" fill="currentColor" opacity="0.8" />
      {/* Body */}
      <rect x="2" y="5" width="6" height="5" fill="currentColor" opacity="0.9" />
      {/* Arms */}
      <rect x="0" y="5" width="2" height="4" fill="currentColor" opacity="0.7" />
      <rect x="8" y="5" width="2" height="4" fill="currentColor" opacity="0.7" />
      {/* Legs */}
      <rect x="2" y="10" width="2" height="4" fill="currentColor" opacity="0.8" />
      <rect x="6" y="10" width="2" height="4" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

/** Pixel baby/small party member */
export function BabyMemberIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 10 10" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Head — bigger proportionally */}
      <rect x="2" y="0" width="6" height="4" fill="currentColor" />
      {/* Body */}
      <rect x="3" y="4" width="4" height="3" fill="currentColor" opacity="0.9" />
      {/* Arms */}
      <rect x="1" y="4" width="2" height="2" fill="currentColor" opacity="0.7" />
      <rect x="7" y="4" width="2" height="2" fill="currentColor" opacity="0.7" />
      {/* Legs */}
      <rect x="3" y="7" width="2" height="3" fill="currentColor" opacity="0.8" />
      <rect x="5" y="7" width="2" height="3" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

/** CRT monitor ON (scanlines visible) */
export function CrtOnIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Monitor body */}
      <rect x="1" y="1" width="14" height="10" fill="currentColor" />
      {/* Screen */}
      <rect x="2" y="2" width="12" height="8" fill="#0a0e1a" />
      {/* Scanlines */}
      <motion.g animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
        <rect x="2" y="3" width="12" height="1" fill="#39ff14" opacity="0.3" />
        <rect x="2" y="5" width="12" height="1" fill="#39ff14" opacity="0.2" />
        <rect x="2" y="7" width="12" height="1" fill="#39ff14" opacity="0.3" />
      </motion.g>
      {/* Stand */}
      <rect x="5" y="11" width="6" height="2" fill="currentColor" opacity="0.8" />
      <rect x="4" y="13" width="8" height="2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

/** CRT monitor OFF (flat screen) */
export function CrtOffIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Monitor body — flatter */}
      <rect x="1" y="2" width="14" height="9" fill="currentColor" />
      {/* Screen */}
      <rect x="2" y="3" width="12" height="7" fill="#0a0e1a" />
      {/* Screen content hint */}
      <rect x="4" y="5" width="3" height="1" fill="currentColor" opacity="0.2" />
      <rect x="4" y="7" width="5" height="1" fill="currentColor" opacity="0.15" />
      {/* Stand */}
      <rect x="6" y="11" width="4" height="2" fill="currentColor" opacity="0.8" />
      <rect x="4" y="13" width="8" height="2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

// ─── HOMELAB SPEC ICONS ──────────────────────────────────────────────────────

/** Lightning bolt for Compute */
export function LightningIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      <rect x="8" y="0" width="4" height="2" fill="currentColor" />
      <rect x="6" y="2" width="4" height="2" fill="currentColor" />
      <rect x="4" y="4" width="4" height="2" fill="currentColor" />
      <rect x="3" y="6" width="8" height="2" fill="currentColor" />
      <rect x="7" y="8" width="4" height="2" fill="currentColor" />
      <rect x="5" y="10" width="4" height="2" fill="currentColor" />
      <rect x="3" y="12" width="4" height="2" fill="currentColor" />
      <rect x="2" y="14" width="3" height="2" fill="currentColor" />
    </svg>
  );
}

/** Brain icon for Memory */
export function BrainIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Brain outline */}
      <rect x="4" y="1" width="8" height="2" fill="currentColor" />
      <rect x="2" y="3" width="12" height="2" fill="currentColor" />
      <rect x="1" y="5" width="14" height="4" fill="currentColor" />
      <rect x="2" y="9" width="12" height="2" fill="currentColor" />
      <rect x="3" y="11" width="10" height="2" fill="currentColor" />
      <rect x="5" y="13" width="6" height="2" fill="currentColor" opacity="0.8" />
      {/* Center divide */}
      <rect x="7" y="3" width="2" height="8" fill="#0a0e1a" opacity="0.3" />
      {/* Neural pulses */}
      <motion.rect x="4" y="5" width="2" height="2" fill="#ff2daa" opacity="0.5"
        animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 1.5, repeat: Infinity }} />
      <motion.rect x="10" y="6" width="2" height="2" fill="#00e5ff" opacity="0.5"
        animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} />
    </svg>
  );
}

/** Floppy disk for Storage / Save */
export function FloppyDiskIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Disk body */}
      <rect x="1" y="1" width="14" height="14" fill="currentColor" />
      {/* Metal slider */}
      <rect x="4" y="1" width="8" height="5" fill="currentColor" opacity="0.6" />
      <rect x="6" y="2" width="4" height="3" fill="#0a0e1a" opacity="0.5" />
      {/* Label */}
      <rect x="3" y="8" width="10" height="6" fill="#0a0e1a" opacity="0.3" />
      <rect x="4" y="9" width="8" height="1" fill="currentColor" opacity="0.3" />
      <rect x="4" y="11" width="6" height="1" fill="currentColor" opacity="0.2" />
      {/* Corner notch */}
      <rect x="1" y="1" width="2" height="2" fill="#0a0e1a" opacity="0.2" />
    </svg>
  );
}

/** Gamepad for GPU */
export function GamepadIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Controller body */}
      <rect x="3" y="4" width="10" height="6" fill="currentColor" />
      <rect x="1" y="6" width="3" height="4" fill="currentColor" opacity="0.9" />
      <rect x="12" y="6" width="3" height="4" fill="currentColor" opacity="0.9" />
      {/* Grips */}
      <rect x="1" y="10" width="3" height="3" fill="currentColor" opacity="0.7" />
      <rect x="12" y="10" width="3" height="3" fill="currentColor" opacity="0.7" />
      {/* D-pad */}
      <rect x="4" y="6" width="1" height="3" fill="#0a0e1a" opacity="0.5" />
      <rect x="3" y="7" width="3" height="1" fill="#0a0e1a" opacity="0.5" />
      {/* Buttons */}
      <rect x="10" y="6" width="2" height="1" fill="#ff3333" opacity="0.7" />
      <rect x="11" y="7" width="2" height="1" fill="#4d8cff" opacity="0.7" />
      <rect x="10" y="8" width="2" height="1" fill="#39ff14" opacity="0.7" />
    </svg>
  );
}

/** Globe for Sites */
export function GlobeIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Globe circle */}
      <rect x="4" y="1" width="8" height="2" fill="currentColor" />
      <rect x="2" y="3" width="12" height="2" fill="currentColor" />
      <rect x="1" y="5" width="14" height="2" fill="currentColor" />
      <rect x="1" y="7" width="14" height="2" fill="currentColor" />
      <rect x="2" y="9" width="12" height="2" fill="currentColor" />
      <rect x="4" y="11" width="8" height="2" fill="currentColor" />
      {/* Latitude lines */}
      <rect x="1" y="5" width="14" height="1" fill="#0a0e1a" opacity="0.2" />
      <rect x="1" y="8" width="14" height="1" fill="#0a0e1a" opacity="0.2" />
      {/* Longitude meridian */}
      <rect x="7" y="1" width="2" height="12" fill="#0a0e1a" opacity="0.15" />
      {/* Stand */}
      <rect x="6" y="13" width="4" height="1" fill="currentColor" opacity="0.7" />
      <rect x="5" y="14" width="6" height="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** Padlock for VPN/Security */
export function LockIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Shackle */}
      <rect x="5" y="1" width="6" height="2" fill="currentColor" opacity="0.8" />
      <rect x="4" y="3" width="2" height="4" fill="currentColor" opacity="0.8" />
      <rect x="10" y="3" width="2" height="4" fill="currentColor" opacity="0.8" />
      {/* Lock body */}
      <rect x="2" y="7" width="12" height="8" fill="currentColor" />
      {/* Keyhole */}
      <rect x="7" y="9" width="2" height="2" fill="#0a0e1a" />
      <rect x="7" y="11" width="2" height="2" fill="#0a0e1a" opacity="0.7" />
    </svg>
  );
}

// ─── RESUME PAGE ICONS ───────────────────────────────────────────────────────

/** Hourglass for loading/saving state */
export function HourglassIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Top frame */}
      <rect x="2" y="1" width="12" height="2" fill="currentColor" />
      {/* Top chamber */}
      <rect x="3" y="3" width="10" height="3" fill="currentColor" opacity="0.7" />
      {/* Narrow center */}
      <rect x="6" y="6" width="4" height="2" fill="currentColor" opacity="0.8" />
      {/* Sand falling */}
      <motion.rect x="7" y="7" width="2" height="2" fill="#ffd700"
        animate={{ opacity: [0.3, 0.9, 0.3] }} transition={{ duration: 1, repeat: Infinity }} />
      {/* Bottom chamber */}
      <rect x="3" y="8" width="10" height="3" fill="currentColor" opacity="0.7" />
      {/* Accumulated sand */}
      <motion.rect x="4" y="9" width="8" height="2" fill="#ffd700" opacity="0.4"
        animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 1, repeat: Infinity }} />
      {/* Bottom frame */}
      <rect x="2" y="11" width="12" height="2" fill="currentColor" />
      {/* Frame ornaments */}
      <rect x="1" y="1" width="1" height="2" fill="currentColor" opacity="0.5" />
      <rect x="14" y="1" width="1" height="2" fill="currentColor" opacity="0.5" />
      <rect x="1" y="11" width="1" height="2" fill="currentColor" opacity="0.5" />
      <rect x="14" y="11" width="1" height="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** Office building for Company */
export function OfficeIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Building body */}
      <rect x="3" y="1" width="10" height="14" fill="currentColor" />
      {/* Windows row 1 */}
      <rect x="4" y="3" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      <rect x="7" y="3" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      <rect x="10" y="3" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      {/* Windows row 2 */}
      <rect x="4" y="6" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      <rect x="7" y="6" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      <rect x="10" y="6" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      {/* Windows row 3 */}
      <rect x="4" y="9" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      <rect x="10" y="9" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      {/* Door */}
      <rect x="7" y="11" width="2" height="4" fill="#0a0e1a" />
      {/* Window glow */}
      <motion.rect x="4" y="3" width="2" height="2" fill="#ffd700" opacity="0.2"
        animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 4, repeat: Infinity }} />
    </svg>
  );
}

/** Graduation cap for Education */
export function GradCapIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Cap top — diamond shape */}
      <rect x="7" y="1" width="2" height="2" fill="currentColor" />
      <rect x="5" y="3" width="6" height="2" fill="currentColor" />
      <rect x="3" y="5" width="10" height="2" fill="currentColor" />
      <rect x="1" y="7" width="14" height="2" fill="currentColor" />
      {/* Board brim */}
      <rect x="0" y="7" width="16" height="1" fill="currentColor" opacity="0.9" />
      {/* Band beneath the board */}
      <rect x="4" y="9" width="8" height="3" fill="currentColor" opacity="0.6" />
      {/* Tassel */}
      <rect x="12" y="8" width="2" height="2" fill="#ffd700" />
      <rect x="13" y="10" width="1" height="3" fill="#ffd700" opacity="0.8" />
      <rect x="12" y="13" width="2" height="1" fill="#ffd700" opacity="0.6" />
    </svg>
  );
}

/** Trophy for Achievements */
export function TrophyIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Cup rim */}
      <rect x="2" y="1" width="12" height="2" fill="currentColor" />
      {/* Cup body */}
      <rect x="3" y="3" width="10" height="4" fill="currentColor" />
      <rect x="4" y="7" width="8" height="2" fill="currentColor" />
      {/* Handles */}
      <rect x="0" y="2" width="3" height="2" fill="currentColor" opacity="0.7" />
      <rect x="0" y="4" width="2" height="2" fill="currentColor" opacity="0.6" />
      <rect x="13" y="2" width="3" height="2" fill="currentColor" opacity="0.7" />
      <rect x="14" y="4" width="2" height="2" fill="currentColor" opacity="0.6" />
      {/* Stem */}
      <rect x="7" y="9" width="2" height="3" fill="currentColor" opacity="0.8" />
      {/* Base */}
      <rect x="4" y="12" width="8" height="2" fill="currentColor" />
      <rect x="3" y="14" width="10" height="1" fill="currentColor" opacity="0.7" />
      {/* Star on cup */}
      <motion.rect x="7" y="4" width="2" height="2" fill="#ffd700"
        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
    </svg>
  );
}

// ─── SERVICE ICONS (for homelab_content.json) ────────────────────────────────

/** Film/clapperboard for Plex */
export function FilmIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      <rect x="1" y="2" width="14" height="12" fill="currentColor" />
      {/* Film perforations left */}
      <rect x="2" y="3" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      <rect x="2" y="6" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      <rect x="2" y="9" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      {/* Film perforations right */}
      <rect x="12" y="3" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      <rect x="12" y="6" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      <rect x="12" y="9" width="2" height="2" fill="#0a0e1a" opacity="0.5" />
      {/* Play triangle */}
      <rect x="6" y="5" width="2" height="6" fill="#0a0e1a" opacity="0.4" />
      <rect x="8" y="6" width="2" height="4" fill="#0a0e1a" opacity="0.4" />
      <rect x="10" y="7" width="1" height="2" fill="#0a0e1a" opacity="0.4" />
    </svg>
  );
}

/** TV for Sonarr */
export function TvIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Antenna */}
      <rect x="4" y="0" width="2" height="3" fill="currentColor" opacity="0.7" />
      <rect x="10" y="0" width="2" height="3" fill="currentColor" opacity="0.7" />
      {/* Body */}
      <rect x="1" y="3" width="14" height="9" fill="currentColor" />
      {/* Screen */}
      <rect x="2" y="4" width="12" height="7" fill="#0a0e1a" opacity="0.5" />
      {/* Screen content */}
      <rect x="4" y="6" width="3" height="1" fill="currentColor" opacity="0.2" />
      <rect x="4" y="8" width="5" height="1" fill="currentColor" opacity="0.15" />
      {/* Stand */}
      <rect x="5" y="12" width="6" height="1" fill="currentColor" opacity="0.7" />
      <rect x="4" y="13" width="8" height="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** Movie camera for Radarr */
export function MovieCameraIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Camera body */}
      <rect x="1" y="4" width="10" height="8" fill="currentColor" />
      {/* Lens/viewfinder */}
      <rect x="11" y="5" width="4" height="3" fill="currentColor" opacity="0.8" />
      <rect x="13" y="8" width="2" height="3" fill="currentColor" opacity="0.6" />
      {/* Reels */}
      <rect x="2" y="1" width="4" height="3" fill="currentColor" opacity="0.7" />
      <rect x="7" y="1" width="4" height="3" fill="currentColor" opacity="0.7" />
      {/* Reel centers */}
      <rect x="3" y="2" width="2" height="1" fill="#0a0e1a" opacity="0.4" />
      <rect x="8" y="2" width="2" height="1" fill="#0a0e1a" opacity="0.4" />
      {/* Lens detail */}
      <rect x="3" y="6" width="3" height="3" fill="#0a0e1a" opacity="0.4" />
      <motion.rect x="4" y="7" width="1" height="1" fill="#ff3333" opacity="0.6"
        animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
    </svg>
  );
}

/** Torii gate / anime flag for Sonarr-Anime */
export function AnimeIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Torii top beam */}
      <rect x="0" y="2" width="16" height="2" fill="currentColor" />
      <rect x="1" y="1" width="14" height="1" fill="currentColor" opacity="0.7" />
      {/* Cross beam */}
      <rect x="2" y="5" width="12" height="2" fill="currentColor" opacity="0.9" />
      {/* Pillars */}
      <rect x="3" y="4" width="2" height="12" fill="currentColor" opacity="0.8" />
      <rect x="11" y="4" width="2" height="12" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

/** Magnifying glass for Prowlarr */
export function SearchIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Lens circle */}
      <rect x="3" y="1" width="6" height="2" fill="currentColor" />
      <rect x="1" y="3" width="10" height="2" fill="currentColor" />
      <rect x="1" y="5" width="10" height="2" fill="currentColor" />
      <rect x="3" y="7" width="6" height="2" fill="currentColor" />
      {/* Lens center */}
      <rect x="4" y="3" width="4" height="4" fill="#0a0e1a" opacity="0.3" />
      {/* Glass shine */}
      <rect x="4" y="3" width="2" height="1" fill="currentColor" opacity="0.4" />
      {/* Handle */}
      <rect x="9" y="8" width="2" height="2" fill="currentColor" opacity="0.9" />
      <rect x="11" y="10" width="2" height="2" fill="currentColor" opacity="0.8" />
      <rect x="13" y="12" width="2" height="2" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

/** Clipboard for Seerr */
export function ClipboardIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Clip */}
      <rect x="5" y="0" width="6" height="3" fill="currentColor" opacity="0.8" />
      {/* Board */}
      <rect x="2" y="2" width="12" height="13" fill="currentColor" />
      {/* Paper area */}
      <rect x="3" y="4" width="10" height="10" fill="currentColor" opacity="0.7" />
      {/* Check lines */}
      <rect x="4" y="5" width="2" height="1" fill="#39ff14" opacity="0.6" />
      <rect x="7" y="5" width="5" height="1" fill="#0a0e1a" opacity="0.4" />
      <rect x="4" y="7" width="2" height="1" fill="#39ff14" opacity="0.6" />
      <rect x="7" y="7" width="5" height="1" fill="#0a0e1a" opacity="0.4" />
      <rect x="4" y="9" width="2" height="1" fill="#39ff14" opacity="0.6" />
      <rect x="7" y="9" width="5" height="1" fill="#0a0e1a" opacity="0.4" />
      <rect x="4" y="11" width="8" height="1" fill="#0a0e1a" opacity="0.3" />
    </svg>
  );
}

/** Bar chart for Tautulli */
export function ChartBarIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Bars */}
      <rect x="2" y="8" width="3" height="6" fill="currentColor" opacity="0.7" />
      <rect x="6" y="4" width="3" height="10" fill="currentColor" opacity="0.85" />
      <rect x="10" y="2" width="3" height="12" fill="currentColor" />
      {/* Axis */}
      <rect x="1" y="14" width="14" height="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** Camera for Immich */
export function CameraIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Flash */}
      <rect x="3" y="1" width="4" height="3" fill="currentColor" opacity="0.7" />
      {/* Camera body */}
      <rect x="1" y="4" width="14" height="9" fill="currentColor" />
      {/* Lens outer */}
      <rect x="5" y="6" width="6" height="5" fill="#0a0e1a" opacity="0.5" />
      {/* Lens inner */}
      <rect x="6" y="7" width="4" height="3" fill="currentColor" opacity="0.4" />
      {/* Lens center */}
      <motion.rect x="7" y="8" width="2" height="1" fill="#00e5ff" opacity="0.5"
        animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
      {/* Viewfinder */}
      <rect x="11" y="5" width="3" height="2" fill="#0a0e1a" opacity="0.4" />
    </svg>
  );
}

/** Chart line going up for Grafana */
export function ChartUpIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Line chart path */}
      <rect x="1" y="11" width="2" height="2" fill="currentColor" />
      <rect x="3" y="9" width="2" height="2" fill="currentColor" />
      <rect x="5" y="10" width="2" height="2" fill="currentColor" />
      <rect x="7" y="7" width="2" height="2" fill="currentColor" />
      <rect x="9" y="5" width="2" height="2" fill="currentColor" />
      <rect x="11" y="3" width="2" height="2" fill="currentColor" />
      <rect x="13" y="1" width="2" height="2" fill="currentColor" />
      {/* Axis */}
      <rect x="0" y="13" width="16" height="1" fill="currentColor" opacity="0.4" />
      <rect x="0" y="1" width="1" height="13" fill="currentColor" opacity="0.4" />
      {/* Arrow tip */}
      <rect x="14" y="0" width="1" height="1" fill="currentColor" opacity="0.6" />
      <rect x="12" y="1" width="1" height="1" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

/** Fire/flame for Prometheus */
export function FireIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      <motion.g animate={{ y: [0, -0.5, 0] }} transition={{ duration: 0.8, repeat: Infinity }}>
        {/* Outer flame */}
        <rect x="6" y="0" width="2" height="2" fill="currentColor" opacity="0.7" />
        <rect x="5" y="2" width="4" height="2" fill="currentColor" opacity="0.8" />
        <rect x="4" y="4" width="6" height="2" fill="currentColor" />
        <rect x="3" y="6" width="8" height="2" fill="currentColor" />
        <rect x="3" y="8" width="10" height="2" fill="currentColor" />
        <rect x="2" y="10" width="12" height="2" fill="currentColor" />
        <rect x="3" y="12" width="10" height="2" fill="currentColor" opacity="0.8" />
        <rect x="4" y="14" width="8" height="2" fill="currentColor" opacity="0.6" />
        {/* Inner flame */}
        <rect x="6" y="6" width="4" height="2" fill="#ffd700" opacity="0.5" />
        <rect x="5" y="8" width="6" height="3" fill="#ffd700" opacity="0.4" />
        <rect x="6" y="11" width="4" height="2" fill="#ffd700" opacity="0.3" />
      </motion.g>
    </svg>
  );
}

/** Notepad/memo for Loki */
export function NoteIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Page */}
      <rect x="2" y="1" width="11" height="14" fill="currentColor" />
      {/* Folded corner */}
      <rect x="10" y="1" width="3" height="3" fill="currentColor" opacity="0.6" />
      <rect x="13" y="1" width="1" height="4" fill="currentColor" opacity="0.4" />
      <rect x="10" y="4" width="4" height="1" fill="currentColor" opacity="0.8" />
      {/* Text lines */}
      <rect x="4" y="4" width="5" height="1" fill="#0a0e1a" opacity="0.4" />
      <rect x="4" y="6" width="7" height="1" fill="#0a0e1a" opacity="0.4" />
      <rect x="4" y="8" width="6" height="1" fill="#0a0e1a" opacity="0.4" />
      <rect x="4" y="10" width="7" height="1" fill="#0a0e1a" opacity="0.4" />
      <rect x="4" y="12" width="4" height="1" fill="#0a0e1a" opacity="0.3" />
    </svg>
  );
}

/** Alarm/siren for AlertManager */
export function AlarmIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Light dome */}
      <rect x="5" y="1" width="6" height="2" fill="currentColor" />
      <rect x="4" y="3" width="8" height="4" fill="currentColor" />
      {/* Pulsing light */}
      <motion.rect x="6" y="2" width="4" height="3" fill="#ff3333" opacity="0.5"
        animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 1, repeat: Infinity }} />
      {/* Base */}
      <rect x="3" y="7" width="10" height="3" fill="currentColor" opacity="0.9" />
      <rect x="2" y="10" width="12" height="2" fill="currentColor" />
      {/* Pulse waves */}
      <motion.g animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
        <rect x="1" y="3" width="2" height="1" fill="currentColor" opacity="0.4" />
        <rect x="13" y="3" width="2" height="1" fill="currentColor" opacity="0.4" />
        <rect x="0" y="5" width="2" height="1" fill="currentColor" opacity="0.3" />
        <rect x="14" y="5" width="2" height="1" fill="currentColor" opacity="0.3" />
      </motion.g>
    </svg>
  );
}

/** Telescope for OpenTelemetry */
export function TelescopeIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Eyepiece */}
      <rect x="1" y="1" width="3" height="2" fill="currentColor" opacity="0.8" />
      {/* Tube */}
      <rect x="3" y="2" width="2" height="2" fill="currentColor" />
      <rect x="5" y="3" width="2" height="2" fill="currentColor" />
      <rect x="7" y="4" width="2" height="2" fill="currentColor" />
      <rect x="9" y="5" width="2" height="2" fill="currentColor" />
      {/* Lens */}
      <rect x="11" y="5" width="3" height="3" fill="currentColor" opacity="0.9" />
      <motion.rect x="12" y="6" width="1" height="1" fill="#00e5ff" opacity="0.5"
        animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
      {/* Tripod */}
      <rect x="7" y="7" width="2" height="2" fill="currentColor" opacity="0.7" />
      <rect x="5" y="9" width="2" height="4" fill="currentColor" opacity="0.6" />
      <rect x="9" y="9" width="2" height="4" fill="currentColor" opacity="0.6" />
      <rect x="4" y="13" width="2" height="2" fill="currentColor" opacity="0.5" />
      <rect x="10" y="13" width="2" height="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** Circular arrows for ArgoCD/Sync */
export function SyncIcon({ className, style }: PixelIconProps) {
  return (
    <motion.svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }}
      aria-hidden="true" animate={{ rotate: [0, 360] }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}>
      {/* Top arc */}
      <rect x="5" y="1" width="6" height="2" fill="currentColor" />
      <rect x="10" y="3" width="3" height="2" fill="currentColor" />
      {/* Arrow head top-right */}
      <rect x="12" y="1" width="2" height="2" fill="currentColor" opacity="0.8" />
      <rect x="14" y="2" width="1" height="2" fill="currentColor" opacity="0.6" />
      {/* Right side */}
      <rect x="12" y="5" width="2" height="3" fill="currentColor" />
      {/* Bottom arc */}
      <rect x="5" y="13" width="6" height="2" fill="currentColor" />
      <rect x="3" y="11" width="3" height="2" fill="currentColor" />
      {/* Arrow head bottom-left */}
      <rect x="2" y="13" width="2" height="2" fill="currentColor" opacity="0.8" />
      <rect x="1" y="12" width="1" height="2" fill="currentColor" opacity="0.6" />
      {/* Left side */}
      <rect x="2" y="8" width="2" height="3" fill="currentColor" />
    </motion.svg>
  );
}

/** Web/network globe for Traefik */
export function WebIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Outer ring */}
      <rect x="4" y="0" width="8" height="1" fill="currentColor" />
      <rect x="2" y="1" width="12" height="1" fill="currentColor" />
      <rect x="1" y="2" width="14" height="1" fill="currentColor" />
      <rect x="0" y="3" width="16" height="1" fill="currentColor" />
      <rect x="0" y="4" width="16" height="1" fill="currentColor" />
      <rect x="0" y="5" width="16" height="1" fill="currentColor" />
      {/* Equator highlight */}
      <rect x="0" y="6" width="16" height="1" fill="currentColor" />
      <rect x="0" y="7" width="16" height="2" fill="currentColor" />
      <rect x="0" y="9" width="16" height="1" fill="currentColor" />
      <rect x="0" y="10" width="16" height="1" fill="currentColor" />
      <rect x="1" y="11" width="14" height="1" fill="currentColor" />
      <rect x="2" y="12" width="12" height="1" fill="currentColor" />
      <rect x="4" y="13" width="8" height="1" fill="currentColor" />
      {/* Grid lines */}
      <rect x="7" y="0" width="2" height="14" fill="#0a0e1a" opacity="0.15" />
      <rect x="0" y="4" width="16" height="1" fill="#0a0e1a" opacity="0.15" />
      <rect x="0" y="9" width="16" height="1" fill="#0a0e1a" opacity="0.15" />
      {/* Connection nodes */}
      <motion.rect x="3" y="3" width="2" height="2" fill="#00e5ff" opacity="0.3"
        animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.rect x="11" y="9" width="2" height="2" fill="#00e5ff" opacity="0.3"
        animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
    </svg>
  );
}

/** Key for Pocket ID */
export function KeyIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Key head ring */}
      <rect x="2" y="2" width="6" height="2" fill="currentColor" />
      <rect x="1" y="4" width="2" height="4" fill="currentColor" />
      <rect x="7" y="4" width="2" height="4" fill="currentColor" />
      <rect x="2" y="8" width="6" height="2" fill="currentColor" />
      {/* Key hole */}
      <rect x="3" y="4" width="4" height="4" fill="#0a0e1a" opacity="0.4" />
      {/* Key shaft */}
      <rect x="9" y="5" width="4" height="2" fill="currentColor" />
      {/* Key teeth */}
      <rect x="13" y="5" width="2" height="2" fill="currentColor" />
      <rect x="13" y="7" width="2" height="2" fill="currentColor" opacity="0.8" />
      <rect x="11" y="7" width="2" height="2" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

/** Bucket for Garage S3 */
export function BucketIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Handle */}
      <rect x="4" y="0" width="8" height="1" fill="currentColor" opacity="0.6" />
      <rect x="3" y="1" width="2" height="3" fill="currentColor" opacity="0.6" />
      <rect x="11" y="1" width="2" height="3" fill="currentColor" opacity="0.6" />
      {/* Bucket rim */}
      <rect x="2" y="4" width="12" height="2" fill="currentColor" />
      {/* Bucket body (tapered) */}
      <rect x="2" y="6" width="12" height="3" fill="currentColor" opacity="0.9" />
      <rect x="3" y="9" width="10" height="3" fill="currentColor" opacity="0.85" />
      <rect x="4" y="12" width="8" height="2" fill="currentColor" opacity="0.8" />
      {/* Bottom */}
      <rect x="5" y="14" width="6" height="1" fill="currentColor" opacity="0.7" />
      {/* Band */}
      <rect x="2" y="7" width="12" height="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** Coin/money for NMS */
export function CoinIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Coin circle */}
      <rect x="4" y="1" width="8" height="2" fill="currentColor" />
      <rect x="2" y="3" width="12" height="2" fill="currentColor" />
      <rect x="1" y="5" width="14" height="2" fill="currentColor" />
      <rect x="1" y="7" width="14" height="2" fill="currentColor" />
      <rect x="2" y="9" width="12" height="2" fill="currentColor" />
      <rect x="4" y="11" width="8" height="2" fill="currentColor" />
      {/* Dollar sign / symbol */}
      <rect x="7" y="3" width="2" height="1" fill="#0a0e1a" opacity="0.3" />
      <rect x="5" y="4" width="6" height="1" fill="#0a0e1a" opacity="0.2" />
      <rect x="5" y="5" width="2" height="1" fill="#0a0e1a" opacity="0.3" />
      <rect x="6" y="6" width="4" height="1" fill="#0a0e1a" opacity="0.25" />
      <rect x="9" y="7" width="2" height="1" fill="#0a0e1a" opacity="0.3" />
      <rect x="5" y="8" width="6" height="1" fill="#0a0e1a" opacity="0.2" />
      <rect x="7" y="9" width="2" height="1" fill="#0a0e1a" opacity="0.3" />
      {/* Shine */}
      <motion.rect x="3" y="4" width="1" height="2" fill="#fff" opacity="0.15"
        animate={{ opacity: [0.05, 0.2, 0.05] }} transition={{ duration: 3, repeat: Infinity }} />
    </svg>
  );
}

/** House for Home Assistant */
export function HouseIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ ...style, ...px }} aria-hidden="true">
      {/* Roof peak */}
      <rect x="7" y="1" width="2" height="2" fill="currentColor" />
      <rect x="5" y="3" width="6" height="2" fill="currentColor" />
      <rect x="3" y="5" width="10" height="2" fill="currentColor" />
      <rect x="1" y="7" width="14" height="1" fill="currentColor" />
      {/* Walls */}
      <rect x="2" y="8" width="12" height="7" fill="currentColor" opacity="0.9" />
      {/* Door */}
      <rect x="6" y="11" width="4" height="4" fill="#0a0e1a" opacity="0.5" />
      <rect x="9" y="13" width="1" height="1" fill="#ffd700" opacity="0.5" />
      {/* Window */}
      <motion.rect x="3" y="9" width="3" height="2" fill="#ffd700" opacity="0.4"
        animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 4, repeat: Infinity }} />
      <rect x="10" y="9" width="3" height="2" fill="#0a0e1a" opacity="0.4" />
      {/* Chimney */}
      <rect x="11" y="2" width="2" height="5" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

// ─── SERVICE ICON LOOKUP ─────────────────────────────────────────────────────

/** Map from service icon identifier to component */
export const serviceIconMap: Record<string, ComponentType<PixelIconProps>> = {
  film: FilmIcon,
  tv: TvIcon,
  'movie-camera': MovieCameraIcon,
  anime: AnimeIcon,
  search: SearchIcon,
  clipboard: ClipboardIcon,
  'chart-bar': ChartBarIcon,
  camera: CameraIcon,
  'chart-up': ChartUpIcon,
  fire: FireIcon,
  note: NoteIcon,
  alarm: AlarmIcon,
  telescope: TelescopeIcon,
  sync: SyncIcon,
  web: WebIcon,
  key: KeyIcon,
  lock: LockIcon,
  bucket: BucketIcon,
  coin: CoinIcon,
  house: HouseIcon,
};

// ─── JUAN.EXE ANIMATED LOGO ─────────────────────────────────────────────────

const juanExeChars = 'JUAN.EXE'.split('');

/**
 * Animated JUAN.EXE logo — letters stay still while a fill wave sweeps
 * left-to-right across the name, holds turning gold, then drains right-to-left.
 * Each character gets unique CSS keyframes with per-char fill/drain timing.
 */
export function JuanExeLogo({ className }: { className?: string }) {
  const n = juanExeChars.length; // 8
  const stagger = 3;  // % of cycle between each char's fill/drain start

  // Phase boundaries (% of total cycle)
  // Fill:  chars fill L→R, char 0 starts at fillStart, char n-1 at fillStart + (n-1)*stagger
  // Hold:  all chars fully lit, transitions to gold
  // Drain: chars drain R→L, char n-1 starts first, char 0 starts last
  // Pause: all empty before loop
  const fillStart = 2;
  const fillDur = 15;   // each char takes this % to fill
  const fillEnd = fillStart + (n - 1) * stagger + fillDur; // ~40%
  const holdStart = fillEnd + 2;
  const holdEnd = holdStart + 12;
  const drainStart = holdEnd + 2;
  const drainDur = 15;
  const drainEnd = drainStart + (n - 1) * stagger + drainDur; // ~92%

  // Generate per-character keyframes
  const keyframes = juanExeChars.map((_, i) => {
    const fStart = fillStart + i * stagger;
    const fEnd = fStart + fillDur;
    const dStart = drainStart + (n - 1 - i) * stagger; // reverse order
    const dEnd = dStart + drainDur;

    return `
      @keyframes juanChar${i} {
        0%, ${fStart}% {
          clip-path: inset(0 100% 0 0);
          color: #00e5ff;
          text-shadow: 0 0 4px rgba(0,229,255,0.2);
        }
        ${fEnd}% {
          clip-path: inset(0 0% 0 0);
          color: #00e5ff;
          text-shadow: 0 0 10px rgba(0,229,255,0.7), 0 0 20px rgba(0,229,255,0.3);
        }
        ${holdStart}%, ${holdEnd}% {
          clip-path: inset(0 0% 0 0);
          color: #ffd700;
          text-shadow: 0 0 8px rgba(255,215,0,0.6), 0 0 16px rgba(255,215,0,0.2);
        }
        ${dStart}% {
          clip-path: inset(0 0% 0 0);
          color: #ffd700;
          text-shadow: 0 0 6px rgba(255,215,0,0.3);
        }
        ${dEnd}%, 100% {
          clip-path: inset(0 0% 0 100%);
          color: #00e5ff;
          text-shadow: 0 0 4px rgba(0,229,255,0.2);
        }
      }`;
  }).join('\n');

  return (
    <span className={`inline-flex items-center ${className ?? ''}`}>
      <style dangerouslySetInnerHTML={{ __html: keyframes }} />
      {juanExeChars.map((char, i) => (
        <span
          key={i}
          className="font-pixel text-[11px] inline-block relative"
          style={{ color: 'transparent', WebkitTextStroke: '0.5px rgba(0,229,255,0.35)' }}
        >
          {char}
          <span
            className="absolute inset-0 font-pixel text-[11px]"
            style={{
              animation: `juanChar${i} 10s ease-in-out infinite`,
              clipPath: 'inset(0 100% 0 0)',
            }}
            aria-hidden="true"
          >
            {char}
          </span>
        </span>
      ))}
      {/* Blinking cursor */}
      <span className="font-pixel text-[11px] text-neon-cyan inline-block ml-[1px] animate-blink">
        _
      </span>
    </span>
  );
}
