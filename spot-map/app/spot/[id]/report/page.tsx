'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

const REPORT_REASONS = ['잘못된 정보', '폐업 / 이전', '스팸 / 광고', '부적절한 내용', '기타'];

function ReportForm() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const reviewId = searchParams.get('reviewId');

  const [spotName, setSpotName] = useState('');
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/spots/${id}`)
      .then((r) => r.json())
      .then((d) => setSpotName(d.name || ''))
      .catch(() => {});
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) { setError('신고 사유를 선택해주세요.'); return; }

    setSubmitting(true);
    setError('');

    const url = reviewId ? `/api/reviews/${reviewId}/report` : `/api/spots/${id}/report`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, detail: detail || null }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError('신고 중 오류가 발생했습니다.');
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm mx-4">
          <p className="text-4xl mb-3">🚩</p>
          <h2 className="text-lg font-bold text-gray-800 mb-2">신고가 접수되었습니다</h2>
          <p className="text-sm text-gray-500 mb-4">관리자가 검토 후 조치합니다.</p>
          <Link href={`/spot/${id}`} className="text-pink-500 hover:underline text-sm">매장으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3">
        <Link href={`/spot/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← 매장으로</Link>
        <div>
          <h1 className="text-lg font-bold text-red-500">신고하기</h1>
          <p className="text-xs text-gray-500">
            {spotName}{reviewId ? ' — 후기 신고' : ''}
          </p>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">신고 사유 <span className="text-red-500">*</span></p>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-red-500"
                  />
                  <span className="text-sm text-gray-700">{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">상세 내용 (선택)</label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="구체적인 내용을 알려주시면 더 빠르게 처리됩니다."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={submitting}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold py-3 rounded-xl transition-colors">
            {submitting ? '신고 중...' : '신고하기'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>}>
      <ReportForm />
    </Suspense>
  );
}
