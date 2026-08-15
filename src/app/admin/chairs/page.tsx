'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Armchair,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  Search,
  Filter,
} from 'lucide-react';
import { Chair, Location } from '@/types';

export const dynamic = 'force-dynamic';

function ChairListContent() {
  const searchParams = useSearchParams();
  const locationIdParam = searchParams.get('location_id') || 'ALL';

  const [locations, setLocations] = useState<Location[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState(locationIdParam);
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Chair Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChairCode, setNewChairCode] = useState('');
  const [newChairName, setNewChairName] = useState('');
  const [newModelType, setNewModelType] = useState('Tokuyo TC-355');
  const [newLocationId, setNewLocationId] = useState('');
  const [newPin, setNewPin] = useState('123456');
  const [modalMsg, setModalMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Chair Modal
  const [deleteConfirmChair, setDeleteConfirmChair] = useState<Chair | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/admin/locations');
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations || []);
        if (data.locations && data.locations.length > 0 && !newLocationId) {
          setNewLocationId(data.locations[0].id);
        }
      }
    } catch (err) {
      console.warn('Fetch locations error:', err);
    }
  };

  const fetchChairs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/chairs');
      const data = await res.json();
      if (data.success) {
        setChairs(data.chairs || []);
      }
    } catch (err) {
      console.warn('Fetch chairs error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchChairs();
  }, []);

  useEffect(() => {
    setSelectedLocationId(locationIdParam);
  }, [locationIdParam]);

  const handleAddChairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newChairCode.trim().toUpperCase();
    const cleanName = newChairName.trim();
    const cleanModel = newModelType.trim() || 'Tokuyo TC-355';
    const cleanPin = newPin.trim() || '123456';

    if (!cleanCode || !cleanName) {
      setModalMsg('Kode Unit dan Nama Unit wajib diisi.');
      return;
    }

    if (!newLocationId) {
      setModalMsg('Silakan pilih lokasi cabang terdaftar.');
      return;
    }

    const matchedLoc = locations.find((l) => l.id === newLocationId);

    setIsSaving(true);
    setModalMsg('');

    try {
      const res = await fetch('/api/admin/chairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chair_code: cleanCode,
          name: cleanName,
          model_type: cleanModel,
          location_id: newLocationId,
          location_name: matchedLoc?.name || 'Cabang Kiosk',
          pin: cleanPin,
        }),
      });

      const resData = await res.json();

      if (resData.success) {
        setShowAddModal(false);
        setNewChairCode('');
        setNewChairName('');
        fetchChairs();
      } else {
        setModalMsg(resData.error || 'Gagal menambahkan unit kursi.');
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
        fetchChairs();
      } else {
        alert(`Gagal menghapus unit kursi: ${resData.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Network error: ${e?.message || 'Server unreachable'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter chairs by search & location
  const filteredChairs = chairs.filter((c) => {
    const matchesLoc =
      selectedLocationId === 'ALL' ||
      c.location_id === selectedLocationId ||
      locations.find((l) => l.id === selectedLocationId)?.name === c.location_name;

    const matchesSearch =
      !searchQuery.trim() ||
      c.chair_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.model_type?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesLoc && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#1B1C1C] tracking-tight flex items-center gap-2">
            <Armchair className="w-5 h-5 text-[#795465]" />
            <span>Armada Chair List (Seluruh Unit)</span>
          </h1>
          <p className="text-xs text-[#4F4448] font-bold mt-1">
            Kelola pendaftaran seluruh unit kursi pijat, lokasi penempatan, dan PIN EDC.
          </p>
        </div>

        <button
          onClick={() => {
            setModalMsg('');
            if (locations.length > 0 && !newLocationId) {
              setNewLocationId(locations[0].id);
            }
            setShowAddModal(true);
          }}
          className="px-4 py-3 bg-[#795465] hover:bg-[#684756] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[#795465]/20 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ TAMBAH UNIT KURSI</span>
        </button>
      </div>

      {/* Filter Bar & Table */}
      <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Kode Unit, Nama Unit, atau Lokasi..."
              className="w-full px-4 py-2.5 pl-10 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] placeholder-[#817478] focus:bg-white focus:border-[#795465] outline-none"
            />
            <Search className="w-4 h-4 text-[#795465] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Location Filter Dropdown */}
          <div className="flex items-center gap-2 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-[#795465] shrink-0" />
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-[#1B1C1C] outline-none cursor-pointer pr-4"
            >
              <option value="ALL">Semua Lokasi Cabang</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.location_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chairs Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-xs font-extrabold text-[#795465] animate-pulse">
              Memuat daftar unit kursi...
            </div>
          ) : filteredChairs.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#817478] font-bold">
              Tidak ada unit kursi ditemukan. Klik "+ TAMBAH UNIT KURSI" untuk mendaftarkan unit baru.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F3F3] text-[#1B1C1C] border-b border-[#EFEDED]">
                  <th className="p-3.5 font-extrabold">Kode Unit / Username EDC</th>
                  <th className="p-3.5 font-extrabold">Tipe / Model Hardware</th>
                  <th className="p-3.5 font-extrabold">Nama Unit (Alias)</th>
                  <th className="p-3.5 font-extrabold">Lokasi Cabang</th>
                  <th className="p-3.5 font-extrabold">Status Device</th>
                  <th className="p-3.5 font-extrabold">PIN EDC</th>
                  <th className="p-3.5 font-extrabold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEDED]">
                {filteredChairs.map((chair) => (
                  <tr key={String(chair.chair_code || chair.id)} className="hover:bg-[#FBF9F9] transition-colors">
                    <td className="p-3.5 font-mono font-extrabold text-[#795465]">
                      {chair.chair_code || String(chair.id)}
                    </td>
                    <td className="p-3.5 font-extrabold text-[#1B1C1C]">
                      {chair.model_type || 'Tokuyo TC-355'}
                    </td>
                    <td className="p-3.5 font-bold text-[#4F4448]">{chair.name}</td>
                    <td className="p-3.5 font-bold text-[#1B1C1C]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#795465]" />
                        {chair.location_name}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#CEE5DA] text-[#4E635A]">
                        <CheckCircle2 className="w-3 h-3" />
                        {chair.status || 'ONLINE'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#1B1C1C]">{chair.pin || '123456'}</td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setDeleteConfirmChair(chair)}
                        className="p-2 hover:bg-[#FFDAD6] text-[#BA1A1A] rounded-xl transition-colors"
                        title="Hapus Unit Kursi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Chair Modal (With Location Dropdown) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-[#EFEDED] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-[#EFEDED] flex items-center justify-between bg-[#FBF9F9]">
              <h2 className="text-sm font-extrabold text-[#1B1C1C] uppercase tracking-wider flex items-center gap-2">
                <Armchair className="w-4 h-4 text-[#795465]" />
                <span>Registrasi Unit Kursi Baru</span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-[#EFEDED] rounded-lg">
                <X className="w-4 h-4 text-[#1B1C1C]" />
              </button>
            </div>

            <form onSubmit={handleAddChairSubmit} className="p-6 space-y-4">
              {modalMsg && (
                <div className="p-3 rounded-xl bg-[#FFDAD6] text-[#93000A] text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalMsg}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Pilih Lokasi Cabang Terdaftar:
                </label>
                <div className="relative">
                  <select
                    value={newLocationId}
                    onChange={(e) => setNewLocationId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-extrabold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none cursor-pointer"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.location_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Kode Unit / Username EDC:
                </label>
                <input
                  type="text"
                  value={newChairCode}
                  onChange={(e) => setNewChairCode(e.target.value)}
                  placeholder="e.g. SAKURA-GI-02"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] uppercase focus:bg-white focus:border-[#795465] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
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
                <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Nama Unit Kursi (Alias):
                </label>
                <input
                  type="text"
                  value={newChairName}
                  onChange={(e) => setNewChairName(e.target.value)}
                  placeholder="e.g. Sakura Series #07"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  PIN Password EDC (Default 123456):
                </label>
                <input
                  type="text"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFEDED]">
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
                  {isSaving ? 'Menyimpan...' : 'Simpan Unit Kursi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Chair Confirmation Modal */}
      {deleteConfirmChair && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-[#EFEDED] shadow-2xl w-full max-w-md p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFDAD6] text-[#BA1A1A] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1B1C1C]">Hapus Unit Kursi?</h3>
              <p className="text-xs text-[#4F4448] font-bold mt-1">
                Apakah Anda yakin ingin menghapus unit <span className="text-[#795465] font-extrabold">"{deleteConfirmChair.chair_code || deleteConfirmChair.id}"</span>?
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

export default function DedicatedChairListPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs font-extrabold text-[#795465] animate-pulse">Memuat daftar kursi...</div>}>
      <ChairListContent />
    </Suspense>
  );
}
