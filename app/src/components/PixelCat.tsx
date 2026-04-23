import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useAnimationFrame } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

function PixelCat() {
  const [meow, setMeow] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const facingLeftRef = useRef(false);
  const meowTimer = useRef<ReturnType<typeof setTimeout>>();
  const x = useMotionValue(-60);
  const { isRpg, setTheme } = useTheme();

  const speed = 0.8;

  useAnimationFrame(() => {
    const current = x.get();
    const maxX = window.innerWidth + 60;

    if (!facingLeftRef.current) {
      const next = current + speed;
      if (next > maxX) {
        facingLeftRef.current = true;
        setFacingLeft(true);
      } else {
        x.set(next);
      }
    } else {
      const next = current - speed;
      if (next < -60) {
        facingLeftRef.current = false;
        setFacingLeft(false);
      } else {
        x.set(next);
      }
    }
  });

  useEffect(() => {
    return () => clearTimeout(meowTimer.current);
  }, []);

  const handleClick = useCallback(() => {
    if (!isRpg) {
      setTheme('rpg');
      return;
    }
    setMeow(true);
    clearTimeout(meowTimer.current);
    meowTimer.current = setTimeout(() => setMeow(false), 1500);
  }, [isRpg, setTheme]);

  const title = isRpg ? 'meow' : 'unlock pixel mode';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-10 pointer-events-none z-40"
      style={{ contain: 'layout style' }}
    >
      <motion.button
        type="button"
        className="absolute bottom-1 pointer-events-auto cursor-pointer bg-transparent border-0 p-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pro-accent focus-visible:outline-dashed"
        style={{
          x,
          scaleX: facingLeft ? -1 : 1,
          willChange: 'transform',
        }}
        onClick={handleClick}
        title={title}
        aria-label={title}
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
            <rect x="4" y="0" width="3" height="3" fill="#6b7fa3" />
            <rect x="15" y="0" width="3" height="3" fill="#6b7fa3" />
            <rect x="3" y="3" width="16" height="8" fill="#8899b3" />
            <rect x="6" y="5" width="2" height="2" fill="#00e5ff" />
            <rect x="14" y="5" width="2" height="2" fill="#00e5ff" />
            <rect x="10" y="7" width="2" height="1" fill="#ff9fba" />
            <rect x="2" y="11" width="18" height="6" fill="#8899b3" />
            <rect x="3" y="17" width="3" height="3" fill="#6b7fa3" />
            <rect x="8" y="17" width="3" height="3" fill="#6b7fa3" />
            <rect x="13" y="17" width="3" height="3" fill="#6b7fa3" />
            <rect x="17" y="17" width="3" height="3" fill="#6b7fa3" />
            <rect x="20" y="10" width="2" height="2" fill="#6b7fa3" />
            <rect x="22" y="8" width="2" height="2" fill="#6b7fa3" />
          </svg>
        </div>
      </motion.button>
    </div>
  );
}

export default PixelCat;
