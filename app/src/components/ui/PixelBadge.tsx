import { useTheme } from '../../context/ThemeContext';

interface PixelBadgeProps {
  children: string;
  color?: 'cyan' | 'magenta' | 'gold' | 'green' | 'default';
}

const rpgColorMap = {
  cyan: 'border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10',
  magenta: 'border-neon-magenta/40 text-neon-magenta bg-neon-magenta/10',
  gold: 'border-neon-gold/40 text-neon-gold bg-neon-gold/10',
  green: 'border-neon-green/40 text-neon-green bg-neon-green/10',
  default: 'border-rpg-border text-rpg-text bg-rpg-panel',
};

// Professional: monospace tags on dark surface, fern-green accent, cream on hover.
const proColorMap = {
  cyan: 'border-pro-rule-strong text-pro-ink-soft bg-transparent',
  magenta: 'border-pro-accent-soft text-pro-accent bg-pro-accent-tint',
  gold: 'border-pro-accent text-pro-accent bg-pro-accent-tint',
  green: 'border-pro-accent text-pro-bg bg-pro-accent',
  default: 'border-pro-rule-strong text-pro-muted bg-transparent',
};

function PixelBadge({ children, color = 'default' }: PixelBadgeProps) {
  const { isRpg } = useTheme();

  if (isRpg) {
    return (
      <span
        className={`
          inline-block px-2 py-1 text-[10px] font-pixel uppercase
          border ${rpgColorMap[color]}
          shadow-pixel-sm
        `}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={`
        inline-block px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.14em]
        border ${proColorMap[color]}
      `}
    >
      {children}
    </span>
  );
}

export default PixelBadge;
