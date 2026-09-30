'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { MapPin, ChevronDown } from 'lucide-react';
import { Location } from '@/types';

export default function LocationSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    searchParams.get('location_id') || 'ALL'
  );

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch('/api/admin/locations');
        const data = await res.json();
        if (data.success) {
          setLocations(data.locations || []);
        }
      } catch (err) {
        console.warn('LocationSelector fetch error:', err);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    const paramLoc = searchParams.get('location_id') || 'ALL';
    setSelectedLocationId(paramLoc);
  }, [searchParams]);

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocId = e.target.value;
    setSelectedLocationId(newLocId);

    const params = new URLSearchParams(searchParams.toString());
    if (newLocId && newLocId !== 'ALL') {
      params.set('location_id', newLocId);
    } else {
      params.delete('location_id');
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative flex items-center">
      <div className="flex items-center gap-2 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-3 py-2">
        <MapPin className="w-4 h-4 text-[#795465] shrink-0" />
        <select
          value={selectedLocationId}
          onChange={handleLocationChange}
          className="bg-transparent text-xs font-extrabold text-[#1B1C1C] outline-none cursor-pointer pr-6 appearance-none"
        >
          <option value="ALL">All Locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name} ({loc.location_code})
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-[#795465] pointer-events-none absolute right-3" />
      </div>
    </div>
  );
}
