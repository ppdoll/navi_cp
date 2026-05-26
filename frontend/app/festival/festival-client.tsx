'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

export type FestivalItem = {
  eventNm: string;
  opar: string;
  eventCo: string;
  eventStartDate: string;
  eventEndDate: string;
  eventStartTime: string;
  eventEndTime: string;
  chrgeInfo: string;
  mnnstNm: string;
  auspcInsttNm: string;
  phoneNumber: string;
  admfee: string;
  entncAge: string;
  dscntInfo: string;
  homepageUrl: string;
  rdnmadr: string;
  lnmadr: string;
  insttNm: string;
  latitude: number | null;
  longitude: number | null;
};

type Props = {
  items: FestivalItem[];
  totalCount: number;
  today: string;
  fetchedAt?: string | null;
  loadError: string | null;
};

const FestivalMap = dynamic(() => import('./festival-map'), { ssr: false });

const PAGE_SIZE = 30;

function KakaoAdUnit() {
  useEffect(() => {
    // ba.min.js runs once on initial page load; re-append on SPA navigation so
    // new <ins> elements on this page are picked up.
    const script = document.createElement('script');
    script.src = '//t1.kakaocdn.net/kas/static/ba.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      try { document.body.removeChild(script); } catch {}
    };
  }, []);

  return (
    <section className="panel kakao-ad-panel" aria-label="kakao-advertisement">
      <div className="kakao-ad-group kakao-ad-group-desktop">
        <div className="kakao-ad-slot kakao-ad-slot-desktop-horizontal">
          <ins
            className="kakao_ad_area"
            style={{ display: 'none' }}
            data-ad-unit="DAN-rgs4SQJmvCt2NxzL"
            data-ad-width="728"
            data-ad-height="90"
          />
        </div>
        <div className="kakao-ad-slot kakao-ad-slot-desktop-vertical">
          <ins
            className="kakao_ad_area"
            style={{ display: 'none' }}
            data-ad-unit="DAN-DFaroiHW07bkmjti"
            data-ad-width="160"
            data-ad-height="600"
          />
        </div>
      </div>
      <div className="kakao-ad-group kakao-ad-group-mobile">
        <div className="kakao-ad-slot kakao-ad-slot-mobile-horizontal">
          <ins
            className="kakao_ad_area"
            style={{ display: 'none' }}
            data-ad-unit="DAN-t08hjMXUx8XWGLxl"
            data-ad-width="320"
            data-ad-height="100"
          />
        </div>
        <div className="kakao-ad-slot kakao-ad-slot-mobile-vertical">
          <ins
            className="kakao_ad_area"
            style={{ display: 'none' }}
            data-ad-unit="DAN-jQhuqQRXYEQCm28i"
            data-ad-width="320"
            data-ad-height="480"
          />
        </div>
      </div>
    </section>
  );
}

function keyFor(item: FestivalItem, idx: number) {
  return `${item.eventNm}-${item.eventStartDate}-${idx}`;
}

function googleMapsUrl(item: FestivalItem) {
  if (item.latitude != null && item.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
  }
  const address = item.rdnmadr || item.lnmadr || item.opar;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function googleMapsEmbedUrl(item: FestivalItem) {
  if (item.latitude != null && item.longitude != null) {
    return `https://maps.google.com/maps?q=${item.latitude},${item.longitude}&z=15&output=embed`;
  }
  const address = item.rdnmadr || item.lnmadr || item.opar;
  if (!address) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`;
}

function truncateName(name: string) {
  return name.length > 7 ? name.slice(0, 7) + '...' : name;
}

function formatDateRange(start: string, end: string) {
  if (!start && !end) return '-';
  if (!end || start === end) return start || '-';
  return `${start} ~ ${end}`;
}

function formatTimeRange(start: string, end: string) {
  if (!start && !end) return '';
  if (!end || start === end) return start;
  return `${start} ~ ${end}`;
}

export default function FestivalClient({
  items,
  totalCount,
  today,
  fetchedAt,
  loadError,
}: Props) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<'ALL' | string>('ALL');
  const [category, setCategory] = useState<'ALL' | string>('ALL');
  const [feeFilter, setFeeFilter] = useState<'ALL' | '무료' | '유료'>('ALL');
  const [page, setPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const r = (item.rdnmadr || item.lnmadr).split(' ')[0];
      if (r) set.add(r);
    }
    return Array.from(set).sort();
  }, [items]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.eventCo) set.add(item.eventCo);
    }
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const haystack =
          `${item.eventNm} ${item.opar} ${item.rdnmadr} ${item.lnmadr} ${item.auspcInsttNm} ${item.insttNm} ${item.mnnstNm}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (region !== 'ALL') {
        const r = (item.rdnmadr || item.lnmadr).split(' ')[0];
        if (r !== region) return false;
      }
      if (category !== 'ALL' && item.eventCo !== category) return false;
      if (feeFilter === '무료' && !item.chrgeInfo.includes('무료')) return false;
      if (feeFilter === '유료' && !item.chrgeInfo.includes('유료')) return false;
      return true;
    });
  }, [items, query, region, category, feeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function resetPaging() {
    setPage(1);
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">KR Tools · Festival</p>
        <h1>전국 공연·행사 일정</h1>
        <p>
          공공데이터포털의 공연·행사 정보를 주 1회 갱신해 보여드립니다.
          오늘({today}) 이후 일정만 표시되며, 위치 좌표가 있는 행사는 지도에서
          확인할 수 있습니다.
          {fetchedAt ? (
            <>
              {' '}
              <span className="festival-source">
                · 데이터 기준 {fetchedAt.slice(0, 10)}
              </span>
            </>
          ) : null}
        </p>
      </section>

      {loadError ? (
        <p className="error">데이터 로드 실패: {loadError}</p>
      ) : null}

      <section className="panel festival-filters">
        <div className="filter-grid">
          <label>
            검색어
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPaging();
              }}
              placeholder="행사명, 장소, 주최 등"
            />
          </label>
          <label>
            지역(시·도)
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                resetPaging();
              }}
            >
              <option value="ALL">전체</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            분류
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                resetPaging();
              }}
            >
              <option value="ALL">전체</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            요금
            <select
              value={feeFilter}
              onChange={(e) => {
                setFeeFilter(e.target.value as typeof feeFilter);
                resetPaging();
              }}
            >
              <option value="ALL">전체</option>
              <option value="무료">무료</option>
              <option value="유료">유료</option>
            </select>
          </label>
        </div>
        <p className="festival-meta">
          전체 {totalCount.toLocaleString()}건 중 다가오는 일정{' '}
          <strong>{items.length.toLocaleString()}</strong>건 · 현재 필터 결과{' '}
          <strong>{filtered.length.toLocaleString()}</strong>건
        </p>
      </section>

      <section className="panel">
        <div className="map-wrap">
          <FestivalMap
            items={filtered}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
          />
        </div>
      </section>

      <section className="festival-grid">
        {paged.length === 0 ? (
          <p className="festival-empty">조건에 맞는 행사가 없습니다.</p>
        ) : (
          paged.map((item, idx) => {
            const key = keyFor(item, (safePage - 1) * PAGE_SIZE + idx);
            const isSelected = selectedKey === key;
            const embedUrl = isSelected ? googleMapsEmbedUrl(item) : null;
            const address = item.rdnmadr || item.lnmadr;
            return (
              <article
                key={key}
                className={`festival-card ${isSelected ? 'selected' : ''}`}
              >
                <header className="festival-card-head">
                  <h2 title={item.eventNm}>{truncateName(item.eventNm)}</h2>
                  {item.eventCo ? (
                    <span className="festival-chip" title={item.eventCo.length > 10 ? item.eventCo : undefined}>
                      {item.eventCo.length > 10 ? item.eventCo.slice(0, 10) + '...' : item.eventCo}
                    </span>
                  ) : null}
                </header>
                <p className="festival-date">
                  {formatDateRange(item.eventStartDate, item.eventEndDate)}
                  {formatTimeRange(item.eventStartTime, item.eventEndTime) ? (
                    <span className="festival-time">
                      {' '}
                      ({formatTimeRange(item.eventStartTime, item.eventEndTime)})
                    </span>
                  ) : null}
                </p>
                {item.opar ? (
                  <p>
                    <strong>장소</strong> {item.opar}
                  </p>
                ) : null}
                {address ? (
                  <p>
                    <strong>주소</strong> {address}
                  </p>
                ) : null}
                {item.chrgeInfo || item.admfee ? (
                  <p>
                    <strong>요금</strong>{' '}
                    {[item.chrgeInfo, item.admfee].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                {item.entncAge ? (
                  <p>
                    <strong>관람연령</strong> {item.entncAge}
                  </p>
                ) : null}
                {item.mnnstNm || item.auspcInsttNm ? (
                  <p>
                    <strong>주최/주관</strong>{' '}
                    {[item.auspcInsttNm, item.mnnstNm]
                      .filter(Boolean)
                      .join(' / ')}
                  </p>
                ) : null}
                {item.phoneNumber ? (
                  <p>
                    <strong>문의</strong>{' '}
                    <a href={`tel:${item.phoneNumber}`}>{item.phoneNumber}</a>
                  </p>
                ) : null}
                <div className="festival-actions">
                  <button
                    type="button"
                    className="festival-action"
                    onClick={() =>
                      setSelectedKey(isSelected ? null : key)
                    }
                  >
                    {isSelected ? '지도 닫기' : '지도 미리보기'}
                  </button>
                  <a
                    className="festival-action"
                    href={googleMapsUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google 지도 열기
                  </a>
                  {item.homepageUrl ? (
                    <a
                      className="festival-action"
                      href={item.homepageUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      홈페이지
                    </a>
                  ) : null}
                </div>
                {embedUrl ? (
                  <div className="festival-embed">
                    <iframe
                      src={embedUrl}
                      width="100%"
                      height="260"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`${item.eventNm} 지도`}
                    />
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>

      {totalPages > 1 ? (
        <section className="festival-pagination">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            이전
          </button>
          <span>
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            다음
          </button>
        </section>
      ) : null}

      <KakaoAdUnit />

      <section className="panel panel-links">
        <p>
          <a href="/">길찾기 비교로 돌아가기</a> |{' '}
          <a href="/about">서비스 소개</a> |{' '}
          <a href="/privacy">개인정보처리방침</a>
        </p>
        <p className="festival-source">
          출처: 공공데이터포털(data.go.kr) 공연·행사 정보 표준데이터
        </p>
      </section>
    </main>
  );
}
