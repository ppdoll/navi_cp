'use client';

import { useEffect, useState } from 'react';

type CarListingNormalized = {
  source: string;
  sourceLabel: string;
  url: string;
  fetchedAt: string;
  supported: boolean;
  title: string | null;
  modelName: string | null;
  year: string | null;
  registrationDate: string | null;
  priceText: string | null;
  priceAmount: number | null;
  mileageText: string | null;
  mileageKm: number | null;
  accidentStatus: string | null;
  accidentHistory: string | null;
  fuel: string | null;
  transmission: string | null;
  color: string | null;
  drivetrain: string | null;
  bodyType: string | null;
  displacement: string | null;
  seller: string | null;
  location: string | null;
  plateNumber: string | null;
  warranty: string | null;
  imageUrl: string | null;
  options: string[];
  highlights: string[];
  specs: Record<string, string>;
  notes: string[];
};

type CompareResponse = {
  requestedAt: string;
  count: number;
  fields: string[];
  listings: CarListingNormalized[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://127.0.0.1:3999';

const SITES = [
  {
    key: 'heydealer',
    label: '헤이딜러',
    href: 'https://www.heydealer.com/',
    placeholder: 'https://www.heydealer.com/market/cars/...',
  },
  {
    key: 'encar',
    label: '엔카',
    href: 'https://fem.encar.com/',
    placeholder: 'https://fem.encar.com/cars/detail/...',
  },
  {
    key: 'hyundai',
    label: '현대 인증중고차',
    href: 'https://certified.hyundai.com/p/goods/goodsDetail.do?goodsNo=GJK260514027744',
    placeholder: 'https://certified.hyundai.com/...',
  },
  {
    key: 'kia',
    label: '기아 인증중고차',
    href: 'https://cpo.kia.com/',
    placeholder: 'https://cpo.kia.com/products/detail/...',
  },
  {
    key: 'bmw',
    label: 'BMW 인증중고차',
    href: 'https://www.bmw.co.kr/',
    placeholder: 'https://www.bmw.co.kr/ko-kr/sl/usedcarfinder/...',
  },
  {
    key: 'benz',
    label: '벤츠 인증중고차',
    href: 'https://www.mercedes-benz.co.kr/',
    placeholder: 'https://www.mercedes-benz.co.kr/...',
  },
] as const;

const rows: Array<[string, (item: CarListingNormalized) => string]> = [
  ['사이트', (item) => item.sourceLabel],
  ['모델명', (item) => item.modelName || item.title || '-'],
  ['연식', (item) => item.year || '-'],
  ['등록일', (item) => item.registrationDate || '-'],
  ['가격', (item) => item.priceText || '-'],
  ['주행거리', (item) => item.mileageText || '-'],
  ['사고여부', (item) => item.accidentStatus || '-'],
  ['사고이력', (item) => item.accidentHistory || '-'],
  ['연료', (item) => item.fuel || '-'],
  ['변속기', (item) => item.transmission || '-'],
  ['색상', (item) => item.color || '-'],
  ['구동/차체', (item) => [item.drivetrain, item.bodyType].filter(Boolean).join(' / ') || '-'],
  ['배기량', (item) => item.displacement || '-'],
  ['보증', (item) => item.warranty || '-'],
  ['판매처/위치', (item) => [item.seller, item.location].filter(Boolean).join(' / ') || '-'],
  ['차량번호', (item) => item.plateNumber || '-'],
  ['옵션', (item) => (item.options.length ? item.options.join(', ') : '-')],
  ['하이라이트', (item) => (item.highlights.length ? item.highlights.join(', ') : '-')],
  [
    '추가 스펙',
    (item) => {
      const entries = Object.entries(item.specs || {});
      return entries.length ? entries.map(([k, v]) => `${k}: ${v}`).join(' / ') : '-';
    },
  ],
  ['비고', (item) => (item.notes.length ? item.notes.join(' / ') : '-')],
];

export default function CarsPage() {
  const [siteUrls, setSiteUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//t1.kakaocdn.net/kas/static/ba.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  const listings = result?.listings ?? [];
  const parsedCount = listings.filter((item) => item.supported).length;

  function setUrl(key: string, value: string) {
    setSiteUrls((prev) => ({ ...prev, [key]: value }));
  }

  async function compareUrls() {
    const urls = SITES.map((site) => (siteUrls[site.key] ?? '').trim()).filter(Boolean);

    if (!urls.length) {
      setError('비교할 URL을 한 개 이상 넣어주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/cars/compare`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ urls }),
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`비교 요청 실패 (${response.status})`);
      }

      setResult((await response.json()) as CompareResponse);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : '비교 도중 오류가 발생했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page cars-page">
      <section className="hero">
        <p className="eyebrow">KR Tools · Cars</p>
        <h1>중고차 비교</h1>
        <p>
          헤이딜러, 엔카, 현대 인증중고차, 기아 인증중고차, BMW 인증중고차, 벤츠 인증중고차 URL을
          넣으면 모델명, 연식, 가격, 사고여부, 사고이력, 스펙을 한 화면에서 비교합니다.
        </p>
      </section>

      <div className="ad-after-hero">
        <div className="ad-mobile-only">
          <ins className="kakao_ad_area" style={{ display: 'none' }}
               data-ad-unit="DAN-jQhuqQRXYEQCm28i" data-ad-width="320" data-ad-height="480" />
        </div>
      </div>

      <section className="panel cars-layout">
        <div className="cars-input-panel">
          <div className="cars-panel-head">
            <div>
              <h2>비교할 URL</h2>
              <p>비교할 사이트의 URL만 입력하면 됩니다.</p>
            </div>
          </div>

          <div className="cars-site-inputs">
            {SITES.map((site) => (
              <label key={site.key} className="cars-site-label">
                <a href={site.href} target="_blank" rel="noreferrer" className="cars-site-link">
                  {site.label}
                </a>
                <input
                  type="url"
                  className="cars-site-input"
                  value={siteUrls[site.key] ?? ''}
                  onChange={(e) => setUrl(site.key, e.target.value)}
                  placeholder={site.placeholder}
                />
              </label>
            ))}
          </div>

          <div className="cars-actions">
            <button type="button" onClick={compareUrls} disabled={loading}>
              {loading ? '비교 중...' : '비교 시작'}
            </button>
            <p className="cars-help-text">비교 항목: 모델명, 연식, 가격, 사고여부, 사고이력, 스펙</p>
          </div>
        </div>

        <div className="cars-results-panel">
          {error ? <p className="error">{error}</p> : null}

          {result ? (
            <>
              <div className="cars-summary-bar">
                <div>
                  <strong>{result.count}</strong>개 URL 확인
                </div>
                <div>
                  <strong>{parsedCount}</strong>개 자동 분석 가능
                </div>
                <div>기준 시각: {new Date(result.requestedAt).toLocaleString('ko-KR')}</div>
              </div>

              <div className="cars-summary-grid">
                {listings.map((item) => (
                  <article key={`${item.source}-${item.url}`} className="cars-summary-card">
                    <div className="cars-summary-top">
                      <span>{item.sourceLabel}</span>
                      <span className={`cars-badge ${item.supported ? 'is-good' : 'is-warn'}`}>
                        {item.supported ? '분석 가능' : '부분 분석'}
                      </span>
                    </div>
                    <h3>{item.modelName || item.title || '차량명 확인 필요'}</h3>
                    <dl>
                      <div>
                        <dt>연식</dt>
                        <dd>{item.year || '-'}</dd>
                      </div>
                      <div>
                        <dt>가격</dt>
                        <dd>{item.priceText || '-'}</dd>
                      </div>
                      <div>
                        <dt>주행거리</dt>
                        <dd>{item.mileageText || '-'}</dd>
                      </div>
                      <div>
                        <dt>사고</dt>
                        <dd>{item.accidentStatus || '-'}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>

              <div className="cars-table-wrap">
                <table className="cars-compare-table">
                  <thead>
                    <tr>
                      <th className="cars-row-header">비교 항목</th>
                      {listings.map((item) => (
                        <th key={`${item.source}-${item.url}-head`}>
                          <div className="cars-cell-main">{item.sourceLabel}</div>
                          <div className="cars-cell-sub">
                            {item.modelName || item.title || '차량'}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([label, formatter]) => (
                      <tr key={label}>
                        <th className="cars-row-header">{label}</th>
                        {listings.map((item) => (
                          <td key={`${item.source}-${item.url}-${label}`}>
                            <div className="cars-cell-main">{formatter(item)}</div>
                            {label === '비고' && item.url ? (
                              <div className="cars-cell-sub">
                                <a href={item.url} target="_blank" rel="noreferrer">
                                  원문 열기
                                </a>
                              </div>
                            ) : null}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="cars-empty-state">
              URL을 넣고 비교를 시작하면 결과가 여기에 표시됩니다.
            </div>
          )}
        </div>
      </section>
      <div className="ad-bottom">
        <div className="ad-pc-only">
          <ins className="kakao_ad_area" style={{ display: 'none' }}
               data-ad-unit="DAN-rgs4SQJmvCt2NxzL" data-ad-width="728" data-ad-height="90" />
        </div>
        <div className="ad-mobile-only">
          <ins className="kakao_ad_area" style={{ display: 'none' }}
               data-ad-unit="DAN-t08hjMXUx8XWGLxl" data-ad-width="320" data-ad-height="100" />
        </div>
      </div>

      <div className="ad-sidebar-right">
        <ins className="kakao_ad_area" style={{ display: 'none' }}
             data-ad-unit="DAN-DFaroiHW07bkmjti" data-ad-width="160" data-ad-height="600" />
      </div>
    </main>
  );
}
