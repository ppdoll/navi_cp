#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_URL =
  'https://api.data.go.kr/openapi/tn_pubr_public_pblprfr_event_info_api';
const SERVICE_KEY =
  (process.env.PUBLIC_EVENT_API_KEY &&
    process.env.PUBLIC_EVENT_API_KEY.trim()) ||
  '18d9b856fdfa9b9d33e494e66cb981bd9ff4f7bbc61d281293ef8fdafec6fc52';

const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_LIMIT = 3;

const __filename = fileURLToPath(import.meta.url);
const FRONTEND_ROOT = path.resolve(path.dirname(__filename), '..');
const CACHE_PATH = path.join(FRONTEND_ROOT, 'data', 'festivals.json');

function describeError(error) {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause;
  if (cause instanceof Error) {
    const code = cause.code;
    return `${error.message} (cause: ${cause.message}${code ? ` / ${code}` : ''})`;
  }
  return error.message;
}

function pick(item, key) {
  const v = item ? item[key] : undefined;
  return typeof v === 'string' ? v.trim() : '';
}

function toFestival(item) {
  const eventNm = pick(item, 'eventNm');
  if (!eventNm) return null;
  const lat = Number(pick(item, 'latitude'));
  const lng = Number(pick(item, 'longitude'));
  const hasLocation =
    Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
  return {
    eventNm,
    opar: pick(item, 'opar'),
    eventCo: pick(item, 'eventCo'),
    eventStartDate: pick(item, 'eventStartDate'),
    eventEndDate: pick(item, 'eventEndDate'),
    eventStartTime: pick(item, 'eventStartTime'),
    eventEndTime: pick(item, 'eventEndTime'),
    chrgeInfo: pick(item, 'chrgeInfo'),
    mnnstNm: pick(item, 'mnnstNm'),
    auspcInsttNm: pick(item, 'auspcInsttNm'),
    phoneNumber: pick(item, 'phoneNumber'),
    admfee: pick(item, 'admfee'),
    entncAge: pick(item, 'entncAge'),
    dscntInfo: pick(item, 'dscntInfo'),
    homepageUrl: pick(item, 'homepageUrl'),
    rdnmadr: pick(item, 'rdnmadr'),
    lnmadr: pick(item, 'lnmadr'),
    insttNm: pick(item, 'insttNm'),
    latitude: hasLocation ? lat : null,
    longitude: hasLocation ? lng : null,
  };
}

function sanitizeJsonText(text) {
  return text.replace(/[\x00-\x1F\x7F]/g, ' ');
}

async function fetchPage(pageNo, attempt = 1) {
  const url = new URL(API_URL);
  url.searchParams.set('ServiceKey', SERVICE_KEY);
  url.searchParams.set('type', 'json');
  url.searchParams.set('pageNo', String(pageNo));
  url.searchParams.set('numOfRows', String(PAGE_SIZE));

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`festival api status=${response.status}`);
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return JSON.parse(sanitizeJsonText(text));
    }
  } catch (error) {
    if (attempt < RETRY_LIMIT) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return fetchPage(pageNo, attempt + 1);
    }
    throw new Error(`page ${pageNo} failed: ${describeError(error)}`);
  }
}

async function main() {
  const startedAt = Date.now();
  console.log(`[festival cache] start ${new Date().toISOString()}`);

  const first = await fetchPage(1);
  console.log('[festival cache] page 1 received');
  const totalCount = Number(first?.response?.body?.totalCount ?? 0);
  const totalPages = Math.min(
    MAX_PAGES,
    Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
  );

  const items = [];
  const warnings = [];
  const collect = (resp) => {
    for (const row of resp?.response?.body?.items ?? []) {
      const festival = toFestival(row);
      if (festival) items.push(festival);
    }
  };
  collect(first);

  for (let p = 2; p <= totalPages; p++) {
    try {
      const page = await fetchPage(p);
      collect(page);
      console.log(`[festival cache] page ${p}/${totalPages} received`);
    } catch (error) {
      warnings.push(describeError(error));
      console.warn(
        `[festival cache] page ${p}/${totalPages} FAILED:`,
        describeError(error),
      );
    }
  }

  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(
    CACHE_PATH,
    JSON.stringify({
      fetchedAt: new Date().toISOString(),
      totalCount,
      items,
      warnings,
    }),
    'utf8',
  );

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `[festival cache] wrote ${items.length} items to ${CACHE_PATH} in ${elapsed}s`,
  );
  if (warnings.length > 0) {
    console.warn(`[festival cache] warnings:`, warnings);
  }
}

main().catch((error) => {
  console.error('[festival cache] failed:', error?.message ?? error);
  process.exit(1);
});
