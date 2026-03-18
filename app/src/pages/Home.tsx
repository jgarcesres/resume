import { useState } from 'react';
import PageTransition from '../components/PageTransition';
import { Github, Linkedin } from 'lucide-react';
import { motion } from 'framer-motion';
import homeContentData from '@resources/home_content.json';
import PixelPanel from '../components/ui/PixelPanel';
import StatBar from '../components/ui/StatBar';
import TypewriterText from '../components/ui/TypewriterText';

interface Skill {
  title: string;
  description: string;
}

interface HomeContent {
  title: string;
  subtitle: string;
  skills: Skill[];
  socials: {
    linkedin: string;
    github: string;
  };
}

const homeContent: HomeContent = homeContentData;

const skillLevels: Record<string, { level: number; color: 'green' | 'blue' | 'gold' | 'magenta' | 'cyan' }> = {
  'DevOps': { level: 95, color: 'cyan' },
  'Automation': { level: 90, color: 'green' },
  'Infrastructure': { level: 92, color: 'blue' },
  'Monitoring': { level: 88, color: 'gold' },
  'Security': { level: 85, color: 'magenta' },
  'Identity': { level: 82, color: 'cyan' },
};

function Home() {
  const [introComplete, setIntroComplete] = useState(false);

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero — Character Intro */}
        <PixelPanel glow="cyan" className="text-center py-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <span className="font-pixel text-[9px] text-neon-gold tracking-wider uppercase">
              ── Class: Site Reliability Mage ──
            </span>
          </motion.div>

          <h1 className="font-pixel text-xl md:text-2xl text-rpg-text-bright mb-6 leading-relaxed">
            <TypewriterText
              text={homeContent.title}
              speed={45}
              delay={500}
              onComplete={() => setIntroComplete(true)}
            />
          </h1>

          {introComplete && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="text-sm md:text-base text-rpg-text max-w-2xl mx-auto leading-relaxed font-body"
            >
              {homeContent.subtitle}
            </motion.p>
          )}
        </PixelPanel>

        {/* Inventory — Social Links */}
        <div className="flex justify-center gap-4">
          {[
            { href: homeContent.socials.github, Icon: Github, label: 'GitHub', color: 'cyan' },
            { href: homeContent.socials.linkedin, Icon: Linkedin, label: 'LinkedIn', color: 'gold' },
          ].map(({ href, Icon, label, color }) => (
            <motion.a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`
                rpg-border flex items-center gap-3 px-5 py-3 transition-all group
                ${color === 'cyan' ? 'rpg-hover-cyan' : 'rpg-hover-gold'}
              `}
            >
              <Icon className={`w-5 h-5 ${color === 'cyan' ? 'text-neon-cyan' : 'text-neon-gold'} group-hover:drop-shadow-lg`} />
              <span className="font-pixel text-[9px] text-rpg-text-dim group-hover:text-rpg-text-bright uppercase">
                {label}
              </span>
            </motion.a>
          ))}
        </div>

        {/* Stat Bars — Skills */}
        <PixelPanel title="Abilities" glow="gold">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-2">
            {homeContent.skills.map((skill: Skill, index: number) => {
              const sl = skillLevels[skill.title] || { level: 75, color: 'green' as const };
              return (
                <div key={index}>
                  <StatBar
                    label={skill.title}
                    level={sl.level}
                    color={sl.color}
                    delay={0.3 + index * 0.15}
                  />
                  <p className="text-[11px] text-rpg-text-dim mt-1 font-body">{skill.description}</p>
                </div>
              );
            })}
          </div>
        </PixelPanel>

        {/* HUD Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex justify-center gap-6 text-rpg-text-dim font-pixel text-[8px]"
        >
          <span>HP ████████ 100%</span>
          <span>│</span>
          <span>STATUS: <span className="text-neon-green">ADVENTURING</span></span>
          <span>│</span>
          <span>EXP: <span className="text-neon-gold">∞</span></span>
        </motion.div>
      </div>
    </PageTransition>
  );
}

export default Home;
