// @vitest-environment node
// Runs the *committed* WASM build, so a broken or stale artifact fails `npm test`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { initSync, inspect, unlock } from '../../wasm/pdf-unlock/pdf_unlock.js';

const wasmPath = fileURLToPath(new URL('../../wasm/pdf-unlock/pdf_unlock_bg.wasm', import.meta.url));
const fixture = (name: string) =>
  new Uint8Array(
    readFileSync(fileURLToPath(new URL(`../../../../tools/pdf-unlock/tests/fixtures/${name}.pdf`, import.meta.url))),
  );
const startsWithPdfHeader = (bytes: Uint8Array) => new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';

describe('pdf-unlock wasm', () => {
  beforeAll(() => {
    initSync({ module: readFileSync(wasmPath) });
  });

  it('inspects an encrypted PDF', () => {
    const result = inspect(fixture('aes-256'));
    expect(result.encrypted).toBe(true);
    expect(result.needsPassword).toBe(true);
    result.free();
  });

  it('unlocks with the user password', () => {
    expect(startsWithPdfHeader(unlock(fixture('aes-256'), 'user'))).toBe(true);
  });

  it('unlocks legacy RC4 with the owner password', () => {
    expect(startsWithPdfHeader(unlock(fixture('rc4-128'), 'owner'))).toBe(true);
  });

  it('throws every error code as a message across the WASM boundary', () => {
    expect(() => unlock(fixture('aes-256'), 'nope')).toThrow('WRONG_PASSWORD');
    expect(() => inspect(new TextEncoder().encode('not a pdf'))).toThrow('MALFORMED_PDF');
    expect(() => unlock(fixture('plain'), 'user')).toThrow('NOT_ENCRYPTED');
    expect(() => unlock(fixture('rc4-128-utf8'), 'contraseña')).toThrow('UNSUPPORTED_ENCRYPTION');
  });
});
