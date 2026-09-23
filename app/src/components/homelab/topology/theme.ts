// theme.ts — palette tokens for the topology diagram, keyed off the site's
// pro/rpg theme. The diagram is pure SVG, so it needs a richer token set than
// the Tailwind classes used elsewhere (per-link colors, card sub-tones, etc.).
// Values mirror the design handoff (claude.ai/design) and the site's existing
// pro/rpg palettes so the diagram sits cohesively on the page.

import { createContext, useContext } from 'react';

export interface TopologyTheme {
  bg: string;
  surface: string;
  panel: string;
  rule: string;
  ruleStrong: string;
  ink: string;
  inkSoft: string;
  mute: string;
  dim: string;
  accent: string;
  accentLED: string;
  siteFL: string;
  siteMDE: string;
  ts: string;
  tsBusBg: string;
  fontDisplay: string;
  fontBody: string;
  fontMono: string;
  fontLabel: string;
  cardFill: string;
  cardStroke: string;
  cardRadius: number;
  cardSelectedStroke: string;
  cardSelectedFill: string;
  cardLabel: string;
  cardSub: string;
  cardMetaKey: string;
  cardMetaVal: string;
  storageLink: string;
  etcdLink: string;
  cpAccent: string;
  ping: string;
  crt: boolean;
  rendering: 'auto' | 'pixelated';
  siteBgFL: string;
  siteBgMDE: string;
}

const PRO: TopologyTheme = {
  bg: '#0A0C0A',
  surface: '#0E1110',
  panel: '#0E1110',
  rule: '#22261F',
  ruleStrong: '#3E7555',
  ink: '#E8E4DA',
  inkSoft: '#C9CCC2',
  mute: '#9AA0A6',
  dim: '#7A7D72',
  accent: '#5FA97B',
  accentLED: '#3FD771',
  siteFL: '#5FA97B',
  siteMDE: '#E8B339',
  ts: '#E8B339',
  tsBusBg: '#1F1A0E',
  fontDisplay: '"Fraunces", Georgia, serif',
  fontBody: '"Geist", ui-sans-serif, system-ui, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, monospace',
  fontLabel: '"JetBrains Mono", ui-monospace, monospace',
  cardFill: '#171B17',
  cardStroke: '#3E7555',
  cardRadius: 2,
  cardSelectedStroke: '#E8B339',
  cardSelectedFill: '#1F2218',
  cardLabel: '#E8E4DA',
  cardSub: '#7A7D72',
  cardMetaKey: '#5F635B',
  cardMetaVal: '#C9CCC2',
  storageLink: '#5FA97B',
  etcdLink: '#8BB0E0',
  cpAccent: '#8BB0E0',
  ping: '#FFD978',
  crt: false,
  rendering: 'auto',
  siteBgFL: '#10130F',
  siteBgMDE: '#10130F',
};

const RPG: TopologyTheme = {
  bg: '#0a0e1a',
  surface: '#0f1628',
  panel: '#141c33',
  rule: '#2a3a5c',
  ruleStrong: '#3d5a8a',
  ink: '#e8f0ff',
  inkSoft: '#c8d6e5',
  mute: '#8da3c1',
  dim: '#6b7d99',
  accent: '#00e5ff',
  accentLED: '#39ff14',
  siteFL: '#00e5ff',
  siteMDE: '#ffd700',
  ts: '#ffd700',
  tsBusBg: '#1d1a08',
  fontDisplay: '"Press Start 2P", "Silkscreen", monospace',
  fontBody: '"Silkscreen", monospace',
  fontMono: '"Silkscreen", monospace',
  fontLabel: '"Press Start 2P", "Silkscreen", monospace',
  cardFill: '#141c33',
  cardStroke: '#3d5a8a',
  cardRadius: 0,
  cardSelectedStroke: '#ffd700',
  cardSelectedFill: '#1a2548',
  cardLabel: '#e8f0ff',
  cardSub: '#8da3c1',
  cardMetaKey: '#7088a8',
  cardMetaVal: '#c8d6e5',
  storageLink: '#39ff14',
  etcdLink: '#7bb0ff',
  cpAccent: '#7bb0ff',
  ping: '#ffd700',
  crt: true,
  rendering: 'pixelated',
  siteBgFL: '#0d1530',
  siteBgMDE: '#0d1530',
};

export function getTopologyTheme(isRpg: boolean): TopologyTheme {
  return isRpg ? RPG : PRO;
}

// Context so the SVG primitives (icons, LEDs, badges) can read theme tokens
// without prop-drilling through every layer.
export const TopologyThemeContext = createContext<TopologyTheme>(PRO);

export function useTopoTheme(): TopologyTheme {
  return useContext(TopologyThemeContext);
}
