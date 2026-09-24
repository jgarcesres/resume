/** Codes the WASM throws. Keep in sync with `UnlockError::code()` in tools/pdf-unlock/src/error.rs. */
export const UNLOCK_CODES = ['NOT_ENCRYPTED', 'WRONG_PASSWORD', 'UNSUPPORTED_ENCRYPTION', 'MALFORMED_PDF'] as const;
/** The WASM codes, plus INTERNAL_ERROR for a crash, out-of-memory, or a worker that failed to load. */
export type UnlockCode = (typeof UNLOCK_CODES)[number] | 'INTERNAL_ERROR';

/**
 * WASM errors carry their code as the message. Anything else is unexpected, so
 * log it (locally; it never contains file data or the password) for debugging.
 */
export function toUnlockCode(value: unknown): UnlockCode {
  const message = value instanceof Error ? value.message : String(value);
  if ((UNLOCK_CODES as readonly string[]).includes(message)) return message as UnlockCode;
  console.error('pdf-unlock: unexpected failure', value);
  return 'INTERNAL_ERROR';
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
