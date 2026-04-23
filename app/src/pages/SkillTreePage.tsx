import PageTransition from '../components/PageTransition';
import PixelPanel from '../components/ui/PixelPanel';
import SkillTree from '../components/SkillTree';
import { useTheme } from '../context/ThemeContext';
import { useLabels } from '../lib/labels';

function SkillTreePage() {
  const { isRpg } = useTheme();
  const L = useLabels();

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Mobile: redirect message */}
        <div className="md:hidden">
          <PixelPanel glow="magenta" className="text-center py-8">
            {isRpg ? (
              <span className="font-pixel text-[9px] text-neon-gold tracking-wider uppercase">
                {L.skillTreeHeader}
              </span>
            ) : (
              <span className="pro-label">{L.skillTreeHeader}</span>
            )}
            <p className={isRpg ? 'text-sm text-rpg-text font-body mt-4' : 'font-sans text-[15px] text-pro-ink mt-4'}>
              {L.skillTreeMobileText}
            </p>
            <p className={isRpg ? 'text-xs text-rpg-text-dim font-body mt-2' : 'font-sans text-[13px] text-pro-muted mt-2'}>
              {L.skillTreeDesktopHint}
            </p>
          </PixelPanel>
        </div>

        {/* Desktop: full skill tree */}
        <div className="hidden md:block space-y-6">
          {isRpg ? (
            <PixelPanel glow="magenta" className="text-center py-4">
              <span className="font-pixel text-[9px] text-neon-gold tracking-wider uppercase">
                {L.skillTreeHeader}
              </span>
              <p className="text-sm text-rpg-text-dim font-body mt-2">
                {L.skillTreeSub}
              </p>
            </PixelPanel>
          ) : (
            <section className="pt-4 pb-2">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="pro-label">05 / {L.skillTreeHeader}</span>
                <span className="flex-1 h-px bg-pro-rule" aria-hidden />
              </div>
              <h1 className="pro-display text-[40px] leading-none tracking-tight text-pro-ink">
                {L.skillTreeHeader}
              </h1>
              <p className="mt-2 font-sans text-[15px] text-pro-muted max-w-2xl">
                {L.skillTreeSub}
              </p>
            </section>
          )}

          <PixelPanel glow="cyan">
            <SkillTree />
          </PixelPanel>
        </div>
      </div>
    </PageTransition>
  );
}

export default SkillTreePage;
