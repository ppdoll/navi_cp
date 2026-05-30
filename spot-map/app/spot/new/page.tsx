'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import StarRating from '@/app/components/StarRating';
import { SITE_CONFIG } from '@/lib/config';

const SpotMap = dynamic(() => import('@/app/components/SpotMap'), { ssr: false });

export default function NewSpotPage() {
  const router = useRouter();
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [rating, setRating] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    address: '',
    machineCount: '',
    dollTypes: '',
    pricePerPlay: '',
    winProbability: '',
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickedLocation) {
      setError('지도를 클릭하여 위치를 선택해주세요.');
      return;
    }
    if (!form.name || !form.address) {
      setError('상호명과 주소는 필수입니다.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          latitude: pickedLocation.lat,
          longitude: pickedLocation.lng,
          category: SITE_CONFIG.category,
          rating,
          attributes: {
            machineCount: form.machineCount ? Number(form.machineCount) : null,
            dollTypes: form.dollTypes,
            pricePerPlay: form.pricePerPlay ? Number(form.pricePerPlay) : null,
            winProbability: form.winProbability,
          },
        }),
      });

      if (!res.ok) throw new Error('등록 실패');
      const data = await res.json();
      router.push(`/spot/${data.id}`);
    } catch {
      setError('등록 중 오류가 발생했습니다. 다시 시도해주세요.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 목록으로</Link>
        <h1 className="text-lg font-bold text-pink-600">{SITE_CONFIG.spotLabel} 등록</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        {/* Map picker */}
        <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
          <div className="p-3 border-b">
            <p className="text-sm font-semibold text-gray-700">📍 지도에서 위치 클릭</p>
            {pickedLocation ? (
              <p className="text-xs text-green-600 mt-0.5">
                선택됨: {pickedLocation.lat.toFixed(5)}, {pickedLocation.lng.toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">지도를 클릭하면 핀이 꽂힙니다</p>
            )}
          </div>
          <div style={{ height: '280px' }}>
            <SpotMap
              spots={[]}
              pickMode
              onPickLocation={(lat, lng) => setPickedLocation({ lat, lng })}
              pickedLocation={pickedLocation}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              상호명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="예) 펀샵 홍대점"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              주소 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="예) 서울 마포구 어울마당로 65"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {SITE_CONFIG.attributeLabels.machineCount}
              </label>
              <input
                type="number"
                min={1}
                value={form.machineCount}
                onChange={(e) => set('machineCount', e.target.value)}
                placeholder="예) 20"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {SITE_CONFIG.attributeLabels.pricePerPlay} (원)
              </label>
              <input
                type="number"
                min={100}
                step={100}
                value={form.pricePerPlay}
                onChange={(e) => set('pricePerPlay', e.target.value)}
                placeholder="예) 500"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {SITE_CONFIG.attributeLabels.dollTypes}
            </label>
            <input
              type="text"
              value={form.dollTypes}
              onChange={(e) => set('dollTypes', e.target.value)}
              placeholder="예) 산리오, BT21, 포켓몬"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {SITE_CONFIG.attributeLabels.winProbability}
            </label>
            <select
              value={form.winProbability}
              onChange={(e) => set('winProbability', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
            >
              <option value="">선택 안함</option>
              {SITE_CONFIG.winProbabilityOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">내 별점</label>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {submitting ? '등록 중...' : '매장 등록하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
