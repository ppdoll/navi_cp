# Map Route Comparison Service

NestJS backend for comparing routes and travel time across Naver Maps, Kakao Navi, and TMAP.

## Quick start

```bash
npm install
npm run start:dev
```

## Environment

Create and fill the following files:

- `src/config/env/.local.env`
- `src/config/env/.live.env`

Required variables:

```env
PORT=3999
HTTP_TIMEOUT_MS=10000
DIRECTION_CACHE_TTL_SECONDS=60
NAVER_MAP_API_KEY_ID=your_key_id
NAVER_MAP_API_KEY=your_key
KAKAO_MAP_API_KEY=your_key
TMAP_API_KEY=your_key
```

## Endpoints

- `GET /health`
- `GET /directions/compare?origin=37.5665,126.9780&destination=37.3948,127.1112`
- `GET /search/places?query=yangcheon-ro 656`

`/directions/compare` response includes:
- `comparedAt`: ISO timestamp
- `summary.okCount`, `summary.failedCount`
- `summary.fastestProvider`, `summary.slowestProvider`
- `summary.spreadMinutes` (slowest - fastest)

## Notes

- `origin` and `destination` are sent as `latitude,longitude`.
- Route calls run in parallel and one provider failure does not break the others.
- Directions compare responses are cached in-memory for `DIRECTION_CACHE_TTL_SECONDS` (default: 60 seconds).
- Default official endpoints are built in for NAVER, Kakao Mobility, and TMAP, but you can override them with env vars when needed.
- Kakao Mobility driving directions requires affiliate permission on the REST API key.

## VS Code Debug

- Open this folder in VS Code and press `F5`.
- Use `Nest: Debug (npm start:debug)` for normal development debugging.
- Default debug env is `NODE_ENV=local`, `PORT=3010`.

## Frontend

- Frontend app path: `frontend`
- Set `frontend/.env.local` with:
  - `FRONTEND_PORT=3998`
  - `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3999`
- Run:
  - `cd frontend`
  - `npm install`
  - `npm run dev`

## Tests

- `npm test` for unit tests
- `npm run test:e2e` for e2e tests
