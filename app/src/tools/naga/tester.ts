/**
 * The button tester: what the computer received (a key, a mouse button, a
 * wheel step) and which mouse buttons are mapped to send it.
 */
import { comboFromEvent, comboLabel } from './keys';
import { ACTION, MOUSE_BUTTONS, type Mapping } from './naga';

export type Input =
  | { kind: 'key'; usage: number; mods: number }
  | { kind: 'mouse'; button: number }
  | { kind: 'hscroll'; dir: 1 | 2 };

/** DOM MouseEvent.button → the mouse-action button id. */
const DOM_BUTTON: Record<number, number> = { 0: 0x01, 1: 0x03, 2: 0x02, 3: 0x04, 4: 0x05 };

export function inputFromKey(e: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>): Input | null {
  const combo = comboFromEvent(e);
  return combo ? { kind: 'key', ...combo } : null;
}

export function inputFromMouse(button: number): Input | null {
  const id = DOM_BUTTON[button];
  return id === undefined ? null : { kind: 'mouse', button: id };
}

/** One wheel event; a diagonal step counts as its larger axis. */
export function inputFromWheel(deltaX: number, deltaY: number): Input | null {
  if (Math.abs(deltaY) >= Math.abs(deltaX) && deltaY !== 0) return { kind: 'mouse', button: deltaY < 0 ? 0x09 : 0x0a };
  if (deltaX !== 0) return { kind: 'hscroll', dir: deltaX < 0 ? 1 : 2 };
  return null;
}

/** Right-hand modifiers read the same as left-hand ones: the browser only reports "Ctrl held". */
const foldMods = (mods: number) => (mods | (mods >> 4)) & 0x0f;

export function sends(m: Mapping, input: Input): boolean {
  switch (input.kind) {
    case 'key':
      return m.action === ACTION.key && m.data[1] === input.usage && foldMods(m.data[0]) === foldMods(input.mods);
    case 'mouse':
      return m.action === ACTION.mouse && m.data[0] === input.button;
    case 'hscroll':
      return m.action === ACTION.hscroll && m.data[0] === input.dir;
  }
}

export function inputLabel(input: Input): string {
  switch (input.kind) {
    case 'key':
      return comboLabel(input.mods, input.usage);
    case 'mouse':
      return MOUSE_BUTTONS[input.button] ?? `Mouse 0x${input.button.toString(16)}`;
    case 'hscroll':
      return input.dir === 1 ? 'Scroll left' : 'Scroll right';
  }
}

/** Identifies a held input so its release can be matched to its press. */
export function inputId(input: Input): string {
  return input.kind === 'key' ? `k${input.usage}` : input.kind === 'mouse' ? `m${input.button}` : `h${input.dir}`;
}
