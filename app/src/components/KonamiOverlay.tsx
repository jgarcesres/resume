import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useZeldaSecret } from '../hooks/useZeldaSecret';

interface KonamiOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

function KonamiOverlay({ visible, onDismiss }: KonamiOverlayProps) {
  const navigate = useNavigate();
  const playZeldaSound = useZeldaSecret();

  useEffect(() => {
    if (visible) {
      playZeldaSound();
    }
  }, [visible, playZeldaSound]);

  const handleSecret = () => {
    onDismiss();
    navigate('/credits');
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onDismiss();
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 'var(--z-konami)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Achievement unlocked"
          onKeyDown={handleKeyDown}
          onClick={onDismiss}
        >
          {/* Dark void that closes in */}
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          />

          {/* Zelda-style spotlight — expanding diamond of light */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {/* Radial light burst */}
            <motion.div
              className="absolute"
              style={{
                width: 600,
                height: 600,
                background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 30%, transparent 60%)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1.2], opacity: [0, 0.8, 0.5] }}
              transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            />

            {/* Spinning diamond sparkles */}
            {[...Array(8)].map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const radius = 80;
              return (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    width: 4,
                    height: 4,
                    backgroundColor: '#ffd700',
                    imageRendering: 'pixelated',
                    boxShadow: '0 0 6px #ffd700, 0 0 12px rgba(255,215,0,0.4)',
                  }}
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 0,
                    scale: 0,
                  }}
                  animate={{
                    x: Math.cos(angle) * radius,
                    y: Math.sin(angle) * radius,
                    opacity: [0, 1, 0.6],
                    scale: [0, 2, 1],
                  }}
                  transition={{
                    delay: 0.4 + i * 0.05,
                    duration: 0.6,
                    ease: 'easeOut',
                  }}
                />
              );
            })}

            {/* Vertical light pillar */}
            <motion.div
              className="absolute"
              style={{
                width: 2,
                background: 'linear-gradient(180deg, transparent, rgba(255,215,0,0.6), rgba(255,215,0,0.8), rgba(255,215,0,0.6), transparent)',
              }}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 300, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4, ease: 'easeOut' }}
            />

            {/* Horizontal light bar */}
            <motion.div
              className="absolute"
              style={{
                height: 2,
                background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.6), rgba(255,215,0,0.8), rgba(255,215,0,0.6), transparent)',
              }}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4, ease: 'easeOut' }}
            />
          </motion.div>

          {/* Pixel sparkle particles */}
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 120 + Math.random() * 80;
            return (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute"
                style={{
                  width: 3,
                  height: 3,
                  backgroundColor: i % 3 === 0 ? '#ffd700' : i % 3 === 1 ? '#00e5ff' : '#e8f0ff',
                  imageRendering: 'pixelated',
                }}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                }}
                transition={{
                  delay: 0.6 + i * 0.04,
                  duration: 0.8,
                  ease: 'easeOut',
                }}
              />
            );
          })}

          {/* Achievement modal */}
          <motion.div
            initial={{ scale: 0, opacity: 0, rotateX: 90 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              delay: 0.7,
              type: 'spring',
              stiffness: 200,
              damping: 18,
            }}
            className="relative rpg-border rpg-border-glow-gold p-8 text-center max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pixel Triforce icon */}
            <motion.div
              className="flex justify-center mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, type: 'spring', stiffness: 300, damping: 15 }}
            >
              <svg viewBox="0 0 32 28" width="40" height="35" style={{ imageRendering: 'pixelated' }}>
                <polygon points="16,0 24,14 8,14" fill="#ffd700" />
                <polygon points="8,14 16,28 0,28" fill="#ffd700" />
                <polygon points="24,14 32,28 16,28" fill="#ffd700" />
                <polygon points="16,14 20,21 12,21" fill="#0a0e1a" />
              </svg>
            </motion.div>

            <motion.h2
              className="font-pixel text-sm text-neon-gold mb-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.3 }}
            >
              SECRET DISCOVERED
            </motion.h2>
            <motion.p
              className="font-pixel text-[8px] text-rpg-text-dim mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              ↑ ↑ ↓ ↓ ← → ← → B A
            </motion.p>
            <motion.p
              className="font-body text-sm text-rpg-text mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
            >
              You found the secret! Not many adventurers make it this far.
            </motion.p>
            <motion.div
              className="flex gap-3 justify-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.3 }}
            >
              <button
                onClick={handleSecret}
                className="font-pixel text-[9px] uppercase px-4 py-2 border-2 border-neon-gold/60 bg-neon-gold/10 text-neon-gold hover:bg-neon-gold/20 shadow-[3px_3px_0_rgba(255,215,0,0.3)] active:shadow-[1px_1px_0_rgba(255,215,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] transition-all"
              >
                View Credits
              </button>
              <button
                onClick={onDismiss}
                className="font-pixel text-[9px] uppercase px-4 py-2 border-2 border-rpg-border bg-rpg-panel text-rpg-text-dim hover:text-rpg-text hover:border-rpg-border-light transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default KonamiOverlay;
