import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  targetY: number;
  rotation: number;
  duration: number;
  delay: number;
}

interface KonamiOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

function KonamiOverlay({ visible, onDismiss }: KonamiOverlayProps) {
  const navigate = useNavigate();
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!visible) {
      setParticles([]);
      return;
    }

    const colors = ['#00e5ff', '#ff2daa', '#ffd700', '#39ff14', '#4d8cff'];
    setParticles(
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 8,
        targetY: -100 - Math.random() * 200,
        rotation: Math.random() * 720,
        duration: 2 + Math.random(),
        delay: Math.random() * 0.5,
      })),
    );
  }, [visible]);

  const handleSecret = () => {
    onDismiss();
    navigate('/credits');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          onClick={onDismiss}
        >
          <div className="absolute inset-0 bg-black/80" />

          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                imageRendering: 'pixelated',
              }}
              initial={{ opacity: 0, scale: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0, 1.5, 1, 0.5],
                y: [0, p.targetY],
                rotate: p.rotation,
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: 'easeOut',
              }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
            className="relative rpg-border rpg-border-glow-gold p-8 text-center max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-4">🎮</div>
            <h2 className="font-pixel text-sm text-neon-gold mb-3">
              ACHIEVEMENT UNLOCKED
            </h2>
            <p className="font-pixel text-[8px] text-rpg-text-dim mb-2">
              ↑ ↑ ↓ ↓ ← → ← → B A
            </p>
            <p className="font-body text-sm text-rpg-text mb-6">
              You found the secret! Not many adventurers make it this far.
            </p>
            <div className="flex gap-3 justify-center">
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default KonamiOverlay;
