'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Armchair,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { Location } from '@/types';

export default function LocationSettingPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for Add / Edit Location
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locCity, setLocCity] = useState('Jakarta');
  const [locPicName, setLocPicName] = useState('Operational Team');
  const [locPicPhone, setLocPicPhone] = useState('08123456789');
  const [ownerPct, setOwnerPct] = useState<number>(95.0);
  const [systemPct, setSystemPct] = useState<number>(5.0);
  const [modalMsg, setModalMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Location Confirmation Modal
  const [deleteConfirmLoc, setDeleteConfirmLoc] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/locations');
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.warn('Fetch locations error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleOwnerPctChange = (val: number) => {
    const cleanOwner = Math.min(100, Math.max(0, val));
    setOwnerPct(cleanOwner);
    setSystemPct(Number((100 - cleanOwner).toFixed(2)));
  };

  const openAddModal = () => {
    setEditingLocation(null);
    setLocName('');
    setLocCode('');
    setLocAddress('');
    setLocCity('Jakarta');
    setLocPicName('Operational Team');
    setLocPicPhone('08123456789');
    setOwnerPct(95.0);
    setSystemPct(5.0);
    setModalMsg('');
    setShowModal(true);
  };

  const openEditModal = (loc: Location) => {
    setEditingLocation(loc);
    setLocName(loc.name);
    setLocCode(loc.location_code);
    setLocAddress(loc.address || '');
    setLocCity(loc.city || 'Jakarta');
    setLocPicName(loc.pic_name || 'Operational Team');
    setLocPicPhone(loc.pic_phone || '08123456789');
    setOwnerPct(loc.owner_share_pct);
    setSystemPct(loc.system_share_pct);
    setModalMsg('');
    setShowModal(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim() || !locCode.trim()) {
      setModalMsg('Nama Lokasi dan Kode Unik wajib diisi.');
      return;
    }

    setIsSaving(true);
    setModalMsg('');

    try {
      const payload = {
        name: locName.trim(),
        location_code: locCode.trim().toUpperCase(),
        address: locAddress.trim(),
        city: locCity.trim(),
        pic_name: locPicName.trim(),
        pic_phone: locPicPhone.trim(),
        owner_share_pct: ownerPct,
        system_share_pct: systemPct,
      };

      let res;
      if (editingLocation) {
        res = await fetch(`/api/admin/locations/${editingLocation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const resData = await res.json();

      if (resData.success) {
        setShowModal(false);
        fetchLocations();
      } else {
        setModalMsg(resData.error || 'Gagal menyimpan lokasi.');
      }
    } catch (err: any) {
      setModalMsg(`Error: ${err?.message || 'Server error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLocationConfirm = async () => {
    if (!deleteConfirmLoc) return;
    setIsDeleting(true);
    setDeleteErrorMsg('');

    try {
      const res = await fetch(`/api/admin/locations/${deleteConfirmLoc.id}`, {
        method: 'DELETE',
      });
      const resData = await res.json();

      if (resData.success) {
        setDeleteConfirmLoc(null);
        fetchLocations();
      } else {
        setDeleteErrorMsg(resData.error || 'Gagal menghapus lokasi.');
      }
    } catch (err: any) {
      setDeleteErrorMsg(`Error: ${err?.message || 'Server error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#1B1C1C] tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#795465]" />
            <span>Location Setting & Revenue Split</span>
          </h1>
          <p className="text-xs text-[#4F4448] font-bold mt-1">
            Kelola daftar lokasi cabang armada kursi pijat dan persentase bagi hasil.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-3 bg-[#795465] hover:bg-[#684756] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[#795465]/20 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ NEW LOCATION</span>
        </button>
      </div>

      {/* Locations Table */}
      <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs font-extrabold text-[#795465] animate-pulse">
            Memuat daftar lokasi cabang...
          </div>
        ) : locations.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#817478] font-bold">
            Belum ada lokasi terdaftar. Klik "+ NEW LOCATION" untuk menambah lokasi baru.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F3F3] text-[#1B1C1C] border-b border-[#EFEDED]">
                  <th className="p-3.5 font-extrabold">Nama Lokasi</th>
                  <th className="p-3.5 font-extrabold">Kode Unik</th>
                  <th className="p-3.5 font-extrabold">Status Lokasi</th>
                  <th className="p-3.5 font-extrabold">Armada Kursi</th>
                  <th className="p-3.5 font-extrabold">Revenue Split (Owner / System)</th>
                  <th className="p-3.5 font-extrabold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEDED]">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-[#FBF9F9] transition-colors">
                    <td className="p-3.5 font-extrabold text-[#1B1C1C]">
                      <div>{loc.name}</div>
                      <div className="text-[10px] text-[#817478] font-normal">{loc.city || 'Jakarta'}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#795465]">{loc.location_code}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#CEE5DA] text-[#4E635A]">
                        <CheckCircle2 className="w-3 h-3" />
                        Online ({loc.online_chair_count || 0}/{loc.chair_count || 0})
                      </span>
                    </td>
                    <td className="p-3.5">
                      <Link
                        href={`/admin/locations/${loc.id}/chairs`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#795465] font-extrabold rounded-xl transition-colors"
                      >
                        <Armchair className="w-3.5 h-3.5" />
                        <span>{loc.chair_count || 0} Unit Chair List</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </Link>
                    </td>
                    <td className="p-3.5 font-bold text-[#1B1C1C]">
                      <span className="text-[#4E635A] font-extrabold">{loc.owner_share_pct}% Owner</span>
                      <span className="text-[#817478] mx-1">/</span>
                      <span className="text-[#795465] font-extrabold">{loc.system_share_pct}% System</span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(loc)}
                          className="p-2 hover:bg-[#F5F3F3] text-[#795465] rounded-xl transition-colors"
                          title="Edit Lokasi"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteErrorMsg('');
                            setDeleteConfirmLoc(loc);
                          }}
                          className="p-2 hover:bg-[#FFDAD6] text-[#BA1A1A] rounded-xl transition-colors"
                          title="Hapus Lokasi"
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

      {/* Add / Edit Location Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-[#EFEDED] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#EFEDED] flex items-center justify-between bg-[#FBF9F9]">
              <h2 className="text-sm font-extrabold text-[#1B1C1C] uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#795465]" />
                <span>{editingLocation ? 'Edit Lokasi Cabang' : 'Registrasi Lokasi Baru'}</span>
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[#EFEDED] rounded-lg">
                <X className="w-4 h-4 text-[#1B1C1C]" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              {modalMsg && (
                <div className="p-3 rounded-xl bg-[#FFDAD6] text-[#93000A] text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                    Kode Unik Lokasi:
                  </label>
                  <input
                    type="text"
                    value={locCode}
                    onChange={(e) => setLocCode(e.target.value)}
                    placeholder="e.g. CP-01"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] uppercase focus:bg-white focus:border-[#795465] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                    Nama Lokasi Cabang:
                  </label>
                  <input
                    type="text"
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    placeholder="e.g. Central Park Fl 1"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Alamat Lengkap:
                </label>
                <input
                  type="text"
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                  placeholder="Jl. Letjen S. Parman No.28"
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                    PIC Lokasi:
                  </label>
                  <input
                    type="text"
                    value={locPicName}
                    onChange={(e) => setLocPicName(e.target.value)}
                    placeholder="Operational Team"
                    className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                    Telepon PIC:
                  </label>
                  <input
                    type="text"
                    value={locPicPhone}
                    onChange={(e) => setLocPicPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                  />
                </div>
              </div>

              {/* Revenue Share Split */}
              <div className="p-4 bg-[#F5F3F3] rounded-2xl border border-[#EFEDED] space-y-3">
                <label className="text-xs font-extrabold text-[#795465] uppercase tracking-wider block">
                  Persentase Bagi Hasil (Revenue Split):
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-[#1B1C1C] block mb-1">Hak Owner (%)</span>
                    <input
                      type="number"
                      step="0.5"
                      value={ownerPct}
                      onChange={(e) => handleOwnerPctChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-[#EFEDED] rounded-xl text-xs font-extrabold text-[#4E635A] focus:border-[#795465] outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#1B1C1C] block mb-1">Bagi Hasil System (%)</span>
                    <input
                      type="number"
                      value={systemPct}
                      disabled
                      className="w-full px-3 py-2 bg-[#E9E8E8] border border-[#EFEDED] rounded-xl text-xs font-extrabold text-[#795465]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFEDED]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] font-extrabold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#795465] hover:bg-[#684756] text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Lokasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmLoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-[#EFEDED] shadow-2xl w-full max-w-md p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFDAD6] text-[#BA1A1A] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1B1C1C]">Hapus Lokasi Cabang?</h3>
              <p className="text-xs text-[#4F4448] font-bold mt-1">
                Apakah Anda yakin ingin menghapus lokasi <span className="text-[#795465] font-extrabold">"{deleteConfirmLoc.name}"</span>?
              </p>
            </div>

            {deleteErrorMsg && (
              <div className="p-3 rounded-xl bg-[#FFDAD6] text-[#93000A] text-xs font-bold text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{deleteErrorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmLoc(null)}
                className="px-4 py-2.5 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] font-extrabold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteLocationConfirm}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-[#BA1A1A] hover:bg-[#93000A] text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Lokasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
