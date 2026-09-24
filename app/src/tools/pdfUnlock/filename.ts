/** `statement.pdf` → `statement-unlocked.pdf`; falls back to `document` for an empty base name. */
export function unlockedFilename(name: string): string {
  const base = name.trim().replace(/\.pdf$/i, '').trim() || 'document';
  return `${base}-unlocked.pdf`;
}
