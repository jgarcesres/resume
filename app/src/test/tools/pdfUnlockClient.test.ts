import { describe, expect, it, vi } from 'vitest';
import { createPdfUnlocker, UnlockFailure, type WorkerLike } from '../../tools/pdfUnlock/client';
import type { WorkerRequest, WorkerResponse } from '../../tools/pdfUnlock/protocol';

class FakeWorker implements WorkerLike {
  onmessage: WorkerLike['onmessage'] = null;
  onerror: WorkerLike['onerror'] = null;
  sent: WorkerRequest[] = [];
  terminated = false;
  postMessage(message: WorkerRequest) {
    this.sent.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(response: WorkerResponse) {
    this.onmessage?.({ data: response } as MessageEvent<WorkerResponse>);
  }
  crash() {
    this.onerror?.({ preventDefault() {} } as unknown as ErrorEvent);
  }
}

const file = new Blob(['%PDF-1.7'], { type: 'application/pdf' });

function setup() {
  const workers: FakeWorker[] = [];
  const factory = vi.fn(() => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  });
  return { unlocker: createPdfUnlocker(factory), factory, workers };
}

describe('createPdfUnlocker', () => {
  it('starts the worker lazily and resolves inspect results', async () => {
    const { unlocker, factory, workers } = setup();
    expect(factory).not.toHaveBeenCalled();

    const pending = unlocker.inspect(file);
    const [request] = workers[0].sent;
    expect(request).toMatchObject({ op: 'inspect', file });
    workers[0].reply({ id: request.id, ok: true, op: 'inspect', inspection: { encrypted: true, needsPassword: true } });

    await expect(pending).resolves.toEqual({ encrypted: true, needsPassword: true });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('sends the password verbatim and resolves the unlocked bytes', async () => {
    const { unlocker, workers } = setup();
    const pending = unlocker.unlock(file, '  spaced pw ');
    const [request] = workers[0].sent;
    expect(request).toMatchObject({ op: 'unlock', password: '  spaced pw ' });
    workers[0].reply({ id: request.id, ok: true, op: 'unlock', pdf: new Uint8Array([37, 80, 68, 70]).buffer });

    await expect(pending).resolves.toEqual(new Uint8Array([37, 80, 68, 70]));
  });

  it('rejects with an UnlockFailure carrying the worker error code', async () => {
    const { unlocker, workers } = setup();
    const pending = unlocker.unlock(file, 'nope');
    workers[0].reply({ id: workers[0].sent[0].id, ok: false, code: 'WRONG_PASSWORD' });

    await expect(pending).rejects.toBeInstanceOf(UnlockFailure);
    await expect(pending).rejects.toMatchObject({ code: 'WRONG_PASSWORD' });
  });

  it('matches responses to requests by id', async () => {
    const { unlocker, workers } = setup();
    const first = unlocker.inspect(file);
    const second = unlocker.inspect(file);
    const [a, b] = workers[0].sent;
    workers[0].reply({ id: b.id, ok: true, op: 'inspect', inspection: { encrypted: false, needsPassword: false } });
    workers[0].reply({ id: a.id, ok: true, op: 'inspect', inspection: { encrypted: true, needsPassword: true } });

    await expect(first).resolves.toEqual({ encrypted: true, needsPassword: true });
    await expect(second).resolves.toEqual({ encrypted: false, needsPassword: false });
  });

  it('fails pending requests when the worker crashes, then starts a fresh worker', async () => {
    const { unlocker, workers } = setup();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const pending = unlocker.inspect(file);
    workers[0].crash();

    await expect(pending).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
    expect(workers[0].terminated).toBe(true);

    void unlocker.inspect(file);
    expect(workers).toHaveLength(2);
    log.mockRestore();
  });

  it('terminates the worker on dispose', () => {
    const { unlocker, workers } = setup();
    void unlocker.inspect(file).catch(() => {});
    unlocker.dispose();
    expect(workers[0].terminated).toBe(true);
  });
});
