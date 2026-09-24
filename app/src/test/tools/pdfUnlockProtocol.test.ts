import { describe, expect, it, vi } from 'vitest';
import { toUnlockCode } from '../../tools/pdfUnlock/protocol';

describe('toUnlockCode', () => {
  it('passes known codes through from wasm errors', () => {
    expect(toUnlockCode(new Error('WRONG_PASSWORD'))).toBe('WRONG_PASSWORD');
    expect(toUnlockCode(new Error('UNSUPPORTED_ENCRYPTION'))).toBe('UNSUPPORTED_ENCRYPTION');
  });

  it('maps anything unrecognised to INTERNAL_ERROR and logs it for debugging', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const trap = new Error('RuntimeError: unreachable');
    expect(toUnlockCode(trap)).toBe('INTERNAL_ERROR');
    expect(toUnlockCode('boom')).toBe('INTERNAL_ERROR');
    expect(toUnlockCode(undefined)).toBe('INTERNAL_ERROR');
    expect(log).toHaveBeenCalledWith(expect.any(String), trap);
    log.mockRestore();
  });
});
