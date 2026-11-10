import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import PageTransition from '../components/PageTransition';
import PixelPanel from '../components/ui/PixelPanel';
import PixelButton from '../components/ui/PixelButton';
import { MouseIcon } from '../components/ui/PixelIcons';
import { useTheme } from '../context/ThemeContext';
import { useLabels } from '../lib/labels';
import {
  ACTION,
  describeMapping,
  factoryMapping,
  isFactoryDefault,
  keyMapping,
  LAYER,
  MOUSE_BUTTONS,
  mouseMapping,
  NagaPro,
  PLATE_BUTTONS,
  sameMapping,
  TOP_BUTTONS,
  type Layer,
  type Mapping,
  type Mode,
  type PlateSize,
} from '../tools/naga/naga';
import { comboFromEvent, comboLabel, isModifierUsage } from '../tools/naga/keys';
import { previouslyAllowedNaga, requestNaga, webHidSupported } from '../tools/naga/webhid';

const SOURCE_URL = 'https://github.com/jgarcesres/resume/tree/main/app/src/tools/naga';
const UDEV_RULE = 'KERNEL=="hidraw*", ATTRS{idVendor}=="1532", ATTRS{idProduct}=="008f|0090", TAG+="uaccess"';

const RPG_UI = {
  text: 'font-pixel text-[9px] leading-relaxed text-rpg-text',
  dim: 'font-pixel text-[8px] leading-relaxed text-rpg-text-dim',
  strong: 'font-pixel text-[10px] text-rpg-text-bright',
  error: 'font-pixel text-[9px] leading-relaxed text-neon-magenta',
  warn: 'border-2 border-neon-gold/60 bg-neon-gold/10 p-4',
  link: 'text-neon-cyan underline',
  code: 'block overflow-x-auto bg-rpg-deep border-2 border-neon-cyan/30 p-3 font-mono text-[11px] text-rpg-text-bright',
  seg: 'font-pixel text-[8px] px-3 py-2 border-2 border-rpg-border text-rpg-text hover:border-neon-cyan',
  segOn: 'font-pixel text-[8px] px-3 py-2 border-2 border-neon-cyan bg-neon-cyan/15 text-neon-cyan',
  row: 'w-full flex items-center justify-between gap-3 px-3 py-2 border-2 border-transparent text-left hover:border-rpg-border',
  rowOn: 'w-full flex items-center justify-between gap-3 px-3 py-2 border-2 border-neon-gold text-left bg-neon-gold/10',
  key: 'border-2 border-rpg-border-light bg-rpg-panel text-rpg-text-bright hover:border-neon-cyan',
  keyOn: 'border-2 border-neon-gold bg-neon-gold/20 text-neon-gold',
  keyNum: 'font-pixel text-[7px] text-rpg-text-dim',
  keyLabel: 'font-pixel text-[8px]',
  body: '#141c33',
  bodyStroke: '#3d5a8a',
  plate: '#0f1628',
  edited: 'bg-neon-blue',
  chip: 'font-mono text-[11px] px-2.5 py-1.5 border-2 border-rpg-border text-rpg-text hover:border-neon-cyan',
  chipOn: 'font-mono text-[11px] px-2.5 py-1.5 border-2 border-neon-gold text-neon-gold',
};

const PRO_UI: typeof RPG_UI = {
  text: 'text-[14px] leading-relaxed text-pro-ink',
  dim: 'text-[13px] leading-relaxed text-pro-muted',
  strong: 'text-[15px] font-medium text-pro-ink',
  error: 'text-[13px] leading-relaxed text-pro-led-red',
  warn: 'border border-pro-led-amber/60 bg-pro-led-amber/10 p-4',
  link: 'text-pro-accent underline',
  code: 'block overflow-x-auto bg-pro-bg border border-pro-rule-strong p-3 font-mono text-[12px] text-pro-ink',
  seg: 'text-[13px] px-3 py-1.5 border border-pro-rule-strong text-pro-ink-soft hover:border-pro-accent',
  segOn: 'text-[13px] px-3 py-1.5 border border-pro-accent bg-pro-accent-tint text-pro-ink',
  row: 'w-full flex items-center justify-between gap-3 px-3 py-2 border border-transparent text-left hover:border-pro-rule-strong',
  rowOn: 'w-full flex items-center justify-between gap-3 px-3 py-2 border border-pro-accent text-left bg-pro-accent-tint',
  key: 'border border-pro-rule-strong bg-pro-surface-2 text-pro-ink hover:border-pro-accent',
  keyOn: 'border border-pro-accent bg-pro-accent-tint text-pro-ink ring-1 ring-pro-accent',
  keyNum: 'font-mono text-[10px] text-pro-muted',
  keyLabel: 'text-[13px] font-medium',
  body: '#171B17',
  bodyStroke: '#3A4036',
  plate: '#0A0C0A',
  edited: 'bg-pro-led-amber',
  chip: 'font-mono text-[12px] px-2.5 py-1.5 border border-pro-rule-strong text-pro-ink-soft hover:border-pro-accent',
  chipOn: 'font-mono text-[12px] px-2.5 py-1.5 border border-pro-accent text-pro-ink bg-pro-accent-tint',
};

// Key positions on a 600×350 drawing of the mouse's left side, front on the left.
// 12-button: 4 columns × 3 rows, numbered up each column (1 bottom-front, 3 top-front).
// 6-button: 3 × 2 along the top of the plate, 1 2 3 top row, 4 5 6 bottom row.
// 2-button: two long buttons along the top, 1 front, 2 back.
interface KeyBox {
  x: number;
  y: number;
  w: number;
  h: number;
}
const LAYOUT: Record<PlateSize, KeyBox[]> = {
  12: Array.from({ length: 12 }, (_, i) => ({ x: [182, 248, 314, 380][Math.floor(i / 3)], y: [246, 182, 118][i % 3], w: 58, h: 56 })),
  6: Array.from({ length: 6 }, (_, i) => ({ x: [196, 270, 344][i % 3], y: i < 3 ? 122 : 180, w: 66, h: 50 })),
  2: [
    { x: 186, y: 126, w: 122, h: 48 },
    { x: 314, y: 126, w: 122, h: 48 },
  ],
};

const QUICK_KEYS: [string, number][] = [
  ['1', 0x1e], ['2', 0x1f], ['3', 0x20], ['4', 0x21], ['5', 0x22], ['Q', 0x14], ['E', 0x08], ['R', 0x15],
  ['F', 0x09], ['G', 0x0a], ['Space', 0x2c], ['F13', 0x68], ['F14', 0x69], ['F15', 0x6a],
];
const MOUSE_CHOICES = [0x01, 0x02, 0x03, 0x04, 0x05];

type Conn =
  | { kind: 'unsupported' }
  | { kind: 'idle'; note?: string }
  | { kind: 'busy'; what: string; done?: number; total?: number }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

interface MouseState {
  plate: PlateSize | null;
  mode: Mode;
  profiles: { slot: number; name: string | null }[];
  active: number;
}

const mkey = (slot: number, layer: number, button: number) => `${slot}|${layer}|${button}`;
const slotLabel = (slot: number) => `slot ${slot.toString(16).padStart(2, '0')}`;
const allButtons = () => [...PLATE_BUTTONS[12], ...PLATE_BUTTONS[6], ...PLATE_BUTTONS[2], ...TOP_BUTTONS.map((b) => b.id)];

function buttonName(button: number): { where: string; name: string } {
  const top = TOP_BUTTONS.find((b) => b.id === button);
  if (top) return { where: 'Top', name: top.name };
  for (const size of [12, 6, 2] as PlateSize[]) {
    const i = PLATE_BUTTONS[size].indexOf(button);
    if (i >= 0) return { where: `${size}-button plate`, name: size === 2 ? `Button ${i + 1} (${i === 0 ? 'front' : 'back'})` : `Button ${i + 1}` };
  }
  return { where: 'Button', name: `0x${button.toString(16)}` };
}

function NagaMapper() {
  const { isRpg } = useTheme();
  const L = useLabels();
  const ui = isRpg ? RPG_UI : PRO_UI;

  const [conn, setConn] = useState<Conn>(() => (webHidSupported() ? { kind: 'idle' } : { kind: 'unsupported' }));
  const [state, setState] = useState<MouseState | null>(null);
  const [slot, setSlot] = useState(0x05);
  const [layer, setLayer] = useState<Layer>('normal');
  const [plateView, setPlateView] = useState<PlateSize>(12);
  const [selected, setSelected] = useState(0x40);
  const [stored, setStored] = useState<Map<string, Mapping>>(new Map());
  const [pending, setPending] = useState<Map<string, Mapping>>(new Map());
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const mouse = useRef<{ device: HIDDevice; naga: NagaPro } | null>(null);

  const layerByte = LAYER[layer];
  const loadedSlots = useRef(new Set<number>());

  const loadSlot = useCallback(async (s: number) => {
    const m = mouse.current;
    if (!m || loadedSlots.current.has(s)) return;
    const buttons = allButtons();
    const total = buttons.length * 2;
    const next = new Map<string, Mapping>();
    let done = 0;
    setConn({ kind: 'busy', what: `Reading ${slotLabel(s)}`, done, total });
    for (const lay of [0, 1]) {
      for (const b of buttons) {
        next.set(mkey(s, lay, b), await m.naga.getMapping(s, b, lay));
        done++;
        if (done % 6 === 0) setConn({ kind: 'busy', what: `Reading ${slotLabel(s)}`, done, total });
      }
    }
    loadedSlots.current.add(s);
    setStored((old) => new Map([...old, ...next]));
    setConn({ kind: 'ready' });
  }, []);

  const attach = useCallback(
    async (device: HIDDevice) => {
      const naga = new NagaPro(device);
      mouse.current = { device, naga };
      loadedSlots.current.clear();
      setStored(new Map());
      setPending(new Map());
      setConn({ kind: 'busy', what: 'Reading the mouse' });
      const [plate, mode, slots, active] = [await naga.plate(), await naga.mode(), await naga.profiles(), await naga.activeProfile()];
      const profiles: MouseState['profiles'] = [];
      for (const s of slots) profiles.push({ slot: s, name: s === 0x01 ? null : await naga.profileName(s) });
      setState({ plate, mode, profiles, active });
      setSlot(active);
      if (plate) {
        setPlateView(plate);
        setSelected(PLATE_BUTTONS[plate][0]);
      }
      await loadSlot(active);
    },
    [loadSlot],
  );

  const fail = (err: unknown) => {
    const text = err instanceof Error ? err.message : String(err);
    setConn({ kind: 'error', message: text });
  };

  // Reconnect on reload if this site was already allowed to use the mouse.
  useEffect(() => {
    if (!webHidSupported()) return;
    let cancelled = false;
    previouslyAllowedNaga()
      .then((d) => {
        if (d && !cancelled) return attach(d);
      })
      .catch(() => undefined);
    const onDisconnect = (e: Event) => {
      if ((e as HIDConnectionEvent).device === mouse.current?.device) {
        mouse.current = null;
        setState(null);
        setConn({ kind: 'idle', note: 'The mouse was disconnected. Changes you did not write are lost.' });
      }
    };
    const hid = navigator.hid;
    hid.addEventListener('disconnect', onDisconnect);
    return () => {
      cancelled = true;
      hid.removeEventListener('disconnect', onDisconnect);
    };
  }, [attach]);

  async function connect() {
    setMessage(null);
    try {
      const device = await requestNaga();
      if (!device) {
        setConn({ kind: 'idle', note: "No Naga Pro was picked. If it isn't listed, see the Linux note below." });
        return;
      }
      await attach(device);
    } catch (err) {
      fail(err);
    }
  }

  async function chooseSlot(s: number) {
    setSlot(s);
    try {
      await loadSlot(s);
    } catch (err) {
      fail(err);
    }
  }

  async function run(what: string, fn: (n: NagaPro) => Promise<void>) {
    const m = mouse.current;
    if (!m) return;
    setConn({ kind: 'busy', what });
    try {
      await fn(m.naga);
      setConn({ kind: 'ready' });
    } catch (err) {
      fail(err);
    }
  }

  const switchToNormal = () =>
    run('Switching to normal mode', async (n) => {
      await n.setNormalMode();
      const mode = await n.mode();
      setState((s) => (s ? { ...s, mode } : s));
    });

  const makeActive = (s: number) =>
    run('Switching profile', async (n) => {
      await n.setActiveProfile(s);
      const active = await n.activeProfile();
      setState((st) => (st ? { ...st, active } : st));
    });

  const writeAll = () =>
    run('Writing to the mouse', async (n) => {
      const written = new Map<string, Mapping>();
      for (const [k, m] of pending) {
        const [s, lay, b] = k.split('|').map(Number);
        await n.setMapping(s, b, lay, m);
        written.set(k, await n.getMapping(s, b, lay));
      }
      setStored((old) => new Map([...old, ...written]));
      setPending(new Map());
      setMessage(`Wrote ${written.size} ${written.size === 1 ? 'change' : 'changes'}. They're stored on the mouse and work on any computer.`);
    });

  const current = (b: number) => pending.get(mkey(slot, layerByte, b)) ?? stored.get(mkey(slot, layerByte, b));

  function propose(m: Mapping) {
    const k = mkey(slot, layerByte, selected);
    const onMouse = stored.get(k);
    setPending((old) => {
      const next = new Map(old);
      if (onMouse && sameMapping(onMouse, m)) next.delete(k);
      else next.set(k, m);
      return next;
    });
    setMessage(null);
  }

  function onRecordKey(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!recording) return;
    e.preventDefault();
    if (e.code === 'Escape' && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
      setRecording(false);
      return;
    }
    const combo = comboFromEvent(e.nativeEvent);
    if (!combo) return;
    // Wait for a non-modifier key unless the modifier is released alone.
    if (isModifierUsage(combo.usage) && (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey)) return;
    propose(keyMapping(combo.usage, combo.mods));
    setRecording(false);
  }

  function onRecordKeyUp(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!recording) return;
    const combo = comboFromEvent(e.nativeEvent);
    if (combo && isModifierUsage(combo.usage)) {
      propose(keyMapping(combo.usage, 0));
      setRecording(false);
    }
  }

  const sel = useMemo(() => buttonName(selected), [selected]);
  const selMapping = current(selected);
  const selStored = stored.get(mkey(slot, layerByte, selected));
  const factory = factoryMapping(selected);
  const busy = conn.kind === 'busy';
  const ready = state !== null && conn.kind !== 'unsupported';
  const slotName = (s: number) => state?.profiles.find((p) => p.slot === s)?.name ?? (s === 0x01 ? 'Base profile' : 'Unnamed profile');

  const header = isRpg ? (
    <h1 className="font-pixel text-lg text-rpg-text-bright">{L.nagaTitle}</h1>
  ) : (
    <div className="pt-4 space-y-2">
      <div className="flex items-baseline gap-3">
        <span className="pro-label">06 / {L.toolsTitle}</span>
        <span className="flex-1 h-px bg-pro-rule" aria-hidden />
      </div>
      <h1 className="pro-display text-[40px] leading-none tracking-tight text-pro-ink">{L.nagaTitle}</h1>
    </div>
  );

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        {header}
        <p className={ui.dim}>{L.nagaSub}</p>

        {conn.kind === 'unsupported' && (
          <PixelPanel glow="magenta">
            <p role="alert" className={ui.text}>
              This browser can't talk to USB devices. Open this page in Chrome, Edge or another Chromium browser on a desktop computer. Firefox and
              Safari don't support WebHID.
            </p>
          </PixelPanel>
        )}

        {!ready && conn.kind !== 'unsupported' && (
          <PixelPanel glow="cyan">
            <div className="flex flex-col items-center gap-4 text-center">
              <MouseIcon className={`w-10 h-10 ${isRpg ? 'text-neon-cyan' : 'text-pro-accent'}`} />
              <p className={ui.text}>Plug in the Naga Pro (cable or its wireless dongle), then pick it in the browser's list.</p>
              <PixelButton variant="gold" onClick={connect} disabled={busy}>
                Connect the mouse
              </PixelButton>
              {conn.kind === 'idle' && conn.note && <p className={ui.dim}>{conn.note}</p>}
            </div>
          </PixelPanel>
        )}

        <div role="status" aria-live="polite" className="min-h-[1.25rem]">
          {conn.kind === 'busy' && (
            <span className={ui.dim}>
              {conn.what}
              {conn.total ? ` (${conn.done} of ${conn.total})` : ''}…
            </span>
          )}
          {conn.kind !== 'busy' && message && <span className={ui.text}>{message}</span>}
        </div>
        {conn.kind === 'error' && (
          <p role="alert" className={ui.error}>
            The mouse didn't answer as expected ({conn.message}). Unplug it, plug it back in and reload the page.
          </p>
        )}

        {ready && state && state.mode === 'driver' && (
          <div className={ui.warn} role="alert">
            <p className={ui.strong}>The mouse is in Synapse's driver mode.</p>
            <p className={`${ui.text} mt-1`}>
              Synapse switches the mouse to driver mode and remaps buttons itself, so the mappings stored on the mouse are ignored. Switch it back to
              use them here and on any computer.
            </p>
            <div className="mt-3">
              <PixelButton variant="gold" onClick={switchToNormal} disabled={busy}>
                Switch to normal mode
              </PixelButton>
            </div>
          </div>
        )}

        {ready && state && (
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
            <PixelPanel title="Profiles">
              <ul className="space-y-1">
                {state.profiles.map((p) => (
                  <li key={p.slot}>
                    <button type="button" className={p.slot === slot ? ui.rowOn : ui.row} onClick={() => chooseSlot(p.slot)} disabled={busy}>
                      <span className="min-w-0">
                        <span className={`block truncate ${ui.strong}`}>{slotName(p.slot)}</span>
                        <span className={ui.dim}>
                          {slotLabel(p.slot)}
                          {p.slot === state.active ? ' · active' : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {slot !== state.active && (
                <div className="mt-3">
                  <PixelButton variant="magenta" onClick={() => makeActive(slot)} disabled={busy}>
                    Make active
                  </PixelButton>
                </div>
              )}
              <p className={`${ui.dim} mt-3`}>The mouse's profile button cycles through these. The active one is what the buttons do now.</p>
            </PixelPanel>

            <div className="space-y-6 min-w-0">
              <PixelPanel title="Side plate">
                <div className="flex flex-wrap gap-3 justify-between mb-3">
                  <div role="group" aria-label="Layer" className="flex gap-1">
                    {(['normal', 'hypershift'] as Layer[]).map((l) => (
                      <button key={l} type="button" aria-pressed={layer === l} className={layer === l ? ui.segOn : ui.seg} onClick={() => setLayer(l)}>
                        {l === 'normal' ? 'Normal' : 'Hypershift'}
                      </button>
                    ))}
                  </div>
                  <div role="group" aria-label="Plate" className="flex gap-1">
                    {([2, 6, 12] as PlateSize[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={plateView === p}
                        className={plateView === p ? ui.segOn : ui.seg}
                        onClick={() => {
                          setPlateView(p);
                          setSelected(PLATE_BUTTONS[p][0]);
                        }}
                      >
                        {p}-button{state.plate === p ? ' (attached)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative w-full max-w-[600px] mx-auto" style={{ aspectRatio: '600 / 350', containerType: 'inline-size' }}>
                  <svg viewBox="0 0 600 350" className="absolute inset-0 w-full h-full" aria-hidden="true">
                    <path
                      d="M30,250 C35,165 110,120 230,105 C350,90 500,100 555,185 C580,235 565,300 505,318 L85,318 C45,318 25,290 30,250 Z"
                      fill={ui.body}
                      stroke={ui.bodyStroke}
                      strokeWidth="2"
                    />
                    <path
                      d="M160,104 C260,90 390,92 462,104 C470,170 470,250 458,306 C370,318 250,318 166,308 C150,240 150,160 160,104 Z"
                      fill={ui.plate}
                      stroke={ui.bodyStroke}
                      strokeWidth="2"
                    />
                    {plateView !== 12 && (
                      <rect
                        x={plateView === 6 ? 190 : 186}
                        y={plateView === 6 ? 246 : 192}
                        width={plateView === 6 ? 236 : 250}
                        height={plateView === 6 ? 52 : 106}
                        rx="18"
                        fill="none"
                        stroke={ui.bodyStroke}
                        strokeDasharray="3 5"
                      />
                    )}
                  </svg>
                  {PLATE_BUTTONS[plateView].map((b, i) => {
                    const box = LAYOUT[plateView][i];
                    const m = current(b);
                    const edited = pending.has(mkey(slot, layerByte, b));
                    const label = m ? describeMapping(m) : '…';
                    return (
                      <button
                        key={b}
                        type="button"
                        aria-label={`Button ${i + 1}: ${label}`}
                        aria-pressed={selected === b}
                        title={label}
                        onClick={() => setSelected(b)}
                        className={`absolute flex flex-col items-center justify-center overflow-hidden rounded-lg px-1 ${selected === b ? ui.keyOn : ui.key}`}
                        style={{ left: `${(box.x / 600) * 100}%`, top: `${(box.y / 350) * 100}%`, width: `${(box.w / 600) * 100}%`, height: `${(box.h / 350) * 100}%` }}
                      >
                        <span className={ui.keyNum} style={{ fontSize: 'clamp(7px, 1.7cqw, 10px)' }}>
                          {i + 1}
                        </span>
                        <span className={`${ui.keyLabel} max-w-full truncate`} style={{ fontSize: 'clamp(8px, 2.3cqw, 13px)' }}>
                          {label}
                        </span>
                        {edited && <span className={`absolute top-1 right-1 h-2 w-2 rounded-full ${ui.edited}`} aria-hidden />}
                      </button>
                    );
                  })}
                  <span className={`absolute left-[6%] bottom-0 ${ui.dim}`}>front</span>
                  <span className={`absolute right-[6%] bottom-0 ${ui.dim}`}>back</span>
                </div>
                <p className={`${ui.dim} mt-2`}>
                  {state.plate === plateView
                    ? 'Attached now. Left side of the mouse, as you see it.'
                    : "Not attached. Each plate keeps its own mappings, so these apply when you swap it in."}
                </p>
              </PixelPanel>

              <PixelPanel title="Top, wheel and DPI">
                <div className="grid gap-x-4 sm:grid-cols-2">
                  {TOP_BUTTONS.map((t) => {
                    const m = current(t.id);
                    return (
                      <button key={t.id} type="button" className={selected === t.id ? ui.rowOn : ui.row} onClick={() => setSelected(t.id)}>
                        <span className={ui.text}>{t.name}</span>
                        <span className={`flex items-center gap-2 ${ui.dim}`}>
                          {m ? describeMapping(m) : '…'}
                          {pending.has(mkey(slot, layerByte, t.id)) && <span className={`h-2 w-2 rounded-full ${ui.edited}`} aria-hidden />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PixelPanel>
            </div>

            <PixelPanel title="Button">
              <div className="space-y-4">
                <div>
                  <p className={ui.dim}>
                    {sel.where} · {layer === 'normal' ? 'normal layer' : 'while Hypershift is held'}
                  </p>
                  <h2 className={isRpg ? 'font-pixel text-[12px] text-rpg-text-bright mt-1' : 'pro-display text-[24px] text-pro-ink'}>{sel.name}</h2>
                </div>

                <div className="space-y-2">
                  <p className={ui.strong}>Key</p>
                  <button
                    type="button"
                    className={`w-full text-left ${recording ? ui.chipOn : ui.chip}`}
                    onClick={() => setRecording((r) => !r)}
                    onKeyDown={onRecordKey}
                    onKeyUp={onRecordKeyUp}
                    onBlur={() => setRecording(false)}
                    aria-label={recording ? 'Recording: press a key or combo, Esc cancels' : `Record a key${selMapping?.action === ACTION.key ? `, now ${comboLabel(selMapping.data[0], selMapping.data[1])}` : ''}`}
                    aria-describedby="naga-record-hint"
                  >
                    {recording ? 'Press a key or combo… (Esc cancels)' : selMapping?.action === ACTION.key ? comboLabel(selMapping.data[0], selMapping.data[1]) : 'Record a key'}
                  </button>
                  <p id="naga-record-hint" className={ui.dim}>
                    Click, then press the key. Combos like Ctrl + C work.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_KEYS.map(([label, usage]) => {
                      const on = selMapping?.action === ACTION.key && selMapping.data[1] === usage && selMapping.data[0] === 0;
                      return (
                        <button key={label} type="button" className={on ? ui.chipOn : ui.chip} onClick={() => propose(keyMapping(usage))}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className={ui.strong}>Mouse button</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MOUSE_CHOICES.map((b) => {
                      const on = selMapping?.action === ACTION.mouse && selMapping.data[0] === b;
                      return (
                        <button key={b} type="button" className={on ? ui.chipOn : ui.chip} onClick={() => propose(mouseMapping(b))}>
                          {MOUSE_BUTTONS[b]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <dl className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 ${ui.text}`}>
                  <dt className={ui.dim}>On the mouse</dt>
                  <dd className="text-right">
                    {selStored ? describeMapping(selStored) : '…'}
                    {selStored && isFactoryDefault(selected, selStored) ? ' (default)' : ''}
                  </dd>
                  {factory && (
                    <>
                      <dt className={ui.dim}>Default</dt>
                      <dd className="text-right">{describeMapping(factory)}</dd>
                    </>
                  )}
                </dl>
                {selStored && !(selStored.action === ACTION.key || selStored.action === ACTION.mouse) && (
                  <p className={ui.dim}>This page can't write {describeMapping(selStored).toLowerCase()} actions yet, but you can replace it with a key or mouse button.</p>
                )}
                {factory && (
                  <PixelButton variant="magenta" onClick={() => propose(factory)}>
                    Back to default
                  </PixelButton>
                )}

                <div className={`pt-4 space-y-3 border-t ${isRpg ? 'border-rpg-border' : 'border-pro-rule'}`}>
                  <p className={ui.text}>
                    {pending.size === 0 ? 'Everything matches the mouse.' : `${pending.size} ${pending.size === 1 ? 'change' : 'changes'} not on the mouse yet.`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <PixelButton variant="gold" onClick={writeAll} disabled={busy || pending.size === 0}>
                      {pending.size ? `Write ${pending.size} to the mouse` : 'Write to the mouse'}
                    </PixelButton>
                    <PixelButton variant="magenta" onClick={() => setPending(new Map())} disabled={busy || pending.size === 0}>
                      Discard
                    </PixelButton>
                  </div>
                </div>
              </div>
            </PixelPanel>
          </div>
        )}

        <PixelPanel title="Before you start">
          <ul className={`space-y-3 ${ui.text}`}>
            <li>
              <strong>Linux and macOS, in Chrome or Edge.</strong> The page talks to the mouse over WebHID, which only Chromium browsers have. On
              Windows, use Synapse: Windows keeps the mouse's configuration interface to itself, so a web page can't reach it.
            </li>
            <li>
              <strong>Linux needs one udev rule</strong> so the browser may open the mouse. Save this as <code>/etc/udev/rules.d/70-naga-pro.rules</code>,
              run <code>sudo udevadm control --reload &amp;&amp; sudo udevadm trigger</code>, then replug the mouse:
              <code className={`${ui.code} mt-2`}>{UDEV_RULE}</code>
            </li>
            <li>
              <strong>Mappings live on the mouse.</strong> They keep working on any computer, with nothing installed. If the mouse is ever plugged into
              Synapse again, Synapse writes its own copy over them.
            </li>
            <li>
              Nothing leaves your browser. The protocol was worked out from USB captures of a Naga Pro and only covers that mouse.{' '}
              <a className={ui.link} href={SOURCE_URL} target="_blank" rel="noreferrer">
                Read the source
              </a>
              . Not affiliated with Razer.
            </li>
          </ul>
        </PixelPanel>
      </div>
    </PageTransition>
  );
}

export default NagaMapper;
