import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PdfUnlock from '../../pages/PdfUnlock';
import { ThemeProvider } from '../../context/ThemeContext';
import { UnlockFailure } from '../../tools/pdfUnlock/client';
import type { Inspection } from '../../tools/pdfUnlock/protocol';

const mocks = vi.hoisted(() => {
  const unlocker = { inspect: vi.fn(), unlock: vi.fn(), dispose: vi.fn() };
  return { ...unlocker, unlocker, create: vi.fn() };
});

vi.mock('../../tools/pdfUnlock/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tools/pdfUnlock/client')>();
  return { ...actual, createPdfUnlocker: () => mocks.create() };
});

const LOCKED: Inspection = { encrypted: true, needsPassword: true };
const pdfFile = (name = 'statement.pdf') => new File(['%PDF-1.7'], name, { type: 'application/pdf' });

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <PdfUnlock />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

async function unlockWithPassword(user: ReturnType<typeof userEvent.setup>, password: string) {
  await user.type(await screen.findByLabelText(/password for statement\.pdf/i), password);
  await user.click(screen.getByRole('button', { name: /^unlock$/i }));
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.create.mockImplementation(() => mocks.unlocker);
  localStorage.clear();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: vi.fn(() => 'blob:unlocked') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: vi.fn() });
});

describe('PdfUnlock page', () => {
  it('asks for the password, then offers the unlocked download', async () => {
    mocks.inspect.mockResolvedValue(LOCKED);
    mocks.unlock.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
    const user = userEvent.setup();
    renderPage();

    const file = pdfFile();
    await user.upload(screen.getByLabelText(/choose a pdf/i), file);
    await unlockWithPassword(user, 'secret');

    const link = await screen.findByRole('link', { name: /download/i });
    expect(link).toHaveAttribute('href', 'blob:unlocked');
    expect(link).toHaveAttribute('download', 'statement-unlocked.pdf');
    expect(mocks.unlock).toHaveBeenCalledWith(file, 'secret');
  });

  it('unlocks owner-only PDFs without asking for a password', async () => {
    mocks.inspect.mockResolvedValue({ encrypted: true, needsPassword: false });
    mocks.unlock.mockResolvedValue(new Uint8Array([1]));
    const user = userEvent.setup();
    renderPage();

    const file = pdfFile();
    await user.upload(screen.getByLabelText(/choose a pdf/i), file);

    expect(await screen.findByRole('link', { name: /download/i })).toBeInTheDocument();
    expect(mocks.unlock).toHaveBeenCalledWith(file, '');
    expect(screen.queryByLabelText(/password for/i)).toBeNull();
  });

  it('stays on the password step after a wrong password and lets the user retry', async () => {
    mocks.inspect.mockResolvedValue(LOCKED);
    mocks.unlock
      .mockRejectedValueOnce(new UnlockFailure('WRONG_PASSWORD'))
      .mockResolvedValueOnce(new Uint8Array([1]));
    const user = userEvent.setup();
    renderPage();

    await user.upload(screen.getByLabelText(/choose a pdf/i), pdfFile());
    await unlockWithPassword(user, 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent(/didn't work/i);
    const field = screen.getByLabelText(/password for statement\.pdf/i);
    await user.clear(field);
    await user.type(field, 'right');
    await user.click(screen.getByRole('button', { name: /^unlock$/i }));

    expect(await screen.findByRole('link', { name: /download/i })).toBeInTheDocument();
    expect(mocks.unlock).toHaveBeenLastCalledWith(expect.any(File), 'right');
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it('passes the password exactly as typed', async () => {
    mocks.inspect.mockResolvedValue(LOCKED);
    mocks.unlock.mockResolvedValue(new Uint8Array([1]));
    const user = userEvent.setup();
    renderPage();

    await user.upload(screen.getByLabelText(/choose a pdf/i), pdfFile());
    await unlockWithPassword(user, '  spaced pw ');

    await screen.findByRole('link', { name: /download/i });
    expect(mocks.unlock).toHaveBeenCalledWith(expect.any(File), '  spaced pw ');
  });

  it.each([
    [{ encrypted: false, needsPassword: false }, null, /isn't password-protected/i],
    [null, 'UNSUPPORTED_ENCRYPTION', /can't remove/i],
    [null, 'MALFORMED_PDF', /couldn't read this file/i],
  ] as const)('explains inspect outcome %#', async (inspection, code, message) => {
    if (inspection) mocks.inspect.mockResolvedValue(inspection);
    else mocks.inspect.mockRejectedValue(new UnlockFailure(code!));
    const user = userEvent.setup();
    renderPage();

    await user.upload(screen.getByLabelText(/choose a pdf/i), pdfFile());

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(mocks.unlock).not.toHaveBeenCalled();
  });

  it('ignores the result for a file that was replaced mid-flight', async () => {
    let resolveFirst!: (value: Inspection) => void;
    mocks.inspect
      .mockImplementationOnce(() => new Promise<Inspection>((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(LOCKED);
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByLabelText(/choose a pdf/i);
    await user.upload(input, pdfFile('first.pdf'));
    await user.upload(input, pdfFile('second.pdf'));
    expect(await screen.findByLabelText(/password for second\.pdf/i)).toBeInTheDocument();

    await act(async () => {
      resolveFirst({ encrypted: true, needsPassword: false });
    });

    expect(mocks.unlock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password for second\.pdf/i)).toBeInTheDocument();
  });

  it('"Unlock another" revokes the download URL and clears the password', async () => {
    mocks.inspect.mockResolvedValue(LOCKED);
    mocks.unlock.mockResolvedValue(new Uint8Array([1]));
    const user = userEvent.setup();
    renderPage();

    await user.upload(screen.getByLabelText(/choose a pdf/i), pdfFile());
    await unlockWithPassword(user, 'secret');
    await user.click(await screen.findByRole('button', { name: /unlock another/i }));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:unlocked');
    expect(mocks.dispose).toHaveBeenCalledTimes(1);
    await user.upload(screen.getByLabelText(/choose a pdf/i), pdfFile());
    expect(await screen.findByLabelText(/password for statement\.pdf/i)).toHaveValue('');
  });

  it('gives each file a fresh worker and stops the previous one', async () => {
    mocks.inspect
      .mockImplementationOnce(() => new Promise<Inspection>(() => {})) // stuck forever
      .mockResolvedValueOnce(LOCKED);
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByLabelText(/choose a pdf/i);
    await user.upload(input, pdfFile('first.pdf'));
    expect(mocks.create).toHaveBeenCalledTimes(1);
    await user.upload(input, pdfFile('second.pdf'));

    // A stuck or crashed worker must not delay or poison the next file.
    expect(mocks.dispose).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(await screen.findByLabelText(/password for second\.pdf/i)).toBeInTheDocument();
  });

  it('revokes the URL and stops the worker when leaving the page', async () => {
    mocks.inspect.mockResolvedValue(LOCKED);
    mocks.unlock.mockResolvedValue(new Uint8Array([1]));
    const user = userEvent.setup();
    const { unmount } = renderPage();

    await user.upload(screen.getByLabelText(/choose a pdf/i), pdfFile());
    await unlockWithPassword(user, 'secret');
    await screen.findByRole('link', { name: /download/i });
    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:unlocked');
    expect(mocks.dispose).toHaveBeenCalled();
  });

  it('explains that everything stays local and links to the source', () => {
    renderPage();
    expect(screen.getByText(/never leave this browser tab/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /read the source/i })).toHaveAttribute(
      'href',
      'https://github.com/jgarcesres/resume/tree/main/tools/pdf-unlock',
    );
  });
});
