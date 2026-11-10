// TopologyFlow — the live map. Two sites on real geography, the WireGuard
// tunnel between them, and short traffic stories that play hop by hop: what
// actually happens when someone presses play, requests a show, merges a pull
// request, or when Medellín loses power.
//
// A canvas (engine.ts) draws the geography, links, glyphs and packets. Every
// label on top of it is DOM, so machines are real buttons: focusable, readable
// by a screen reader, and they open a small fact card.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { getTopologyTheme } from '../topology/theme';
import {
  HULLS, KIND_LABEL, LAYOUTS, NODES, SCENARIOS, SITE_LABEL, SITE_TITLES, downAt, nodeById,
  type FlowKind, type FlowNode, type LayoutId,
} from './data';
import { FlowEngine, nodePos, tunnelMid, type Palette, type Scene } from './engine';
import './topologyFlow.css';

const FLOW_LABEL: Record<FlowKind, string> = {
  public: 'Public internet',
  cluster: 'Cluster traffic',
  tailnet: 'Tailnet',
  storage: 'Storage',
  backup: 'Backups',
  power: 'Power signalling',
};

/** Reading time for a caption, so a step never ends before it can be read. */
function readSeconds(text: string): number {
  return Math.max(5, Math.min(11, text.split(/\s+/).length * 0.3 + 2.4));
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

function TopologyFlow() {
  const { isRpg } = useTheme();
  const T = getTopologyTheme(isRpg);
  const reduced = usePrefersReducedMotion();

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FlowEngine | null>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  const [width, setWidth] = useState(0);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  // Until someone picks a story, the map tours all of them.
  const [touring, setTouring] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const layoutId: LayoutId = width === 0 || width >= 700 ? 'wide' : 'tall';
  const layout = LAYOUTS[layoutId];
  const stageW = layoutId === 'tall' ? Math.min(width, 520) : width;
  const scale = stageW / layout.w;
  const stageH = Math.round(stageW * (layout.h / layout.w));
  const compact = layoutId === 'tall' || width < 880;

  const scenario = SCENARIOS[scenarioIdx];
  const step = scenario.steps[stepIdx];

  const palette = useMemo<Palette>(() => ({
    bg: T.bg,
    land: isRpg ? '#34497a' : '#3A473C',
    ink: T.ink,
    dim: T.dim,
    glyphFill: T.cardFill,
    kinds: {
      gateway: T.ts, host: T.dim, cp: T.cpAccent, worker: T.accent,
      nas: isRpg ? '#39ff14' : '#7AB5C7', pi: T.inkSoft, ups: isRpg ? '#ff7a9c' : '#D98B8B', net: T.mute,
    },
    sites: { fl: T.siteFL, mde: T.siteMDE },
    flows: {
      public: T.ink, cluster: T.cpAccent, tailnet: T.ts, storage: T.storageLink,
      backup: isRpg ? '#d68cff' : '#B79CE8', power: isRpg ? '#ff5d7a' : '#E07A7A',
    },
    tunnel: T.ts,
    square: isRpg,
  }), [T, isRpg]);

  const scene = useMemo<Scene>(() => ({
    flows: step.flows,
    trail: scenario.steps.slice(0, stepIdx).flatMap(s => s.flows),
    down: downAt(scenario, stepIdx),
    minSeconds: readSeconds(step.text),
  }), [scenario, step, stepIdx]);

  const activeIds = useMemo(() => new Set(step.flows.flatMap(f => f.path)), [step]);

  // ── engine lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new FlowEngine(canvasRef.current);
    engineRef.current = engine;
    engine.onProgress = fraction => {
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${fraction})`;
    };
    return () => { engine.destroy(); engineRef.current = null; };
  }, []);

  // Advancing reads the latest state through a ref, so the engine callback never goes stale.
  const cursor = useRef({ scenarioIdx, stepIdx, touring });
  cursor.current = { scenarioIdx, stepIdx, touring };
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.onStepEnd = () => {
      const now = cursor.current;
      const last = SCENARIOS[now.scenarioIdx].steps.length - 1;
      if (now.stepIdx < last) setStepIdx(now.stepIdx + 1);
      else {
        if (now.touring) setScenarioIdx((now.scenarioIdx + 1) % SCENARIOS.length);
        setStepIdx(0);
      }
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = wrapRef.current, engine = engineRef.current;
    if (!el || !engine) return;
    let inView = true;
    const sync = () => engine.setVisible(inView && !document.hidden);
    document.addEventListener('visibilitychange', sync);
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: 0.05 });
      io.observe(el);
    }
    return () => { document.removeEventListener('visibilitychange', sync); io?.disconnect(); };
  }, []);

  useEffect(() => { engineRef.current?.setPalette(palette); }, [palette]);
  useEffect(() => { if (stageW > 0) engineRef.current?.resize(layoutId, stageW); }, [layoutId, stageW]);
  useEffect(() => { engineRef.current?.setReducedMotion(reduced); if (reduced) setPlaying(false); }, [reduced]);
  useEffect(() => { engineRef.current?.setRunning(playing); }, [playing]);
  useEffect(() => {
    engineRef.current?.setScene(scene);
    if (progressRef.current) progressRef.current.style.transform = 'scaleX(0)';
  }, [scene]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  // ── controls ─────────────────────────────────────────────────────────
  const goTo = useCallback((s: number, st: number) => {
    setTouring(false);
    setScenarioIdx(s);
    setStepIdx(st);
    setPlaying(!reduced);
  }, [reduced]);

  const next = () => {
    if (stepIdx < scenario.steps.length - 1) goTo(scenarioIdx, stepIdx + 1);
    else goTo((scenarioIdx + 1) % SCENARIOS.length, 0);
  };
  const prev = () => {
    if (stepIdx > 0) goTo(scenarioIdx, stepIdx - 1);
    else {
      const s = (scenarioIdx + SCENARIOS.length - 1) % SCENARIOS.length;
      goTo(s, SCENARIOS[s].steps.length - 1);
    }
  };

  // ── render helpers ───────────────────────────────────────────────────
  const at = (n: FlowNode): [number, number] => {
    const [x, y] = nodePos(layoutId, n);
    return [x * scale, y * scale];
  };
  const stateClass = (id: string) =>
    scene.down.has(id) ? ' is-down' : activeIds.has(id) ? ' is-active' : '';

  const selectedNode = selected ? nodeById(selected) : null;
  let cardStyle: CSSProperties | undefined;
  if (selectedNode && stageW > 0) {
    const [x, y] = at(selectedNode);
    const cardW = Math.min(252, stageW - 16);
    const left = Math.max(8, Math.min(stageW - cardW - 8, x - cardW / 2));
    cardStyle = y > stageH * 0.55
      ? { left, width: cardW, bottom: stageH - y + 20 }
      : { left, width: cardW, top: y + 24 };
  }

  const rootStyle = {
    '--tf-bg': T.bg, '--tf-surface': T.surface, '--tf-rule': T.rule, '--tf-ink': T.ink,
    '--tf-soft': T.inkSoft, '--tf-mute': T.mute, '--tf-dim': T.dim, '--tf-accent': T.accent, '--tf-ts': T.ts,
    '--tf-font-label': T.fontMono, '--tf-font-body': isRpg ? T.fontBody : T.fontBody, '--tf-font-display': T.fontDisplay,
  } as CSSProperties;

  const usedKinds = Array.from(new Set(step.flows.map(f => f.kind)));

  return (
    <section className={`tf${isRpg ? ' tf-rpg' : ''}${compact ? ' tf-compact' : ''}${layoutId === 'tall' ? ' tf-tall' : ''}`} style={rootStyle} aria-label="Live map of the homelab">
      <div className="tf-chips" role="group" aria-label="Pick a story">
        {SCENARIOS.map((s, i) => (
          <button key={s.id} type="button" className="tf-chip" aria-pressed={i === scenarioIdx} onClick={() => goTo(i, 0)}>
            <b>{s.title}</b>
            <i>{s.tag}</i>
          </button>
        ))}
      </div>

      <div ref={wrapRef} className="tf-wrap">
        <div className="tf-stage" style={{ width: stageW || '100%', height: stageH || undefined }}
          onClick={() => setSelected(null)}>
          <canvas ref={canvasRef} aria-hidden />

          {stageW > 0 && (
            <>
              {(['fl', 'mde'] as const).map(site => {
                const title = SITE_TITLES[site][layoutId];
                const gw = NODES.find(n => n.site === site && n.kind === 'gateway')!;
                return (
                  <div key={site} className={`tf-site tf-site-${title.align}`}
                    style={{ left: title.at[0] * scale, top: title.at[1] * scale }}>
                    <b>{SITE_LABEL[site]}</b>
                    <i>{gw.sub}</i>
                  </div>
                );
              })}

              <div className="tf-tunnel" style={{ left: tunnelMid(layoutId)[0] * scale, top: tunnelMid(layoutId)[1] * scale }}>
                WireGuard · ~62 ms
              </div>

              {NODES.map(n => {
                const [x, y] = at(n);
                const open = selected === n.id;
                const label = `${n.label}: ${KIND_LABEL[n.kind]}, ${SITE_LABEL[n.site]}`;
                const toggle = (e: React.MouseEvent) => { e.stopPropagation(); setSelected(open ? null : n.id); };
                if (n.kind === 'host') {
                  const hull = HULLS.find(h => h.id === n.id)![layoutId];
                  return (
                    <button key={n.id} type="button" className={`tf-host${stateClass(n.id)}${open ? ' is-open' : ''}`}
                      style={{ left: hull[0] * scale + 8, top: hull[1] * scale }}
                      aria-label={label} aria-expanded={open} onClick={toggle}>
                      {n.label}<i> · Proxmox</i>
                    </button>
                  );
                }
                return (
                  <button key={n.id} type="button"
                    className={`tf-node tf-node-${n[layoutId]?.label ?? 'b'}${stateClass(n.id)}${open ? ' is-open' : ''}`}
                    style={{ left: x, top: y }} aria-label={label} aria-expanded={open} onClick={toggle}>
                    {n.kind !== 'gateway' && <span>{compact ? n.short : n.label}</span>}
                  </button>
                );
              })}

              {selectedNode && (
                <div className="tf-card" style={cardStyle} role="dialog" aria-label={`${selectedNode.label} details`}
                  onClick={e => e.stopPropagation()}>
                  <div className="tf-card-hd">
                    <span>{KIND_LABEL[selectedNode.kind]} · {SITE_LABEL[selectedNode.site]}</span>
                    <button type="button" aria-label="Close" onClick={() => setSelected(null)}><X size={13} /></button>
                  </div>
                  <b>{selectedNode.label}</b>
                  <p>{selectedNode.sub}</p>
                  <dl>
                    {selectedNode.facts.map(([k, v]) => (
                      <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                    ))}
                  </dl>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="tf-caption">
        <div className="tf-caption-hd">
          <span className="tf-count">{String(stepIdx + 1).padStart(2, '0')} / {String(scenario.steps.length).padStart(2, '0')}</span>
          <h3>{step.title}</h3>
          <div className="tf-ctl">
            <button type="button" aria-label="Previous step" onClick={prev}><ChevronLeft size={15} /></button>
            <button type="button" aria-label={playing ? 'Pause' : 'Play'} disabled={reduced}
              onClick={() => setPlaying(p => !p)}>
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button type="button" aria-label="Next step" onClick={next}><ChevronRight size={15} /></button>
          </div>
        </div>
        <p aria-live={playing ? 'off' : 'polite'}>{step.text}</p>
        <div className="tf-steps">
          {scenario.steps.map((s, i) => (
            <button key={s.title} type="button" className={i < stepIdx ? 'is-done' : i === stepIdx ? 'is-now' : ''}
              aria-label={`Step ${i + 1}: ${s.title}`} aria-current={i === stepIdx ? 'step' : undefined}
              onClick={() => goTo(scenarioIdx, i)}>
              <span ref={i === stepIdx ? progressRef : undefined} />
            </button>
          ))}
        </div>
        <div className="tf-legend">
          {usedKinds.map(kind => (
            <span key={kind}><i style={{ background: palette.flows[kind] }} />{FLOW_LABEL[kind]}</span>
          ))}
          <span><i className="tf-legend-tunnel" />WireGuard between sites</span>
          <em>Tap a machine for details</em>
        </div>
      </div>
    </section>
  );
}

export default TopologyFlow;
