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
  JuanExeLogo,
} from './ui/PixelIcons';
import type { ComponentType, CSSProperties } from 'react';
import { useTheme } from '../context/ThemeContext';
import ShaderSelector from './ShaderSelector';
import type { ShaderPreset } from '../hooks/useShaderPreset';

interface NavItem {
  to: string;
  rpgLabel: string;
  proLabel: string;
  Icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  desktopOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/projects', rpgLabel: 'Quests', proLabel: 'Projects', Icon: CrossedSwordsIcon },
  { to: '/skill-tree', rpgLabel: 'Talents', proLabel: 'Skills', Icon: SkillTreeIcon, desktopOnly: true },
  { to: '/hobbies', rpgLabel: 'Skills', proLabel: 'Hobbies', Icon: SparklesIcon },
  { to: '/resume', rpgLabel: 'Stats', proLabel: 'Resume', Icon: ScrollIcon },
  { to: '/homelab', rpgLabel: 'Base', proLabel: 'Homelab', Icon: CastleIcon },
];

interface NavbarProps {
  shaderPreset: ShaderPreset;
  onShaderPresetChange: (next: ShaderPreset) => void;
}

function ProLogo() {
  return (
    <div className="flex items-baseline gap-2 select-none">
      <span className="pro-display text-[19px] font-medium tracking-tight text-pro-ink">
        Juan Garces
      </span>
      <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.22em] text-pro-accent">
        / SRE
      </span>
    </div>
  );
}

function Navbar({ shaderPreset, onShaderPresetChange }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExitAnimating, setIsExitAnimating] = useState(false);
  const prevMenuOpen = useRef(false);
  const location = useLocation();
  const { isRpg, setTheme } = useTheme();

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

  const navBg = isRpg
    ? 'bg-rpg-deep/95 border-b-2 border-rpg-border shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
    : 'bg-pro-bg/85 border-b border-pro-rule backdrop-saturate-150';

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 backdrop-blur-md ${navBg}`}
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
              {isRpg
                ? <JuanExeLogo className="group-hover:[&>span]:!text-neon-gold" />
                : <ProLogo />}
            </NavLink>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isRpg
                      ? `relative flex items-center gap-2 px-4 py-2 font-pixel text-[9px] uppercase tracking-wider transition-all duration-150 ${
                          isActive
                            ? 'text-neon-gold bg-neon-gold/5'
                            : 'text-rpg-text-dim hover:text-rpg-text-bright'
                        }`
                      : `relative flex items-center gap-2 px-3 py-2 font-sans text-[13px] transition-colors duration-150 ${
                          isActive
                            ? 'text-pro-accent'
                            : 'text-pro-muted hover:text-pro-ink'
                        }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isRpg && isActive && (
                        <motion.span
                          layoutId="nav-arrow"
                          className="text-neon-gold text-[8px] animate-arrow-bounce"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        >
                          ▶
                        </motion.span>
                      )}
                      {isRpg && <item.Icon className="w-4 h-4" />}
                      <span>{isRpg ? item.rpgLabel : item.proLabel}</span>
                      {!isRpg && isActive && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute left-3 right-3 -bottom-[1px] h-px bg-pro-accent"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}

              {/* Right cluster */}
              {isRpg ? (
                <div className="ml-4 pl-4 border-l border-rpg-border flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-[8px] text-rpg-text-dim">PARTY</span>
                    <div className="flex gap-0.5 items-end">
                      <PartyMemberIcon className="w-[10px] h-[14px] text-rpg-text" />
                      <PartyMemberIcon className="w-[10px] h-[14px] text-rpg-text" />
                      <BabyMemberIcon className="w-[8px] h-[10px] text-rpg-text" />
                    </div>
                  </div>
                  <ShaderSelector
                    preset={shaderPreset}
                    onChange={onShaderPresetChange}
                    variant="desktop"
                  />
                  <button
                    onClick={() => setTheme('professional')}
                    className="font-pixel text-[8px] text-rpg-text-dim hover:text-neon-cyan transition-colors ml-2"
                    title="Switch to professional mode"
                  >
                    [ pro ]
                  </button>
                </div>
              ) : (
                <div className="ml-3 pl-3 border-l border-pro-rule">
                  <button
                    onClick={() => setTheme('rpg')}
                    className="font-mono text-[10px] uppercase tracking-[0.18em] text-pro-muted hover:text-pro-accent transition-colors"
                    title="Enter pixel mode"
                  >
                    ↳ pixel mode
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`md:hidden relative z-50 p-2 transition-colors ${
                isRpg
                  ? 'text-rpg-text hover:text-neon-cyan'
                  : 'text-pro-ink hover:text-pro-accent'
              }`}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence onExitComplete={() => setIsExitAnimating(false)}>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isRpg ? 0.7 : 0.75 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 md:hidden bg-black"
              style={{ zIndex: 'var(--z-menu-backdrop)' }}
              onClick={() => setIsMenuOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className={`fixed top-0 right-0 w-64 h-full md:hidden ${
                isRpg
                  ? 'border-l-2 border-rpg-border bg-[#0f1628]'
                  : 'border-l border-pro-rule bg-pro-bg'
              }`}
              style={{ zIndex: 'var(--z-menu-drawer)' }}
            >
              <div className="pt-20 px-4">
                {isRpg ? (
                  <div className="font-pixel text-[9px] text-neon-cyan mb-4 pb-2 border-b border-rpg-border uppercase">
                    ═══ Menu ═══
                  </div>
                ) : (
                  <div className="mb-5 pb-3 border-b border-pro-rule flex items-baseline gap-3">
                    <span className="pro-label">Navigate</span>
                    <span className="flex-1 h-px bg-pro-rule" />
                  </div>
                )}

                <div className="space-y-1">
                  {navItems.filter((item) => !item.desktopOnly).map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        isRpg
                          ? `flex items-center gap-3 px-3 py-3 font-pixel text-[10px] uppercase border border-transparent transition-all ${
                              isActive
                                ? 'text-neon-gold border-neon-gold/20 bg-neon-gold/5'
                                : 'text-rpg-text-dim hover:text-rpg-text hover:bg-rpg-panel'
                            }`
                          : `flex items-center justify-between px-3 py-3 font-sans text-[14px] border-b border-pro-rule/60 transition-colors ${
                              isActive ? 'text-pro-accent' : 'text-pro-ink hover:text-pro-accent'
                            }`
                      }
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {({ isActive }) => (
                        <>
                          {isRpg ? (
                            <>
                              {isActive && <span className="text-neon-gold text-[8px]">▶</span>}
                              <item.Icon className="w-4 h-4" />
                              <span>{item.rpgLabel}</span>
                            </>
                          ) : (
                            <>
                              <span>{item.proLabel}</span>
                              <span className={`font-mono text-[10px] ${isActive ? 'text-pro-accent' : 'text-pro-muted'}`}>
                                {isActive ? '●' : '→'}
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>

                {/* Mobile controls */}
                {isRpg ? (
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
                    <ShaderSelector
                      preset={shaderPreset}
                      onChange={onShaderPresetChange}
                      variant="mobile"
                    />
                    <button
                      onClick={() => { setTheme('professional'); setIsMenuOpen(false); }}
                      className="font-pixel text-[8px] text-neon-cyan hover:text-neon-gold transition-colors"
                    >
                      [ exit to pro mode ]
                    </button>
                  </div>
                ) : (
                  <div className="mt-8">
                    <button
                      onClick={() => { setTheme('rpg'); setIsMenuOpen(false); }}
                      className="font-mono text-[11px] uppercase tracking-[0.18em] text-pro-muted hover:text-pro-accent transition-colors"
                    >
                      ↳ pixel mode
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
