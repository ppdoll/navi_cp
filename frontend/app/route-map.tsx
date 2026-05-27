'use client';

import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';

type Provider = 'NAVER' | 'KAKAO' | 'TMAP';

type RouteItem = {
  provider: Provider;
  pathCoordinates?: Array<[number, number]>;
};

const providerColor: Record<Provider, string> = {
  NAVER: '#00a83f',
  KAKAO: '#f2c200',
  TMAP: '#2c7be5',
};

// 30px 주기로 엇갈린 dash — 겹치는 구간에서 줄무늬 효과
// NAVER: 0-9px, KAKAO: 10-19px, TMAP: 20-29px
const allModeDash: Record<Provider, { dashArray: string; dashOffset: string }> = {
  NAVER: { dashArray: '10 20', dashOffset: '0' },
  KAKAO: { dashArray: '10 20', dashOffset: '20' },
  TMAP:  { dashArray: '10 20', dashOffset: '10' },
};

type Props = {
  visibleRoutes: RouteItem[];
  selectedProvider: Provider | 'ALL';
  origin?: [number, number] | null;
  destination?: [number, number] | null;
  defaultCenter: [number, number];
};

export default function RouteMap({
  visibleRoutes,
  selectedProvider,
  origin,
  destination,
  defaultCenter,
}: Props) {
  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      scrollWheelZoom
      style={{ height: '360px', width: '100%' }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {visibleRoutes.map((route) =>
        route.pathCoordinates ? (
          <Polyline
            key={`line-${route.provider}`}
            positions={route.pathCoordinates}
            pathOptions={{
              color: providerColor[route.provider],
              weight: selectedProvider === 'ALL' ? 4 : 6,
              ...(selectedProvider === 'ALL' ? allModeDash[route.provider] : {}),
            }}
          />
        ) : null,
      )}
      {origin ? <Marker position={origin} /> : null}
      {destination ? <Marker position={destination} /> : null}
    </MapContainer>
  );
}

