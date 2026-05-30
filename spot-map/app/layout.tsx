import type { Metadata } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata: Metadata = {
  title: '인형뽑기 성지 — 전국 인형뽑기방 지도',
  description: '전국 인형뽑기방을 직접 등록하고 후기를 나눠요',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full font-sans antialiased">{children}</body>
    </html>
  );
}
