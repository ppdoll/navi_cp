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
            }}
          />
        ) : null,
      )}
      {origin ? <Marker position={origin} /> : null}
      {destination ? <Marker position={destination} /> : null}
    </MapContainer>
  );
}

