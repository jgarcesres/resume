import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { to: '/projects', label: 'Quests', icon: '⚔️' },
  { to: '/hobbies', label: 'Skills', icon: '✨' },
  { to: '/resume', label: 'Stats', icon: '📜' },
  { to: '/homelab', label: 'Base', icon: '🏰' },
];

interface NavbarProps {
  onToggleCrt?: () => void;
  crtEnabled?: boolean;
}

function Navbar({ onToggleCrt, crtEnabled }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-rpg-deep/95 backdrop-blur-sm border-b-2 border-rpg-border shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
    >
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Home */}
          <NavLink
            to="/"
            className="flex items-center gap-2 relative z-50 group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span className="text-lg">⚡</span>
            <span className="font-pixel text-[11px] text-neon-cyan group-hover:text-neon-gold transition-colors">
              JUAN.EXE
            </span>
          </NavLink>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  relative flex items-center gap-2 px-4 py-2 font-pixel text-[9px] uppercase tracking-wider
                  transition-all duration-150
                  ${isActive
                    ? 'text-neon-gold bg-neon-gold/5'
                    : 'text-rpg-text-dim hover:text-rpg-text-bright'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-arrow"
                        className="text-neon-gold text-[8px] animate-arrow-bounce"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      >
                        ▶
                      </motion.span>
                    )}
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}

            {/* Party Members indicator */}
            <div className="ml-4 pl-4 border-l border-rpg-border flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[8px] text-rpg-text-dim">PARTY</span>
                <div className="flex gap-0.5">
                  <span className="text-[10px]">👤</span>
                  <span className="text-[10px]">👤</span>
                  <span className="text-[8px]">👶</span>
                </div>
              </div>
              {onToggleCrt && (
                <button
                  onClick={onToggleCrt}
                  className="font-pixel text-[7px] text-rpg-text-dim hover:text-rpg-text transition-colors"
                  title={crtEnabled ? 'Disable CRT effect' : 'Enable CRT effect'}
                  aria-label={crtEnabled ? 'Disable CRT effect' : 'Enable CRT effect'}
                >
                  {crtEnabled ? '📺' : '🖥️'}
                </button>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden relative z-50">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-rpg-text hover:text-neon-cyan transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu — RPG Inventory Style */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black md:hidden z-[10000]"
              onClick={() => setIsMenuOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed top-0 right-0 w-64 h-full md:hidden z-[10001] border-l-2 border-rpg-border"
              style={{ backgroundColor: '#0f1628' }}
            >
              <div className="pt-20 px-4">
                <div className="font-pixel text-[9px] text-neon-cyan mb-4 pb-2 border-b border-rpg-border uppercase">
                  ═══ Menu ═══
                </div>
                <div className="space-y-1">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-3 font-pixel text-[10px] uppercase
                        border border-transparent transition-all
                        ${isActive
                          ? 'text-neon-gold border-neon-gold/20 bg-neon-gold/5'
                          : 'text-rpg-text-dim hover:text-rpg-text hover:bg-rpg-panel'
                        }
                      `}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <span className="text-neon-gold text-[8px]">▶</span>}
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>

                {/* Party Members + CRT toggle in mobile */}
                <div className="mt-8 pt-4 border-t border-rpg-border space-y-4">
                  <div>
                    <div className="font-pixel text-[8px] text-rpg-text-dim mb-2">PARTY MEMBERS</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>👤</span><span>👤</span><span>👶</span>
                      <span className="font-pixel text-[8px] text-rpg-text-dim ml-2">× 3</span>
                    </div>
                  </div>
                  {onToggleCrt && (
                    <button
                      onClick={onToggleCrt}
                      className="flex items-center gap-2 font-pixel text-[8px] text-rpg-text-dim hover:text-rpg-text transition-colors"
                    >
                      <span>{crtEnabled ? '📺' : '🖥️'}</span>
                      <span>CRT {crtEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default Navbar;
