// Minimal WebHID types (the DOM lib doesn't ship them yet); just what this tool uses.
// https://wicg.github.io/webhid/

interface HIDReportInfo {
  reportId: number;
}

interface HIDCollectionInfo {
  usagePage: number;
  usage: number;
  featureReports?: HIDReportInfo[];
  inputReports?: HIDReportInfo[];
  outputReports?: HIDReportInfo[];
}

interface HIDDevice extends EventTarget {
  readonly opened: boolean;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly collections: HIDCollectionInfo[];
  open(): Promise<void>;
  close(): Promise<void>;
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
  receiveFeatureReport(reportId: number): Promise<DataView>;
}

interface HIDDeviceFilter {
  vendorId?: number;
  productId?: number;
  usagePage?: number;
  usage?: number;
}

interface HIDConnectionEvent extends Event {
  readonly device: HIDDevice;
}

interface HID extends EventTarget {
  getDevices(): Promise<HIDDevice[]>;
  requestDevice(options: { filters: HIDDeviceFilter[] }): Promise<HIDDevice[]>;
}

interface Navigator {
  readonly hid: HID;
}
