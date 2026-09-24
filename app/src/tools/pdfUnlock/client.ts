import type { Inspection, UnlockCode, WorkerRequest, WorkerResponse } from './protocol';

export class UnlockFailure extends Error {
  readonly code: UnlockCode;
  constructor(code: UnlockCode) {
    super(code);
    this.name = 'UnlockFailure';
    this.code = code;
  }
}

export interface PdfUnlocker {
  inspect(file: Blob): Promise<Inspection>;
  unlock(file: Blob, password: string): Promise<Uint8Array>;
  /** Terminates the worker; pending requests reject. */
  dispose(): void;
}

/** The slice of `Worker` the client uses — lets tests pass a fake. */
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export type WorkerFactory = () => WorkerLike;

const spawnWorker: WorkerFactory = () =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

type Success = Extract<WorkerResponse, { ok: true }>;
interface Pending {
  resolve: (response: Success) => void;
  reject: (failure: UnlockFailure) => void;
}

export function createPdfUnlocker(factory: WorkerFactory = spawnWorker): PdfUnlocker {
  let worker: WorkerLike | null = null;
  let nextId = 1;
  const pending = new Map<number, Pending>();

  const failAll = (code: UnlockCode) => {
    for (const request of pending.values()) request.reject(new UnlockFailure(code));
    pending.clear();
  };

  const getWorker = (): WorkerLike => {
    if (worker) return worker;
    const spawned = factory();
    spawned.onmessage = (event) => {
      const response = event.data;
      const request = pending.get(response.id);
      if (!request) return;
      pending.delete(response.id);
      if (response.ok) request.resolve(response);
      else request.reject(new UnlockFailure(response.code));
    };
    spawned.onerror = (event) => {
      event.preventDefault();
      // The worker failed to load or crashed; don't reuse it.
      spawned.terminate();
      worker = null;
      console.error('pdf-unlock: worker failed', event.message);
      failAll('INTERNAL_ERROR');
    };
    worker = spawned;
    return spawned;
  };

  const send = (build: (id: number) => WorkerRequest) =>
    new Promise<Success>((resolve, reject) => {
      const target = getWorker();
      const id = nextId++;
      pending.set(id, { resolve, reject });
      target.postMessage(build(id));
    });

  return {
    async inspect(file) {
      const response = await send((id) => ({ id, op: 'inspect', file }));
      if (response.op !== 'inspect') throw new UnlockFailure('INTERNAL_ERROR');
      return response.inspection;
    },
    async unlock(file, password) {
      const response = await send((id) => ({ id, op: 'unlock', file, password }));
      if (response.op !== 'unlock') throw new UnlockFailure('INTERNAL_ERROR');
      return new Uint8Array(response.pdf);
    },
    dispose() {
      worker?.terminate();
      worker = null;
      failAll('INTERNAL_ERROR');
    },
  };
}
