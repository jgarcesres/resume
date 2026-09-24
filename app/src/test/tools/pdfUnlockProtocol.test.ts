import { describe, expect, it } from 'vitest';
import { toUnlockCode } from '../../tools/pdfUnlock/protocol';

describe('toUnlockCode', () => {
  it('passes known codes through from wasm errors', () => {
    expect(toUnlockCode(new Error('WRONG_PASSWORD'))).toBe('WRONG_PASSWORD');
    expect(toUnlockCode(new Error('UNSUPPORTED_ENCRYPTION'))).toBe('UNSUPPORTED_ENCRYPTION');
  });

  it('maps anything unrecognised to MALFORMED_PDF', () => {
    expect(toUnlockCode(new Error('RuntimeError: unreachable'))).toBe('MALFORMED_PDF');
    expect(toUnlockCode('boom')).toBe('MALFORMED_PDF');
    expect(toUnlockCode(undefined)).toBe('MALFORMED_PDF');
  });
});
