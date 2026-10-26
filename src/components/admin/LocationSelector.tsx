'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { Location } from '@/types';
import { AppSelect, Option } from './ThemedSelect';

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

  const handleLocationChange = (newLocId: string) => {
    setSelectedLocationId(newLocId);

    const params = new URLSearchParams(searchParams.toString());
    if (newLocId && newLocId !== 'ALL') {
      params.set('location_id', newLocId);
    } else {
      params.delete('location_id');
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const options = useMemo<Option[]>(
    () => [
      { value: 'ALL', label: 'All Locations' },
      ...locations.map((loc) => ({
        value: loc.id,
        label: loc.name,
        hint: loc.location_code,
      })),
    ],
    [locations]
  );

  return (
    <div className="w-52 sm:w-60">
      <AppSelect
        aria-label="Filter by branch location"
        icon={<MapPin className="size-4 text-(--brand)" />}
        value={selectedLocationId}
        onValueChange={handleLocationChange}
        options={options}
      />
    </div>
  );
}
