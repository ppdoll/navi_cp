'use client';

import { usePathname } from 'next/navigation';

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="sitenav">
      <div className="sitenav-inner">
        <a className="sitenav-brand" href="https://krtools.cloud/">KR Tools</a>
        <a href="/" className={pathname === '/' ? 'is-current' : ''}>길찾기 비교</a>
        <a href="/festival" className={pathname === '/festival' ? 'is-current' : ''}>전국 공연</a>
        <a href="https://carot-pc.krtools.cloud/daangn/quotes">PC 견적 비교</a>
        <a href="https://carot-pc.krtools.cloud/hospital">병원 검색</a>
      </div>
    </nav>
  );
}
