import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function Image() {
  const title = process.env.OG_TITLE?.trim() || '길찾기 비교 지도';
  const subtitle =
    process.env.OG_SUBTITLE?.trim() ||
    '네이버 · 카카오 · 티맵 경로를 한눈에 비교하세요';
  const brand = process.env.OG_BRAND?.trim() || 'Route Compare';
  const bgStart = process.env.OG_BG_START?.trim() || '#f7efe6';
  const bgEnd = process.env.OG_BG_END?.trim() || '#d9ecfb';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${bgStart} 0%, ${bgEnd} 100%)`,
          padding: '56px 64px',
          color: '#2f2a33',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            opacity: 0.9,
            fontWeight: 700,
          }}
        >
          {brand}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 72,
              lineHeight: 1.1,
              fontWeight: 800,
              letterSpacing: -1.2,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 34,
              lineHeight: 1.35,
              color: '#4a4450',
              fontWeight: 600,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

