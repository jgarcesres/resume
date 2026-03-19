import PageTransition from '../components/PageTransition';
import PixelPanel from '../components/ui/PixelPanel';
import SkillTree from '../components/SkillTree';

function SkillTreePage() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Mobile: redirect message */}
        <div className="md:hidden">
          <PixelPanel glow="magenta" className="text-center py-8">
            <span className="font-pixel text-[9px] text-neon-gold tracking-wider uppercase">
              ── Skill Tree ──
            </span>
            <p className="text-sm text-rpg-text font-body mt-4">
              The interactive skill tree requires a larger screen.
            </p>
            <p className="text-xs text-rpg-text-dim font-body mt-2">
              Visit on desktop to explore the full talent tree.
            </p>
          </PixelPanel>
        </div>

        {/* Desktop: full skill tree */}
        <div className="hidden md:block space-y-6">
          <PixelPanel glow="magenta" className="text-center py-4">
            <span className="font-pixel text-[9px] text-neon-gold tracking-wider uppercase">
              ── Skill Tree ──
            </span>
            <p className="text-sm text-rpg-text-dim font-body mt-2">
              Hover over nodes to explore abilities. Connected skills share synergy.
            </p>
          </PixelPanel>

          <PixelPanel glow="cyan">
            <SkillTree />
          </PixelPanel>
        </div>
      </div>
    </PageTransition>
  );
}

export default SkillTreePage;
