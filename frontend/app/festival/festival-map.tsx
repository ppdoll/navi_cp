'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

import type { FestivalItem } from './festival-client';

const defaultIcon = L.icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

type Props = {
  items: FestivalItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

function googleMapsUrl(item: FestivalItem) {
  if (item.latitude != null && item.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
  }
  const address = item.rdnmadr || item.lnmadr || item.opar;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function keyFor(item: FestivalItem, idx: number) {
  return `${item.eventNm}-${item.eventStartDate}-${idx}`;
}

function FitBounds({ items }: { items: FestivalItem[] }) {
  const map = useMap();
  useEffect(() => {
    const points = items
      .filter((i): i is FestivalItem & { latitude: number; longitude: number } =>
        i.latitude != null && i.longitude != null,
      )
      .map((i) => [i.latitude, i.longitude] as [number, number]);
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    map.fitBounds(points, { padding: [40, 40], maxZoom: 13 });
  }, [items, map]);
  return null;
}

export default function FestivalMap({ items, selectedKey, onSelect }: Props) {
  const located = useMemo(
    () =>
      items
        .map((item, idx) => ({ item, idx, key: keyFor(item, idx) }))
        .filter(
          (entry) =>
            entry.item.latitude != null && entry.item.longitude != null,
        ),
    [items],
  );

  return (
    <MapContainer
      center={[36.5, 127.8]}
      zoom={7}
      scrollWheelZoom
      style={{ height: '420px', width: '100%' }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds items={items} />
      {located.map(({ item, key }) => (
        <Marker
          key={key}
          position={[item.latitude as number, item.longitude as number]}
          eventHandlers={{ click: () => onSelect(key) }}
          opacity={selectedKey && selectedKey !== key ? 0.55 : 1}
        >
          <Popup>
            <strong>{item.eventNm}</strong>
            <br />
            {item.opar || item.rdnmadr || ''}
            <br />
            {item.eventStartDate}
            {item.eventEndDate && item.eventEndDate !== item.eventStartDate
              ? ` ~ ${item.eventEndDate}`
              : ''}
            <br />
            <a href={googleMapsUrl(item)} target="_blank" rel="noreferrer">
              Google 지도에서 보기
            </a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
