'use client';

import React, { useState, useEffect } from 'react';
import { connectUSBRelay, sendPulsesToTokuyo, stopTokuyoChair, isAndroidKioskNative, checkHardwareConnected } from '@/lib/usb-relay';
import { Usb, CheckCircle2, Power, AlertTriangle } from 'lucide-react';
import { TOKUYO_THEME } from '@/lib/theme';

export default function TestHardwarePage() {
  const [port, setPort] = useState<SerialPort | null>(null);
  const [status, setStatus] = useState<string>('Disconnected');
  const [logs, setLogs] = useState<string[]>([]);
  const [isPulsing, setIsPulsing] = useState(false);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  useEffect(() => {
    // Auto-detect status on load for Android Kiosk APK Native Bridge
    if (isAndroidKioskNative()) {
      const isConnected = checkHardwareConnected();
      if (isConnected) {
        setPort({} as SerialPort);
        setStatus('CONNECTED (Android Kiosk Bridge)');
        addLog('Terhubung via Android Native Kiosk Bridge (AndroidBridge).');
      } else {
        setPort(null);
        setStatus('DISCONNECTED (USB OTG Unplugged)');
        addLog('Android Kiosk APK: Kabel USB OTG LCUS-1 tidak dicolokkan.');
      }
    }
  }, []);

  const handleConnect = async () => {
    try {
      if (isAndroidKioskNative()) {
        const isConnected = checkHardwareConnected();
        if (isConnected) {
          setPort({} as SerialPort);
          setStatus('CONNECTED (Android Kiosk Bridge)');
          addLog('Status Hardware Aktual: CONNECTED (AndroidBridge).');
        } else {
          setPort(null);
          setStatus('DISCONNECTED (USB OTG Unplugged)');
          addLog('Peringatan Hardware: Kabel USB OTG LCUS-1 tidak dicolokkan ke EDC!');
          alert('Kabel USB OTG LCUS-1 tidak dicolokkan ke perangkat EDC!');
        }
        return;
      }

      const serialPort = await connectUSBRelay();
      if (serialPort) {
        setPort(serialPort);
        setStatus('CONNECTED (CH340 USB Relay)');
        addLog('Modul USB Relay LCUS-1 terhubung pada baudrate 9600 BPS.');
      } else {
        setStatus('Connection Cancelled');
        addLog('Koneksi dibatalkan oleh pengguna.');
      }
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
      addLog(`Error Koneksi: ${err.message}`);
    }
  };

  const handleTriggerPulses = async (count: number) => {
    if (isAndroidKioskNative() && !checkHardwareConnected()) {
      alert('Gagal: Kabel USB Relay LCUS-1 tidak dicolokkan ke perangkat EDC!');
      addLog('Gagal Pengiriman: Kabel USB OTG LCUS-1 tidak terhubung.');
      return;
    }

    if (!port && !isAndroidKioskNative()) {
      alert('Silakan hubungkan USB Relay terlebih dahulu.');
      return;
    }

    setIsPulsing(true);
    addLog(`Mengirim ${count} Pulsa Hex (ON 0xA0 0x01 0x01 0xA2 - 200ms) ke Socket J3...`);
    try {
      const success = await sendPulsesToTokuyo(port, count);
      if (success) {
        addLog(`Sukses melepaskan ${count} pulsa ke PCB Tokuyo.`);
      } else {
        addLog(`Gagal memicu pulsa. Cek sambungan kabel fisik LCUS-1.`);
      }
    } catch (err: any) {
      addLog(`Gagal memicu pulsa: ${err.message}`);
    } finally {
      setIsPulsing(false);
    }
  };

  const handleEmergencyStop = async () => {
    if (isAndroidKioskNative() && !checkHardwareConnected()) {
      alert('Gagal: Kabel USB Relay LCUS-1 tidak dicolokkan!');
      return;
    }

    if (!port && !isAndroidKioskNative()) {
      alert('Silakan hubungkan USB Relay terlebih dahulu.');
      return;
    }

    setIsPulsing(true);
    addLog('Mengirim Sinyal Breaker OFF Hex (0xA0 0x01 0x00 0xA1)...');
    try {
      const success = await stopTokuyoChair(port);
      if (success) {
        addLog('Sukses mengirim sinyal Breaker OFF (Relay Disconnect).');
      } else {
        addLog('Gagal mengirim Breaker OFF.');
      }
    } catch (err: any) {
      addLog(`Gagal Breaker OFF: ${err.message}`);
    } finally {
      setIsPulsing(false);
    }
  };

  return (
    <div className={`flex-1 flex flex-col justify-between p-4 sm:p-8 min-h-screen ${TOKUYO_THEME.bgBase}`}>
      <main className="max-w-xl w-full mx-auto my-auto py-6 space-y-6">
        <div className="bg-white border border-[#EFEDED] rounded-[2rem] p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)]">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#EFEDED] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#F8C8DC] text-[#795465] rounded-2xl shadow-sm">
                <Usb className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-[#1B1C1C]">Developer Hardware Tester</h1>
                <p className="text-xs text-[#4F4448] font-medium">Uji Fisik Modul USB Relay LCUS-1 & PCB Tokuyo</p>
              </div>
            </div>
            <span className="bg-[#CEE5DA] text-[#4E635A] text-xs font-bold px-3 py-1 rounded-full">
              {isAndroidKioskNative() ? 'Android Native Bridge' : 'Web Serial API'}
            </span>
          </div>

          {/* Status Card */}
          <div className="bg-[#F5F3F3] border border-[#EFEDED] rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[#4F4448]">Status Device:</span>
              <span className={`font-bold font-mono ${port || (isAndroidKioskNative() && checkHardwareConnected()) ? 'text-[#4E635A]' : 'text-[#BA1A1A]'}`}>
                {status}
              </span>
            </div>
            {!port && !checkHardwareConnected() ? (
              <button
                onClick={handleConnect}
                className="bg-[#795465] hover:bg-[#60404f] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Usb className="w-4 h-4" />
                <span>Connect USB Relay</span>
              </button>
            ) : (
              <span className="bg-[#CEE5DA] text-[#4E635A] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-[#4E635A]" />
                <span>Hardware Active</span>
              </span>
            )}
          </div>

          {/* Trigger Pulse Buttons */}
          <div className="space-y-3">
            <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block">
              Picu Pulsa Manual ke PCB Tokuyo Socket J3:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTriggerPulses(1)}
                disabled={isPulsing || (!port && !checkHardwareConnected())}
                className="bg-white hover:bg-[#F5F3F3] border-2 border-[#EFEDED] text-[#1B1C1C] p-4 rounded-2xl font-bold text-xs transition-all flex flex-col items-center gap-1 shadow-xs disabled:opacity-40 cursor-pointer"
              >
                <span className="text-base font-black text-[#795465]">1 Pulsa</span>
                <span className="text-[11px] text-[#4F4448] font-semibold">4 Menit (Rp 5.000)</span>
              </button>

              <button
                onClick={() => handleTriggerPulses(2)}
                disabled={isPulsing || (!port && !checkHardwareConnected())}
                className="bg-white hover:bg-[#F5F3F3] border-2 border-[#EFEDED] text-[#1B1C1C] p-4 rounded-2xl font-bold text-xs transition-all flex flex-col items-center gap-1 shadow-xs disabled:opacity-40 cursor-pointer"
              >
                <span className="text-base font-black text-[#795465]">2 Pulsa</span>
                <span className="text-[11px] text-[#4F4448] font-semibold">8 Menit (Rp 10.000)</span>
              </button>

              <button
                onClick={() => handleTriggerPulses(4)}
                disabled={isPulsing || (!port && !checkHardwareConnected())}
                className="bg-[#F8C8DC]/30 hover:bg-[#F8C8DC]/50 border-2 border-[#795465] text-[#795465] p-4 rounded-2xl font-bold text-xs transition-all flex flex-col items-center gap-1 shadow-sm disabled:opacity-40 cursor-pointer"
              >
                <span className="text-base font-black text-[#795465]">4 Pulsa</span>
                <span className="text-[11px] text-[#795465] font-extrabold">16 Menit (Popular)</span>
              </button>

              <button
                onClick={() => handleTriggerPulses(10)}
                disabled={isPulsing || (!port && !checkHardwareConnected())}
                className="bg-white hover:bg-[#F5F3F3] border-2 border-[#EFEDED] text-[#1B1C1C] p-4 rounded-2xl font-bold text-xs transition-all flex flex-col items-center gap-1 shadow-xs disabled:opacity-40 cursor-pointer"
              >
                <span className="text-base font-black text-[#795465]">10 Pulsa</span>
                <span className="text-[11px] text-[#4F4448] font-semibold">40 Menit (Rp 50.000)</span>
              </button>
            </div>
          </div>

          {/* Emergency Breaker Test */}
          <div className="pt-2">
            <button
              onClick={handleEmergencyStop}
              disabled={isPulsing || (!port && !checkHardwareConnected())}
              className="w-full bg-[#FFDAD6] hover:bg-[#FFDAD6]/80 text-[#93000A] font-extrabold p-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
            >
              <Power className="w-4 h-4" />
              <span>Test Sinyal Breaker OFF (0xA0 0x01 0x00 0xA1)</span>
            </button>
          </div>

          {/* Console Output Log */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block">
              Console Output Log:
            </label>
            <div className="bg-[#1B1C1C] text-[#CEE5DA] font-mono text-[11px] p-4 rounded-2xl h-44 overflow-y-auto space-y-1 shadow-inner">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">Belum ada aktivitas pulsa terkirim...</div>
              ) : (
                logs.map((log, idx) => <div key={idx}>{log}</div>)
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
