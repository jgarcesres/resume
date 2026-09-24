import { Link } from 'react-router-dom';
import type { ComponentType } from 'react';
import PageTransition from '../components/PageTransition';
import PixelPanel from '../components/ui/PixelPanel';
import { LockIcon, type PixelIconProps } from '../components/ui/PixelIcons';
import { useTheme } from '../context/ThemeContext';
import { useLabels } from '../lib/labels';

type LabelKey = keyof ReturnType<typeof useLabels>;

interface Tool {
  to: string;
  titleKey: LabelKey;
  descriptionKey: LabelKey;
  stack: string;
  Icon: ComponentType<PixelIconProps>;
}

// Adding a tool = one entry here + a route in App.tsx.
const tools: Tool[] = [
  {
    to: '/tools/pdf-unlock',
    titleKey: 'pdfUnlockTitle',
    descriptionKey: 'pdfUnlockSub',
    stack: 'Rust · WebAssembly · runs locally',
    Icon: LockIcon,
  },
];

function Tools() {
  const { isRpg } = useTheme();
  const L = useLabels();

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {isRpg ? (
          <div className="space-y-2">
            <h1 className="font-pixel text-lg text-rpg-text-bright">{L.toolsTitle}</h1>
            <p className="font-pixel text-[8px] text-rpg-text-dim">{L.toolsSub}</p>
          </div>
        ) : (
          <div className="pt-4 space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="pro-label">06 / {L.toolsTitle}</span>
              <span className="flex-1 h-px bg-pro-rule" aria-hidden />
            </div>
            <h1 className="pro-display text-[40px] leading-none tracking-tight text-pro-ink">{L.toolsTitle}</h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-pro-muted">{L.toolsSub}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool, i) => (
            <Link key={tool.to} to={tool.to} className="block group">
              <PixelPanel glow="cyan" delay={i * 0.05} className="h-full">
                <tool.Icon className={`w-8 h-8 mb-3 ${isRpg ? 'text-neon-cyan' : 'text-pro-accent'}`} />
                <h2
                  className={
                    isRpg
                      ? 'font-pixel text-[11px] text-rpg-text-bright group-hover:text-neon-gold mb-2'
                      : 'pro-display text-[22px] text-pro-ink group-hover:text-pro-accent mb-2'
                  }
                >
                  {L[tool.titleKey]}
                </h2>
                <p className={isRpg ? 'font-pixel text-[8px] leading-relaxed text-rpg-text' : 'text-[14px] text-pro-ink-soft'}>
                  {L[tool.descriptionKey]}
                </p>
                <p className={isRpg ? 'font-pixel text-[7px] text-rpg-text-dim mt-3' : 'font-mono text-[11px] text-pro-muted mt-3'}>
                  {tool.stack}
                </p>
              </PixelPanel>
            </Link>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}

export default Tools;
