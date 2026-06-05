# 인형뽑기 성지 — 주소 목록

## 페이지

| 경로 | 설명 |
|------|------|
| `/` | 메인 지도 + 매장 목록 사이드바 (검색 포함) |
| `/spot/new` | 매장 등록 (지도 클릭으로 위치 선택) |
| `/spot/[id]` | 매장 상세 (정보 카드, 별점 분포, 후기 목록) |
| `/spot/[id]/edit` | 수정 요청 (현재 데이터 미리채움, 관리자 검토 후 반영) |
| `/spot/[id]/review` | 후기 작성 (별점, 몇 판, 인형 종류, 코멘트) |
| `/spot/[id]/report` | 매장 신고 |
| `/spot/[id]/report?reviewId=[reviewId]` | 특정 후기 신고 |
| `/admin` | 관리자 대시보드 (비밀번호 로그인 필요, 비공개) |

---

## API

### 매장

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/spots` | 전체 매장 목록 |
| `POST` | `/api/spots` | 매장 등록 |
| `GET` | `/api/spots/[id]` | 매장 상세 + 리뷰 목록 |
| `POST` | `/api/spots/[id]/reviews` | 후기 등록 |
| `POST` | `/api/spots/[id]/edit-requests` | 수정 요청 제출 |
| `POST` | `/api/spots/[id]/report` | 매장 신고 |

### 후기

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/reviews/[id]/report` | 후기 신고 |

### 관리자 (인증 필요)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/admin/login` | 로그인 (쿠키 발급) |
| `DELETE` | `/api/admin/login` | 로그아웃 |
| `GET` | `/api/admin/edit-requests` | 수정 요청 목록 |
| `PATCH` | `/api/admin/edit-requests/[id]` | 수정 요청 승인/거절 |
| `GET` | `/api/admin/reports` | 신고 목록 |
| `PATCH` | `/api/admin/reports/[id]` | 신고 처리/무시 (+ 삭제 옵션) |

---

## 환경 변수

| 키 | 기본값 | 설명 |
|----|--------|------|
| `DATABASE_URL` | `file:./prisma/dev.db` | SQLite 경로 (PostgreSQL 교체 가능) |
| `ADMIN_PASSWORD` | `admin1234` | `/admin` 페이지 비밀번호 |

---

## 로컬 실행

```bash
cd spot-map
cp .env.example .env   # 환경 변수 설정
npx prisma migrate dev # DB 초기화 (최초 1회)
npm run dev            # http://localhost:3000
```
