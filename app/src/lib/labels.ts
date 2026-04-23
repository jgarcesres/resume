import { useTheme } from '../context/ThemeContext';

const rpgLabels = {
  classLine: '── Class: Site Reliability Mage ──',
  classTitle: 'Site Reliability Mage',
  abilities: 'Abilities',
  questLog: 'Quest Log',
  sideQuests: 'Side Quests',
  mainQuests: 'Main Quests',
  questsCompletedSide: 'side quests completed',
  questsCompletedMain: 'main quests completed',
  objectivesCompleted: 'Objectives Completed',
  passiveSkills: 'Passive Skills',
  abilitiesEquipped: 'abilities equipped',
  activeSideQuests: 'Active Side Quests',
  adventureLog: 'Adventure Log',
  trainingGrounds: 'Training Grounds',
  achievementsUnlocked: 'Achievements Unlocked',
  inventory: 'Inventory',
  saveGame: 'Save Game (PDF)',
  saveGameLoading: 'Saving...',
  techArsenal: 'Tech Arsenal',
  skillTreeHeader: '── Skill Tree ──',
  skillTreeSub: 'Hover over nodes to explore abilities. Connected skills share synergy.',
  skillTreeDesktopHint: 'Visit on desktop to explore the full talent tree.',
  skillTreeMobileText: 'The interactive skill tree requires a larger screen.',
  credits: 'Credits',
  creditsEnd: '— THE END? —',
  pressStart: 'PRESS START TO CONTINUE...',
} as const;

const proLabels: typeof rpgLabels = {
  classLine: 'Site Reliability Engineer',
  classTitle: 'Site Reliability Engineer',
  abilities: 'Core Competencies',
  questLog: 'Projects',
  sideQuests: 'Personal',
  mainQuests: 'Professional',
  questsCompletedSide: 'personal projects',
  questsCompletedMain: 'professional engagements',
  objectivesCompleted: 'Key Deliverables',
  passiveSkills: 'Hobbies & Interests',
  abilitiesEquipped: 'pursuits',
  activeSideQuests: 'Current Projects',
  adventureLog: 'Experience',
  trainingGrounds: 'Education',
  achievementsUnlocked: 'Certifications',
  inventory: 'Skills & Technologies',
  saveGame: 'Download Resume (PDF)',
  saveGameLoading: 'Preparing…',
  techArsenal: 'Technology Stack',
  skillTreeHeader: 'Technical Skills',
  skillTreeSub: 'Hover over nodes to explore skills. Connected items show related expertise.',
  skillTreeDesktopHint: 'Visit on desktop for the full interactive view.',
  skillTreeMobileText: 'The interactive skill map requires a larger screen.',
  credits: 'Colophon',
  creditsEnd: '— end —',
  pressStart: 'Thank you for reading.',
} as const;

export function useLabels(): typeof rpgLabels {
  const { isRpg } = useTheme();
  return isRpg ? rpgLabels : proLabels;
}
