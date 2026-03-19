import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CrossedSwordsIcon,
  SkillTreeIcon,
  SparklesIcon,
  ScrollIcon,
  CastleIcon,
  PartyMemberIcon,
  BabyMemberIcon,
  CrtOnIcon,
  CrtOffIcon,
  JuanExeLogo,
} from './ui/PixelIcons';
import type { ComponentType, CSSProperties } from 'react';

interface NavItem {
  to: string;
  label: string;
  Icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  desktopOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/projects', label: 'Quests', Icon: CrossedSwordsIcon },
  { to: '/skill-tree', label: 'Talents', Icon: SkillTreeIcon, desktopOnly: true },
  { to: '/hobbies', label: 'Skills', Icon: SparklesIcon },
  { to: '/resume', label: 'Stats', Icon: ScrollIcon },
  { to: '/homelab', label: 'Base', Icon: CastleIcon },
];

interface NavbarProps {
  onToggleCrt?: () => void;
  crtEnabled?: boolean;
}

function Navbar({ onToggleCrt, crtEnabled }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExitAnimating, setIsExitAnimating] = useState(false);
  const prevMenuOpen = useRef(false);
  const location = useLocation();

  const isMenuVisible = isMenuOpen || isExitAnimating;

  useEffect(() => {
    if (prevMenuOpen.current && !isMenuOpen) setIsExitAnimating(true);
    prevMenuOpen.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuVisible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isMenuVisible]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = () => { if (mq.matches) setIsMenuOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 bg-rpg-deep/95 backdrop-blur-sm border-b-2 border-rpg-border shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
        style={{ zIndex: isMenuOpen ? 'var(--z-nav-open)' : 'var(--z-nav)' }}
      >
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo / Home */}
            <NavLink
              to="/"
              className="flex items-center gap-2 relative z-50 group"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <JuanExeLogo className="group-hover:[&>span]:!text-neon-gold" />
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
                      <item.Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}

              {/* Party Members indicator */}
              <div className="ml-4 pl-4 border-l border-rpg-border flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[8px] text-rpg-text-dim">PARTY</span>
                  <div className="flex gap-0.5 items-end">
                    <PartyMemberIcon className="w-[10px] h-[14px] text-rpg-text" />
                    <PartyMemberIcon className="w-[10px] h-[14px] text-rpg-text" />
                    <BabyMemberIcon className="w-[8px] h-[10px] text-rpg-text" />
                  </div>
                </div>
                {onToggleCrt && (
                  <button
                    onClick={onToggleCrt}
                    className="text-rpg-text-dim hover:text-rpg-text transition-colors"
                    title={crtEnabled ? 'Disable CRT effect' : 'Enable CRT effect'}
                    aria-label={crtEnabled ? 'Disable CRT effect' : 'Enable CRT effect'}
                  >
                    {crtEnabled
                      ? <CrtOnIcon className="w-4 h-4" />
                      : <CrtOffIcon className="w-4 h-4" />
                    }
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden relative z-50 p-2 text-rpg-text hover:text-neon-cyan transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu — RPG Inventory Style (outside nav to escape its stacking context) */}
      <AnimatePresence onExitComplete={() => setIsExitAnimating(false)}>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black md:hidden"
              style={{ zIndex: 'var(--z-menu-backdrop)' }}
              onClick={() => setIsMenuOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed top-0 right-0 w-64 h-full md:hidden border-l-2 border-rpg-border bg-[#0f1628]"
              style={{ zIndex: 'var(--z-menu-drawer)' }}
            >
              <div className="pt-20 px-4">
                <div className="font-pixel text-[9px] text-neon-cyan mb-4 pb-2 border-b border-rpg-border uppercase">
                  ═══ Menu ═══
                </div>
                <div className="space-y-1">
                  {navItems.filter((item) => !item.desktopOnly).map((item) => (
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
                          <item.Icon className="w-4 h-4" />
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
                    <div className="flex items-end gap-2">
                      <PartyMemberIcon className="w-3 h-[18px] text-rpg-text" />
                      <PartyMemberIcon className="w-3 h-[18px] text-rpg-text" />
                      <BabyMemberIcon className="w-2.5 h-[14px] text-rpg-text" />
                      <span className="font-pixel text-[8px] text-rpg-text-dim ml-2">× 3</span>
                    </div>
                  </div>
                  {onToggleCrt && (
                    <button
                      onClick={onToggleCrt}
                      className="flex items-center gap-2 font-pixel text-[8px] text-rpg-text-dim hover:text-rpg-text transition-colors"
                    >
                      {crtEnabled
                        ? <CrtOnIcon className="w-4 h-4" />
                        : <CrtOffIcon className="w-4 h-4" />
                      }
                      <span>CRT {crtEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
