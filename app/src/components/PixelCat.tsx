import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useAnimationFrame } from 'framer-motion';

function PixelCat() {
  const [meow, setMeow] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const x = useMotionValue(-60);

  const speed = 0.8; // pixels per frame (~48px/sec at 60fps)

  useAnimationFrame(() => {
    const current = x.get();
    const maxX = window.innerWidth + 60;

    if (!facingLeft) {
      const next = current + speed;
      if (next > maxX) {
        setFacingLeft(true);
      } else {
        x.set(next);
      }
    } else {
      const next = current - speed;
      if (next < -60) {
        setFacingLeft(false);
      } else {
        x.set(next);
      }
    }
  });

  const handleClick = useCallback(() => {
    setMeow(true);
    setTimeout(() => setMeow(false), 1500);
  }, []);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-10 pointer-events-none z-40"
      style={{ contain: 'layout style' }}
    >
      <motion.div
        className="absolute bottom-1 pointer-events-auto cursor-pointer"
        style={{
          x,
          scaleX: facingLeft ? -1 : 1,
          willChange: 'transform',
        }}
        onClick={handleClick}
        title="meow"
      >
        <div className="relative">
          <AnimatePresence>
            {meow && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: -4 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap"
                style={{ scaleX: facingLeft ? -1 : 1 }}
              >
                <span className="font-pixel text-[7px] text-neon-gold bg-rpg-deep border border-neon-gold/40 px-2 py-1">
                  Nya~!
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <svg
            width="24"
            height="20"
            viewBox="0 0 24 20"
            className="pixel-cat"
            style={{ imageRendering: 'pixelated' }}
          >
            {/* Ears */}
            <rect x="4" y="0" width="3" height="3" fill="#6b7fa3" />
            <rect x="15" y="0" width="3" height="3" fill="#6b7fa3" />
            {/* Head */}
            <rect x="3" y="3" width="16" height="8" fill="#8899b3" />
            {/* Eyes */}
            <rect x="6" y="5" width="2" height="2" fill="#00e5ff" />
            <rect x="14" y="5" width="2" height="2" fill="#00e5ff" />
            {/* Nose */}
            <rect x="10" y="7" width="2" height="1" fill="#ff9fba" />
            {/* Body */}
            <rect x="2" y="11" width="18" height="6" fill="#8899b3" />
            {/* Legs */}
            <rect x="3" y="17" width="3" height="3" fill="#6b7fa3" />
            <rect x="8" y="17" width="3" height="3" fill="#6b7fa3" />
            <rect x="13" y="17" width="3" height="3" fill="#6b7fa3" />
            <rect x="17" y="17" width="3" height="3" fill="#6b7fa3" />
            {/* Tail */}
            <rect x="20" y="10" width="2" height="2" fill="#6b7fa3" />
            <rect x="22" y="8" width="2" height="2" fill="#6b7fa3" />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}

export default PixelCat;
