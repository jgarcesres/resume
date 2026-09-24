import { describe, expect, it } from 'vitest';
import { unlockedFilename } from '../../tools/pdfUnlock/filename';

describe('unlockedFilename', () => {
  it.each([
    ['statement.pdf', 'statement-unlocked.pdf'],
    ['REPORT.PDF', 'REPORT-unlocked.pdf'],
    ['a.b.pdf', 'a.b-unlocked.pdf'],
    ['no-extension', 'no-extension-unlocked.pdf'],
    ['.pdf', 'document-unlocked.pdf'],
    ['   .pdf', 'document-unlocked.pdf'],
    ['report.pdf ', 'report-unlocked.pdf'],
  ])('%s → %s', (input, expected) => {
    expect(unlockedFilename(input)).toBe(expected);
  });
});
