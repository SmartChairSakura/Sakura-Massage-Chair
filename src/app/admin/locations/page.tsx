'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Armchair,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Search,
  Filter,
  Globe,
  Navigation,
  DollarSign,
  PlusCircle,
  Info,
} from 'lucide-react';
import { Location, IncomeBreakdownItem, IncomeEntity } from '@/types';

export const dynamic = 'force-dynamic';

const PROVINCE_OPTIONS = [
  'DKI Jakarta',
  'Jawa Barat',
  'Jawa Tengah',
  'Jawa Timur',
  'Banten',
  'DI Yogyakarta',
  'Bali',
  'Sumatera Utara',
  'Sumatera Selatan',
  'Kepulauan Riau',
  'Lainnya',
];

const DEFAULT_BREAKDOWN_ITEMS: IncomeBreakdownItem[] = [
  {
    entity: 'LANDOWNER',
    party_name: 'Pemilik Lahan / Partner',
    percentage: 95,
    is_default: true,
  },
  {
    entity: 'SYSTEM',
    party_name: 'Sistem & Operasional',
    percentage: 5,
    is_default: false,
  },
];

function LocationSettingContent() {
  const searchParams = useSearchParams();
  const locationIdParam = searchParams.get('location_id') || 'ALL';

  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for Add / Edit Location
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Location Metadata Form States
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locCountry, setLocCountry] = useState('Indonesia');
  const [locStateProv, setLocStateProv] = useState('DKI Jakarta');
  const [locCity, setLocCity] = useState('Kota Jakarta Pusat');
  const [locLat, setLocLat] = useState('');
  const [locLng, setLocLng] = useState('');
  const [locPicName, setLocPicName] = useState('Operational Team');
  const [locPicPhone, setLocPicPhone] = useState('08123456789');

  // Income Breakdown Multi-party Items
  const [incomeBreakdown, setIncomeBreakdown] = useState<IncomeBreakdownItem[]>(DEFAULT_BREAKDOWN_ITEMS);

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

  // Compute total owner and system percentages from breakdown list
  const computedOwnerPct = incomeBreakdown
    .filter((item) => item.entity !== 'SYSTEM')
    .reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);

  const computedSystemPct = incomeBreakdown
    .filter((item) => item.entity === 'SYSTEM')
    .reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);

  const totalBreakdownPct = computedOwnerPct + computedSystemPct;

  const handleAddBreakdownItem = () => {
    setIncomeBreakdown((prev) => [
      ...prev,
      {
        entity: 'PARKING_OFFICER',
        party_name: 'Mitra Operasional',
        percentage: 0,
        is_default: false,
      },
    ]);
  };

  const handleRemoveBreakdownItem = (index: number) => {
    setIncomeBreakdown((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateBreakdownItem = (index: number, field: keyof IncomeBreakdownItem, val: any) => {
    setIncomeBreakdown((prev) => {
      const copy = [...prev];
      if (field === 'is_default' && val === true) {
        // Set all others to false
        copy.forEach((item, i) => {
          item.is_default = i === index;
        });
      } else {
        (copy[index] as any)[field] = val;
      }
      return copy;
    });
  };

  const openAddModal = () => {
    setEditingLocation(null);
    setLocName('');
    setLocCode('');
    setLocAddress('');
    setLocCountry('Indonesia');
    setLocStateProv('DKI Jakarta');
    setLocCity('Kota Jakarta Pusat');
    setLocLat('');
    setLocLng('');
    setLocPicName('Operational Team');
    setLocPicPhone('08123456789');
    setIncomeBreakdown([
      { entity: 'LANDOWNER', party_name: 'Pemilik Lahan / Partner', percentage: 95, is_default: true },
      { entity: 'SYSTEM', party_name: 'Sistem & Operasional', percentage: 5, is_default: false },
    ]);
    setModalMsg('');
    setShowModal(true);
  };

  const openEditModal = (loc: Location) => {
    setEditingLocation(loc);
    setLocName(loc.name);
    setLocCode(loc.location_code);
    setLocAddress(loc.address || '');
    setLocCountry(loc.country || 'Indonesia');
    setLocStateProv(loc.state_province || 'DKI Jakarta');
    setLocCity(loc.city || 'Kota Jakarta Pusat');
    setLocLat(loc.latitude ? String(loc.latitude) : '');
    setLocLng(loc.longitude ? String(loc.longitude) : '');
    setLocPicName(loc.pic_name || 'Operational Team');
    setLocPicPhone(loc.pic_phone || '08123456789');

    if (loc.income_breakdown && loc.income_breakdown.length > 0) {
      setIncomeBreakdown(loc.income_breakdown);
    } else {
      setIncomeBreakdown([
        { entity: 'LANDOWNER', party_name: 'Pemilik Lahan ' + loc.name, percentage: loc.owner_share_pct || 95, is_default: true },
        { entity: 'SYSTEM', party_name: 'Sistem & Operasional', percentage: loc.system_share_pct || 5, is_default: false },
      ]);
    }

    setModalMsg('');
    setShowModal(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim() || !locCode.trim()) {
      setModalMsg('Nama Lokasi dan Kode Unik wajib diisi.');
      return;
    }

    if (Math.abs(totalBreakdownPct - 100) > 0.01) {
      setModalMsg(`Total persentase Income Breakdown harus tepat 100%. Current total: ${totalBreakdownPct}%`);
      return;
    }

    setIsSaving(true);
    setModalMsg('');

    try {
      const payload = {
        name: locName.trim(),
        location_code: locCode.trim().toUpperCase(),
        address: locAddress.trim(),
        country: locCountry.trim(),
        state_province: locStateProv.trim(),
        city: locCity.trim(),
        latitude: locLat ? parseFloat(locLat) : null,
        longitude: locLng ? parseFloat(locLng) : null,
        pic_name: locPicName.trim(),
        pic_phone: locPicPhone.trim(),
        owner_share_pct: computedOwnerPct,
        system_share_pct: computedSystemPct,
        income_breakdown: incomeBreakdown,
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

  // Filter locations by header location_id, search query, and status filter
  const filteredLocations = locations.filter((loc) => {
    const matchesHeaderId = locationIdParam === 'ALL' || loc.id === locationIdParam;

    const matchesSearch =
      !searchQuery.trim() ||
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.location_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc.city && loc.city.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || loc.status === statusFilter;

    return matchesHeaderId && matchesSearch && matchesStatus;
  });

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
            Kelola daftar lokasi cabang armada kursi pijat, alamat detail, dan persentase income breakdown.
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

      {/* Filter Bar & Table */}
      <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Name, Unique Code, atau Kota..."
              className="w-full px-4 py-2.5 pl-10 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] placeholder-[#817478] focus:bg-white focus:border-[#795465] outline-none"
            />
            <Search className="w-4 h-4 text-[#795465] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-[#795465] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-[#1B1C1C] outline-none cursor-pointer pr-4"
            >
              <option value="ALL">Status ALL STATUS</option>
              <option value="active">Active / Online</option>
              <option value="inactive">Inactive / Offline</option>
            </select>
          </div>
        </div>

        {/* Locations Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-xs font-extrabold text-[#795465] animate-pulse">
              Memuat daftar lokasi cabang...
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#817478] font-bold">
              Tidak ada lokasi cabang ditemukan. Klik "+ NEW LOCATION" untuk menambah lokasi baru.
            </div>
          ) : (
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
                {filteredLocations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-[#FBF9F9] transition-colors">
                    <td className="p-3.5 font-extrabold text-[#1B1C1C]">
                      <div>{loc.name}</div>
                      <div className="text-[10px] text-[#817478] font-normal">
                        {loc.city || 'Jakarta'} • {loc.state_province || 'DKI Jakarta'}
                      </div>
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
          )}
        </div>
      </div>

      {/* Comprehensive Add / Edit Location Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-[#EFEDED] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#EFEDED] flex items-center justify-between bg-[#FBF9F9] shrink-0">
              <h2 className="text-sm font-extrabold text-[#1B1C1C] uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#795465]" />
                <span>{editingLocation ? 'Location Details & Income Breakdown' : 'New Location Registration'}</span>
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[#EFEDED] rounded-lg">
                <X className="w-4 h-4 text-[#1B1C1C]" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleModalSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              {modalMsg && (
                <div className="p-3.5 rounded-xl bg-[#FFDAD6] text-[#93000A] text-xs font-extrabold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalMsg}</span>
                </div>
              )}

              {/* Section 1: Location Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-[#795465] uppercase tracking-wider border-b border-[#EFEDED] pb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#795465]" />
                  <span>Location Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                      Location Name:
                    </label>
                    <input
                      type="text"
                      value={locName}
                      onChange={(e) => setLocName(e.target.value)}
                      placeholder="HO On Street / Central Park"
                      required
                      className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                      Location Code:
                    </label>
                    <input
                      type="text"
                      value={locCode}
                      onChange={(e) => setLocCode(e.target.value)}
                      placeholder="001-HO-OnStreet / CP-01"
                      required
                      className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-mono font-extrabold text-[#795465] uppercase focus:bg-white focus:border-[#795465] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                    Address:
                  </label>
                  <textarea
                    rows={2}
                    value={locAddress}
                    onChange={(e) => setLocAddress(e.target.value)}
                    placeholder="Jl. Biak Raya No 48C-E, Jakarta Pusat"
                    className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                      Country:
                    </label>
                    <input
                      type="text"
                      value={locCountry}
                      onChange={(e) => setLocCountry(e.target.value)}
                      placeholder="Indonesia"
                      className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                      State / Provinsi:
                    </label>
                    <select
                      value={locStateProv}
                      onChange={(e) => setLocStateProv(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none cursor-pointer"
                    >
                      {PROVINCE_OPTIONS.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                      City / Kota:
                    </label>
                    <input
                      type="text"
                      value={locCity}
                      onChange={(e) => setLocCity(e.target.value)}
                      placeholder="Kota Jakarta Pusat"
                      className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                      Latitude:
                    </label>
                    <input
                      type="text"
                      value={locLat}
                      onChange={(e) => setLocLat(e.target.value)}
                      placeholder="-6.1677739"
                      className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-mono font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                      Longitude:
                    </label>
                    <input
                      type="text"
                      value={locLng}
                      onChange={(e) => setLocLng(e.target.value)}
                      placeholder="106.812345"
                      className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-mono font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Income Breakdown (Multi-party Split) */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-[#EFEDED] pb-2">
                  <h3 className="text-xs font-extrabold text-[#795465] uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#795465]" />
                    <span>Income Breakdown</span>
                  </h3>
                  <span
                    className={`text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full ${
                      Math.abs(totalBreakdownPct - 100) < 0.01
                        ? 'bg-[#CEE5DA] text-[#4E635A]'
                        : 'bg-[#FFDAD6] text-[#BA1A1A]'
                    }`}
                  >
                    Total: {totalBreakdownPct}% / 100%
                  </span>
                </div>

                <div className="space-y-3">
                  {incomeBreakdown.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 bg-[#FBF9F9] rounded-2xl border border-[#EFEDED] space-y-3 relative"
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.is_default}
                            onChange={(e) => handleUpdateBreakdownItem(index, 'is_default', e.target.checked)}
                            className="w-4 h-4 rounded text-[#795465] focus:ring-[#795465]"
                          />
                          <span className="text-xs font-bold text-[#1B1C1C]">Set as default entity</span>
                        </label>

                        {incomeBreakdown.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBreakdownItem(index)}
                            className="p-1.5 hover:bg-[#FFDAD6] text-[#BA1A1A] rounded-xl transition-colors"
                            title="Remove entity row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-extrabold text-[#817478] uppercase block mb-1">
                            Income Entity:
                          </label>
                          <select
                            value={item.entity}
                            onChange={(e) =>
                              handleUpdateBreakdownItem(index, 'entity', e.target.value as IncomeEntity)
                            }
                            className="w-full px-3 py-2 bg-white border border-[#EFEDED] rounded-xl text-xs font-extrabold text-[#1B1C1C] focus:border-[#795465] outline-none cursor-pointer"
                          >
                            <option value="LANDOWNER">LANDOWNER</option>
                            <option value="PARKING_OFFICER">PARKING_OFFICER</option>
                            <option value="OPERATOR">OPERATOR</option>
                            <option value="SYSTEM">SYSTEM</option>
                            <option value="OTHER">OTHER</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-[#817478] uppercase block mb-1">
                            Party Name:
                          </label>
                          <input
                            type="text"
                            value={item.party_name}
                            onChange={(e) => handleUpdateBreakdownItem(index, 'party_name', e.target.value)}
                            placeholder="Pemilik Lahan HO"
                            className="w-full px-3 py-2 bg-white border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:border-[#795465] outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-[#817478] uppercase block mb-1">
                            Percentage (%):
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={item.percentage}
                            onChange={(e) =>
                              handleUpdateBreakdownItem(index, 'percentage', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-3 py-2 bg-white border border-[#EFEDED] rounded-xl text-xs font-mono font-extrabold text-[#795465] focus:border-[#795465] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddBreakdownItem}
                  className="w-full py-3 bg-[#F5F3F3] hover:bg-[#EFEDED] border border-dashed border-[#795465]/40 rounded-2xl text-xs font-extrabold text-[#795465] flex items-center justify-center gap-2 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ ADD INCOME BREAKDOWN</span>
                </button>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EFEDED] shrink-0">
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
                  className="px-6 py-2.5 bg-[#795465] hover:bg-[#684756] text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50"
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

export default function LocationSettingPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs font-extrabold text-[#795465] animate-pulse">Memuat location setting...</div>}>
      <LocationSettingContent />
    </Suspense>
  );
}
