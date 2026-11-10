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

/** A simulated Naga Pro with a 12-button plate, one profile (slot 01) and factory number keys. */
function simulatedMouse() {
  const table = new Map<string, number[]>();
  const key = (slot: number, button: number, layer: number) => `${slot}|${button}|${layer}`;
  let reply = new Uint8Array(REPORT_LEN);

  function answer(req: Uint8Array): number[] {
    const c = (req[6] << 8) | req[7];
    const args = Array.from(req.slice(8, 8 + req[5]));
    switch (c) {
      case 0x00b9:
        return [0x03];
      case 0x0084:
        return [0x00, 0x00];
      case 0x0584:
        return [0x01];
      case 0x0580:
        return [0x01];
      case 0x0581:
        return [0x01, 0x01];
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
      reply[0] = 0x02;
      reply[5] = Math.max(req[5], out.length);
      reply.set(out, 8);
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
  return { device, hid, table };
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
});
