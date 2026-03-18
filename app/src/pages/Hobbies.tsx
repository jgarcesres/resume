import type { ComponentType, CSSProperties } from 'react';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';
import hobbiesContent from '@resources/hobbies_content.json';
import PixelPanel from '../components/ui/PixelPanel';
import {
  TriforceIcon,
  PixelPotIcon,
  PixelServerIcon,
  PixelCompassIcon,
  PixelCoffeeIcon,
  PixelBookIcon,
} from '../components/ui/PixelIcons';

const iconMap: Record<string, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  Gamepad2: TriforceIcon,
  ChefHat: PixelPotIcon,
  Server: PixelServerIcon,
  Plane: PixelCompassIcon,
  Coffee: PixelCoffeeIcon,
  BookOpen: PixelBookIcon,
};

const colorMap: Record<string, string> = {
  'text-purple-500': '#c084fc',
  'text-red-500': '#f87171',
  'text-green-500': '#39ff14',
  'text-blue-500': '#4d8cff',
  'text-yellow-500': '#ffd700',
  'text-amber-700': '#d97706',
  'text-gray-400': '#9ca3af',
};

function Hobbies() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-baseline gap-4">
          <h1 className="font-pixel text-lg text-rpg-text-bright">Passive Skills</h1>
          <span className="font-pixel text-[8px] text-rpg-text-dim">
            {hobbiesContent.hobbies.length} abilities equipped
          </span>
        </div>

        {/* Hobby Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hobbiesContent.hobbies.map((hobby, index) => {
            const IconComponent = iconMap[hobby.icon];
            const color = colorMap[hobby.iconColor] || '#c8d6e5';

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <PixelPanel className="h-full" delay={index * 0.08}>
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
                      className="mb-3"
                    >
                      {IconComponent && (
                        <IconComponent
                          className="w-10 h-10"
                          style={{ color, filter: `drop-shadow(0 0 6px ${color}40)` }}
                        />
                      )}
                    </motion.div>
                    <h2 className="font-pixel text-[10px] text-rpg-text-bright uppercase mb-2">
                      {hobby.title}
                    </h2>
                    <p className="text-xs text-rpg-text font-body leading-relaxed">
                      {hobby.description}
                    </p>
                  </div>
                </PixelPanel>
              </motion.div>
            );
          })}
        </div>

        {/* Active Side Quests */}
        <PixelPanel title="Active Side Quests" glow="magenta">
          <div className="space-y-4 pt-2">
            {hobbiesContent.projects.map((project, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-3"
              >
                <span className="font-pixel text-[8px] text-neon-gold mt-1 shrink-0 animate-blink">▶</span>
                <div>
                  <h3 className="font-pixel text-[10px] text-rpg-text-bright uppercase">
                    {project.title}
                  </h3>
                  <p className="text-xs text-rpg-text font-body mt-1 leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </PixelPanel>
      </div>
    </PageTransition>
  );
}

export default Hobbies;
