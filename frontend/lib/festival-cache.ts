import 'server-only';
import fs from 'fs';
import path from 'path';

export type CachedFestivalItem = {
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

export type CachePayload = {
  fetchedAt: string;
  totalCount: number;
  items: CachedFestivalItem[];
  warnings: string[];
};

const API_URL =
  'https://api.data.go.kr/openapi/tn_pubr_public_pblprfr_event_info_api';

const SERVICE_KEY =
  process.env.PUBLIC_EVENT_API_KEY?.trim() ||
  '18d9b856fdfa9b9d33e494e66cb981bd9ff4f7bbc61d281293ef8fdafec6fc52';

const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_LIMIT = 3;

// process.cwd() is the Next.js project root in both dev and Vercel runtime
export const CACHE_PATH = path.join(process.cwd(), 'data', 'festivals.json');

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = (error as { cause?: unknown }).cause;
  if (cause instanceof Error) {
    const code = (cause as { code?: string }).code;
    return `${error.message} (cause: ${cause.message}${code ? ` / ${code}` : ''})`;
  }
  return error.message;
}

function pick(item: Record<string, unknown> | null | undefined, key: string): string {
  const v = item ? item[key] : undefined;
  return typeof v === 'string' ? v.trim() : '';
}

function toFestival(item: Record<string, unknown>): CachedFestivalItem | null {
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

function sanitizeJsonText(text: string): string {
  return text.replace(/[\x00-\x1F\x7F]/g, ' ');
}

type ApiResponse = {
  response?: {
    body?: {
      items?: Array<Record<string, unknown>>;
      totalCount?: string | number;
    };
  };
};

async function fetchPage(pageNo: number, attempt = 1): Promise<ApiResponse> {
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
      return JSON.parse(text) as ApiResponse;
    } catch {
      return JSON.parse(sanitizeJsonText(text)) as ApiResponse;
    }
  } catch (error) {
    if (attempt < RETRY_LIMIT) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return fetchPage(pageNo, attempt + 1);
    }
    throw new Error(`page ${pageNo} failed: ${describeError(error)}`);
  }
}

export type ProgressCallback = (
  page: number,
  totalPages: number | null,
) => void;

export async function fetchAllFestivals(
  onProgress?: ProgressCallback,
): Promise<{
  items: CachedFestivalItem[];
  warnings: string[];
  totalCount: number;
  totalPages: number;
}> {
  const first = await fetchPage(1);
  onProgress?.(1, null);

  const totalCount = Number(first.response?.body?.totalCount ?? 0);
  const totalPages = Math.min(
    MAX_PAGES,
    Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
  );

  const items: CachedFestivalItem[] = [];
  const warnings: string[] = [];
  const collect = (resp: ApiResponse) => {
    const rows = resp.response?.body?.items ?? [];
    for (const row of rows) {
      const festival = toFestival(row);
      if (festival) items.push(festival);
    }
  };
  collect(first);

  for (let p = 2; p <= totalPages; p++) {
    try {
      const page = await fetchPage(p);
      collect(page);
      onProgress?.(p, totalPages);
    } catch (error) {
      warnings.push(describeError(error));
      onProgress?.(p, totalPages);
    }
  }

  return { items, warnings, totalCount, totalPages };
}

export function readCache(): CachePayload | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const buf = fs.readFileSync(CACHE_PATH, 'utf8');
    const parsed = JSON.parse(buf) as CachePayload;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCache(payload: CachePayload): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(payload), 'utf8');
  } catch {
    // Vercel runtime filesystem is read-only; cache lives in memory only
  }
}

let pendingBootstrap: Promise<CachePayload> | null = null;

export async function ensureCache(options?: {
  onProgress?: ProgressCallback;
}): Promise<CachePayload> {
  const existing = readCache();
  if (existing) return existing;

  if (!pendingBootstrap) {
    pendingBootstrap = (async () => {
      const result = await fetchAllFestivals(options?.onProgress);
      const payload: CachePayload = {
        fetchedAt: new Date().toISOString(),
        totalCount: result.totalCount,
        items: result.items,
        warnings: result.warnings,
      };
      writeCache(payload);
      return payload;
    })().finally(() => {
      pendingBootstrap = null;
    });
  }
  return pendingBootstrap;
}
