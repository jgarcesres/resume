import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildReport, checksum, RazerChannel, REPORT_LEN, type FeatureTransport } from '../../tools/naga/protocol';
import {
  describeMapping,
  isFactoryDefault,
  keyMapping,
  mappingArgs,
  mappingFromArgs,
  NagaPro,
  PLATE_BUTTONS,
  PLATE_BY_ID,
  parseProfileName,
} from '../../tools/naga/naga';
import { comboFromEvent, comboLabel, MODS } from '../../tools/naga/keys';

// Mouse-only frames extracted from Synapse USB captures (jg-homelab/razer-gui tests/fixtures).
const FIXTURES = join(__dirname, 'fixtures', 'naga');

interface Frame {
  dir: 'req' | 'reply';
  raw: Uint8Array;
}

function load(name: string): Frame[] {
  return readFileSync(join(FIXTURES, `${name}.jsonl`), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { dir: 'req' | 'reply'; hex: string })
    .map((f) => ({ dir: f.dir, raw: Uint8Array.from(f.hex.match(/../g)!.map((h) => parseInt(h, 16))) }));
}

const cmd = (raw: Uint8Array) => (raw[6] << 8) | raw[7];
const requests = (name: string, c?: number) => load(name).filter((f) => f.dir === 'req' && (c === undefined || cmd(f.raw) === c)).map((f) => f.raw);
const replies = (name: string, c: number) => load(name).filter((f) => f.dir === 'reply' && cmd(f.raw) === c).map((f) => f.raw);
const mappingWrites = (name: string) => requests(name, 0x020c).map((r) => Array.from(r.slice(8, 18)).join(','));

const KEY = { a: 0x04, b: 0x05, c: 0x06 };

describe('Razer report framing', () => {
  const names = readdirSync(FIXTURES).map((f) => f.replace(/\.jsonl$/, ''));

  it.each(names)('rebuilds every Synapse request in %s byte for byte', (name) => {
    const reqs = requests(name);
    expect(reqs.length).toBeGreaterThan(0);
    for (const raw of reqs) {
      expect(raw.length).toBe(REPORT_LEN);
      expect(checksum(raw)).toBe(raw[88]);
      expect(Array.from(buildReport(raw[1], raw[6], raw[7], raw.slice(8, 8 + raw[5])))).toEqual(Array.from(raw));
    }
  });
});

describe('Naga Pro mapping records', () => {
  it('encodes 2-button plate key writes the way Synapse does', () => {
    expect(mappingWrites('btn1-to-A')).toContain(mappingArgs(0x01, 0x05, 0, keyMapping(KEY.a)).join(','));
    expect(mappingWrites('btn2-to-A')).toContain(mappingArgs(0x01, 0x04, 0, keyMapping(KEY.a)).join(','));
  });

  it.each([
    ['p12-btn1-to-A', 1],
    ['p12-btn12-to-A', 12],
  ] as const)('maps 12-button plate button ids (%s)', (name, n) => {
    const button = PLATE_BUTTONS[12][n - 1];
    const writes = mappingWrites(name);
    expect(writes).toContain(mappingArgs(0x05, button, 0, keyMapping(KEY.a)).join(','));
  });

  it('puts Hypershift in the layer byte', () => {
    expect(mappingWrites('p12-btn1-hypershift-to-A')).toContain(mappingArgs(0x05, 0x40, 1, keyMapping(KEY.b)).join(','));
  });

  it('stores profile 2 in slot 0x04', () => {
    expect(mappingWrites('p12-profile2-btn1-to-C')).toContain(mappingArgs(0x04, 0x40, 0, keyMapping(KEY.c)).join(','));
  });

  it('decodes plate ids in the order they were swapped', () => {
    const got = replies('plate-ids', 0x00b9).map((r) => r[8]);
    expect(got).toEqual([0x00, 0x01, 0x00, 0x03, 0x00, 0x04, 0x00, 0x04, 0x00, 0x03]);
    expect(new Set(got.map((g) => PLATE_BY_ID[g] ?? null))).toEqual(new Set([null, 2, 12, 6]));
  });

  it('reads factory defaults back as such', () => {
    // The probe's reply for slot 05, 12-plate button 1: key "1", flag 0x01.
    const m = mappingFromArgs([0x05, 0x40, 0x00, 0x02, 0x01, 0x00, 0x1e, 0x00]);
    expect(describeMapping(m)).toBe('1');
    expect(isFactoryDefault(0x40, m)).toBe(true);
    expect(isFactoryDefault(0x40, keyMapping(0x1e))).toBe(false);
  });
});

describe('keys', () => {
  it('labels combos', () => {
    expect(comboLabel(MODS.ctrl | MODS.shift, KEY.a)).toBe('Ctrl + Shift + A');
    expect(comboLabel(0, 0xe2)).toBe('Left Alt');
  });

  it('reads physical keys from keyboard events', () => {
    const ev = { code: 'KeyQ', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false };
    expect(comboFromEvent(ev)).toEqual({ mods: MODS.ctrl, usage: 0x14 });
    expect(comboFromEvent({ ...ev, code: 'AltLeft', ctrlKey: false, altKey: true })).toEqual({ mods: 0, usage: 0xe2 });
    expect(comboFromEvent({ ...ev, code: 'Fn' })).toBeNull();
  });
});

/** A fake mouse: answers busy a set number of times, then replies via `respond`. */
function fakeMouse(respond: (req: Uint8Array) => Uint8Array, busyPolls = 0) {
  const sent: Uint8Array[] = [];
  let pending: Uint8Array | null = null;
  let busy = 0;
  const transport: FeatureTransport = {
    async sendFeatureReport(id, data) {
      expect(id).toBe(0);
      const req = new Uint8Array(data as ArrayBuffer);
      sent.push(req);
      pending = respond(req);
      busy = busyPolls;
    },
    async receiveFeatureReport(id) {
      expect(id).toBe(0);
      if (busy-- > 0) {
        const r = new Uint8Array(REPORT_LEN);
        r[0] = 0x01;
        return new DataView(r.buffer);
      }
      return new DataView(pending!.buffer);
    },
  };
  return { transport, sent };
}

function okReply(req: Uint8Array, args: number[]): Uint8Array {
  const r = Uint8Array.from(req);
  r[0] = 0x02;
  r[5] = Math.max(r[5], args.length);
  r.set(args, 8);
  return r;
}

const fast = { sleep: () => Promise.resolve() };

describe('NagaPro over a feature-report transport', () => {
  it('polls through busy replies and decodes a mapping', async () => {
    const { transport, sent } = fakeMouse((req) => okReply(req, [0x05, 0x40, 0x00, 0x02, 0x01, 0x00, 0x1e, 0x00]), 3);
    const mouse = new NagaPro(transport, fast);
    const m = await mouse.getMapping(0x05, 0x40, 0);
    expect(describeMapping(m)).toBe('1');
    expect(Array.from(sent[0].slice(6, 11))).toEqual([0x02, 0x8c, 0x05, 0x40, 0x00]);
  });

  it('reads plate, mode, active profile and profile list', async () => {
    const { transport } = fakeMouse((req) => {
      const c = cmd(req);
      if (c === 0x00b9) return okReply(req, [0x03]);
      if (c === 0x0084) return okReply(req, [0x03, 0x00]);
      if (c === 0x0584) return okReply(req, [0x04]);
      if (c === 0x0580) return okReply(req, [0x04]);
      if (c === 0x0581) return okReply(req, [0x05, 0x01, 0x03, 0x04, 0x05]);
      throw new Error('unexpected');
    });
    const mouse = new NagaPro(transport, fast);
    expect(await mouse.plate()).toBe(12);
    expect(await mouse.mode()).toBe('driver');
    expect(await mouse.activeProfile()).toBe(0x04);
    expect(await mouse.profiles()).toEqual([0x01, 0x03, 0x04, 0x05]);
  });

  it('throws on a failed reply and keeps serving later calls', async () => {
    let fail = true;
    const { transport } = fakeMouse((req) => {
      const r = okReply(req, [0x03]);
      if (fail) r[0] = 0x03;
      fail = false;
      return r;
    });
    const mouse = new NagaPro(transport, fast);
    await expect(mouse.plate()).rejects.toThrow(/failure/);
    expect(await mouse.plate()).toBe(12);
  });

  it('serializes overlapping calls', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const transport: FeatureTransport = {
      async sendFeatureReport(_id, data) {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        (transport as unknown as { last: Uint8Array }).last = okReply(new Uint8Array(data as ArrayBuffer), [0x03]);
      },
      async receiveFeatureReport() {
        await Promise.resolve();
        inFlight--;
        return new DataView((transport as unknown as { last: Uint8Array }).last.buffer);
      },
    };
    const channel = new RazerChannel(transport, 0x1f, fast);
    await Promise.all([channel.call(0x00, 0xb9, [0]), channel.call(0x00, 0xb9, [0]), channel.call(0x00, 0xb9, [0])]);
    expect(maxInFlight).toBe(1);
  });

  it('parses profile names and ignores empty slots', () => {
    const guid = new Array(16).fill(7);
    expect(parseProfileName(Uint8Array.from([...guid, ...new TextEncoder().encode('fps'), 0]))).toBe('fps');
    expect(parseProfileName(Uint8Array.from(new Array(40).fill(0xff)))).toBeNull();
    expect(parseProfileName(Uint8Array.from(guid))).toBeNull();
  });
});

