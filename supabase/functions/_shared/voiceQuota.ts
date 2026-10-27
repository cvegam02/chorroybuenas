import { renderEmail } from './email.ts';

/**
 * Cupo mensual de ElevenLabs para la voz con IA del cantador (FEAT-58, US A4, decisión 11): antes de cobrar se
 * revisa que alcance para la lotería, y al bajar del 20 % se avisa al administrador, una vez por periodo.
 */

/** Medido el 2026-10-26 con el historial de ElevenLabs: ~26 créditos por carta (con la indicación de tono). */
export const CREDITS_PER_CARD = 26;
/** La frase de arranque, ~48 créditos. */
export const INTRO_CREDITS = 50;
/** Por debajo de esta parte del cupo se avisa al administrador. */
const LOW_QUOTA_SHARE = 0.2;

export interface Subscription {
  used: number;
  limit: number;
  /** El periodo de facturación (cuándo se reinicia el cupo): una alerta por periodo. */
  period: string;
}

/** Lee `GET /v1/user/subscription` de ElevenLabs; null si la respuesta no trae lo que hace falta. */
export function parseSubscription(body: unknown): Subscription | null {
  if (typeof body !== 'object' || body === null) return null;
  const raw = body as Record<string, unknown>;
  const used = raw.character_count;
  const limit = raw.character_limit;
  if (typeof used !== 'number' || typeof limit !== 'number') return null;
  return { used, limit, period: String(raw.next_character_count_reset_unix ?? 'sin-periodo') };
}

/** Créditos que pide generar `cards` cartas, más la frase de arranque si no está ya compartida. */
export function creditsFor(cards: number, withIntro: boolean): number {
  return Math.max(0, cards) * CREDITS_PER_CARD + (withIntro ? INTRO_CREDITS : 0);
}

export interface VoiceQuotaDeps {
  /** null si ElevenLabs no respondió. */
  fetchSubscription: () => Promise<Subscription | null>;
  /** true si es la primera alerta del periodo. */
  claimAlert: (period: string) => Promise<boolean>;
  releaseAlert: (period: string) => Promise<void>;
  sendAlert: (subscription: Subscription) => Promise<void>;
  log: (message: string, err: unknown) => void;
}

/** Lanza VOICE_UNAVAILABLE si el cupo no alcanza para `credits` (o no se pudo consultar); entonces no se cobra. */
export async function ensureVoiceQuota(deps: VoiceQuotaDeps, credits: number): Promise<void> {
  const subscription = await deps.fetchSubscription();
  if (!subscription) throw new Error('VOICE_UNAVAILABLE');
  const remaining = subscription.limit - subscription.used;
  if (remaining - credits < subscription.limit * LOW_QUOTA_SHARE) await alertOnce(deps, subscription);
  if (remaining < credits) throw new Error('VOICE_UNAVAILABLE');
}

/** La alerta no detiene al usuario: si el correo falla, se libera la marca para intentarlo la próxima vez. */
async function alertOnce(deps: VoiceQuotaDeps, subscription: Subscription): Promise<void> {
  try {
    if (!(await deps.claimAlert(subscription.period))) return;
  } catch (err) {
    deps.log('caller-voice: no se pudo marcar la alerta de cupo', err);
    return;
  }
  try {
    await deps.sendAlert(subscription);
  } catch (err) {
    deps.log('caller-voice: no se envió la alerta de cupo', err);
    await deps.releaseAlert(subscription.period).catch((e) => deps.log('caller-voice: no se liberó la alerta', e));
  }
}

const formatNumber = (n: number) => n.toLocaleString('en-US');

/** El correo al administrador (§13): cuánto queda del cupo de la voz con IA. */
export function buildQuotaAlertEmail(subscription: Subscription) {
  const remaining = Math.max(0, subscription.limit - subscription.used);
  const lotteries = Math.floor(remaining / creditsFor(54, true));
  return {
    subject: 'Queda poco cupo de la voz con IA',
    ...renderEmail({
      title: 'Queda poco cupo de la voz con IA',
      greeting: 'Hola:',
      paragraphs: [
        `Quedan **${formatNumber(remaining)} de ${formatNumber(subscription.limit)} créditos** de ElevenLabs este periodo, menos del 20 %.`,
        `Alcanzan para unas ${lotteries} loterías de 54 cartas. Cuando no alcance para una lotería, el sitio deja de cobrar la voz con IA y dice que no está disponible.`,
        'Para no quedarte sin voz, revisa el plan en el panel de ElevenLabs. Recibirás una sola alerta por periodo.',
      ],
    }),
  };
}
