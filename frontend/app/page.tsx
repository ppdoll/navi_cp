'use client';

import dynamic from 'next/dynamic';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type Provider = 'NAVER' | 'KAKAO' | 'TMAP';
type ProviderView = Provider | 'ALL';

type RouteItem = {
  provider: Provider;
  durationMinutes: number | null;
  distanceMeters: number | null;
  option: string;
  status: 'ok' | 'missing_api_key' | 'not_configured' | 'request_failed';
  message?: string;
  pathCoordinates?: Array<[number, number]>;
  apiDetail?: unknown;
};

type CompareResponse = {
  origin: string;
  destination: string;
  option: string;
  comparedAt: string;
  summary: {
    okCount: number;
    failedCount: number;
    fastestProvider: Provider | null;
    slowestProvider: Provider | null;
    spreadMinutes: number | null;
  };
  routes: RouteItem[];
};

type SearchAddressItem = {
  address: string;
  roadAddress: string;
  longitude: string;
  latitude: string;
};

type KakaoSearchProvider = {
  provider: 'KAKAO';
  status: 'ok' | 'missing_api_key' | 'not_configured' | 'request_failed';
  message?: string;
  source?: 'address' | 'keyword';
  addresses?: SearchAddressItem[];
};

type SearchResponse = {
  query: string;
  providers: Array<
    | { provider: 'NAVER' | 'TMAP'; status: string; message?: string }
    | KakaoSearchProvider
  >;
};

type SelectedPlace = {
  label: string;
  latitude: string;
  longitude: string;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3999';

const RouteMap = dynamic(() => import('./route-map'), { ssr: false });

const isLocalEnvironment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

const providerColor: Record<Provider, string> = {
  NAVER: '#00a83f',
  KAKAO: '#f2c200',
  TMAP: '#2c7be5',
};

function AdsenseUnit() {
  const adRef = useRef<HTMLModElement | null>(null);
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT?.trim();

  useEffect(() => {
    if (!slot || !adRef.current || typeof window === 'undefined') {
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ignore duplicate/late ad initialization errors.
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <section className="panel" aria-label="advertisement">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-5300900783303783"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}

function KakaoAdUnit() {
  return (
    <section className="panel kakao-ad-panel" aria-label="kakao-advertisement">
      <div className="kakao-ad-slot kakao-ad-slot-desktop">
        <ins
          className="kakao_ad_area"
          style={{ display: 'none' }}
          data-ad-unit="DAN-rLxDqF6ZOAufoZc4"
          data-ad-width="160"
          data-ad-height="600"
        />
      </div>
      <div className="kakao-ad-slot kakao-ad-slot-mobile">
        <ins
          className="kakao_ad_area"
          style={{ display: 'none' }}
          data-ad-unit="DAN-AlXb06IWlDddaBRT"
          data-ad-width="320"
          data-ad-height="480"
        />
      </div>
    </section>
  );
}

function toKm(distanceMeters: number | null) {
  if (distanceMeters === null) return '-';
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function mapRouteStatusText(status: RouteItem['status']) {
  if (status === 'ok') return '정상';
  if (status === 'missing_api_key') return 'API 키 누락';
  if (status === 'not_configured') return '설정 누락';
  return '요청 실패';
}

function buildExternalLinks(
  provider: Provider,
  origin: SelectedPlace | null,
  destination: SelectedPlace | null,
) {
  if (!origin || !destination) return null;

  const oName = encodeURIComponent(origin.label);
  const dName = encodeURIComponent(destination.label);
  const oLat = encodeURIComponent(origin.latitude);
  const oLng = encodeURIComponent(origin.longitude);
  const dLat = encodeURIComponent(destination.latitude);
  const dLng = encodeURIComponent(destination.longitude);

  if (provider === 'NAVER') {
    return {
      app: `nmap://route/car?slat=${oLat}&slng=${oLng}&sname=${oName}&dlat=${dLat}&dlng=${dLng}&dname=${dName}`,
      site: `https://map.naver.com/v5/directions/${oLng},${oLat},${oName}/${dLng},${dLat},${dName}/car`,
    };
  }

  if (provider === 'KAKAO') {
    return {
      app: `kakaomap://route?sp=${oLat},${oLng}&ep=${dLat},${dLng}&by=CAR`,
      site: `https://map.kakao.com/?sX=${oLng}&sY=${oLat}&eX=${dLng}&eY=${dLat}&by=CAR`,
    };
  }

  return {
    app: `tmap://route?rGoName=${dName}&rGoX=${dLng}&rGoY=${dLat}&rStName=${oName}&rStX=${oLng}&rStY=${oLat}`,
  };
}

function openAppWithFallback(appUrl: string, siteUrl?: string) {
  if (typeof window === 'undefined') return;

  const startedAt = Date.now();
  const fallback = window.setTimeout(() => {
    if (!document.hidden && siteUrl) {
      window.location.href = siteUrl;
    }
  }, 900);

  const clear = () => {
    window.clearTimeout(fallback);
    window.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', clear);
  };

  const onVisibilityChange = () => {
    if (document.hidden && Date.now() - startedAt < 4000) {
      clear();
    }
  };

  window.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', clear);
  window.location.href = appUrl;
}

export default function Page() {
  const [originName, setOriginName] = useState('서울시청');
  const [destinationName, setDestinationName] = useState('양천로 656');
  const [originCandidates, setOriginCandidates] = useState<SearchAddressItem[]>([]);
  const [destinationCandidates, setDestinationCandidates] = useState<
    SearchAddressItem[]
  >([]);
  const [selectedOrigin, setSelectedOrigin] = useState<SelectedPlace | null>(null);
  const [selectedDestination, setSelectedDestination] =
    useState<SelectedPlace | null>(null);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDestination, setSearchingDestination] = useState(false);
  const [option, setOption] = useState('RECOMMENDED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderView>('ALL');

  const visibleRoutes = useMemo(() => {
    if (!result) return [];
    if (selectedProvider === 'ALL') {
      return result.routes.filter(
        (route) => (route.pathCoordinates?.length ?? 0) > 1 && route.status === 'ok',
      );
    }
    return result.routes.filter(
      (route) =>
        route.provider === selectedProvider &&
        (route.pathCoordinates?.length ?? 0) > 1 &&
        route.status === 'ok',
    );
  }, [result, selectedProvider]);

  async function searchPlace(kind: 'origin' | 'destination') {
    const query = kind === 'origin' ? originName : destinationName;
    if (!query.trim()) {
      setError('검색할 위치명을 입력해 주세요.');
      return;
    }

    if (kind === 'origin') setSearchingOrigin(true);
    else setSearchingDestination(true);
    setError(null);

    try {
      const url = new URL('/search/places', API_BASE_URL);
      url.searchParams.set('query', query);
      const response = await fetch(url.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error(`장소 검색 실패 (${response.status})`);

      const data = (await response.json()) as SearchResponse;
      const kakaoProvider = data.providers.find(
        (provider): provider is KakaoSearchProvider => provider.provider === 'KAKAO',
      );
      const addresses = kakaoProvider?.addresses ?? [];

      if (addresses.length === 0) {
        setError('검색 결과가 없습니다. 다른 키워드로 다시 시도해 주세요.');
      }

      if (kind === 'origin') setOriginCandidates(addresses);
      else setDestinationCandidates(addresses);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : '장소 검색 중 오류가 발생했습니다.',
      );
    } finally {
      if (kind === 'origin') setSearchingOrigin(false);
      else setSearchingDestination(false);
    }
  }

  function selectPlace(kind: 'origin' | 'destination', item: SearchAddressItem) {
    const place: SelectedPlace = {
      label: item.roadAddress || item.address,
      latitude: item.latitude,
      longitude: item.longitude,
    };
    if (kind === 'origin') {
      setSelectedOrigin(place);
      setOriginCandidates([]);
      return;
    }
    setSelectedDestination(place);
    setDestinationCandidates([]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrigin || !selectedDestination) {
      setError('출발지와 도착지를 검색 목록에서 선택해 주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = new URL('/directions/compare', API_BASE_URL);
      url.searchParams.set(
        'origin',
        `${selectedOrigin.latitude},${selectedOrigin.longitude}`,
      );
      url.searchParams.set(
        'destination',
        `${selectedDestination.latitude},${selectedDestination.longitude}`,
      );
      url.searchParams.set('option', option);

      const response = await fetch(url.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error(`경로 비교 실패 (${response.status})`);
      const data = (await response.json()) as CompareResponse;
      setResult(data);
      setSelectedProvider('ALL');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '경로 비교 요청 중 오류가 발생했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }

  const defaultCenter: [number, number] = selectedOrigin
    ? [Number(selectedOrigin.latitude), Number(selectedOrigin.longitude)]
    : [37.5665, 126.978];

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">KR Tools · Navi</p>
        <h1>길찾기 비교 서비스</h1>
        <p>출발지와 도착지를 검색하고 3개 지도 앱의 경로를 한 번에 비교하세요.</p>
      </section>

      <section className="panel">
        <form className="form" onSubmit={onSubmit}>
          <div className="place-block">
            <label>
              출발지 검색
              <div className="inline">
                <input
                  value={originName}
                  onChange={(event) => setOriginName(event.target.value)}
                  placeholder="예: 서울시청, 강남역"
                />
                <button type="button" onClick={() => searchPlace('origin')}>
                  {searchingOrigin ? '검색 중...' : '검색'}
                </button>
              </div>
            </label>
            {selectedOrigin ? (
              <p className="selected">
                선택됨: {selectedOrigin.label} ({selectedOrigin.latitude},{' '}
                {selectedOrigin.longitude})
              </p>
            ) : null}
            {originCandidates.length > 0 ? (
              <ul className="candidate-list">
                {originCandidates.map((item) => (
                  <li key={`o-${item.latitude}-${item.longitude}`}>
                    <button
                      type="button"
                      className="candidate"
                      onClick={() => selectPlace('origin', item)}
                    >
                      <strong>{item.roadAddress || item.address}</strong>
                      <span>{item.address}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="place-block">
            <label>
              도착지 검색
              <div className="inline">
                <input
                  value={destinationName}
                  onChange={(event) => setDestinationName(event.target.value)}
                  placeholder="예: 양천로 656, 여의도"
                />
                <button type="button" onClick={() => searchPlace('destination')}>
                  {searchingDestination ? '검색 중...' : '검색'}
                </button>
              </div>
            </label>
            {selectedDestination ? (
              <p className="selected">
                선택됨: {selectedDestination.label} ({selectedDestination.latitude},{' '}
                {selectedDestination.longitude})
              </p>
            ) : null}
            {destinationCandidates.length > 0 ? (
              <ul className="candidate-list">
                {destinationCandidates.map((item) => (
                  <li key={`d-${item.latitude}-${item.longitude}`}>
                    <button
                      type="button"
                      className="candidate"
                      onClick={() => selectPlace('destination', item)}
                    >
                      <strong>{item.roadAddress || item.address}</strong>
                      <span>{item.address}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <label>
            경로 옵션
            <select value={option} onChange={(event) => setOption(event.target.value)}>
              <option value="RECOMMENDED">추천</option>
              <option value="FASTEST">최단 시간</option>
              <option value="FREE">무료 우선</option>
              <option value="BIG_ROAD">큰길 우선</option>
            </select>
          </label>

          <button type="submit" disabled={loading}>
            {loading ? '비교 중...' : '경로 비교'}
          </button>
        </form>
      </section>

      {error ? <p className="error">{error}</p> : null}

      {result ? (
        <section className="results">
          <div className="summary">
            <h2>비교 요약</h2>
            <p>
              가장 빠른 경로: <strong>{result.summary.fastestProvider ?? '-'}</strong>
            </p>
            <p>
              가장 느린 경로: <strong>{result.summary.slowestProvider ?? '-'}</strong>
            </p>
            <p>
              소요 시간 차이: <strong>{result.summary.spreadMinutes ?? '-'}분</strong>
            </p>
            <p>
              성공/실패: <strong>{result.summary.okCount}</strong> /{' '}
              <strong>{result.summary.failedCount}</strong>
            </p>
          </div>

          <div className="provider-tabs">
            <button
              type="button"
              className={`tab ${selectedProvider === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedProvider('ALL')}
            >
              <span className="legend-group">
                <span className="color-chip all" />
                3개 동시 보기
              </span>
            </button>
            {result.routes.map((route) => (
              <button
                key={route.provider}
                type="button"
                className={`tab ${selectedProvider === route.provider ? 'active' : ''}`}
                onClick={() => setSelectedProvider(route.provider)}
              >
                <span className="legend-group">
                  <span
                    className="color-chip"
                    style={{ backgroundColor: providerColor[route.provider] }}
                  />
                  {route.provider}
                </span>
              </button>
            ))}
          </div>

          <div className="map-wrap">
            <RouteMap
              visibleRoutes={visibleRoutes}
              selectedProvider={selectedProvider}
              defaultCenter={defaultCenter}
              origin={
                selectedOrigin
                  ? [
                      Number(selectedOrigin.latitude),
                      Number(selectedOrigin.longitude),
                    ]
                  : null
              }
              destination={
                selectedDestination
                  ? [
                      Number(selectedDestination.latitude),
                      Number(selectedDestination.longitude),
                    ]
                  : null
              }
            />
          </div>

          <div className="cards">
            {result.routes.map((route) => (
              <article
                key={route.provider}
                className={`card ${route.status === 'ok' ? 'ok' : 'fail'} ${
                  result.summary.fastestProvider === route.provider
                    ? 'fastest'
                    : ''
                }`}
              >
                <h3>{route.provider}</h3>
                <p>상태: {mapRouteStatusText(route.status)}</p>
                <p>소요 시간: {route.durationMinutes ?? '-'}분</p>
                <p>거리: {toKm(route.distanceMeters)}</p>
                <p>경로 포인트 수: {route.pathCoordinates?.length ?? 0}</p>
                {route.message ? <p className="message">{route.message}</p> : null}

                {(() => {
                  const links = buildExternalLinks(
                    route.provider,
                    selectedOrigin,
                    selectedDestination,
                  );
                  if (!links) return null;

                  return (
                    <div className="external-link-buttons">
                      <button
                        type="button"
                        onClick={() => openAppWithFallback(links.app, links.site)}
                      >
                        앱 열기
                      </button>
                    </div>
                  );
                })()}

                {isLocalEnvironment && route.apiDetail ? (
                  <details className="api-detail">
                    <summary>API 요청/응답 보기</summary>
                    <pre>{JSON.stringify(route.apiDetail, null, 2)}</pre>
                  </details>
                ) : null}
              </article>
            ))}
          </div>

          <AdsenseUnit />
          <KakaoAdUnit />
        </section>
      ) : null}

      <section className="panel panel-links">
        <p>
          <a href="/about">서비스 소개</a> | <a href="/privacy">개인정보처리방침</a>
        </p>
      </section>
    </main>
  );
}
