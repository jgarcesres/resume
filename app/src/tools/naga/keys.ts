/** USB HID keyboard usages (HID Usage Tables, page 0x07) and modifier bits. */

export const MODS = {
  ctrl: 0x01,
  shift: 0x02,
  alt: 0x04,
  gui: 0x08,
  rctrl: 0x10,
  rshift: 0x20,
  ralt: 0x40,
  rgui: 0x80,
} as const;

export type ModName = keyof typeof MODS;

const MOD_LABEL: Record<ModName, string> = {
  ctrl: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
  gui: 'Super',
  rctrl: 'Right Ctrl',
  rshift: 'Right Shift',
  ralt: 'Right Alt',
  rgui: 'Right Super',
};

/** HID usage → label shown on the key. */
export const KEY_LABELS: Record<number, string> = (() => {
  const k: Record<number, string> = {};
  for (let i = 0; i < 26; i++) k[0x04 + i] = String.fromCharCode(65 + i);
  for (let i = 1; i <= 9; i++) k[0x1d + i] = String(i);
  k[0x27] = '0';
  Object.assign(k, {
    0x28: 'Enter', 0x29: 'Esc', 0x2a: 'Backspace', 0x2b: 'Tab', 0x2c: 'Space',
    0x2d: '-', 0x2e: '=', 0x2f: '[', 0x30: ']', 0x31: '\\', 0x33: ';', 0x34: "'",
    0x35: '`', 0x36: ',', 0x37: '.', 0x38: '/', 0x39: 'Caps Lock',
    0x46: 'Print Screen', 0x47: 'Scroll Lock', 0x48: 'Pause', 0x49: 'Insert',
    0x4a: 'Home', 0x4b: 'Page Up', 0x4c: 'Delete', 0x4d: 'End', 0x4e: 'Page Down',
    0x4f: 'Right', 0x50: 'Left', 0x51: 'Down', 0x52: 'Up',
    0x53: 'Num Lock', 0x54: 'Num /', 0x55: 'Num *', 0x56: 'Num -', 0x57: 'Num +',
    0x58: 'Num Enter', 0x63: 'Num .',
    0xe0: 'Left Ctrl', 0xe1: 'Left Shift', 0xe2: 'Left Alt', 0xe3: 'Left Super',
    0xe4: 'Right Ctrl', 0xe5: 'Right Shift', 0xe6: 'Right Alt', 0xe7: 'Right Super',
  });
  for (let i = 1; i <= 9; i++) k[0x58 + i] = `Num ${i}`;
  k[0x62] = 'Num 0';
  for (let i = 1; i <= 12; i++) k[0x39 + i] = `F${i}`;
  for (let i = 13; i <= 24; i++) k[0x68 + i - 13] = `F${i}`;
  return k;
})();

/** KeyboardEvent.code → HID usage. Layout-independent: it names the physical key. */
export const CODE_TO_USAGE: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (let i = 0; i < 26; i++) m[`Key${String.fromCharCode(65 + i)}`] = 0x04 + i;
  for (let i = 1; i <= 9; i++) m[`Digit${i}`] = 0x1d + i;
  m.Digit0 = 0x27;
  for (let i = 1; i <= 9; i++) m[`Numpad${i}`] = 0x58 + i;
  m.Numpad0 = 0x62;
  for (let i = 1; i <= 12; i++) m[`F${i}`] = 0x39 + i;
  for (let i = 13; i <= 24; i++) m[`F${i}`] = 0x68 + i - 13;
  Object.assign(m, {
    Enter: 0x28, Escape: 0x29, Backspace: 0x2a, Tab: 0x2b, Space: 0x2c,
    Minus: 0x2d, Equal: 0x2e, BracketLeft: 0x2f, BracketRight: 0x30, Backslash: 0x31,
    Semicolon: 0x33, Quote: 0x34, Backquote: 0x35, Comma: 0x36, Period: 0x37, Slash: 0x38,
    CapsLock: 0x39, PrintScreen: 0x46, ScrollLock: 0x47, Pause: 0x48, Insert: 0x49,
    Home: 0x4a, PageUp: 0x4b, Delete: 0x4c, End: 0x4d, PageDown: 0x4e,
    ArrowRight: 0x4f, ArrowLeft: 0x50, ArrowDown: 0x51, ArrowUp: 0x52,
    NumLock: 0x53, NumpadDivide: 0x54, NumpadMultiply: 0x55, NumpadSubtract: 0x56,
    NumpadAdd: 0x57, NumpadEnter: 0x58, NumpadDecimal: 0x63,
    ControlLeft: 0xe0, ShiftLeft: 0xe1, AltLeft: 0xe2, MetaLeft: 0xe3,
    ControlRight: 0xe4, ShiftRight: 0xe5, AltRight: 0xe6, MetaRight: 0xe7,
  });
  return m;
})();

const MODIFIER_USAGES = new Set([0xe0, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7]);

export function isModifierUsage(usage: number): boolean {
  return MODIFIER_USAGES.has(usage);
}

export function keyLabel(usage: number): string {
  return KEY_LABELS[usage] ?? `Key 0x${usage.toString(16).padStart(2, '0')}`;
}

export function comboLabel(mods: number, usage: number): string {
  const names = (Object.keys(MODS) as ModName[]).filter((m) => mods & MODS[m]).map((m) => MOD_LABEL[m]);
  return [...names, keyLabel(usage)].join(' + ');
}

/** The (mods, usage) a key press describes, or null for an unknown key. A lone modifier press maps to that modifier key itself. */
export function comboFromEvent(e: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>): { mods: number; usage: number } | null {
  const usage = CODE_TO_USAGE[e.code];
  if (usage === undefined) return null;
  if (isModifierUsage(usage)) return { mods: 0, usage };
  let mods = 0;
  if (e.ctrlKey) mods |= MODS.ctrl;
  if (e.shiftKey) mods |= MODS.shift;
  if (e.altKey) mods |= MODS.alt;
  if (e.metaKey) mods |= MODS.gui;
  return { mods, usage };
}
