const REPLICATE_API_BASE = 'https://api.replicate.com/v1';
const MAX_RETRY_WAIT_MS = 30_000;
const DEFAULT_RETRY_WAIT_S = 10;

export interface Prediction {
  id: string;
  status: string;
  output?: string | string[] | null;
  error?: string | null;
  logs?: string | null;
}

/** Red y reloj inyectados para poder probar los topes sin esperar de verdad. */
export interface ReplicateDeps {
  fetchFn: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

const TERMINAL = new Set(['succeeded', 'failed', 'canceled']);

/** Crea una predicción. Ante 429 reintenta hasta maxRetries veces y luego lanza AI_BUSY. */
export async function createPrediction(
  deps: ReplicateDeps,
  apiKey: string,
  body: Record<string, unknown>,
  maxRetries = 3,
): Promise<Prediction> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await deps.fetchFn(`${REPLICATE_API_BASE}/predictions`, {
      method: 'POST',
      headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      if (attempt === maxRetries) break;
      const err = await res.json().catch(() => ({}));
      const seconds = typeof err.retry_after === 'number' ? err.retry_after : DEFAULT_RETRY_WAIT_S;
      await deps.sleep(Math.min(seconds * 1000, MAX_RETRY_WAIT_MS));
      continue;
    }

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(`Replicate API (${res.status}): ${json.detail ?? res.statusText}`);
    }

    return (await res.json()) as Prediction;
  }
  throw new Error('AI_BUSY');
}

/** Espera a que la predicción termine. Al exceder el tope la cancela y lanza AI_TIMEOUT. */
export async function waitForPrediction(
  deps: ReplicateDeps,
  apiKey: string,
  initial: Prediction,
  opts: { timeoutMs: number; intervalMs: number } = { timeoutMs: 120_000, intervalMs: 3000 },
): Promise<Prediction> {
  const startedAt = deps.now();
  let prediction = initial;

  while (!TERMINAL.has(prediction.status)) {
    if (deps.now() - startedAt >= opts.timeoutMs) {
      // Cancelar para que Replicate deje de facturar la predicción abandonada.
      await deps.fetchFn(`${REPLICATE_API_BASE}/predictions/${prediction.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Token ${apiKey}` },
      }).catch(() => undefined);
      throw new Error('AI_TIMEOUT');
    }
    await deps.sleep(opts.intervalMs);
    const res = await deps.fetchFn(`${REPLICATE_API_BASE}/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Replicate poll (${res.status})`);
    prediction = (await res.json()) as Prediction;
  }

  return prediction;
}

export function firstOutput(p: Prediction): string {
  const out = Array.isArray(p.output) ? p.output[0] : p.output;
  if (typeof out !== 'string' || out.length === 0) throw new Error('AI_EMPTY_OUTPUT');
  return out;
}

/**
 * Cobra antes de ejecutar y reembolsa si la ejecución falla. Si el reembolso también falla
 * se avisa por onRefundError y se relanza el error original (el cobro queda para revisión manual).
 */
export async function runCharged<T>(ops: {
  spend: () => Promise<string>;
  refund: (usageId: string) => Promise<void>;
  run: () => Promise<T>;
  onRefundError?: (usageId: string, error: unknown) => void;
}): Promise<T> {
  const usageId = await ops.spend();
  try {
    return await ops.run();
  } catch (runError) {
    try {
      await ops.refund(usageId);
    } catch (refundError) {
      ops.onRefundError?.(usageId, refundError);
    }
    throw runError;
  }
}
