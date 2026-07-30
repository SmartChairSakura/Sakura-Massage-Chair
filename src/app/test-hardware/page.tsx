'use client';

import React, { useState } from 'react';
import { connectUSBRelay, sendPulsesToTokuyo } from '@/lib/usb-relay';
import { Armchair, Zap, CheckCircle2, AlertCircle, RefreshCw, Usb } from 'lucide-react';
import { TOKUYO_THEME } from '@/lib/theme';

export default function TestHardwarePage() {
  const [port, setPort] = useState<SerialPort | null>(null);
  const [status, setStatus] = useState<string>('Disconnected');
  const [logs, setLogs] = useState<string[]>([]);
  const [isPulsing, setIsPulsing] = useState(false);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleConnect = async () => {
    try {
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
    if (!port) {
      alert('Silakan hubungkan USB Relay terlebih dahulu.');
      return;
    }
    setIsPulsing(true);
    addLog(`Mengirim ${count} Pulsa Hex (ON 0xA0 0x01 0x01 0xA2 - 100ms) ke Socket J3...`);
    try {
      await sendPulsesToTokuyo(port, count);
      addLog(`Sukses melepaskan ${count} pulsa ke PCB Tokuyo.`);
    } catch (err: any) {
      addLog(`Gagal memicu pulsa: ${err.message}`);
    } finally {
      setIsPulsing(false);
    }
  };

  return (
    <div className={`flex-1 flex flex-col justify-between p-4 sm:p-8 ${TOKUYO_THEME.bgBase}`}>
      <main className="max-w-xl w-full mx-auto my-auto py-6 space-y-6">
        <div className={TOKUYO_THEME.bgCard + ' p-6 sm:p-8 space-y-6'}>
          <div className="flex items-center justify-between border-b border-amber-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-600 to-amber-600 text-white rounded-2xl shadow-md">
                <Usb className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900">Developer Hardware Tester</h1>
                <p className="text-xs text-slate-500 font-medium">Uji Fisik Modul USB Relay & PCB Tokuyo</p>
              </div>
            </div>
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
              Web Serial API
            </span>
          </div>

          {/* Status Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Status Device:</span>
              <span className={`font-bold font-mono ${port ? 'text-emerald-600' : 'text-rose-600'}`}>
                {status}
              </span>
            </div>
            {!port ? (
              <button
                onClick={handleConnect}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-orange-600/20 transition-all flex items-center gap-1.5"
              >
                <Usb className="w-3.5 h-3.5" />
                <span>Connect USB Relay</span>
              </button>
            ) : (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Port Open</span>
              </span>
            )}
          </div>

          {/* Trigger Pulse Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Picu Pulsa Manual ke PCB Tokuyo Socket J3:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTriggerPulses(1)}
                disabled={!port || isPulsing}
                className="bg-white hover:bg-amber-50 border-2 border-amber-200 text-amber-900 p-3.5 rounded-2xl font-bold text-xs transition-all flex flex-col items-center gap-1 shadow-sm disabled:opacity-40"
              >
                <span className="text-base font-black text-orange-600">1 Pulsa</span>
                <span className="text-[11px] text-slate-500 font-normal">4 Menit (Rp 5.000)</span>
              </button>

              <button
                onClick={() => handleTriggerPulses(2)}
                disabled={!port || isPulsing}
                className="bg-white hover:bg-amber-50 border-2 border-amber-200 text-amber-900 p-3.5 rounded-2xl font-bold text-xs transition-all flex flex-col items-center gap-1 shadow-sm disabled:opacity-40"
              >
                <span className="text-base font-black text-orange-600">2 Pulsa</span>
                <span className="text-[11px] text-slate-500 font-normal">8 Menit (Rp 10.000)</span>
              </button>

              <button
                onClick={() => handleTriggerPulses(4)}
                disabled={!port || isPulsing}
                className="bg-orange-50 hover:bg-orange-100 border-2 border-orange-500 text-orange-900 p-3.5 rounded-2xl font-bold text-xs transition-all flex flex-col items-center gap-1 shadow-md shadow-orange-500/10 disabled:opacity-40"
              >
                <span className="text-base font-black text-orange-600">4 Pulsa</span>
                <span className="text-[11px] text-orange-800 font-semibold">16 Menit (Popular)</span>
              </button>

              <button
                onClick={() => handleTriggerPulses(10)}
                disabled={!port || isPulsing}
                className="bg-white hover:bg-amber-50 border-2 border-amber-200 text-amber-900 p-3.5 rounded-2xl font-bold text-xs transition-all flex flex-col items-center gap-1 shadow-sm disabled:opacity-40"
              >
                <span className="text-base font-black text-orange-600">10 Pulsa</span>
                <span className="text-[11px] text-slate-500 font-normal">40 Menit (Rp 50.000)</span>
              </button>
            </div>
          </div>

          {/* Execution Logs */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Console Output Log:
            </label>
            <div className="bg-slate-900 text-emerald-400 font-mono text-[11px] p-4 rounded-2xl h-44 overflow-y-auto space-y-1 shadow-inner border border-slate-800">
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
