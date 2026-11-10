import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import NagaMapper from '../../pages/NagaMapper';
import { ThemeProvider } from '../../context/ThemeContext';
import { REPORT_LEN } from '../../tools/naga/protocol';

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <NagaMapper />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

/** A simulated Naga Pro with a 12-button plate, profiles in slots 01 and 05, and factory number keys. */
function simulatedMouse() {
  const live = { active: 0x01, slots: [0x01, 0x05] };
  const info = new Map<number, number[]>();
  const table = new Map<string, number[]>();
  const key = (slot: number, button: number, layer: number) => `${slot}|${button}|${layer}`;
  let reply = new Uint8Array(REPORT_LEN);

  function answer(req: Uint8Array): number[] | null {
    const c = (req[6] << 8) | req[7];
    const args = Array.from(req.slice(8, 8 + req[5]));
    switch (c) {
      case 0x00b9:
        return [0x03];
      case 0x0084:
        return [0x00, 0x00];
      case 0x0584:
        return [live.active];
      case 0x0580:
        return [live.slots.length];
      case 0x0581:
        return [0x05, ...live.slots];
      case 0x0502:
        live.slots = [...live.slots, args[0]].sort();
        return args;
      case 0x0503:
        live.slots = live.slots.filter((s) => s !== args[0]);
        return args;
      case 0x0508: {
        const [slot, , offset] = args;
        const data = info.get(slot) ?? new Array(0xfa).fill(0);
        data.splice(offset, args.length - 5, ...args.slice(5));
        info.set(slot, data);
        return args;
      }
      case 0x0588: {
        const [slot, , offset] = args;
        const data = info.get(slot);
        return data ? [slot, 0, offset, 0, 0xfa, ...data.slice(offset, offset + Math.min(64, 0xfa - offset))] : null;
      }
      case 0x028c: {
        const [slot, button, layer] = args;
        const stored = table.get(key(slot, button, layer));
        if (stored) return [slot, button, layer, ...stored];
        const n = button - 0x40;
        return [slot, button, layer, ...(n >= 0 && n < 12 ? [0x02, 0x01, 0x00, 0x1e + n, 0x00] : [0x01, 0x01, button, 0, 0])];
      }
      case 0x020c: {
        const [slot, button, layer, ...rest] = args;
        table.set(key(slot, button, layer), rest.slice(0, 5));
        return args;
      }
      default:
        throw new Error(`unexpected command ${c.toString(16)}`);
    }
  }

  const device = {
    vendorId: 0x1532,
    productId: 0x008f,
    productName: 'Razer Naga Pro',
    opened: false,
    collections: [{ usagePage: 0x01, usage: 0x02, featureReports: [{ reportId: 0 }] }],
    async open() {
      device.opened = true;
    },
    async sendFeatureReport(_id: number, data: BufferSource) {
      const req = new Uint8Array(data as ArrayBuffer);
      const out = answer(req);
      reply = Uint8Array.from(req);
      reply[0] = out ? 0x02 : 0x05;
      reply[5] = Math.max(req[5], out?.length ?? 0);
      reply.set(out ?? [], 8);
    },
    async receiveFeatureReport() {
      return new DataView(reply.buffer.slice(0));
    },
  };

  const hid = {
    requestDevice: async () => [device],
    getDevices: async () => [],
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  return { device, hid, table, live };
}

describe('Naga Pro mapper page', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    delete (navigator as { hid?: unknown }).hid;
  });

  it('tells browsers without WebHID what to use instead', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Naga Pro Mapper');
    expect(screen.getByRole('alert')).toHaveTextContent(/chrome, edge/i);
    expect(screen.queryByRole('button', { name: /connect the mouse/i })).toBeNull();
  });

  it('reads the mouse, records a key and writes it', async () => {
    const mouse = simulatedMouse();
    Object.defineProperty(navigator, 'hid', { value: mouse.hid, configurable: true });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /connect the mouse/i }));
    const first = await screen.findByRole('button', { name: 'Button 1: 1' }, { timeout: 8000 });
    await user.click(first);
    await user.click(screen.getByRole('button', { name: /record a key/i }));
    await user.keyboard('{Control>}q{/Control}');
    await user.click(await screen.findByRole('button', { name: /write 1 to the mouse/i }));

    await waitFor(() => expect(mouse.table.get(`1|${0x40}|0`)).toEqual([0x02, 0x02, 0x01, 0x14, 0x00]), { timeout: 4000 });
    expect(await screen.findByRole('button', { name: 'Button 1: Ctrl + Q' })).toBeInTheDocument();
  }, 20000);

  it('follows a profile switch made with the mouse button', async () => {
    const mouse = simulatedMouse();
    Object.defineProperty(navigator, 'hid', { value: mouse.hid, configurable: true });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /connect the mouse/i }));
    expect(await screen.findByText(/slot 01 · active/, {}, { timeout: 8000 })).toBeInTheDocument();
    mouse.live.active = 0x05;
    expect(await screen.findByText(/slot 05 · active/, {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.queryByText(/slot 01 · active/)).toBeNull();
  }, 20000);

  it('shows which button sent a key in the button test', async () => {
    const mouse = simulatedMouse();
    Object.defineProperty(navigator, 'hid', { value: mouse.hid, configurable: true });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /connect the mouse/i }));
    await screen.findByRole('button', { name: 'Button 3: 3' }, { timeout: 8000 });
    await user.click(screen.getByRole('application', { name: /button test pad/i }));
    await user.keyboard('{3>}');
    expect(screen.getByRole('list', { name: /received inputs/i })).toHaveTextContent(/3: .*Button 3/);
    expect(screen.getByRole('button', { name: 'Button 3: 3' }).className).toMatch(/led-green/);
    await user.keyboard('{/3}');
    expect(screen.getByRole('button', { name: 'Button 3: 3' }).className).not.toMatch(/led-green/);
  }, 20000);

  it('creates a profile in an empty slot and deletes it', async () => {
    const mouse = simulatedMouse();
    Object.defineProperty(navigator, 'hid', { value: mouse.hid, configurable: true });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /connect the mouse/i }));
    await screen.findByRole('button', { name: 'Button 1: 1' }, { timeout: 8000 });
    await user.click(screen.getByRole('button', { name: /new profile in slot 03/i }));
    await user.type(screen.getByLabelText(/name for slot 03/i), 'Raid{Enter}');
    expect(await screen.findByText('Raid', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(mouse.live.slots).toEqual([0x01, 0x03, 0x05]);

    const del = await screen.findByRole('button', { name: /^delete$/i }, { timeout: 8000 });
    await waitFor(() => expect(del).toBeEnabled(), { timeout: 8000 });
    await user.click(del);
    await user.click(screen.getByRole('button', { name: /delete it/i }));
    await waitFor(() => expect(mouse.live.slots).toEqual([0x01, 0x05]), { timeout: 4000 });
    expect(await screen.findByRole('button', { name: /new profile in slot 03/i })).toBeInTheDocument();
  }, 30000);
});
