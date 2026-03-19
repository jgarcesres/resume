import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import PixelPanel from '../components/ui/PixelPanel';
import { TrophyIcon, PixelCoffeeIcon, PartyMemberIcon, BabyMemberIcon } from '../components/ui/PixelIcons';

const credits = [
  {
    section: 'Created By',
    entries: ['Juan Garces', 'Site Reliability Mage', 'Medellín → Florida'],
  },
  {
    section: 'Built With',
    entries: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Framer Motion'],
  },
  {
    section: 'Deployed On',
    entries: ['Cloudflare Workers', 'GitHub Actions'],
  },
  {
    section: 'Powered By',
    entries: ['Colombian coffee', 'Late night debugging sessions', 'An unhealthy amount of anime'],
    specialIcons: { 0: 'coffee' },
  },
  {
    section: 'Infrastructure',
    entries: ['K3s cluster across 2 countries', 'Tailscale VPN', '~140TB of storage', 'One very loud Lenovo P520'],
  },
  {
    section: 'Special Thanks',
    entries: ['The open-source community', 'Stack Overflow (obviously)', 'My family for tolerating the server noise'],
  },
  {
    section: 'Party Members',
    entries: ['Juan — Lead Adventurer', 'Wife — Support Healer', 'Kid — Chaos Agent'],
    partyIcons: true,
  },
  {
    section: 'Easter Egg Found By',
    entries: ['You! Thanks for exploring.', '↑ ↑ ↓ ↓ ← → ← → B A'],
  },
];

function Credits() {
  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-2 pb-20">
        <PixelPanel glow="gold" className="text-center py-8 mb-8">
          <span className="flex justify-center mb-3">
            <TrophyIcon className="w-10 h-10 text-neon-gold" style={{ filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.4))' }} />
          </span>
          <h1 className="font-pixel text-lg text-neon-gold mb-2">Credits</h1>
          <p className="font-pixel text-[8px] text-rpg-text-dim">
            — THE END? —
          </p>
        </PixelPanel>

        {credits.map((block, i) => (
          <motion.div
            key={block.section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.3, duration: 0.6 }}
            className="text-center py-4"
          >
            <h2 className="font-pixel text-[10px] text-neon-cyan uppercase mb-3">
              {block.section}
            </h2>
            {block.partyIcons ? (
              <div className="space-y-1">
                {block.entries.map((entry, j) => (
                  <p key={j} className="font-body text-sm text-rpg-text leading-relaxed inline-flex items-center justify-center gap-2 w-full">
                    {j < 2
                      ? <PartyMemberIcon className="w-3 h-[14px] text-rpg-text" />
                      : <BabyMemberIcon className="w-2.5 h-[10px] text-rpg-text" />
                    }
                    {entry}
                  </p>
                ))}
              </div>
            ) : (
              block.entries.map((entry, j) => (
                <p key={j} className="font-body text-sm text-rpg-text leading-relaxed inline-flex items-center justify-center gap-1.5 w-full">
                  {block.specialIcons && block.specialIcons[j as keyof typeof block.specialIcons] === 'coffee' && (
                    <PixelCoffeeIcon className="w-4 h-4 text-neon-gold" />
                  )}
                  {entry}
                </p>
              ))
            )}
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: credits.length * 0.3 + 1 }}
          className="text-center pt-8 pb-12"
        >
          <p className="font-pixel text-[8px] text-rpg-text-dim animate-blink">
            PRESS START TO CONTINUE...
          </p>
        </motion.div>
      </div>
    </PageTransition>
  );
}

export default Credits;
