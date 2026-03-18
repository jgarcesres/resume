interface PixelBadgeProps {
  children: string;
  color?: 'cyan' | 'magenta' | 'gold' | 'green' | 'default';
}

const colorMap = {
  cyan: 'border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10',
  magenta: 'border-neon-magenta/40 text-neon-magenta bg-neon-magenta/10',
  gold: 'border-neon-gold/40 text-neon-gold bg-neon-gold/10',
  green: 'border-neon-green/40 text-neon-green bg-neon-green/10',
  default: 'border-rpg-border text-rpg-text bg-rpg-panel',
};

function PixelBadge({ children, color = 'default' }: PixelBadgeProps) {
  return (
    <span className={`
      inline-block px-2 py-1 text-[10px] font-pixel uppercase
      border ${colorMap[color]}
      shadow-pixel-sm
    `}>
      {children}
    </span>
  );
}

export default PixelBadge;
