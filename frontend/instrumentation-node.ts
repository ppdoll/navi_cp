import { readCache, ensureCache } from './lib/festival-cache';

if (readCache()) {
  console.log('[festival bootstrap] cache present, skip');
} else {
  console.log('[festival bootstrap] no cache, kicking off background fetch');
  ensureCache({
    onProgress: (page, total) => {
      if (total == null) {
        console.log('[festival bootstrap] page 1 received');
      } else {
        console.log(`[festival bootstrap] page ${page}/${total} received`);
      }
    },
  })
    .then((payload) => {
      console.log(
        `[festival bootstrap] cached ${payload.items.length} items at ${payload.fetchedAt}`,
      );
    })
    .catch((error) => {
      console.error(
        '[festival bootstrap] failed:',
        error instanceof Error ? error.message : error,
      );
    });
}
