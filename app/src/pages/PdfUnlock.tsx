import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import PageTransition from '../components/PageTransition';
import PixelPanel from '../components/ui/PixelPanel';
import PixelButton from '../components/ui/PixelButton';
import { LockIcon } from '../components/ui/PixelIcons';
import { useTheme } from '../context/ThemeContext';
import { useLabels } from '../lib/labels';
import { createPdfUnlocker, UnlockFailure, type PdfUnlocker } from '../tools/pdfUnlock/client';
import { unlockedFilename } from '../tools/pdfUnlock/filename';
import type { UnlockCode } from '../tools/pdfUnlock/protocol';

const SOURCE_URL = 'https://github.com/jgarcesres/resume/tree/main/tools/pdf-unlock';

const ERROR_MESSAGES: Record<UnlockCode, string> = {
  NOT_ENCRYPTED: "This PDF isn't password-protected, so there's nothing to remove.",
  WRONG_PASSWORD: "That password didn't work. Check it and try again.",
  UNSUPPORTED_ENCRYPTION:
    "This PDF uses encryption this tool can't remove (for example certificate-based encryption, or a non-ASCII password on an older RC4/AES-128 file).",
  MALFORMED_PDF: "Couldn't read this file. Make sure it's a valid PDF.",
};

const RPG_UI = {
  text: 'font-pixel text-[9px] leading-relaxed text-rpg-text',
  dim: 'font-pixel text-[8px] leading-relaxed text-rpg-text-dim',
  error: 'font-pixel text-[9px] leading-relaxed text-neon-magenta',
  link: 'text-neon-cyan underline',
  drop: 'border-2 border-dashed border-neon-cyan/40 hover:border-neon-cyan',
  dropActive: 'border-neon-cyan bg-neon-cyan/10',
  input:
    'w-full bg-rpg-deep border-2 border-neon-cyan/40 px-3 py-2 font-mono text-sm text-rpg-text-bright focus:outline-none focus:border-neon-cyan',
  download:
    'inline-block font-pixel text-[10px] uppercase tracking-wider px-5 py-3 border-2 border-neon-gold/60 bg-neon-gold/10 text-neon-gold hover:bg-neon-gold/20',
};

const PRO_UI: typeof RPG_UI = {
  text: 'text-[14px] leading-relaxed text-pro-ink',
  dim: 'text-[13px] leading-relaxed text-pro-muted',
  error: 'text-[13px] leading-relaxed text-pro-led-red',
  link: 'text-pro-accent underline',
  drop: 'border border-dashed border-pro-rule-strong hover:border-pro-accent',
  dropActive: 'border-pro-accent bg-pro-accent-tint',
  input:
    'w-full bg-pro-bg border border-pro-rule-strong px-3 py-2 font-mono text-sm text-pro-ink focus:outline-none focus:border-pro-accent',
  download:
    'inline-block font-sans text-[13px] font-medium tracking-wide px-5 py-2.5 border bg-pro-accent text-pro-bg border-pro-accent hover:bg-pro-accent-soft',
};

type Phase =
  | { kind: 'idle' }
  | { kind: 'busy'; file: File; step: 'Checking' | 'Unlocking' }
  | { kind: 'password'; file: File; wrong: boolean }
  | { kind: 'done'; file: File; url: string }
  | { kind: 'error'; code: UnlockCode };

/** Mutable, non-rendered state. `generation` invalidates in-flight work. */
interface Session {
  generation: number;
  url: string | null;
  unlocker: PdfUnlocker | null;
}

function PdfUnlock() {
  const { isRpg } = useTheme();
  const L = useLabels();
  const ui = isRpg ? RPG_UI : PRO_UI;
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [password, setPassword] = useState('');
  const [dragging, setDragging] = useState(false);
  const session = useRef<Session>({ generation: 0, url: null, unlocker: null });

  useEffect(() => {
    const s = session.current;
    return () => {
      s.generation++;
      if (s.url) URL.revokeObjectURL(s.url);
      s.url = null;
      s.unlocker?.dispose();
      s.unlocker = null;
    };
  }, []);

  const unlocker = () => (session.current.unlocker ??= createPdfUnlocker());

  const releaseUrl = () => {
    const s = session.current;
    if (s.url) URL.revokeObjectURL(s.url);
    s.url = null;
  };

  // Each file gets its own worker: a stuck or crashed one (e.g. out of memory)
  // can't delay or poison the next file, and its memory is freed.
  const dropUnlocker = () => {
    const s = session.current;
    s.unlocker?.dispose();
    s.unlocker = null;
  };

  async function runUnlock(file: File, typedPassword: string | null) {
    const generation = ++session.current.generation;
    const isStale = () => generation !== session.current.generation;
    try {
      let pw = typedPassword;
      if (pw === null) {
        setPhase({ kind: 'busy', file, step: 'Checking' });
        const info = await unlocker().inspect(file);
        if (isStale()) return;
        if (!info.encrypted) {
          setPhase({ kind: 'error', code: 'NOT_ENCRYPTED' });
          return;
        }
        if (info.needsPassword) {
          setPhase({ kind: 'password', file, wrong: false });
          return;
        }
        pw = '';
      }
      setPhase({ kind: 'busy', file, step: 'Unlocking' });
      const pdf = await unlocker().unlock(file, pw);
      if (isStale()) return;
      releaseUrl();
      const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
      session.current.url = url;
      setPassword('');
      setPhase({ kind: 'done', file, url });
    } catch (err) {
      if (isStale()) return;
      const code = err instanceof UnlockFailure ? err.code : 'MALFORMED_PDF';
      if (code === 'WRONG_PASSWORD') {
        setPhase({ kind: 'password', file, wrong: true });
        return;
      }
      setPassword('');
      setPhase({ kind: 'error', code });
    }
  }

  function chooseFile(file: File | undefined) {
    if (!file) return;
    session.current.generation++; // invalidate the old run before its worker is stopped
    dropUnlocker();
    releaseUrl();
    setPassword('');
    void runUnlock(file, null);
  }

  function reset() {
    session.current.generation++;
    dropUnlocker();
    releaseUrl();
    setPassword('');
    setPhase({ kind: 'idle' });
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow picking the same file again
    chooseFile(file);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (phase.kind === 'password') void runUnlock(phase.file, password);
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        {isRpg ? (
          <h1 className="font-pixel text-lg text-rpg-text-bright">{L.pdfUnlockTitle}</h1>
        ) : (
          <div className="pt-4 space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="pro-label">06 / {L.toolsTitle}</span>
              <span className="flex-1 h-px bg-pro-rule" aria-hidden />
            </div>
            <h1 className="pro-display text-[40px] leading-none tracking-tight text-pro-ink">{L.pdfUnlockTitle}</h1>
          </div>
        )}
        <p className={ui.dim}>{L.pdfUnlockSub}</p>

        <PixelPanel glow="cyan">
          {phase.kind === 'done' ? (
            <div className="space-y-4 text-center">
              <p className={ui.text}>
                Unlocked <strong>{phase.file.name}</strong>. The copy below has no password.
              </p>
              <a href={phase.url} download={unlockedFilename(phase.file.name)} className={ui.download}>
                Download {unlockedFilename(phase.file.name)}
              </a>
              <div>
                <PixelButton variant="magenta" onClick={reset}>
                  Unlock another
                </PixelButton>
              </div>
            </div>
          ) : (
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`block cursor-pointer p-8 text-center transition-colors ${ui.drop} ${dragging ? ui.dropActive : ''}`}
            >
              <input
                type="file"
                accept="application/pdf,.pdf"
                aria-label="Choose a PDF"
                className="sr-only"
                onChange={onInputChange}
              />
              <LockIcon className="w-8 h-8 mx-auto mb-3" />
              <span className={ui.text}>Drop a PDF here, or click to pick one</span>
            </label>
          )}

          <div role="status" aria-live="polite" className="mt-4 min-h-[1.25rem]">
            {phase.kind === 'busy' && (
              <span className={ui.dim}>
                {phase.step} {phase.file.name}…
              </span>
            )}
          </div>

          {phase.kind === 'error' && (
            <p role="alert" className={ui.error}>
              {ERROR_MESSAGES[phase.code]}
            </p>
          )}

          {phase.kind === 'password' && (
            <form onSubmit={onSubmit} className="space-y-3">
              <label htmlFor="pdf-password" className={`block ${ui.text}`}>
                Password for {phase.file.name}
              </label>
              <input
                id="pdf-password"
                type="password"
                autoComplete="off"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={phase.wrong || undefined}
                aria-describedby={phase.wrong ? 'pdf-password-error' : undefined}
                className={ui.input}
              />
              {phase.wrong && (
                <p id="pdf-password-error" role="alert" className={ui.error}>
                  {ERROR_MESSAGES.WRONG_PASSWORD}
                </p>
              )}
              <PixelButton variant="gold">Unlock</PixelButton>
            </form>
          )}
        </PixelPanel>

        <PixelPanel title="Privacy">
          <ul className={`space-y-2 ${ui.text}`}>
            <li>Your PDF and password never leave this browser tab: nothing is uploaded, logged, or stored.</li>
            <li>Decryption runs in a Web Worker, using a Rust library compiled to WebAssembly.</li>
            <li>
              Don't take my word for it: watch your browser's network tab while you unlock, or{' '}
              <a className={ui.link} href={SOURCE_URL} target="_blank" rel="noreferrer">
                read the source
              </a>
              .
            </li>
          </ul>
        </PixelPanel>
      </div>
    </PageTransition>
  );
}

export default PdfUnlock;
