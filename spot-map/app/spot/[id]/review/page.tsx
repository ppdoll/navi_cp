'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StarRating from '@/app/components/StarRating';
import { SITE_CONFIG } from '@/lib/config';

export default function NewReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [spotName, setSpotName] = useState('');
  const [rating, setRating] = useState(3);
  const [triesCount, setTriesCount] = useState('');
  const [dollTypes, setDollTypes] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/spots/${id}`)
      .then((r) => r.json())
      .then((data) => setSpotName(data.name || ''))
      .catch(() => {});
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError('별점을 선택해주세요.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/spots/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment: comment || null,
          attributes: {
            triesCount: triesCount ? Number(triesCount) : null,
            dollTypes,
          },
        }),
      });

      if (!res.ok) throw new Error('등록 실패');
      router.push(`/spot/${id}`);
    } catch {
      setError('후기 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3">
        <Link href={`/spot/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← 매장으로
        </Link>
        <div>
          <h1 className="text-lg font-bold text-pink-600">후기 작성</h1>
          {spotName && <p className="text-xs text-gray-500">{spotName}</p>}
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5 space-y-5">
          {/* Star rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              별점 <span className="text-red-500">*</span>
            </label>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          {/* Tries count */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {SITE_CONFIG.reviewAttributeLabels.triesCount}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={triesCount}
                onChange={(e) => setTriesCount(e.target.value)}
                placeholder="예) 5"
                className="w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
              <span className="text-sm text-gray-500">판</span>
            </div>
          </div>

          {/* Doll types */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {SITE_CONFIG.reviewAttributeLabels.dollTypes}
            </label>
            <input
              type="text"
              value={dollTypes}
              onChange={(e) => setDollTypes(e.target.value)}
              placeholder="예) 쿠로미, 마이멜로디"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              한마디 (선택)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="이 매장에 대한 솔직한 후기를 남겨주세요 😊"
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {submitting ? '등록 중...' : '후기 등록하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
