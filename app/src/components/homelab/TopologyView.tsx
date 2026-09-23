// TopologyView — the /homelab topology figure with a 2D ⇄ 3D switch.
//
// 2D (TopologyDiagram, SVG) is the default and the only option in RPG mode —
// the 3D scene has no pixel-art treatment yet. The 3D view is code-split so
// three.js is only fetched when someone asks for it, and it falls back to 2D
// if the browser can't create a WebGL context.

import { Suspense, lazy, useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import TopologyDiagram from './TopologyDiagram';

const Topology3D = lazy(() => import('./topology3d/Topology3D'));

type Mode = '2d' | '3d';

function Loading3D() {
  return (
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

  if (isRpg) return <TopologyDiagram />;

  const btn = (m: Mode, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === m}
      disabled={m === '3d' && webglFailed}
      onClick={() => setMode(m)}
      className={
        'px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ' +
        (mode === m ? 'bg-pro-accent text-pro-bg' : 'text-pro-muted hover:text-pro-ink')
      }
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-3">
        {webglFailed && <span className="font-mono text-[10px] text-pro-muted">3D needs WebGL, which this browser didn't provide</span>}
        <div role="radiogroup" aria-label="Topology view" className="inline-flex border border-pro-rule bg-pro-surface">
          {btn('2d', '2D')}
          {btn('3d', '3D')}
        </div>
      </div>
      {mode === '3d' ? (
        <Suspense fallback={<Loading3D />}>
          <Topology3D onUnsupported={onUnsupported} />
        </Suspense>
      ) : (
        <TopologyDiagram />
      )}
    </div>
  );
}

export default TopologyView;
