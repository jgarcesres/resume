/**
 * Razer Naga Pro: button ids, side plates, profiles and the mapping record.
 * Reverse-engineered from Synapse USB captures (November 2026); every value
 * marked "confirmed" in the protocol notes was written from Linux and seen
 * working on the mouse.
 */
import { comboLabel } from './keys';
import { RazerChannel, type FeatureTransport, type TransactOptions } from './protocol';

export const VENDOR_ID = 0x1532;
export const PRODUCT_IDS = { wireless: 0x0090, wired: 0x008f } as const;
export const TRANSACTION_ID = 0x1f;

const CMD = {
  getMode: [0x00, 0x84],
  setMode: [0x00, 0x04],
  getPlate: [0x00, 0xb9],
  getProfile: [0x05, 0x84],
  setProfile: [0x05, 0x04],
  getProfileCount: [0x05, 0x80],
  getProfileList: [0x05, 0x81],
  getProfileInfo: [0x05, 0x88],
  getMapping: [0x02, 0x8c],
  setMapping: [0x02, 0x0c],
} as const;

export const MODE = { normal: 0x00, driver: 0x03 } as const;
export type Mode = 'normal' | 'driver' | 'unknown';

export type PlateSize = 2 | 6 | 12;

/** Plate id (00/B9 reply) → size. 0x00 means no plate is detected. */
export const PLATE_BY_ID: Record<number, PlateSize> = { 0x01: 2, 0x03: 12, 0x04: 6 };

/** Button ids per plate, in the order printed on the plate (1, 2, 3, …). */
export const PLATE_BUTTONS: Record<PlateSize, number[]> = {
  2: [0x05, 0x04], // front, back (also the mouse's forward/back)
  6: [0x50, 0x51, 0x52, 0x53, 0x54, 0x55],
  12: Array.from({ length: 12 }, (_, i) => 0x40 + i),
};

export const TOP_BUTTONS: { id: number; name: string }[] = [
  { id: 0x01, name: 'Left click' },
  { id: 0x02, name: 'Right click' },
  { id: 0x03, name: 'Wheel click' },
  { id: 0x09, name: 'Wheel up' },
  { id: 0x0a, name: 'Wheel down' },
  { id: 0x0b, name: 'Wheel tilt left' },
  { id: 0x0c, name: 'Wheel tilt right' },
  { id: 0x0e, name: 'Profile button' },
  { id: 0x34, name: 'DPI up' },
  { id: 0x35, name: 'DPI down' },
];

export const LAYER = { normal: 0x00, hypershift: 0x01 } as const;
export type Layer = keyof typeof LAYER;

export const ACTION = { disabled: 0x00, mouse: 0x01, key: 0x02, hscroll: 0x06, profile: 0x07, dpi: 0x0e } as const;

export const MOUSE_BUTTONS: Record<number, string> = {
  0x01: 'Left click',
  0x02: 'Right click',
  0x03: 'Middle click',
  0x04: 'Back',
  0x05: 'Forward',
  0x09: 'Wheel up',
  0x0a: 'Wheel down',
};

/** The 5 meaningful bytes of a mapping record: action, flag, 3 data bytes. */
export interface Mapping {
  action: number;
  flag: number;
  data: [number, number, number];
}

export const keyMapping = (usage: number, mods = 0): Mapping => ({ action: ACTION.key, flag: 0x02, data: [mods, usage, 0] });
export const mouseMapping = (button: number): Mapping => ({ action: ACTION.mouse, flag: 0x01, data: [button, 0, 0] });

export function mappingFromArgs(args: ArrayLike<number>): Mapping {
  return { action: args[3], flag: args[4], data: [args[5], args[6], args[7]] };
}

export function mappingArgs(slot: number, button: number, layer: number, m: Mapping): number[] {
  return [slot, button, layer, m.action, m.flag, ...m.data, 0, 0];
}

/** Same action, ignoring the flag (Synapse and factory defaults differ only there). */
export function sameMapping(a: Mapping, b: Mapping): boolean {
  return a.action === b.action && a.data[0] === b.data[0] && a.data[1] === b.data[1];
}

/** Byte 4 is 0x01 on factory defaults; mouse actions always carry 0x01, so for those "default" means mapped to itself. */
export function isFactoryDefault(button: number, m: Mapping): boolean {
  if (m.action === ACTION.mouse) return m.data[0] === button;
  return m.flag === 0x01;
}

/** Whether this page can write the action (the ones razer-map has confirmed). */
export function isWritable(m: Mapping): boolean {
  return m.action === ACTION.key || m.action === ACTION.mouse;
}

export function describeMapping(m: Mapping): string {
  const [d0, d1] = m.data;
  switch (m.action) {
    case ACTION.disabled:
      return 'Disabled';
    case ACTION.mouse:
      return MOUSE_BUTTONS[d0] ?? `Mouse 0x${d0.toString(16)}`;
    case ACTION.key:
      return comboLabel(d0, d1);
    case ACTION.hscroll:
      return d0 === 0x01 ? 'Scroll left' : d0 === 0x02 ? 'Scroll right' : 'Horizontal scroll';
    case ACTION.profile:
      return d0 === 0x04 ? 'Next profile' : 'Profile action';
    case ACTION.dpi:
      return d0 === 0x09 ? 'DPI up' : d0 === 0x0a ? 'DPI down' : 'DPI action';
    default:
      return `Action 0x${m.action.toString(16)}`;
  }
}

/**
 * Factory action for side-plate buttons: number keys, or forward/back on the
 * 2-button plate. Written with Synapse's flag (0x02), the form razer-map has
 * confirmed; the mouse then shows it as customized but it behaves the same.
 */
export function factoryMapping(button: number): Mapping | null {
  const twelve = [0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x2d, 0x2e]; // 1–9, 0, -, =
  if (button >= 0x40 && button <= 0x4b) return keyMapping(twelve[button - 0x40]);
  if (button >= 0x50 && button <= 0x55) return keyMapping(0x1e + button - 0x50);
  if (button === 0x04 || button === 0x05) return mouseMapping(button);
  return null;
}

/** The Naga Pro over any feature-report transport (WebHID in the browser). */
export class NagaPro {
  readonly channel: RazerChannel;

  constructor(transport: FeatureTransport, options?: TransactOptions) {
    this.channel = new RazerChannel(transport, TRANSACTION_ID, options);
  }

  async plate(): Promise<PlateSize | null> {
    const [id] = await this.channel.call(...CMD.getPlate, [0x00]);
    return PLATE_BY_ID[id] ?? null;
  }

  async mode(): Promise<Mode> {
    const [m] = await this.channel.call(...CMD.getMode, [0x00, 0x00]);
    return m === MODE.normal ? 'normal' : m === MODE.driver ? 'driver' : 'unknown';
  }

  async setNormalMode(): Promise<void> {
    await this.channel.call(...CMD.setMode, [MODE.normal, 0x00]);
  }

  async activeProfile(): Promise<number> {
    const [slot] = await this.channel.call(...CMD.getProfile, [0x00]);
    return slot;
  }

  async setActiveProfile(slot: number): Promise<void> {
    await this.channel.call(...CMD.setProfile, [slot]);
  }

  /** Slots that hold a profile, as the mouse lists them. */
  async profiles(): Promise<number[]> {
    const [count] = await this.channel.call(...CMD.getProfileCount, [0x00]);
    const list = await this.channel.call(...CMD.getProfileList, new Array(0x50).fill(0));
    return Array.from(list.slice(1, 1 + count));
  }

  /** Name stored for the slot (GUID(16), name, NUL, in 64-byte chunks), or null. */
  async profileName(slot: number): Promise<string | null> {
    const INFO_LEN = 0xfa;
    const bytes: number[] = [];
    for (let offset = 0; offset < INFO_LEN; offset += 64) {
      const size = Math.min(64, INFO_LEN - offset);
      const { status, reply } = await this.channel.transact(...CMD.getProfileInfo, [slot, 0, offset, 0, ...new Array(size + 1).fill(0)]);
      if (status !== 'ok') break;
      bytes.push(...reply.slice(8 + 5, 8 + reply[5]));
      if (bytes.slice(16).includes(0)) break;
    }
    return parseProfileName(Uint8Array.from(bytes));
  }

  async getMapping(slot: number, button: number, layer: number): Promise<Mapping> {
    const args = await this.channel.call(...CMD.getMapping, [slot, button, layer, 0, 0, 0, 0, 0, 0, 0]);
    return mappingFromArgs(args);
  }

  async setMapping(slot: number, button: number, layer: number, m: Mapping): Promise<void> {
    await this.channel.call(...CMD.setMapping, mappingArgs(slot, button, layer, m));
  }
}

export function parseProfileName(info: Uint8Array): string | null {
  if (info.length <= 16) return null;
  const rest = info.slice(16);
  const end = rest.indexOf(0);
  const raw = end === -1 ? rest : rest.slice(0, end);
  if (!raw.length || raw.every((b) => b === 0xff)) return null;
  return new TextDecoder().decode(raw);
}
