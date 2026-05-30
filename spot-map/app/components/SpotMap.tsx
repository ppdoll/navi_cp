'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { SITE_CONFIG } from '@/lib/config';
import type { SpotSummary } from '@/lib/types';

type Props = {
  spots: SpotSummary[];
  selectedId?: string | null;
  onSpotClick?: (spot: SpotSummary) => void;
  pickMode?: boolean;
  onPickLocation?: (lat: number, lng: number) => void;
  pickedLocation?: { lat: number; lng: number } | null;
};

export default function SpotMap({
  spots,
  selectedId,
  onSpotClick,
  pickMode = false,
  onPickLocation,
  pickedLocation,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Record<string, unknown>>({});
  const pickedMarkerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      // Fix default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!).setView(
        SITE_CONFIG.mapCenter,
        SITE_CONFIG.mapZoom,
      );
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      if (pickMode && onPickLocation) {
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          onPickLocation(lat, lng);
        });
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers
  useEffect(() => {
    if (!mapRef.current) return;
    import('leaflet').then((L) => {
      const map = mapRef.current!;

      // Remove stale markers
      Object.keys(markersRef.current).forEach((id) => {
        if (!spots.find((s) => s.id === id)) {
          (markersRef.current[id] as { remove: () => void }).remove();
          delete markersRef.current[id];
        }
      });

      spots.forEach((spot) => {
        if (markersRef.current[spot.id]) return;
        const marker = L.marker([spot.latitude, spot.longitude])
          .addTo(map)
          .bindPopup(
            `<strong>${spot.name}</strong><br/>${spot.address}<br/>` +
              (spot.avgRating ? `⭐ ${spot.avgRating} (${spot.reviewCount}건)` : '리뷰 없음'),
          );
        if (onSpotClick) {
          marker.on('click', () => onSpotClick(spot));
        }
        markersRef.current[spot.id] = marker;
      });
    });
  }, [spots, onSpotClick]);

  // Pan to selected
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const spot = spots.find((s) => s.id === selectedId);
    if (spot) {
      mapRef.current.setView([spot.latitude, spot.longitude], 14);
      (markersRef.current[selectedId] as { openPopup: () => void })?.openPopup();
    }
  }, [selectedId, spots]);

  // Picked location marker
  useEffect(() => {
    if (!mapRef.current) return;
    import('leaflet').then((L) => {
      if (pickedMarkerRef.current) {
        (pickedMarkerRef.current as { remove: () => void }).remove();
        pickedMarkerRef.current = null;
      }
      if (pickedLocation) {
        const marker = L.marker([pickedLocation.lat, pickedLocation.lng], {
          icon: L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            className: 'picked-marker',
          }),
        }).addTo(mapRef.current!);
        pickedMarkerRef.current = marker;
        mapRef.current!.setView([pickedLocation.lat, pickedLocation.lng], 15);
      }
    });
  }, [pickedLocation]);

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', width: '100%' }}
    />
  );
}
