// Topology3D — three.js view of the homelab: two site plinths, the physical →
// VM → k3s tiers stacked above them and the tailnet plane on top. The scene
// itself lives in scene.ts; this component owns the HUD (view bar, link
// legend, inventory / inspector) and wires it to the scene API.
//
// Loaded lazily by TopologyView so three.js stays out of the main bundle.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CHIPS, KINDS, LINK_KINDS, NODES, SITES, TIERS } from './data';
import type { Chip, LinkKind, PlaneTier, TopoNode } from './data';
import { createTopologyScene, defaultLayers } from './scene';
import type { SceneLinkInfo, TopologySceneApi, ViewName } from './scene';
import './topology3d.css';

type AnyNode = TopoNode | Chip;
const ALL: AnyNode[] = [...NODES, ...CHIPS];
const BY_ID: Record<string, AnyNode> = Object.fromEntries(ALL.map(n => [n.id, n]));
const isChip = (n: AnyNode): n is Chip => 'hosts' in n;
const tierOf = (n: AnyNode): PlaneTier => (isChip(n) ? 'plane' : n.tier);

const VIEW_LIST: [ViewName, string][] = [['overview', 'Overview'], ['fl', 'Florida'], ['mde', 'Medellín'], ['top', 'Top'], ['elevation', 'Side']];

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function Legend({ layers, onToggle, links }: { layers: Record<LinkKind, boolean>; onToggle: (k: LinkKind) => void; links: readonly SceneLinkInfo[] }) {
  const counts = useMemo(() => {
    const c: Partial<Record<LinkKind, number>> = {};
    links.forEach(L => { c[L.kind] = (c[L.kind] ?? 0) + 1; });
    return c;
  }, [links]);
  // Starts collapsed: expanded it covers the Florida plinth at this size.
  const [open, setOpen] = useState(false);
  return (
    <div className={'t3d-card t3d-legend' + (open ? '' : ' closed')}>
      <button type="button" className="t3d-card-hd" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>Links</span><span className="chev">{open ? '–' : '+'}</span>
      </button>
      {open && (
        <div className="t3d-legend-rows">
          {(Object.keys(LINK_KINDS) as LinkKind[]).map(k => {
            const K = LINK_KINDS[k];
            return (
              <button type="button" key={k} className={'t3d-lg-row' + (layers[k] ? '' : ' off')} onClick={() => onToggle(k)} aria-pressed={layers[k]}>
                <span className={'t3d-sw' + (K.dashed ? ' dashed' : '')} style={{ '--c': K.color } as CSSProperties} />
                <span>{K.label}</span>
                <span className="t3d-lg-n">{counts[k] ?? 0}</span>
              </button>
            );
          })}
          <div className="t3d-lg-hint">drag orbit · scroll zoom · click inspect · esc reset</div>
        </div>
      )}
    </div>
  );
}

function Inventory({ onPick, onHover, hover }: { onPick: (id: string) => void; onHover: (id: string | null) => void; hover: string | null }) {
  return (
    <div className="t3d-inv">
      {Object.values(SITES).map(s => (
        <section key={s.id}>
          <div className="t3d-inv-site"><em>{s.idx}</em>{s.label}<span>{s.wan}</span></div>
          {(['k3s', 'vm', 'phys', 'plane'] as PlaneTier[]).map(t => {
            const rows = ALL.filter(n => n.site === s.id && tierOf(n) === t);
            if (!rows.length) return null;
            return (
              <div key={t}>
                <div className="t3d-inv-th">{TIERS[t].idx} · {TIERS[t].label}</div>
                {rows.map(n => (
                  <button type="button" key={n.id} className={'t3d-inv-row' + (hover === n.id ? ' hov' : '')}
                    onClick={() => onPick(n.id)} onMouseEnter={() => onHover(n.id)} onMouseLeave={() => onHover(null)}>
                    <span className="t3d-dot" style={{ background: KINDS[n.kind].edge }} />
                    <span className="t3d-inv-l">{n.label}</span>
                    <span className="t3d-inv-s">{n.sub}</span>
                    {n.warn ? <span className="t3d-inv-warn" title={n.warn}>!</span> : <span />}
                  </button>
                ))}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function Inspector({ id, links, onPick }: { id: string; links: readonly SceneLinkInfo[]; onPick: (id: string) => void }) {
  const n = BY_ID[id];
  const K = KINDS[n.kind], site = SITES[n.site], tier = TIERS[tierOf(n)];
  const conns = links.filter(L => L.from === id || L.to === id).map(L => {
    const out = L.from === id, other = BY_ID[out ? L.to : L.from];
    let verb = out ? '→' : '←', desc = L.label || L.K.label;
    if (L.kind === 'runs') { desc = out ? 'hosts' : 'runs on'; verb = ''; }
    if (L.chip) desc = out ? (L.label === 'egress target' ? 'egress to' : 'proxy pod on') : (L.label === 'egress target' ? 'reached via' : 'hosts proxy');
    return { L, other, verb, desc };
  });
  return (
    <div className="t3d-insp" key={id}>
      <div className="t3d-insp-eye"><span className="t3d-dot" style={{ background: K.edge }} />{K.label} · {site.code} · {tier.idx} {tier.label}</div>
      <h3>{n.label}</h3>
      <div className="t3d-insp-sub">{n.sub}</div>
      <div className="t3d-insp-status">
        <span className={'t3d-led' + (n.warn ? ' warn' : '')} />{n.warn ? 'attention' : 'online'}
      </div>
      {n.warn && <div className="t3d-note warn">{n.warn}</div>}
      {n.note && <div className="t3d-note">{n.note}</div>}
      {n.meta && (
        <dl className="t3d-kv">
          {Object.entries(n.meta).map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      )}
      {n.ts && (
        <div className="t3d-ts-block">
          <div className="t3d-blk-h">Tailnet</div>
          <div className="t3d-ts-row"><span className="t3d-ts-host">{n.ts.host}</span></div>
          <div className="t3d-ts-tags">{n.ts.tags}</div>
        </div>
      )}
      {conns.length > 0 && (
        <div className="t3d-conns">
          <div className="t3d-blk-h">Connections · {conns.length}</div>
          {conns.map(({ L, other, verb, desc }, i) => (
            <button type="button" key={i} className="t3d-conn" onClick={() => onPick(other.id)}>
              <span className={'t3d-sw' + (L.K.dashed ? ' dashed' : '')} style={{ '--c': L.K.color } as CSSProperties} />
              <span className="t3d-conn-d">{desc}</span>
              <span className="t3d-conn-o">{verb} {other.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Topology3D({ onUnsupported }: { onUnsupported?: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<TopologySceneApi | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState<ViewName | null>('overview');
  const [open, setOpen] = useState(true);
  const [layers, setLayers] = useState(defaultLayers);
  const [interactive, setInteractive] = useState(false);
  const coarse = useMemo(() => typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches, []);

  // Scene lifecycle. createTopologyScene throws when WebGL is unavailable.
  useEffect(() => {
    const stage = stageRef.current, labels = labelsRef.current;
    if (!stage || !labels) return;
    let scene: TopologySceneApi;
    try {
      scene = createTopologyScene(stage, labels, { reducedMotion: prefersReducedMotion() }, {
        onSelect: id => { setSel(id); if (id) { setView(null); setOpen(true); } },
        onHover: setHover,
        onViewCleared: () => setView(null),
      });
    } catch (err) {
      console.warn('[Topology3D] WebGL unavailable, falling back to 2D', err);
      onUnsupported?.();
      return;
    }
    setApi(scene);
    return () => { scene.dispose(); setApi(null); };
  }, [onUnsupported]);

  useEffect(() => { api?.set({ layers }); }, [api, layers]);
  useEffect(() => { api?.setInteractive(interactive); }, [api, interactive]);

  // Keep the camera framing clear of the HUD rail (desktop only — on mobile
  // the rail sits below the canvas).
  useEffect(() => {
    if (!api) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const upd = () => api.setInsets({ right: mq.matches && open ? (railRef.current?.offsetWidth ?? 0) + 24 : 0, bottom: 0 });
    upd();
    mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, [api, open]);

  // Clicking anywhere outside hands scroll/touch back to the page.
  useEffect(() => {
    if (!interactive) return;
    const off = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setInteractive(false); };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [interactive]);

  const go = (v: ViewName) => { setView(v); api?.select(null); api?.setView(v); };
  const pick = (id: string | null) => api?.select(id);
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') { api?.select(null); setInteractive(false); return; }
    const i = parseInt(e.key, 10);
    if (i >= 1 && i <= VIEW_LIST.length) go(VIEW_LIST[i - 1][0]);
  };

  return (
    <div ref={rootRef} className="t3d" tabIndex={-1} onKeyDown={onKeyDown}
      role="group" aria-label="Interactive 3D homelab topology">
      <div ref={stageRef} className="t3d-stage" onPointerDown={() => { setInteractive(true); rootRef.current?.focus({ preventScroll: true }); }}>
        <div ref={labelsRef} className="t3d-labels" />
      </div>
      <div className={'t3d-hint' + (interactive ? ' gone' : '')} aria-hidden>{coarse ? 'tap to explore' : 'click to explore · then scroll zooms'}</div>

      <div ref={railRef} className="t3d-rail">
        <div className="t3d-card t3d-viewbar">
          {VIEW_LIST.map(([id, l], i) => (
            <button type="button" key={id} className={view === id ? 'on' : ''} onClick={() => go(id)} title={`${l} (${i + 1})`}>{l}</button>
          ))}
        </div>
        <div className={'t3d-card t3d-panel' + (open ? '' : ' closed')}>
          <div className="t3d-card-hd">
            {sel
              ? <button type="button" className="back" onClick={() => pick(null)}>← Inventory</button>
              : <span>Inventory · {ALL.length}</span>}
            <button type="button" className="chev" onClick={() => setOpen(!open)} aria-label={open ? 'Collapse panel' : 'Expand panel'}>{open ? '–' : '+'}</button>
          </div>
          {open && (
            <div className="t3d-panel-body">
              {api && sel
                ? <Inspector id={sel} links={api.links} onPick={pick} />
                : <Inventory onPick={pick} onHover={id => api?.hover(id)} hover={hover} />}
            </div>
          )}
        </div>
      </div>

      <Legend layers={layers} links={api?.links ?? []} onToggle={k => setLayers(l => ({ ...l, [k]: !l[k] }))} />
    </div>
  );
}
