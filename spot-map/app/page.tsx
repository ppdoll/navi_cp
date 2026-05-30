'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SITE_CONFIG } from '@/lib/config';
import type { SpotSummary } from '@/lib/types';

const SpotMap = dynamic(() => import('./components/SpotMap'), { ssr: false });

export default function HomePage() {
  const [spots, setSpots] = useState<SpotSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/spots')
      .then((r) => r.json())
      .then(setSpots)
      .catch(console.error);
  }, []);

  const filtered = spots.filter(
    (s) =>
      s.name.includes(search) ||
      s.address.includes(search) ||
      (s.attributes.dollTypes || '').includes(search),
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-pink-600">{SITE_CONFIG.siteName} 🎠</h1>
          <p className="text-xs text-gray-500">{SITE_CONFIG.siteSubtitle}</p>
        </div>
        <Link
          href="/spot/new"
          className="bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
        >
          + 등록
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 flex flex-col bg-white border-r overflow-hidden flex-shrink-0">
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="이름, 주소, 인형 종류 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <p className="text-xs text-gray-400 mt-1">{filtered.length}개 매장</p>
          </div>

          <ul className="flex-1 overflow-y-auto divide-y">
            {filtered.length === 0 && (
              <li className="p-6 text-center text-gray-400 text-sm">
                등록된 매장이 없습니다.
                <br />
                <Link href="/spot/new" className="text-pink-500 underline mt-1 inline-block">
                  첫 번째로 등록해보세요!
                </Link>
              </li>
            )}
            {filtered.map((spot) => (
              <li
                key={spot.id}
                className={`p-3 cursor-pointer hover:bg-pink-50 transition-colors ${
                  selectedId === spot.id ? 'bg-pink-50 border-l-4 border-pink-500' : ''
                }`}
                onClick={() => setSelectedId(spot.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{spot.name}</p>
                    <p className="text-xs text-gray-500 truncate">{spot.address}</p>
                    {spot.attributes.dollTypes && (
                      <p className="text-xs text-pink-500 truncate mt-0.5">
                        🎀 {spot.attributes.dollTypes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {spot.attributes.pricePerPlay != null && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                          {spot.attributes.pricePerPlay.toLocaleString()}원/판
                        </span>
                      )}
                      {spot.attributes.machineCount != null && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          기계 {spot.attributes.machineCount}대
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {spot.avgRating != null ? (
                      <>
                        <span className="text-sm font-bold text-yellow-500">★ {spot.avgRating}</span>
                        <span className="text-xs text-gray-400">{spot.reviewCount}건</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">리뷰 없음</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/spot/${spot.id}`}
                  className="text-xs text-pink-500 hover:underline mt-1 inline-block"
                  onClick={(e) => e.stopPropagation()}
                >
                  자세히 보기 →
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex-1 relative">
          <SpotMap
            spots={filtered}
            selectedId={selectedId}
            onSpotClick={(spot) => setSelectedId(spot.id)}
          />
        </main>
      </div>
    </div>
  );
}
