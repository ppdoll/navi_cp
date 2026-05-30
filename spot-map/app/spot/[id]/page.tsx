'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import StarRating from '@/app/components/StarRating';
import { SITE_CONFIG } from '@/lib/config';
import type { SpotDetail } from '@/lib/types';

const SpotMap = dynamic(() => import('@/app/components/SpotMap'), { ssr: false });

function ReviewCard({ review, spotId }: { review: SpotDetail['reviews'][number]; spotId: string }) {
  return (
    <div className="border rounded-xl p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <StarRating value={review.rating} readonly size="sm" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {new Date(review.createdAt).toLocaleDateString('ko-KR')}
          </span>
          <Link
            href={`/spot/${spotId}/report?reviewId=${review.id}`}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            🚩
          </Link>
        </div>
      </div>
      {review.attributes.triesCount != null && (
        <p className="text-sm text-gray-700">
          🎮 <span className="font-semibold">{review.attributes.triesCount}판</span> 만에 뽑음
        </p>
      )}
      {review.attributes.dollTypes && (
        <p className="text-sm text-gray-700">🎀 {review.attributes.dollTypes}</p>
      )}
      {review.comment && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{review.comment}</p>
      )}
    </div>
  );
}

export default function SpotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/spots/${id}`)
      .then((r) => r.json())
      .then((data) => { setSpot(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>
    );
  }

  if (!spot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">매장을 찾을 수 없습니다.</p>
        <Link href="/" className="text-pink-500 underline">목록으로 돌아가기</Link>
      </div>
    );
  }

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: spot.reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 목록으로</Link>
        <h1 className="text-lg font-bold text-pink-600 flex-1 truncate">{spot.name}</h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/spot/${id}/edit`}
            className="bg-amber-400 hover:bg-amber-500 text-white text-sm font-semibold px-3 py-1.5 rounded-full transition-colors"
          >
            수정 요청
          </Link>
          <Link
            href={`/spot/${id}/report`}
            className="text-gray-400 hover:text-red-400 text-sm transition-colors"
            title="신고하기"
          >
            🚩
          </Link>
          <Link
            href={`/spot/${id}/review`}
            className="bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold px-3 py-1.5 rounded-full transition-colors"
          >
            후기 작성
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Map */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div style={{ height: '220px' }}>
            <SpotMap
              spots={[spot]}
              selectedId={spot.id}
            />
          </div>
        </div>

        {/* Info */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{spot.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">📍 {spot.address}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {spot.attributes.machineCount != null && (
              <div className="bg-blue-50 rounded-lg p-2.5">
                <p className="text-xs text-blue-500 font-medium">{SITE_CONFIG.attributeLabels.machineCount}</p>
                <p className="text-lg font-bold text-blue-700">{spot.attributes.machineCount}대</p>
              </div>
            )}
            {spot.attributes.pricePerPlay != null && (
              <div className="bg-yellow-50 rounded-lg p-2.5">
                <p className="text-xs text-yellow-600 font-medium">{SITE_CONFIG.attributeLabels.pricePerPlay}</p>
                <p className="text-lg font-bold text-yellow-700">{spot.attributes.pricePerPlay.toLocaleString()}원</p>
              </div>
            )}
            {spot.attributes.dollTypes && (
              <div className="bg-pink-50 rounded-lg p-2.5 col-span-2">
                <p className="text-xs text-pink-500 font-medium">{SITE_CONFIG.attributeLabels.dollTypes}</p>
                <p className="text-sm font-semibold text-pink-700">🎀 {spot.attributes.dollTypes}</p>
              </div>
            )}
            {spot.attributes.winProbability && (
              <div className="bg-green-50 rounded-lg p-2.5 col-span-2">
                <p className="text-xs text-green-600 font-medium">{SITE_CONFIG.attributeLabels.winProbability}</p>
                <p className="text-sm font-semibold text-green-700">{spot.attributes.winProbability}</p>
              </div>
            )}
          </div>
        </div>

        {/* Rating summary */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-bold text-gray-800 mb-3">리뷰 요약</h3>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-5xl font-black text-yellow-500">
                {spot.avgRating != null ? spot.avgRating.toFixed(1) : '-'}
              </p>
              <StarRating value={Math.round(spot.avgRating ?? 0)} readonly size="sm" />
              <p className="text-xs text-gray-400 mt-1">{spot.reviewCount}건</p>
            </div>
            <div className="flex-1 space-y-1">
              {ratingDistribution.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4">{star}</span>
                  <span className="text-yellow-400 text-xs">★</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full rounded-full transition-all"
                      style={{ width: spot.reviewCount > 0 ? `${(count / spot.reviewCount) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-4">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800">후기 {spot.reviewCount}건</h3>
            <Link
              href={`/spot/${id}/review`}
              className="text-sm text-pink-500 hover:underline"
            >
              + 후기 쓰기
            </Link>
          </div>
          {spot.reviews.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">
              아직 후기가 없습니다. 첫 번째 후기를 남겨보세요!
            </div>
          ) : (
            spot.reviews.map((r) => <ReviewCard key={r.id} review={r} spotId={id} />)
          )}
        </div>
      </div>
    </div>
  );
}
