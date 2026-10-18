/**
 * «Generar las que faltan» y «Usar estas cartas» del modo «Generar con IA» (FEAT-50, US A4): lo que no
 * depende de la red, para probarlo solo.
 */

interface BatchCard {
  id: string;
  chosenAttemptId: string | null;
  attempts: readonly { id: string; path: string }[];
}

/** Cuántas a la vez (decidido con Carlos el 2026-10-17): rápido sin topar seguido con el límite de Replicate. */
export const AI_BATCH_CONCURRENCY = 8;

/** Cuando Replicate sigue ocupado tras los reintentos del servidor, la carta espera y se vuelve a pedir. */
export const AI_BUSY_RETRY_MS = 20_000;
export const AI_BUSY_RETRIES = 2;

/** Pide la carta y, si la respuesta es «ocupado» (AI_BUSY), espera y reintenta hasta 2 veces. */
export async function retryWhenBusy<R extends { ok: boolean; code?: string }>(
  request: () => Promise<R>,
  sleep: (ms: number) => Promise<void>,
): Promise<R> {
  let result = await request();
  for (let retry = 0; retry < AI_BUSY_RETRIES && !result.ok && result.code === 'AI_BUSY'; retry += 1) {
    await sleep(AI_BUSY_RETRY_MS);
    result = await request();
  }
  return result;
}

const chosenPath = (card: BatchCard): string | undefined =>
  card.attempts.find((attempt) => attempt.id === card.chosenAttemptId)?.path;

/** Las cartas que faltan: sin intento elegido y sin generarse ahora. Las que ya están no se tocan. */
export const cardsToGenerate = <T extends BatchCard>(cards: readonly T[], generating: ReadonlySet<string>): T[] =>
  cards.filter((card) => card.chosenAttemptId === null && !generating.has(card.id));

/**
 * Corre `worker` sobre cada elemento, con `limit` a la vez. Un fallo no detiene a los demás (cada carta
 * guarda su propio error); `shouldStop` deja de empezar trabajos nuevos.
 */
export async function runWithLimit<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
  shouldStop: () => boolean = () => false,
): Promise<void> {
  let next = 0;
  const lane = async () => {
    while (next < items.length && !shouldStop()) {
      const item = items[next];
      next += 1;
      await worker(item).catch(() => undefined);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}

/** Las cartas con intento elegido y su archivo, en el orden de la lista, y cuántas no tienen uno. */
export function cardsToUse<T extends BatchCard>(cards: readonly T[]): { items: { card: T; path: string }[]; missing: number } {
  const items = cards.flatMap((card) => {
    const path = chosenPath(card);
    return path ? [{ card, path }] : [];
  });
  return { items, missing: cards.length - items.length };
}
