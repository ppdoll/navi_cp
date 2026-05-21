import { ensureCache } from '../../lib/festival-cache';
import FestivalClient, { FestivalItem } from './festival-client';

export const dynamic = 'force-dynamic';

function todayKstIso(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = (error as { cause?: unknown }).cause;
  if (cause instanceof Error) {
    const code = (cause as { code?: string }).code;
    return `${error.message} (cause: ${cause.message}${code ? ` / ${code}` : ''})`;
  }
  return error.message;
}

export default async function FestivalPage() {
  let items: FestivalItem[] = [];
  let fetchedAt: string | null = null;
  let loadError: string | null = null;

  try {
    const payload = await ensureCache();
    items = payload.items as FestivalItem[];
    fetchedAt = payload.fetchedAt;
    if (payload.warnings && payload.warnings.length > 0) {
      loadError = `일부 페이지 로드 실패: ${payload.warnings[0]}`;
    }
  } catch (error) {
    loadError = describeError(error);
    console.error('[festival page] load failed:', loadError);
  }

  const today = todayKstIso();
  const upcoming = items
    .filter((item) => !item.eventEndDate || item.eventEndDate >= today)
    .sort((a, b) => a.eventStartDate.localeCompare(b.eventStartDate));

  return (
    <FestivalClient
      items={upcoming}
      totalCount={items.length}
      today={today}
      fetchedAt={fetchedAt}
      loadError={loadError}
    />
  );
}
