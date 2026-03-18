import { useState } from 'react';
import PageTransition from '../components/PageTransition';
import { Github, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import projectsContent from '@resources/projects_content.json';
import PixelPanel from '../components/ui/PixelPanel';
import PixelBadge from '../components/ui/PixelBadge';

interface Project {
  title: string;
  description: string;
  githubUrl?: string;
  liveUrl?: string;
  technologies: string[];
  features: string[];
}

interface ProjectsContent {
  projects: {
    public: Project[];
  };
  work: Project[];
}

const badgeColors: Record<string, 'cyan' | 'magenta' | 'gold' | 'green' | 'default'> = {
  'React': 'cyan', 'Python': 'green', 'Docker': 'cyan', 'AWS': 'gold',
  'Terraform': 'magenta', 'kubernetes': 'cyan', 'Grafana': 'gold',
  'Prometheus': 'gold', 'EKS': 'gold', 'ECS': 'gold',
};

function Projects() {
  const [activeTab, setActiveTab] = useState<'public' | 'work'>('public');
  const typedContent = projectsContent as ProjectsContent;

  const tabs = [
    { key: 'public' as const, label: 'Side Quests', icon: '⚔️' },
    { key: 'work' as const, label: 'Main Quests', icon: '🏰' },
  ];

  const projects = activeTab === 'public'
    ? typedContent.projects.public
    : typedContent.work;

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-baseline gap-4">
          <h1 className="font-pixel text-lg text-rpg-text-bright">Quest Log</h1>
          <span className="font-pixel text-[8px] text-rpg-text-dim">
            {projects.length} {activeTab === 'public' ? 'side' : 'main'} quests completed
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                font-pixel text-[9px] uppercase px-4 py-2 border-2 transition-all
                ${activeTab === tab.key
                  ? 'border-neon-gold/60 bg-neon-gold/10 text-neon-gold shadow-[3px_3px_0_rgba(255,215,0,0.2)]'
                  : 'border-rpg-border bg-rpg-panel text-rpg-text-dim hover:text-rpg-text hover:border-rpg-border-light'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quest Cards */}
        <div className="space-y-4">
          {projects.map((project, index) => (
            <motion.div
              key={`${activeTab}-${index}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PixelPanel glow={index === 0 ? 'cyan' : 'none'} delay={index * 0.08}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-pixel text-[8px] text-neon-green">✓</span>
                    <h2 className="font-pixel text-xs text-rpg-text-bright uppercase">
                      {project.title}
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rpg-text-dim hover:text-neon-cyan transition-colors"
                        aria-label={`View ${project.title} source`}
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rpg-text-dim hover:text-neon-gold transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <p className="text-sm text-rpg-text font-body mb-4 leading-relaxed">
                  {project.description}
                </p>

                {/* Tech Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.technologies.map((tech, idx) => (
                    <PixelBadge key={idx} color={badgeColors[tech] || 'default'}>
                      {tech}
                    </PixelBadge>
                  ))}
                </div>

                {/* Quest Objectives */}
                {project.features.length > 0 && (
                  <div className="border-t border-rpg-border/50 pt-3">
                    <span className="font-pixel text-[8px] text-rpg-text-dim uppercase mb-2 block">
                      Objectives Completed
                    </span>
                    <ul className="space-y-1">
                      {project.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-rpg-text font-body">
                          <span className="text-neon-green text-[10px] mt-0.5 shrink-0">◆</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </PixelPanel>
            </motion.div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}

export default Projects;
