# Technical Specification & Prompt: Android EDC Kiosk Shell APK (Sakura Massage Chair)

**Kepada:** Tim Developer Android / Mobile Engineering  
**Dari:** System Architect & IoT Engineering  
**Proyek:** Upgrade Smart Kursi Pijat Sakura — Integration EDC Android Kiosk APK  
**Target Device:** EDC Android Terminal (PAX / Sunmi / Ingenico) / Android Touchscreen Kiosk Tablet (Android 8.0+)  

---

## 1. 📌 Overview & Latar Belakang Arsitektur

Proyek **Sakura Massage Chair** mengoperasikan Kiosk Self-Service berbasis **Next.js Web App** yang terdeploy secara live di Vercel:
👉 **Production Web URL:** `https://sakura-massage-chair.vercel.app`

### Permasalahan Browser Chrome Android:
Secara default, Google Chrome Android memblokir akses langsung Web Serial API (`navigator.serial`) ke hardware OTG USB-to-Serial converter (CH340). 

### Solusi Teknis (Android Native Kiosk Shell APK):
Dibutuhkan sebuah **Aplikasi Android Native Wrapper (APK)** berbasis **Android WebView** yang mengintegrasikan **Library USB Serial OTG (CH340)** dan menyediakannya ke Web App via **JavaScript Interface (`@JavascriptInterface`)**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ANDROID EDC TERMINAL / TABLET                      │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                 ANDROID KIOSK APK (NATIVE SHELL)                  │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │        FULLSCREEN WEBVIEW (Next.js 14 App)                  │  │  │
│  │  │        URL: https://sakura-massage-chair.vercel.app         │  │  │
│  │  └──────────────────────────────┬──────────────────────────────┘  │  │
│  │                                 │ JavaScript Bridge               │  │
│  │  ┌──────────────────────────────▼──────────────────────────────┐  │  │
│  │  │      @JavascriptInterface (AndroidBridge.java)              │  │  │
│  │  └──────────────────────────────┬──────────────────────────────┘  │  │
│  │                                 │ Native Java/Kotlin Call         │  │
│  │  ┌──────────────────────────────▼──────────────────────────────┐  │  │
│  │  │   USB Serial Driver (usb-serial-for-android / CH340 SDK)    │  │  │
│  │  └──────────────────────────────┬──────────────────────────────┘  │  │
│  └─────────────────────────────────┼─────────────────────────────────┘  │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │ USB OTG (9600 BPS)
                                     ▼
                    ┌─────────────────────────────────┐
                    │ Modul USB Relay LCUS-1 (CH340)  │
                    └────────────────┬────────────────┘
                                     │ Contact Sinyal (NO - COM)
                                     ▼
                    ┌─────────────────────────────────┐
                    │ Socket J3 PCB Controller Tokuyo │
                    └─────────────────────────────────┘
```

---

## 2. 🔌 Spesifikasi Hardware & Protocol Komunikasi Hex Serial

- **Modul USB Relay:** LCUS-1 1-Channel Relay dengan Micro-controller STC15F104W & Converter USB-to-Serial CH340G (`Vendor ID: 0x1a86`, `Product ID: 0x7523`).
- **Baud Rate:** `9600 BPS`, Data bits: `8`, Stop bits: `1`, Parity: `None`.
- **Target PCB:** Socket J3 Controller Tokuyo (Contact Pulse Decoder).

### Hex Protocol (Multi-Pulse System):
Setiap 1 Pulsa mewakili kelipatan **Rp 5.000 / 4 Menit Pijat**.

1. **Relay ON (Short Contact NO ke COM / Pin MS1 ke GND):**
   `Hex: 0xA0 0x01 0x01 0xA2` (Hold selama **100 ms**)
2. **Relay OFF (Disconnect Saklar / Release):**
   `Hex: 0xA0 0x01 0x00 0xA1` (Interval antar pulsa **100 ms**)
3. **Emergency Breaker OFF:**
   `Hex: 0xA0 0x01 0x00 0xA1`

---

## 3. 🛠️ Persyaratan Fitur Kiosk APK Android (Functional Requirements)

### A. Kiosk Mode & Fullscreen Lockdown:
- Fullscreen WebView (sembunyikan Android Status Bar, Action Bar, dan System Navigation Bar / Immersive Sticky Mode).
- Auto-start pada saat device Android di-reboot / boot-up (`RECEIVE_BOOT_COMPLETED`).
- Lock Task Mode / Kiosk Lockdown (mencegah pengguna keluar dari web app).
- Enable Webview settings: DOM Storage, JavaScript Enabled, Hardware Acceleration, Mixed Content Allowed.

### B. USB OTG Auto-Connect & Service:
- Menggunakan library open-source standard: **`com.github.mik3y:usb-serial-for-android:3.8.0`** (atau SDK CH340 resmi).
- Auto-request izin USB permission saat kabel OTG LCUS-1 dicolokkan (`ACTION_USB_DEVICE_ATTACHED`).
- Mengelola pembukaan & penutupan `UsbSerialPort` di background thread / Service agar tidak blocking UI.

### C. JavaScript Interface (`@JavascriptInterface`):
Aplikasi Android Wajib meregistrasikan JavaScript Object bernama **`AndroidBridge`** ke WebView (`webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");`).

---

## 4. 💻 Contoh Kode Implementasi Java/Kotlin untuk Tim Android

### `AndroidBridge.java`:
```java
package com.sakura.kiosk;

import android.content.Context;
import android.webkit.JavascriptInterface;
import android.util.Log;

public class AndroidBridge {
    private static final String TAG = "AndroidBridge";
    private UsbRelayManager relayManager;

    public AndroidBridge(Context context) {
        this.relayManager = UsbRelayManager.getInstance(context);
    }

    // 1. Panggil dari JS saat pembayaran QRIS sukses
    @JavascriptInterface
    public boolean sendPulses(int count) {
        Log.d(TAG, "JS Triggered sendPulses: " + count);
        return relayManager.sendPulsesToTokuyo(count);
    }

    // 2. Panggil dari JS saat tombol Darurat Batal ditekan
    @JavascriptInterface
    public boolean stopChair() {
        Log.d(TAG, "JS Triggered stopChair (Breaker OFF)");
        return relayManager.sendBreakerOff();
    }

    // 3. Panggil dari JS untuk mengecek status hardware OTG
    @JavascriptInterface
    public boolean isHardwareConnected() {
        return relayManager.isConnected();
    }
}
```

### `UsbRelayManager.java` (Pengiriman Pulsa Hex):
```java
package com.sakura.kiosk;

import com.hoho.android.usbserial.driver.UsbSerialPort;
import com.hoho.android.usbserial.driver.UsbSerialProber;

public class UsbRelayManager {
    private static final byte[] RELAY_ON_HEX = new byte[]{(byte) 0xA0, 0x01, 0x01, (byte) 0xA2};
    private static final byte[] RELAY_OFF_HEX = new byte[]{(byte) 0xA0, 0x01, 0x00, (byte) 0xA1};
    private static final int BAUDRATE = 9600;
    private static final int PULSE_DURATION_MS = 100;
    private static final int INTER_PULSE_DELAY_MS = 100;

    private UsbSerialPort port;

    public boolean sendPulsesToTokuyo(int count) {
        if (port == null) return false;

        new Thread(() -> {
            try {
                for (int i = 0; i < count; i++) {
                    // 1. Relay ON
                    port.write(RELAY_ON_HEX, 1000);
                    Thread.sleep(PULSE_DURATION_MS);

                    // 2. Relay OFF
                    port.write(RELAY_OFF_HEX, 1000);
                    Thread.sleep(INTER_PULSE_DELAY_MS);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
        return true;
    }

    public boolean sendBreakerOff() {
        if (port == null) return false;
        try {
            port.write(RELAY_OFF_HEX, 1000);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean isConnected() {
        return port != null;
    }
}
```

---

## 5. 🌐 Kode Integrasi Web Next.js (Hybrid Fallback)

Di sisi Web App Next.js (`src/lib/usb-relay.ts`), sistem akan secara otomatis mendeteksi apakah berjalan di lingkungan **Android Kiosk APK (`window.AndroidBridge`)** atau **Chrome Desktop (`navigator.serial`)**:

```typescript
export async function sendPulsesToTokuyo(port: SerialPort | null, count: number): Promise<boolean> {
  // Mode A: Android Native Kiosk Shell APK
  if (typeof window !== 'undefined' && (window as any).AndroidBridge) {
    console.log('[Hardware] Executing via Android Native Bridge...');
    return (window as any).AndroidBridge.sendPulses(count);
  }

  // Mode B: Chrome Desktop Web Serial API
  if (port && port.writable) {
    // Existing Web Serial implementation...
    return executeWebSerialPulses(port, count);
  }

  return false;
}
```

---

## 6. 📋 Checklist Deliverables Tim Android

1. [ ] Project Android Studio (Java / Kotlin).
2. [ ] Dependency `usb-serial-for-android` / CH340 SDK terpasang di `build.gradle`.
3. [ ] Class `AndroidBridge` terhubung dengan `WebView` di `MainActivity`.
4. [ ] Fitur Auto-Grant USB Permission untuk Vendor ID `0x1a86` di `AndroidManifest.xml` (`device_filter.xml`).
5. [ ] Build APK Release yang siap di-install pada perangkat EDC Android Kiosk.
