'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SITE_CONFIG } from '@/lib/config';
import type { SpotDetail } from '@/lib/types';

const SpotMap = dynamic(() => import('@/app/components/SpotMap'), { ssr: false });

export default function EditSpotPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    name: '',
    address: '',
    machineCount: '',
    dollTypes: '',
    pricePerPlay: '',
    winProbability: '',
    reason: '',
  });

  useEffect(() => {
    fetch(`/api/spots/${id}`)
      .then((r) => r.json())
      .then((data: SpotDetail) => {
        setSpot(data);
        setPickedLocation({ lat: data.latitude, lng: data.longitude });
        setForm({
          name: data.name,
          address: data.address,
          machineCount: data.attributes.machineCount?.toString() ?? '',
          dollTypes: data.attributes.dollTypes ?? '',
          pricePerPlay: data.attributes.pricePerPlay?.toString() ?? '',
          winProbability: data.attributes.winProbability ?? '',
          reason: '',
        });
      })
      .catch(() => {});
  }, [id]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickedLocation) { setError('위치를 선택해주세요.'); return; }
    if (!form.name || !form.address) { setError('상호명과 주소는 필수입니다.'); return; }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/spots/${id}/edit-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: form.reason,
          proposed: {
            name: form.name,
            address: form.address,
            latitude: pickedLocation.lat,
            longitude: pickedLocation.lng,
            attributes: {
              machineCount: form.machineCount ? Number(form.machineCount) : null,
              dollTypes: form.dollTypes,
              pricePerPlay: form.pricePerPlay ? Number(form.pricePerPlay) : null,
              winProbability: form.winProbability,
            },
          },
        }),
      });

      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError('제출 중 오류가 발생했습니다.');
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm mx-4">
          <p className="text-4xl mb-3">✅</p>
          <h2 className="text-lg font-bold text-gray-800 mb-2">수정 요청이 접수되었습니다</h2>
          <p className="text-sm text-gray-500 mb-4">관리자 검토 후 반영됩니다.</p>
          <Link href={`/spot/${id}`} className="text-pink-500 hover:underline text-sm">
            매장으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!spot) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3">
        <Link href={`/spot/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← 매장으로</Link>
        <div>
          <h1 className="text-lg font-bold text-pink-600">수정 요청</h1>
          <p className="text-xs text-gray-500">{spot.name}</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-700">
          수정 내용은 관리자 검토 후 반영됩니다. 즉시 변경되지 않습니다.
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
          <div className="p-3 border-b">
            <p className="text-sm font-semibold text-gray-700">📍 위치 수정 (클릭해서 변경)</p>
            {pickedLocation && (
              <p className="text-xs text-green-600 mt-0.5">
                {pickedLocation.lat.toFixed(5)}, {pickedLocation.lng.toFixed(5)}
              </p>
            )}
          </div>
          <div style={{ height: '240px' }}>
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">상호명 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">주소 <span className="text-red-500">*</span></label>
            <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{SITE_CONFIG.attributeLabels.machineCount}</label>
              <input type="number" min={1} value={form.machineCount} onChange={(e) => set('machineCount', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{SITE_CONFIG.attributeLabels.pricePerPlay} (원)</label>
              <input type="number" min={100} step={100} value={form.pricePerPlay} onChange={(e) => set('pricePerPlay', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{SITE_CONFIG.attributeLabels.dollTypes}</label>
            <input type="text" value={form.dollTypes} onChange={(e) => set('dollTypes', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{SITE_CONFIG.attributeLabels.winProbability}</label>
            <select value={form.winProbability} onChange={(e) => set('winProbability', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white">
              <option value="">선택 안함</option>
              {SITE_CONFIG.winProbabilityOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">수정 사유 (선택)</label>
            <textarea value={form.reason} onChange={(e) => set('reason', e.target.value)}
              placeholder="어떤 내용이 잘못되었나요?"
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none" />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold py-3 rounded-xl transition-colors">
            {submitting ? '제출 중...' : '수정 요청 보내기'}
          </button>
        </form>
      </div>
    </div>
  );
}
