/** Keep in sync with `UnlockError::code()` in tools/pdf-unlock/src/error.rs. */
export const UNLOCK_CODES = ['NOT_ENCRYPTED', 'WRONG_PASSWORD', 'UNSUPPORTED_ENCRYPTION', 'MALFORMED_PDF'] as const;
export type UnlockCode = (typeof UNLOCK_CODES)[number];

/** WASM errors carry their code as the message; anything else is a generic failure. */
export function toUnlockCode(value: unknown): UnlockCode {
  const message = value instanceof Error ? value.message : String(value);
  return (UNLOCK_CODES as readonly string[]).includes(message) ? (message as UnlockCode) : 'MALFORMED_PDF';
}

export interface Inspection {
  encrypted: boolean;
  needsPassword: boolean;
}

// The File itself is posted (a cheap handle, not a copy) and read in the worker.
export type WorkerRequest =
  | { id: number; op: 'inspect'; file: Blob }
  | { id: number; op: 'unlock'; file: Blob; password: string };

export type WorkerResponse =
  | { id: number; ok: true; op: 'inspect'; inspection: Inspection }
  | { id: number; ok: true; op: 'unlock'; pdf: ArrayBuffer }
  | { id: number; ok: false; code: UnlockCode };
