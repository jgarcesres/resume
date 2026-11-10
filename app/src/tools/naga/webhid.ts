import { PRODUCT_IDS, VENDOR_ID } from './naga';

/** The interface that carries the configuration protocol: Generic Desktop / Mouse with feature report 0. */
export function isConfigInterface(device: HIDDevice): boolean {
  return device.collections.some(
    (c) => c.usagePage === 0x01 && c.usage === 0x02 && (c.featureReports ?? []).some((r) => r.reportId === 0),
  );
}

export function webHidSupported(): boolean {
  return typeof navigator !== 'undefined' && 'hid' in navigator;
}

const FILTERS: HIDDeviceFilter[] = Object.values(PRODUCT_IDS).map((productId) => ({
  vendorId: VENDOR_ID,
  productId,
  usagePage: 0x01,
  usage: 0x02,
}));

/** Ask the browser for the mouse. Resolves null when the user cancels or picks nothing usable. */
export async function requestNaga(): Promise<HIDDevice | null> {
  const picked = await navigator.hid.requestDevice({ filters: FILTERS });
  const device = picked.find(isConfigInterface);
  if (!device) return null;
  if (!device.opened) await device.open();
  return device;
}

/** A mouse this page was already allowed to use, so a reload doesn't need the picker again. */
export async function previouslyAllowedNaga(): Promise<HIDDevice | null> {
  const devices = await navigator.hid.getDevices();
  const device = devices.find((d) => d.vendorId === VENDOR_ID && isConfigInterface(d));
  if (!device) return null;
  if (!device.opened) await device.open();
  return device;
}
