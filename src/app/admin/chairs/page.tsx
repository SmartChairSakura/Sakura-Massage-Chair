'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Armchair,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  Search,
  Filter,
  CloudUpload,
  Cpu,
} from 'lucide-react';
import { Chair, Location } from '@/types';

export const dynamic = 'force-dynamic';

function ChairListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locationIdParam = searchParams.get('location_id') || 'ALL';

  const [locations, setLocations] = useState<Location[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState(locationIdParam);
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Chair Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingChair, setEditingChair] = useState<Chair | null>(null);

  // Form Fields
  const [chairCode, setChairCode] = useState('');
  const [chairName, setChairName] = useState('');
  const [modelType, setModelType] = useState('Tokuyo TC-355');
  const [locationId, setLocationId] = useState('');
  const [pin, setPin] = useState('123456');
  const [modalMsg, setModalMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Firmware OTA Modal State
  const [showOtaModal, setShowOtaModal] = useState(false);
  const [otaFile, setOtaFile] = useState<File | null>(null);
  const [otaVersion, setOtaVersion] = useState('2.2.0');
  const [otaTargetChairId, setOtaTargetChairId] = useState('ALL');
  const [otaNotes, setOtaNotes] = useState('');
  const [otaMsg, setOtaMsg] = useState('');
  const [isDeployingOta, setIsDeployingOta] = useState(false);

  // Delete Chair Modal
  const [deleteConfirmChair, setDeleteConfirmChair] = useState<Chair | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/admin/locations');
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations || []);
        if (data.locations && data.locations.length > 0 && !locationId) {
          setLocationId(data.locations[0].id);
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

  const handleLocationFilterChange = (newLocId: string) => {
    setSelectedLocationId(newLocId);
    if (newLocId === 'ALL') {
      router.push('/admin/chairs');
    } else {
      router.push(`/admin/chairs?location_id=${newLocId}`);
    }
  };

  const openAddModal = () => {
    setEditingChair(null);
    setChairCode('');
    setChairName('');
    setModelType('Tokuyo TC-355');
    if (locations.length > 0) setLocationId(locations[0].id);
    setPin('123456');
    setModalMsg('');
    setShowModal(true);
  };

  const openEditModal = (chair: Chair) => {
    setEditingChair(chair);
    setChairCode(String(chair.chair_code || chair.id));
    setChairName(chair.name || '');
    setModelType(chair.model_type || 'Tokuyo TC-355');
    setPin(chair.pin || '123456');

    // Find location ID from location_name
    const matchedLoc = locations.find((l) => l.name === chair.location_name || l.id === chair.location_id);
    if (matchedLoc) {
      setLocationId(matchedLoc.id);
    } else if (locations.length > 0) {
      setLocationId(locations[0].id);
    }

    setModalMsg('');
    setShowModal(true);
  };

  const handleChairFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = chairCode.trim().toUpperCase();
    const cleanName = chairName.trim();
    const cleanModel = modelType.trim() || 'Tokuyo TC-355';
    const cleanPin = pin.trim() || '123456';

    if (!cleanCode || !cleanName) {
      setModalMsg('Chair code and unit name are required.');
      return;
    }

    if (!locationId) {
      setModalMsg('Please select a registered branch location.');
      return;
    }

    const matchedLoc = locations.find((l) => l.id === locationId);

    setIsSaving(true);
    setModalMsg('');

    try {
      let res;
      if (editingChair) {
        // Edit Chair (PATCH)
        res = await fetch('/api/admin/chairs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chair_code: cleanCode,
            name: cleanName,
            model_type: cleanModel,
            location_id: locationId,
            location_name: matchedLoc?.name || 'Branch Kiosk',
            pin: cleanPin,
          }),
        });
      } else {
        // Add Chair (POST)
        res = await fetch('/api/admin/chairs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chair_code: cleanCode,
            name: cleanName,
            model_type: cleanModel,
            location_id: locationId,
            location_name: matchedLoc?.name || 'Branch Kiosk',
            pin: cleanPin,
          }),
        });
      }

      const resData = await res.json();

      if (resData.success) {
        setShowModal(false);
        fetchChairs();
      } else {
        setModalMsg(resData.error || 'Failed to save chair unit.');
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
        alert(`Failed to delete chair unit: ${resData.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Network error: ${e?.message || 'Server unreachable'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeployOta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otaFile) {
      setOtaMsg('Please select a compiled ESP32 firmware (.bin) file.');
      return;
    }
    if (!otaVersion.trim()) {
      setOtaMsg('Firmware version string is required.');
      return;
    }

    setIsDeployingOta(true);
    setOtaMsg('');

    try {
      const formData = new FormData();
      formData.append('file', otaFile);
      formData.append('version', otaVersion.trim());
      formData.append('chair_id', otaTargetChairId);
      formData.append('notes', otaNotes.trim());

      const res = await fetch('/api/admin/chairs/firmware/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setOtaMsg(`Success: ${data.message || 'Firmware deployed!'}`);
        setTimeout(() => {
          setShowOtaModal(false);
          setOtaFile(null);
          setOtaMsg('');
          fetchChairs();
        }, 1500);
      } else {
        setOtaMsg(data.error || 'Failed to deploy firmware.');
      }
    } catch (err: any) {
      setOtaMsg(`Network error: ${err?.message || 'Server unreachable'}`);
    } finally {
      setIsDeployingOta(false);
    }
  };

  // Filter chairs by search & synced location
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
            <span>Chairs & Hardware Fleet</span>
          </h1>
          <p className="text-xs text-[#4F4448] font-bold mt-1">
            Manage massage chairs, hardware fleet status, and kiosk terminals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setOtaMsg('');
              setShowOtaModal(true);
            }}
            className="px-4 py-3 bg-[#1B1C1C] hover:bg-[#333333] text-white rounded-xl text-xs font-extrabold shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <CloudUpload className="w-4 h-4 text-[#D3B1C2]" />
            <span>Deploy Firmware (OTA)</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-3 bg-[#795465] hover:bg-[#684756] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[#795465]/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Chair</span>
          </button>
        </div>
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
              placeholder="Search by chair code, name, model, or branch..."
              className="w-full px-4 py-2.5 pl-10 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] placeholder-[#817478] focus:bg-white focus:border-[#795465] outline-none"
            />
            <Search className="w-4 h-4 text-[#795465] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Location Filter Dropdown (Synced with Header Location Selector) */}
          <div className="flex items-center gap-2 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-[#795465] shrink-0" />
            <select
              value={selectedLocationId}
              onChange={(e) => handleLocationFilterChange(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-[#1B1C1C] outline-none cursor-pointer pr-4"
            >
              <option value="ALL">All Locations</option>
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
              Loading chairs...
            </div>
          ) : filteredChairs.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#817478] font-bold">
              No chairs found. Click "+ Add Chair" to register a new unit.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F3F3] text-[#1B1C1C] border-b border-[#EFEDED]">
                  <th className="p-3.5 font-extrabold">Chair Code</th>
                  <th className="p-3.5 font-extrabold">Hardware Model</th>
                  <th className="p-3.5 font-extrabold">Unit Name</th>
                  <th className="p-3.5 font-extrabold">Branch Location</th>
                  <th className="p-3.5 font-extrabold">Device Status</th>
                  <th className="p-3.5 font-extrabold">Firmware / OTA</th>
                  <th className="p-3.5 font-extrabold">Terminal PIN</th>
                  <th className="p-3.5 font-extrabold text-center">Actions</th>
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
                        <MapPin className="w-3.5 h-3.5 text-[#795465]" />
                        {chair.location_name}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#CEE5DA] text-[#4E635A]">
                        <CheckCircle2 className="w-3 h-3" />
                        {chair.status || 'ONLINE'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="font-mono font-bold text-[11px] text-[#1B1C1C]">
                          {chair.firmware_version || '2.1.0'}
                        </span>
                        {chair.ota_status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#FFF0D4] text-[#8C5E00] animate-pulse">
                            OTA Pending
                          </span>
                        )}
                        {chair.ota_status === 'DOWNLOADING' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#D7E3FF] text-[#004A98] animate-pulse">
                            Flashing...
                          </span>
                        )}
                        {chair.ota_status === 'SUCCESS' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#CEE5DA] text-[#4E635A]">
                            Updated
                          </span>
                        )}
                        {chair.ota_status === 'FAILED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#FFDAD6] text-[#BA1A1A]">
                            Failed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#1B1C1C]">{chair.pin || '123456'}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(chair)}
                          className="p-2 hover:bg-[#F5F3F3] text-[#795465] rounded-xl transition-colors"
                          title="Edit Chair"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmChair(chair)}
                          className="p-2 hover:bg-[#FFDAD6] text-[#BA1A1A] rounded-xl transition-colors"
                          title="Delete Chair"
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

      {/* Add / Edit Chair Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-[#EFEDED] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#EFEDED] flex items-center justify-between bg-[#FBF9F9]">
              <h2 className="text-sm font-extrabold text-[#1B1C1C] uppercase tracking-wider flex items-center gap-2">
                <Armchair className="w-4 h-4 text-[#795465]" />
                <span>{editingChair ? 'Edit Chair' : 'Register New Chair'}</span>
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[#EFEDED] rounded-lg">
                <X className="w-4 h-4 text-[#1B1C1C]" />
              </button>
            </div>

            <form onSubmit={handleChairFormSubmit} className="p-6 space-y-4">
              {modalMsg && (
                <div className="p-3.5 rounded-xl bg-[#FFDAD6] text-[#93000A] text-xs font-extrabold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalMsg}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Hardware Model:
                </label>
                <input
                  type="text"
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value)}
                  placeholder="Tokuyo TC-355"
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Chair Code (Unique):
                </label>
                <input
                  type="text"
                  value={chairCode}
                  onChange={(e) => setChairCode(e.target.value)}
                  placeholder="GI-01 / CP-01"
                  required
                  disabled={!!editingChair}
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-mono font-extrabold text-[#795465] uppercase focus:bg-white focus:border-[#795465] outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Unit Name (Alias):
                </label>
                <input
                  type="text"
                  value={chairName}
                  onChange={(e) => setChairName(e.target.value)}
                  placeholder="Sakura Series #01"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Branch Location:
                </label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none cursor-pointer"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.location_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Terminal PIN (Default: 123456):
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-mono font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EFEDED]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] font-extrabold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#795465] hover:bg-[#684756] text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingChair ? 'Save Changes' : 'Register Chair'}
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
              <h3 className="text-base font-extrabold text-[#1B1C1C]">Delete Chair Unit?</h3>
              <p className="text-xs text-[#4F4448] font-bold mt-1">
                Are you sure you want to delete unit <span className="text-[#795465] font-extrabold">"{deleteConfirmChair.chair_code || deleteConfirmChair.name}"</span>? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmChair(null)}
                className="px-4 py-2.5 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] font-extrabold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteChairConfirm}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-[#BA1A1A] hover:bg-[#93000A] text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Unit'}
              </button>
            </div>
      {/* Firmware OTA Deployment Modal */}
      {showOtaModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-[#EFEDED] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#EFEDED] flex items-center justify-between bg-[#FBF9F9]">
              <h2 className="text-sm font-extrabold text-[#1B1C1C] uppercase tracking-wider flex items-center gap-2">
                <CloudUpload className="w-4 h-4 text-[#795465]" />
                <span>Deploy Firmware OTA (Cloud Update)</span>
              </h2>
              <button
                onClick={() => setShowOtaModal(false)}
                className="p-1.5 hover:bg-[#EFEDED] text-[#4F4448] rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeployOta} className="p-6 space-y-4">
              {otaMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 ${
                    otaMsg.startsWith('Success')
                      ? 'bg-[#CEE5DA] text-[#4E635A]'
                      : 'bg-[#FFDAD6] text-[#BA1A1A]'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{otaMsg}</span>
                </div>
              )}

              {/* Target Chair Selection */}
              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Target Chair Deployment:
                </label>
                <select
                  value={otaTargetChairId}
                  onChange={(e) => setOtaTargetChairId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none cursor-pointer"
                >
                  <option value="ALL">🌐 All Active Chairs (Fleet-wide Broadcast)</option>
                  {chairs.map((c) => (
                    <option key={String(c.chair_code || c.id)} value={String(c.id)}>
                      {c.chair_code || c.id} — {c.name} ({c.location_name})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#817478] font-bold mt-1">
                  Update will be executed automatically when chair(s) are in STANDBY (idle).
                </p>
              </div>

              {/* Version Input */}
              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  New Firmware Version:
                </label>
                <input
                  type="text"
                  value={otaVersion}
                  onChange={(e) => setOtaVersion(e.target.value)}
                  placeholder="2.2.0"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-mono font-extrabold text-[#795465] focus:bg-white focus:border-[#795465] outline-none"
                />
              </div>

              {/* Binary File Upload */}
              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Compiled Binary File (.bin):
                </label>
                <div className="border-2 border-dashed border-[#EFEDED] hover:border-[#795465] rounded-xl p-4 text-center bg-[#FBF9F9] transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept=".bin"
                    required
                    onChange={(e) => setOtaFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Cpu className="w-8 h-8 text-[#795465] mx-auto mb-2 opacity-80" />
                  {otaFile ? (
                    <div className="text-xs font-mono font-extrabold text-[#795465]">
                      {otaFile.name} ({(otaFile.size / 1024).toFixed(1)} KB)
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-extrabold text-[#1B1C1C] block">
                        Click to select .bin file
                      </span>
                      <span className="text-[10px] text-[#817478] font-bold">
                        Exported from Arduino IDE (Sketch → Export Compiled Binary)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Release Notes */}
              <div>
                <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Changelog / Release Notes (Optional):
                </label>
                <textarea
                  rows={2}
                  value={otaNotes}
                  onChange={(e) => setOtaNotes(e.target.value)}
                  placeholder="e.g. Added multi-scan cancellation protection & faster heartbeat"
                  className="w-full px-3.5 py-2 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] focus:bg-white focus:border-[#795465] outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EFEDED]">
                <button
                  type="button"
                  onClick={() => setShowOtaModal(false)}
                  className="px-4 py-2.5 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeployingOta}
                  className="px-5 py-2.5 bg-[#1B1C1C] hover:bg-[#333333] text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <CloudUpload className="w-4 h-4 text-[#D3B1C2]" />
                  <span>{isDeployingOta ? 'Deploying to Cloud...' : 'Deploy OTA Update'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChairListPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs font-extrabold text-[#795465] animate-pulse">Loading chairs...</div>}>
      <ChairListContent />
    </Suspense>
  );
}
