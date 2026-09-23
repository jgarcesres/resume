// TopologyView — the /homelab topology figure with a 2D ⇄ 3D switch.
//
// 2D (TopologyDiagram, SVG) is the default. "3D" is the three.js scene in pro
// mode and its HD-2D pixel-art counterpart in RPG mode. Both are code-split so
// three.js is only fetched when someone asks for it, and both fall back to 2D
// if the browser can't create a WebGL context.

import { Suspense, lazy, useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import TopologyDiagram from './TopologyDiagram';

const Topology3D = lazy(() => import('./topology3d/Topology3D'));
const TopologyPixel = lazy(() => import('./topologyPixel/TopologyPixel'));

type Mode = '2d' | '3d';

function Loading3D({ rpg }: { rpg: boolean }) {
  return rpg ? (
    <div className="h-[620px] max-md:h-[560px] grid place-items-center bg-[#0a0e1a] border border-rpg-border">
      <span className="font-pixel text-[8px] uppercase text-rpg-text-dim">Loading world map…</span>
    </div>
  ) : (
    <div className="h-[580px] max-md:h-[400px] grid place-items-center bg-[#0A0C0A] border border-pro-rule">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-pro-muted">Loading 3D scene…</span>
    </div>
  );
}

function TopologyView() {
  const { isRpg } = useTheme();
  const [mode, setMode] = useState<Mode>('2d');
  const [webglFailed, setWebglFailed] = useState(false);
  const onUnsupported = useCallback(() => { setWebglFailed(true); setMode('2d'); }, []);

  const btn = (m: Mode, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === m}
      disabled={m === '3d' && webglFailed}
      onClick={() => setMode(m)}
      className={
        (isRpg
          ? 'px-3 py-1.5 font-pixel text-[8px] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed ' +
            (mode === m ? 'bg-neon-cyan/15 text-neon-gold' : 'text-rpg-text-dim hover:text-rpg-text-bright')
          : 'px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ' +
            (mode === m ? 'bg-pro-accent text-pro-bg' : 'text-pro-muted hover:text-pro-ink'))
      }
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-3">
        {webglFailed && (
          <span className={isRpg ? 'font-body text-[10px] text-rpg-text-dim' : 'font-mono text-[10px] text-pro-muted'}>
            3D needs WebGL, which this browser didn't provide
          </span>
        )}
        <div role="radiogroup" aria-label="Topology view"
          className={isRpg ? 'inline-flex border-2 border-rpg-border bg-rpg-panel' : 'inline-flex border border-pro-rule bg-pro-surface'}>
          {btn('2d', '2D')}
          {btn('3d', '3D')}
        </div>
      </div>
      {mode === '3d' ? (
        <Suspense fallback={<Loading3D rpg={isRpg} />}>
          {isRpg ? <TopologyPixel onUnsupported={onUnsupported} /> : <Topology3D onUnsupported={onUnsupported} />}
        </Suspense>
      ) : (
        <TopologyDiagram />
      )}
    </div>
  );
}

export default TopologyView;
