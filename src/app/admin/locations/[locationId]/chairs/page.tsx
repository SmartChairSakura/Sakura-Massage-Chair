'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Armchair,
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
} from 'lucide-react';
import { Chair, Location } from '@/types';

export const dynamic = 'force-dynamic';

export default function ScopedChairListPage() {
  const params = useParams();
  const locationId = String(params.locationId || '');

  const [location, setLocation] = useState<Location | null>(null);
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Chair Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChair, setEditingChair] = useState<Chair | null>(null);

  const [newChairCode, setNewChairCode] = useState('');
  const [newChairName, setNewChairName] = useState('');
  const [newModelType, setNewModelType] = useState('Tokuyo TC-355');
  const [newPin, setNewPin] = useState('123456');
  const [modalMsg, setModalMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Chair Modal
  const [deleteConfirmChair, setDeleteConfirmChair] = useState<Chair | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchScopedChairs = async () => {
    if (!locationId) return;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/admin/locations/${locationId}/chairs`);
      const data = await res.json();
      if (data.success) {
        setLocation(data.location || null);
        setChairs(data.chairs || []);
      }
    } catch (err) {
      console.warn('Fetch scoped chairs error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScopedChairs();
  }, [locationId]);

  const openAddModal = () => {
    setEditingChair(null);
    setNewChairCode('');
    setNewChairName('');
    setNewModelType('Tokuyo TC-355');
    setNewPin('123456');
    setModalMsg('');
    setShowAddModal(true);
  };

  const openEditModal = (chair: Chair) => {
    setEditingChair(chair);
    setNewChairCode(String(chair.chair_code || chair.id));
    setNewChairName(chair.name || '');
    setNewModelType(chair.model_type || 'Tokuyo TC-355');
    setNewPin(chair.pin || '123456');
    setModalMsg('');
    setShowAddModal(true);
  };

  const handleChairFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newChairCode.trim().toUpperCase();
    const cleanName = newChairName.trim();
    const cleanModel = newModelType.trim() || 'Tokuyo TC-355';
    const cleanPin = newPin.trim() || '123456';

    if (!cleanCode || !cleanName) {
      setModalMsg('Kode Unit dan Nama Unit wajib diisi.');
      return;
    }

    setIsSaving(true);
    setModalMsg('');

    try {
      let res;
      if (editingChair) {
        res = await fetch('/api/admin/chairs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chair_code: cleanCode,
            name: cleanName,
            model_type: cleanModel,
            location_id: locationId,
            location_name: location?.name || 'Cabang Kiosk',
            pin: cleanPin,
          }),
        });
      } else {
        res = await fetch(`/api/admin/locations/${locationId}/chairs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chair_code: cleanCode,
            name: cleanName,
            model_type: cleanModel,
            pin: cleanPin,
          }),
        });
      }

      const resData = await res.json();

      if (resData.success) {
        setShowAddModal(false);
        fetchScopedChairs();
      } else {
        setModalMsg(resData.error || 'Gagal menyimpan unit kursi.');
      }
    } catch (err: any) {
      setModalMsg(`Error: ${err?.message || 'Server unreachable'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteChairConfirm = async () => {
    if (!deleteConfirmChair) return;
    const targetCode = String(deleteConfirmChair.chair_code || deleteConfirmChair.id).trim();

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/chairs?id=${encodeURIComponent(targetCode)}`, {
        method: 'DELETE',
      });
      const resData = await res.json();

      if (resData.success) {
        setDeleteConfirmChair(null);
        fetchScopedChairs();
      } else {
        alert(`Gagal menghapus unit kursi: ${resData.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Network error: ${e?.message || 'Server unreachable'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/locations"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#795465] hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Location Setting</span>
          </Link>
          <h1 className="text-xl font-extrabold text-[#1B1C1C] tracking-tight flex items-center gap-2">
            <Armchair className="w-5 h-5 text-[#795465]" />
            <span>Chair List: {location?.name || 'Cabang'}</span>
          </h1>
          <p className="text-xs text-[#4F4448] font-bold mt-0.5">
            Daftar unit kursi pijat terpasang di <span className="text-[#795465] font-extrabold">{location?.name}</span> (Kode: {location?.location_code}).
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-3 bg-[#795465] hover:bg-[#684756] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[#795465]/20 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ TAMBAH UNIT KURSI</span>
        </button>
      </div>

      {/* Scoped Chairs Table */}
      <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs font-extrabold text-[#795465] animate-pulse">
            Memuat daftar kursi lokasi...
          </div>
        ) : chairs.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#817478] font-bold">
            Belum ada unit kursi terdaftar di lokasi ini. Klik "+ TAMBAH UNIT KURSI" untuk mendaftarkan unit baru.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F3F3] text-[#1B1C1C] border-b border-[#EFEDED]">
                  <th className="p-3.5 font-extrabold">Kode Unit / Username EDC</th>
                  <th className="p-3.5 font-extrabold">Tipe / Model Hardware</th>
                  <th className="p-3.5 font-extrabold">Nama Unit (Alias)</th>
                  <th className="p-3.5 font-extrabold">Status Device</th>
                  <th className="p-3.5 font-extrabold">PIN EDC</th>
                  <th className="p-3.5 font-extrabold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEDED]">
                {chairs.map((chair) => (
                  <tr key={String(chair.chair_code || chair.id)} className="hover:bg-[#FBF9F9] transition-colors">
                    <td className="p-3.5 font-mono font-extrabold text-[#795465]">
                      {chair.chair_code || String(chair.id)}
                    </td>
                    <td className="p-3.5 font-extrabold text-[#1B1C1C]">
                      {chair.model_type || 'Tokuyo TC-355'}
                    </td>
                    <td className="p-3.5 font-bold text-[#4F4448]">{chair.name}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#CEE5DA] text-[#4E635A]">
                        <CheckCircle2 className="w-3 h-3" />
                        {chair.status || 'ONLINE'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#1B1C1C]">{chair.pin || '123456'}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(chair)}
                          className="p-2 hover:bg-[#F5F3F3] text-[#795465] rounded-xl transition-colors"
                          title="Edit Unit Kursi"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmChair(chair)}
                          className="p-2 hover:bg-[#FFDAD6] text-[#BA1A1A] rounded-xl transition-colors"
                          title="Hapus Unit Kursi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Chair Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-[#EFEDED] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#EFEDED] flex items-center justify-between bg-[#FBF9F9]">
              <h2 className="text-sm font-extrabold text-[#1B1C1C] uppercase tracking-wider flex items-center gap-2">
                <Armchair className="w-4 h-4 text-[#795465]" />
                <span>{editingChair ? 'Edit Unit Kursi' : 'Registrasi Unit Kursi Baru'}</span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-[#EFEDED] rounded-lg">
                <X className="w-4 h-4 text-[#1B1C1C]" />
              </button>
            </div>

            <form onSubmit={handleChairFormSubmit} className="p-6 space-y-4">
              {modalMsg && (
                <div className="p-3 rounded-xl bg-[#FFDAD6] text-[#93000A] text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalMsg}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Tipe / Model Hardware:
                </label>
                <input
                  type="text"
                  value={newModelType}
                  onChange={(e) => setNewModelType(e.target.value)}
                  placeholder="Tokuyo TC-355"
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Kode Unit / Username EDC (Unique):
                </label>
                <input
                  type="text"
                  value={newChairCode}
                  onChange={(e) => setNewChairCode(e.target.value)}
                  placeholder="GI-01 / CP-01"
                  required
                  disabled={!!editingChair}
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-mono font-extrabold text-[#795465] uppercase focus:bg-white focus:border-[#795465] outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Nama Unit (Alias / Label):
                </label>
                <input
                  type="text"
                  value={newChairName}
                  onChange={(e) => setNewChairName(e.target.value)}
                  placeholder="Sakura Series #01"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Lokasi Cabang Penempatan:
                </label>
                <div className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#795465]">
                  {location?.name} ({location?.location_code})
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  PIN EDC Login (Default: 123456):
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-mono font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EFEDED]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] font-extrabold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#795465] hover:bg-[#684756] text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : editingChair ? 'Simpan Perubahan' : 'Daftarkan Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmChair && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-[#EFEDED] shadow-2xl w-full max-w-md p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFDAD6] text-[#BA1A1A] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1B1C1C]">Hapus Unit Kursi?</h3>
              <p className="text-xs text-[#4F4448] font-bold mt-1">
                Apakah Anda yakin ingin menghapus unit <span className="text-[#795465] font-extrabold">"{deleteConfirmChair.chair_code || deleteConfirmChair.name}"</span>?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmChair(null)}
                className="px-4 py-2.5 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] font-extrabold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteChairConfirm}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-[#BA1A1A] hover:bg-[#93000A] text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Unit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
