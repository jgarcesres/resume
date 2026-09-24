import init, { inspect, unlock } from '../../wasm/pdf-unlock/pdf_unlock.js';
import wasmUrl from '../../wasm/pdf-unlock/pdf_unlock_bg.wasm?url';
import { toUnlockCode, type WorkerRequest, type WorkerResponse } from './protocol';

// Typed as Worker because the app's tsconfig only has DOM libs; the
// postMessage/onmessage shapes match DedicatedWorkerGlobalScope.
const scope = self as unknown as Worker;
const ready = init({ module_or_path: wasmUrl });

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  let response: WorkerResponse;
  const transfer: Transferable[] = [];
  try {
    await ready;
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    if (request.op === 'inspect') {
      const result = inspect(bytes);
      response = {
        id: request.id,
        ok: true,
        op: 'inspect',
        inspection: { encrypted: result.encrypted, needsPassword: result.needsPassword },
      };
      result.free();
    } else {
      const pdf = unlock(bytes, request.password);
      // wasm-bindgen returns a fresh copy, so its buffer is safe to transfer.
      response = { id: request.id, ok: true, op: 'unlock', pdf: pdf.buffer as ArrayBuffer };
      transfer.push(pdf.buffer);
    }
  } catch (err) {
    response = { id: request.id, ok: false, code: toUnlockCode(err) };
  }
  scope.postMessage(response, transfer);
};
