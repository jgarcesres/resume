// TopologyPixel — RPG mode's 3D view: an HD-2D pixel-art diorama of the
// homelab (scene.ts) under an RPG-menu HUD (title, links, view menu, roster /
// status window). Shares its model with the pro 3D view.
//
// Loaded lazily by TopologyView so three.js stays out of the main bundle.

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { CHIPS, KINDS, LINK_KINDS, NODES, SITES } from '../topology3d/data';
import type { LinkKind, SiteId } from '../topology3d/data';
import { P } from './art';
import { BY_ID, LINKC, SITEC, createPixelScene, defaultLayers, dotColor } from './scene';
import type { PixelSceneApi, PxLinkInfo, ViewName } from './scene';
import './topologyPixel.css';

const SITE_ORDER: SiteId[] = ['fl', 'mde'];
const VIEWS: [ViewName, string, string][] = [['overview', 'Overview', '1'], ['fl', 'Florida', '2'], ['mde', 'Medellín', '3']];

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function Win({ title, glow, className = '', children }: { title?: string; glow?: 'cyan' | 'gold'; className?: string; children: ReactNode }) {
  return (
    <div className={`tpx-win ${glow ? 'glow-' + glow : ''} ${className}`}>
      {title && <div className="tpx-win-tab">{title}</div>}
      {children}
    </div>
  );
}

function LinksWin({ layers, onToggle }: { layers: Record<LinkKind, boolean>; onToggle: (k: LinkKind) => void }) {
  // Starts collapsed: expanded it covers most of the Florida island at this size.
  const [open, setOpen] = useState(false);
  return (
    <Win title="Links" className="tpx-links">
      <div className="tpx-menu">
        <button type="button" className="tpx-mi" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="cur">▶</span><span className="ml">{open ? 'Hide legend' : 'Show legend'}</span><kbd>{open ? '–' : '+'}</kbd>
        </button>
        {open && (Object.keys(LINK_KINDS) as LinkKind[]).map(k => (
          <button type="button" key={k} className={'tpx-lk' + (layers[k] ? '' : ' off')} onClick={() => onToggle(k)} aria-pressed={layers[k]}>
            <span className="box" style={{ '--c': LINKC[k] } as CSSProperties}>{layers[k] ? '■' : ''}</span>
            <span className="sw" style={{ '--c': LINKC[k] } as CSSProperties} data-dash={LINK_KINDS[k].dashed ? '1' : '0'} />
            <span className="ml">{LINK_KINDS[k].label}</span>
          </button>
        ))}
      </div>
      {open && (
        <div className="tpx-floors">
          <span><i className="f-host" />Hosts</span><span><i className="f-vm" />VMs</span><span><i className="f-k3s" />k3s</span><span><i className="f-ts" />Tailnet</span>
        </div>
      )}
    </Win>
  );
}

function ViewWin({ api, view }: { api: PixelSceneApi | null; view: ViewName }) {
  return (
    <Win title="View" className="tpx-view">
      <div className="tpx-menu">
        {VIEWS.map(([id, l, k]) => (
          <button type="button" key={id} className={'tpx-mi' + (view === id ? ' on' : '')} onClick={() => { api?.select(null); api?.setView(id); }}>
            <span className="cur">▶</span><span className="ml">{l}</span><kbd>{k}</kbd>
          </button>
        ))}
        <div className="tpx-rot">
          <button type="button" onClick={() => api?.rotate(-1)} aria-label="Rotate left"><kbd>Q</kbd> ◀</button>
          <span>ROTATE</span>
          <button type="button" onClick={() => api?.rotate(1)} aria-label="Rotate right">▶ <kbd>E</kbd></button>
        </div>
      </div>
    </Win>
  );
}

function Roster({ api, hov }: { api: PixelSceneApi | null; hov: string | null }) {
  const row = (n: (typeof NODES)[number] | (typeof CHIPS)[number], dot: string) => (
    <button type="button" key={n.id} className={'tpx-ro' + (hov === n.id ? ' hov' : '')}
      onClick={() => api?.select(n.id)} onMouseEnter={() => api?.hover(n.id)} onMouseLeave={() => api?.hover(null)}>
      <span className="cur">▶</span><i style={{ background: dot }} />
      <span className="ro-l">{n.label}</span>
      {n.warn ? <em className="bang" title={n.warn}>!</em> : <span className="ro-k">{KINDS[n.kind].label}</span>}
    </button>
  );
  return (
    <div className="tpx-roster">
      {SITE_ORDER.map(id => {
        const nodes = NODES.filter(n => n.site === id);
        return (
          <section key={id}>
            <div className="ro-site" style={{ '--c': SITEC[id] } as CSSProperties}><b>{SITES[id].label.split(',')[0].toUpperCase()}</b><span>{nodes.length}</span></div>
            {nodes.map(n => row(n, dotColor(n)))}
          </section>
        );
      })}
      <section>
        <div className="ro-site" style={{ '--c': P.gold } as CSSProperties}><b>TAILNET</b><span>{CHIPS.length}</span></div>
        {CHIPS.map(n => row(n, P.gold))}
      </section>
    </div>
  );
}

function Typer({ text }: { text: string }) {
  const [n, setN] = useState(() => (prefersReducedMotion() ? text.length : 0));
  useEffect(() => {
    if (prefersReducedMotion()) { setN(text.length); return; }
    setN(0);
    const id = window.setInterval(() => setN(v => { if (v >= text.length) { window.clearInterval(id); return v; } return v + 2; }), 18);
    return () => window.clearInterval(id);
  }, [text]);
  return <>{text.slice(0, n)}{n < text.length && <span className="caret">▌</span>}</>;
}

function Status({ id, links, onPick }: { id: string; links: readonly PxLinkInfo[]; onPick: (id: string) => void }) {
  const n = BY_ID[id];
  const K = KINDS[n.kind];
  const mine = links.filter(L => L.from === id || L.to === id);
  const parent = mine.find(L => L.kind === 'runs' && L.to === id);
  const kids = mine.filter(L => L.kind === 'runs' && L.from === id);
  const conns = mine.filter(L => L.kind !== 'runs');
  const site = SITES[n.site];
  return (
    <div className="tpx-status" key={id}>
      <div className="st-class" style={{ '--c': dotColor(n) } as CSSProperties}><i />{K.label}</div>
      <h2>{n.label}</h2>
      <div className="st-sub">{n.sub}</div>
      <div className="st-row"><span>LOC</span><b style={{ color: SITEC[n.site] }}>{site.label}</b></div>
      <div className="st-row"><span>STATE</span>{n.warn ? <b className="degraded">DEGRADED</b> : <b className="ok">ONLINE</b>}</div>
      {n.warn && <div className="msg warn"><em>!</em><Typer text={n.warn} /></div>}
      {n.note && <div className="msg"><Typer text={n.note} /></div>}
      {n.meta && (
        <dl className="kv">
          {Object.entries(n.meta).map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k.replace(/_/g, ' ')}</dt><dd>{v}</dd></div>)}
        </dl>
      )}
      {n.ts && (
        <div className="blk">
          <div className="blk-h">Tailnet</div>
          <div className="ts"><span className="host">{n.ts.host}</span></div>
          <div className="ts-tags">{n.ts.tags}</div>
        </div>
      )}
      {(parent || kids.length > 0 || conns.length > 0) && (
        <div className="blk">
          <div className="blk-h">Links</div>
          {parent && <Conn color={LINKC.runs} kind="runs on" other={parent.from} onPick={onPick} />}
          {kids.map(L => <Conn key={L.to} color={LINKC.runs} kind="hosts" other={L.to} onPick={onPick} />)}
          {conns.map((L, i) => (
            <Conn key={i} color={LINKC[L.kind]} kind={L.label || L.K.label} other={L.from === id ? L.to : L.from} onPick={onPick} />
          ))}
        </div>
      )}
    </div>
  );
}

function Conn({ color, kind, other, onPick }: { color: string; kind: string; other: string; onPick: (id: string) => void }) {
  return (
    <button type="button" className="tpx-conn" onClick={() => onPick(other)}>
      <span className="cur">▶</span><i style={{ background: color }} /><span className="cn-o">{BY_ID[other].label}</span><span className="cn-k">{kind}</span>
    </button>
  );
}

export default function TopologyPixel({ onUnsupported }: { onUnsupported?: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<PixelSceneApi | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [hov, setHov] = useState<string | null>(null);
  const [view, setView] = useState<ViewName>('overview');
  const [open, setOpen] = useState(false);
  const [layers, setLayers] = useState(defaultLayers);
  const [interactive, setInteractive] = useState(false);

  // Scene lifecycle. createPixelScene throws when WebGL is unavailable.
  useEffect(() => {
    const stage = stageRef.current, labels = labelsRef.current;
    if (!stage || !labels) return;
    let scene: PixelSceneApi;
    try {
      scene = createPixelScene(stage, labels, { reducedMotion: prefersReducedMotion() }, { onSelect: setSel, onHover: setHov, onView: setView });
    } catch (err) {
      console.warn('[TopologyPixel] WebGL unavailable, falling back to 2D', err);
      onUnsupported?.();
      return;
    }
    setApi(scene);
    return () => { scene.dispose(); setApi(null); };
  }, [onUnsupported]);

  useEffect(() => { api?.setInteractive(interactive); }, [api, interactive]);

  // Keep the camera framing clear of the HUD columns on wide layouts, and
  // above the side window when it docks to the bottom on narrow ones.
  useEffect(() => {
    const el = sideRef.current, left = leftRef.current, root = rootRef.current;
    if (!api || !el || !left || !root) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect(), wide = root.clientWidth > 700, big = r.height > 120;
      api.setInsets({
        left: wide ? left.offsetWidth * 0.6 : 0,
        right: wide && big ? r.width + 24 : 0,
        bottom: !wide && big ? r.height + 12 : 0,
      });
    });
    ro.observe(el); ro.observe(left); ro.observe(root);
    return () => ro.disconnect();
  }, [api]);

  // Clicking anywhere outside hands scroll/touch back to the page.
  useEffect(() => {
    if (!interactive) return;
    const off = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setInteractive(false); };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [interactive]);

  const go = (v: ViewName) => { api?.select(null); api?.setView(v); };
  const onKeyDown = (e: ReactKeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'escape') { if (sel) api?.select(null); else setInteractive(false); }
    else if (k === 'q') api?.rotate(-1);
    else if (k === 'e') api?.rotate(1);
    else { const v = VIEWS.find(x => x[2] === k); if (v) go(v[0]); }
  };
  const toggleLayer = (k: LinkKind) => setLayers(l => { const next = { ...l, [k]: !l[k] }; api?.setLayer(k, next[k]); return next; });
  const showSide = !!sel || open;

  return (
    <div ref={rootRef} className="tpx" tabIndex={-1} onKeyDown={onKeyDown} role="group" aria-label="Interactive pixel-art homelab topology">
      <div ref={stageRef} className="tpx-stage" onPointerDown={() => { setInteractive(true); rootRef.current?.focus({ preventScroll: true }); }}>
        <div ref={labelsRef} className="tpx-labels" />
      </div>

      <div className="tpx-hud">
        <Win glow="cyan" className="tpx-title">
          <div className="kick">HOMELAB · WORLD MAP</div>
          <h3>NETWORK TOPOLOGY</h3>
          <div className="tsub">2 SITES · 1 TAILNET · {NODES.length + CHIPS.length} DEVICES</div>
        </Win>

        <div ref={leftRef} className="tpx-left">
          <LinksWin layers={layers} onToggle={toggleLayer} />
          <ViewWin api={api} view={view} />
        </div>

        <div ref={sideRef} className={'tpx-side' + (showSide ? '' : ' closed')}>
          {!showSide ? (
            <Win className="tpx-side-closed">
              <button type="button" className="tpx-mi" onClick={() => setOpen(true)}>
                <span className="cur">▶</span><span className="ml">ROSTER</span><kbd>{NODES.length}</kbd>
              </button>
            </Win>
          ) : (
            <Win title={sel ? 'Status' : 'Roster'} glow={sel ? 'gold' : undefined} className="tpx-side-win">
              {sel
                ? <button type="button" className="tpx-back" onClick={() => api?.select(null)}>◀ BACK <kbd>ESC</kbd></button>
                : <button type="button" className="tpx-back" onClick={() => setOpen(false)}>CLOSE ✕</button>}
              <div className="tpx-side-body">
                {sel && api ? <Status id={sel} links={api.links} onPick={id => api.select(id)} /> : <Roster api={api} hov={hov} />}
              </div>
            </Win>
          )}
        </div>

        <div className="tpx-hints" aria-hidden>
          {interactive
            ? <>DRAG PAN · WHEEL ZOOM · <kbd>Q</kbd><kbd>E</kbd> ROTATE · CLICK TO INSPECT</>
            : <>CLICK TO EXPLORE · THEN WHEEL ZOOMS</>}
        </div>
      </div>
    </div>
  );
}
