/**
 * Hybrid Hardware Helper untuk Modul USB Relay LCUS-1 (CH340)
 * Mendukung 2 Mode Komunikasi Hardware:
 * Mode A: Android Native Kiosk Shell APK via `@JavascriptInterface` (`window.AndroidBridge`)
 * Mode B: Chrome Desktop Web Serial API (`navigator.serial`)
 */

const RELAY_ON_HEX = new Uint8Array([0xA0, 0x01, 0x01, 0xA2]);
const RELAY_OFF_HEX = new Uint8Array([0xA0, 0x01, 0x00, 0xA1]);
const PULSE_DURATION_MS = 100;
const INTER_PULSE_DELAY_MS = 100;
const DEFAULT_BAUDRATE = 9600;

let isPulseExecuting = false;

/**
 * Cek apakah berjalan di dalam Android Native Kiosk APK Shell
 */
export function isAndroidKioskNative(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).AndroidBridge);
}

/**
 * Meminta izin pengguna & membuka koneksi USB Serial ke modul CH340 / LCUS-1
 */
export async function connectUSBRelay(): Promise<SerialPort | null> {
  // Mode A: Android Native Kiosk Shell APK
  if (isAndroidKioskNative()) {
    console.log('[Hardware] Connected via Android Native Kiosk Bridge (AndroidBridge).');
    return {} as SerialPort; // Return dummy SerialPort object for Android Native APK
  }

  // Mode B: Web Serial API (Desktop Chrome)
  if (typeof window === 'undefined' || !('serial' in navigator)) {
    throw new Error('Web Serial API tidak didukung di browser ini. Gunakan Chrome Desktop atau Android Kiosk APK.');
  }

  try {
    const ports = await navigator.serial.getPorts();
    let port: SerialPort | null = null;

    if (ports.length > 0) {
      port = ports[0];
    } else {
      try {
        port = await navigator.serial.requestPort({
          filters: [
            { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340 LCUS-1 Specific
            { usbVendorId: 0x1a86 }, // CH340 General
            { usbVendorId: 0x0403 }, // FTDI
            { usbVendorId: 0x10c4 }, // CP2102
          ],
        });
      } catch (filterError) {
        console.warn('Fallback ke requestPort tanpa filter...', filterError);
        port = await navigator.serial.requestPort();
      }
    }

    if (!port) {
      return null;
    }

    if (!port.readable || !port.writable) {
      await port.open({ baudRate: DEFAULT_BAUDRATE });
    }

    console.log('USB Relay LCUS-1 CH340 terhubung di baudrate', DEFAULT_BAUDRATE);
    return port;
  } catch (error: any) {
    console.error('Gagal membuka koneksi USB Serial:', error);
    throw error;
  }
}

/**
 * Mengirimkan sinyal pulsa kelipatan (Multi-Pulse) ke PCB Tokuyo
 * 1 Pulsa = 100ms ON / 100ms OFF
 */
export async function sendPulsesToTokuyo(
  port: SerialPort | null,
  pulseCount: number,
  onPulseProgress?: (currentPulse: number, total: number) => void
): Promise<boolean> {
  // Mode A: Android Native Kiosk Shell APK
  if (isAndroidKioskNative()) {
    console.log(`[Hardware AndroidBridge] Triggering ${pulseCount} pulses via Native OTG Driver...`);
    try {
      return (window as any).AndroidBridge.sendPulses(pulseCount);
    } catch (err) {
      console.error('Error calling AndroidBridge.sendPulses:', err);
      return false;
    }
  }

  // Mode B: Web Serial API (Desktop Chrome)
  if (!port || !port.writable) {
    console.error('Port USB Relay tidak tersedia atau belum terbuka.');
    return false;
  }

  if (isPulseExecuting) {
    console.warn('Proses pengiriman pulsa sedang berjalan, melempar mutex lock...');
    return false;
  }

  isPulseExecuting = true;
  const writer = port.writable.getWriter();

  try {
    for (let i = 1; i <= pulseCount; i++) {
      if (onPulseProgress) {
        onPulseProgress(i, pulseCount);
      }

      // 1. Send Relay ON (Short MS1 to GND)
      await writer.write(RELAY_ON_HEX);
      await new Promise((resolve) => setTimeout(resolve, PULSE_DURATION_MS));

      // 2. Send Relay OFF (Disconnect)
      await writer.write(RELAY_OFF_HEX);
      await new Promise((resolve) => setTimeout(resolve, INTER_PULSE_DELAY_MS));
    }
    return true;
  } catch (error) {
    console.error('Error saat mengeksekusi pulsa ke USB Relay:', error);
    return false;
  } finally {
    writer.releaseLock();
    isPulseExecuting = false;
  }
}

/**
 * Menghentikan paksa sesi pijat (Breaker OFF / Emergency Stop)
 * Mengirimkan sinyal Relay OFF 0xA0 0x01 0x00 0xA1 ke PCB Tokuyo
 */
export async function stopTokuyoChair(port: SerialPort | null): Promise<boolean> {
  // Mode A: Android Native Kiosk Shell APK
  if (isAndroidKioskNative()) {
    console.log('[Hardware AndroidBridge] Triggering stopChair (Breaker OFF) via Native OTG Driver...');
    try {
      return (window as any).AndroidBridge.stopChair();
    } catch (err) {
      console.error('Error calling AndroidBridge.stopChair:', err);
      return false;
    }
  }

  // Mode B: Web Serial API (Desktop Chrome)
  if (!port || !port.writable) {
    console.warn('Port USB Relay tidak tersedia saat penghentian paksa.');
    return false;
  }

  try {
    const writer = port.writable.getWriter();
    await writer.write(RELAY_OFF_HEX);
    writer.releaseLock();
    console.log('Sinyal Breaker OFF Hex (0xA0 0x01 0x00 0xA1) berhasil terkirim ke PCB Tokuyo.');
    return true;
  } catch (error) {
    console.error('Gagal memicu penghentian paksa USB Relay:', error);
    return false;
  }
}
