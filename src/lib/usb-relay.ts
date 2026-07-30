/**
 * Singleton Hybrid Hardware Helper untuk Modul USB Relay LCUS-1 (CH340)
 * Mendukung 2 Mode Komunikasi Hardware:
 * Mode A: Android Native Kiosk Shell APK via `@JavascriptInterface` (`window.AndroidBridge`)
 * Mode B: Chrome Desktop Web Serial API (`navigator.serial`)
 */

const RELAY_ON_HEX = new Uint8Array([0xA0, 0x01, 0x01, 0xA2]);
const RELAY_OFF_HEX = new Uint8Array([0xA0, 0x01, 0x00, 0xA1]);

// 200ms ON & 150ms OFF guarantees solid mechanical relay contact & booster optical coupler trigger
const PULSE_DURATION_MS = 200;
const INTER_PULSE_DELAY_MS = 150;
const DEFAULT_BAUDRATE = 9600;

let activeSerialPort: SerialPort | null = null;
let isPulseExecuting = false;

/**
 * Cek apakah berjalan di dalam Android Native Kiosk APK Shell
 */
export function isAndroidKioskNative(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).AndroidBridge);
}

/**
 * Mengecek status koneksi hardware fisik aktual (AndroidBridge atau Web Serial API)
 */
export function checkHardwareConnected(): boolean {
  // Mode A: Android Native Kiosk Shell APK
  if (typeof window !== 'undefined' && (window as any).AndroidBridge) {
    try {
      const bridge = (window as any).AndroidBridge;
      if (typeof bridge.isHardwareConnected === 'function') {
        const isConn = bridge.isHardwareConnected();
        return Boolean(isConn);
      }
      return true;
    } catch (e) {
      console.warn('[AndroidBridge] Error calling isHardwareConnected:', e);
      return true;
    }
  }

  // Mode B: Web Serial API (Desktop Chrome)
  if (activeSerialPort && (activeSerialPort.readable || activeSerialPort.writable)) {
    return true;
  }

  return false;
}

/**
 * Singleton helper untuk membuka dan mengembalikan koneksi USB Serial yang aktif
 */
export async function connectUSBRelay(): Promise<SerialPort | null> {
  // Mode A: Android Native Kiosk Shell APK
  if (isAndroidKioskNative()) {
    console.log('[Hardware] Connected via Android Native Kiosk Bridge (AndroidBridge).');
    return {} as SerialPort;
  }

  // Mode B: Web Serial API (Desktop Chrome)
  if (typeof window === 'undefined' || !('serial' in navigator)) {
    throw new Error('Web Serial API tidak didukung di browser ini. Gunakan Chrome Desktop atau Android Kiosk APK.');
  }

  try {
    // 1. Jika activeSerialPort sudah ada dan masih terbuka, gunakan langsung (Singleton)
    if (activeSerialPort && (activeSerialPort.readable || activeSerialPort.writable)) {
      return activeSerialPort;
    }

    // 2. Cek port yang tersambung
    const ports = await navigator.serial.getPorts();
    if (ports.length > 0) {
      activeSerialPort = ports[0];
    } else {
      try {
        activeSerialPort = await navigator.serial.requestPort({
          filters: [
            { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340 LCUS-1 Specific
            { usbVendorId: 0x1a86 }, // CH340 General
            { usbVendorId: 0x0403 }, // FTDI
            { usbVendorId: 0x10c4 }, // CP2102
          ],
        });
      } catch (filterError) {
        console.warn('Fallback ke requestPort tanpa filter...', filterError);
        activeSerialPort = await navigator.serial.requestPort();
      }
    }

    if (!activeSerialPort) {
      return null;
    }

    // 3. Buka port secara aman jika belum terbuka
    try {
      if (!activeSerialPort.readable || !activeSerialPort.writable) {
        await activeSerialPort.open({ baudRate: DEFAULT_BAUDRATE });
      }
    } catch (openErr: any) {
      if (!openErr.message?.includes('already open') && !openErr.message?.includes('Failed to open')) {
        console.warn('Port open notice:', openErr.message);
      }
    }

    console.log('USB Relay LCUS-1 CH340 terhubung di baudrate', DEFAULT_BAUDRATE);
    return activeSerialPort;
  } catch (error: any) {
    console.error('Gagal membuka koneksi USB Serial:', error);
    throw error;
  }
}

/**
 * Mengirimkan sinyal pulsa kelipatan (Multi-Pulse) ke PCB Tokuyo / Parkee Booster V5
 * 1 Pulsa = 200ms ON / 150ms OFF (Solid mechanical contact)
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
  const targetPort = port || activeSerialPort || (await connectUSBRelay().catch(() => null));

  if (!targetPort) {
    console.error('Port USB Relay tidak tersedia.');
    return false;
  }

  // Auto re-open port jika belum writable
  if (!targetPort.readable || !targetPort.writable) {
    try {
      await targetPort.open({ baudRate: DEFAULT_BAUDRATE });
    } catch (e: any) {
      if (!e.message?.includes('already open')) {
        console.warn('Re-opening port in sendPulsesToTokuyo notice:', e.message);
      }
    }
  }

  if (!targetPort.writable) {
    console.error('Port USB Relay tidak dapat ditulis (writable stream null).');
    return false;
  }

  if (isPulseExecuting) {
    console.warn('Proses pengiriman pulsa sebelumnya masih berjalan, melempar mutex lock...');
    return false;
  }

  isPulseExecuting = true;
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  try {
    writer = targetPort.writable.getWriter();
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
    if (writer) {
      try {
        writer.releaseLock();
      } catch (e) {
        // ignore lock release error
      }
    }
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
  const targetPort = port || activeSerialPort || (await connectUSBRelay().catch(() => null));

  if (!targetPort) {
    console.warn('Port USB Relay tidak tersedia saat penghentian paksa.');
    return false;
  }

  if (!targetPort.readable || !targetPort.writable) {
    try {
      await targetPort.open({ baudRate: DEFAULT_BAUDRATE });
    } catch (e: any) {
      if (!e.message?.includes('already open')) {
        console.warn('Re-opening port in stopTokuyoChair notice:', e.message);
      }
    }
  }

  if (!targetPort.writable) {
    console.warn('Port USB Relay tidak dapat ditulis.');
    return false;
  }

  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  try {
    writer = targetPort.writable.getWriter();
    await writer.write(RELAY_OFF_HEX);
    console.log('Sinyal Breaker OFF Hex (0xA0 0x01 0x00 0xA1) berhasil terkirim ke PCB Tokuyo.');
    return true;
  } catch (error) {
    console.error('Gagal memicu penghentian paksa USB Relay:', error);
    return false;
  } finally {
    if (writer) {
      try {
        writer.releaseLock();
      } catch (e) {
        // ignore
      }
    }
  }
}
