import type { Metadata } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://127.0.0.1:3998';
const ogTitle = process.env.OG_TITLE?.trim() || '길찾기 비교 지도';
const ogSubtitle =
  process.env.OG_SUBTITLE?.trim() ||
  '네이버, 카카오, 티맵 경로를 한 화면에서 비교하는 지도 서비스';

export const metadata: Metadata = {
  title: ogTitle,
  description: ogSubtitle,
  themeColor: '#f8efe6',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: ogTitle,
    description: ogSubtitle,
    type: 'website',
    url: siteUrl,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: ogTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: ogTitle,
    description: ogSubtitle,
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
