/**
 * Web Serial API Helper untuk Modul USB Relay LCUS-1 (CH340)
 * Dikoneksikan ke Socket J3 PCB Tokuyo (MS1 = Signal, GND = Ground)
 */

const RELAY_ON_HEX = new Uint8Array([0xA0, 0x01, 0x01, 0xA2]);
const RELAY_OFF_HEX = new Uint8Array([0xA0, 0x01, 0x00, 0xA1]);
const PULSE_DURATION_MS = 100;
const INTER_PULSE_DELAY_MS = 100;
const DEFAULT_BAUDRATE = 9600;

let isPulseExecuting = false;

/**
 * Meminta izin pengguna & membuka koneksi USB Serial ke modul CH340 / LCUS-1
 */
export async function connectUSBRelay(): Promise<SerialPort | null> {
  if (typeof window === 'undefined' || !('serial' in navigator)) {
    console.warn('Web Serial API tidak didukung di browser/lingkungan ini.');
    return null;
  }

  try {
    // 1. Cek apakah ada port yang sudah di-pair sebelumnya
    const ports = await navigator.serial.getPorts();
    let port: SerialPort;

    if (ports.length > 0) {
      port = ports[0];
    } else {
      // 2. Minta izin pairing port baru dengan filter vendor ID CH340 (0x1a86)
      port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x1a86 }, // CH340 LCUS-1 USB Relay
          { usbVendorId: 0x0403 }, // FTDI
          { usbVendorId: 0x10c4 }, // CP2102
        ],
      });
    }

    // Buka port jika belum terbuka
    if (!port.readable || !port.writable) {
      await port.open({ baudRate: DEFAULT_BAUDRATE });
    }

    console.log('USB Relay LCUS-1 CH340 terhubung di baudrate', DEFAULT_BAUDRATE);
    return port;
  } catch (error) {
    console.error('Gagal membuka koneksi USB Serial:', error);
    return null;
  }
}

/**
 * Mengirimkan sinyal pulsa kelipatan (Multi-Pulse) ke PCB Tokuyo
 * 1 Pulsa = 100ms ON / 100ms OFF
 */
export async function sendPulsesToTokuyo(
  port: SerialPort,
  pulseCount: number,
  onPulseProgress?: (currentPulse: number, total: number) => void
): Promise<boolean> {
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
export async function stopTokuyoChair(port: SerialPort): Promise<boolean> {
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
