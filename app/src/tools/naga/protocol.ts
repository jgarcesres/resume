/**
 * Razer's 90-byte feature-report protocol (report ID 0), as documented by
 * openrazer and checked against Synapse captures of a Naga Pro.
 *
 *   [0]      status          0x00 in requests; see STATUS for replies
 *   [1]      transaction id  0x1F on the Naga Pro
 *   [2:4]    remaining packets
 *   [4]      protocol type   0x00
 *   [5]      data size       number of argument bytes
 *   [6]      command class
 *   [7]      command id      reads are usually the write id | 0x80
 *   [8:88]   arguments
 *   [88]     checksum        XOR of bytes 2..87
 *   [89]     reserved
 */

export const REPORT_LEN = 90;

export type Status = 'new' | 'busy' | 'ok' | 'failure' | 'timeout' | 'not supported' | 'unknown';

const STATUS: Record<number, Status> = {
  0x00: 'new',
  0x01: 'busy',
  0x02: 'ok',
  0x03: 'failure',
  0x04: 'timeout',
  0x05: 'not supported',
};

export function statusOf(reply: Uint8Array): Status {
  return STATUS[reply[0]] ?? 'unknown';
}

export function checksum(report: Uint8Array): number {
  let crc = 0;
  for (let i = 2; i < 88; i++) crc ^= report[i];
  return crc;
}

export function buildReport(transactionId: number, cmdClass: number, cmdId: number, args: ArrayLike<number>): Uint8Array {
  if (args.length > 80) throw new RangeError('at most 80 argument bytes');
  const r = new Uint8Array(REPORT_LEN);
  r[1] = transactionId;
  r[5] = args.length;
  r[6] = cmdClass;
  r[7] = cmdId;
  r.set(Array.from(args), 8);
  r[88] = checksum(r);
  return r;
}

/** The argument bytes of a reply: at least `minLength`, more if the reply says so. */
export function replyArgs(reply: Uint8Array, minLength: number): Uint8Array {
  return reply.slice(8, 8 + Math.max(reply[5], minLength));
}

/** What the page needs from a WebHID device; tests pass a fake. */
export interface FeatureTransport {
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
  receiveFeatureReport(reportId: number): Promise<DataView>;
}

export class RazerError extends Error {
  constructor(
    message: string,
    readonly status?: Status,
  ) {
    super(message);
    this.name = 'RazerError';
  }
}

const hex2 = (n: number) => n.toString(16).padStart(2, '0');

export interface TransactOptions {
  replyWaitMs?: number;
  retries?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One request/reply exchange. The mouse answers "busy" until the reply is
 * ready, so poll a few times. Calls are serialized: the mouse has one reply
 * buffer, so overlapping requests would read each other's answers.
 */
export class RazerChannel {
  private queue: Promise<unknown> = Promise.resolve();
  private readonly wait: number;
  private readonly retries: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly transport: FeatureTransport,
    private readonly transactionId: number,
    options: TransactOptions = {},
  ) {
    this.wait = options.replyWaitMs ?? 30;
    this.retries = options.retries ?? 20;
    this.sleep = options.sleep ?? defaultSleep;
  }

  transact(cmdClass: number, cmdId: number, args: ArrayLike<number>): Promise<{ status: Status; reply: Uint8Array }> {
    const run = this.queue.then(() => this.exchange(cmdClass, cmdId, args));
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** transact(), throwing unless the mouse answered ok. Returns the argument bytes. */
  async call(cmdClass: number, cmdId: number, args: ArrayLike<number>): Promise<Uint8Array> {
    const { status, reply } = await this.transact(cmdClass, cmdId, args);
    if (status !== 'ok') throw new RazerError(`${hex2(cmdClass)}/${hex2(cmdId)}: ${status}`, status);
    return replyArgs(reply, args.length);
  }

  private async exchange(cmdClass: number, cmdId: number, args: ArrayLike<number>) {
    await this.transport.sendFeatureReport(0, buildReport(this.transactionId, cmdClass, cmdId, args));
    let reply = new Uint8Array(REPORT_LEN);
    for (let i = 0; i < this.retries; i++) {
      await this.sleep(this.wait);
      const view = await this.transport.receiveFeatureReport(0);
      let bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
      // Some platforms hand back the report ID as a leading byte.
      if (bytes.length === REPORT_LEN + 1) bytes = bytes.subarray(1);
      reply = Uint8Array.from(bytes);
      if (reply[0] !== 0x01) break;
    }
    let status = statusOf(reply);
    if (status === 'ok' && (reply[6] !== cmdClass || reply[7] !== cmdId)) status = 'unknown';
    return { status, reply };
  }
}
