// Genera una carta de lotería temática con IA (FEAT-50, US A2 y A3). Solo administradores. Arma el prompt
// (general + número, nombre y escena), elige la imagen de entrada (baraja base, carta de referencia o
// ninguna), llama a openai/gpt-image-2 en Replicate, guarda la imagen en el espacio privado
// `seasonal-ai`, la registra como intento elegido de la carta y le deja solo sus últimos 5 intentos. No
// descuenta tokens (decisión del 2026-10-17): el costo lo paga la cuenta de Replicate.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders, parseAllowedOrigins } from '../_shared/cors.ts';
import { createPrediction, firstOutput, waitForPrediction, type ReplicateDeps } from '../_shared/replicate.ts';
import { assertPredictionSucceeded } from '../_shared/transform.ts';
import {
  attemptPath,
  attemptsToPrune,
  buildSeasonalCardPrediction,
  buildSeasonalCardPrompt,
  parseGenerateCardRequest,
  SEASONAL_CARD_MODEL_PATH,
  seasonalCardErrorResponse,
  type SeasonalCardQuality,
} from '../_shared/seasonalCard.ts';

const ATTEMPTS_BUCKET = 'seasonal-ai';
const BASE_DECK_BUCKET = 'base-deck';
/** Lo que Replicate tiene para bajar la imagen de entrada. */
const INPUT_LINK_SECONDS = 10 * 60;
/** Por debajo del tope de tiempo de una función de Supabase (150 s). */
const WAIT = { timeoutMs: 140_000, intervalMs: 3000 };

const replicateDeps: ReplicateDeps = {
  fetchFn: fetch,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

interface CardRow {
  id: string;
  loteria_id: string;
  number: number;
  name: string;
  scene: string;
  input_source: 'base' | 'reference' | 'none';
  chosen_attempt_id: string | null;
}

interface BuildRow {
  general_prompt: string;
  quality: SeasonalCardQuality;
  reference_card_id: string | null;
}

async function requireAdmin(admin: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await admin.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(`admin_users: ${error.message}`);
  if (!data) throw new Error('NOT_ADMIN');
}

async function loadCard(admin: SupabaseClient, cardId: string): Promise<{ card: CardRow; build: BuildRow }> {
  const { data: card, error } = await admin
    .from('seasonal_ai_cards')
    .select('id, loteria_id, number, name, scene, input_source, chosen_attempt_id')
    .eq('id', cardId)
    .maybeSingle();
  if (error) throw new Error(`seasonal_ai_cards: ${error.message}`);
  if (!card) throw new Error('CARD_NOT_FOUND');
  const { data: build, error: buildError } = await admin
    .from('seasonal_ai_builds')
    .select('general_prompt, quality, reference_card_id')
    .eq('loteria_id', card.loteria_id)
    .single();
  if (buildError) throw new Error(`seasonal_ai_builds: ${buildError.message}`);
  if ((build.general_prompt as string).trim() === '') throw new Error('PROMPT_MISSING');
  return { card: card as CardRow, build: build as BuildRow };
}

async function signed(admin: SupabaseClient, bucket: string, path: string, missing: string): Promise<string> {
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, INPUT_LINK_SECONDS);
  if (error || !data?.signedUrl) throw new Error(missing);
  return data.signedUrl;
}

/** La imagen de entrada como dirección temporal, o null si la carta se genera solo con el prompt. */
async function resolveInputImage(admin: SupabaseClient, card: CardRow, build: BuildRow): Promise<string | null> {
  if (card.input_source === 'none') return null;
  if (card.input_source === 'base') return signed(admin, BASE_DECK_BUCKET, String(card.number), 'BASE_CARD_MISSING');
  if (!build.reference_card_id) throw new Error('REFERENCE_MISSING');
  const { data: reference } = await admin
    .from('seasonal_ai_cards')
    .select('chosen_attempt_id, seasonal_ai_attempts!seasonal_ai_cards_chosen_attempt_fkey(path)')
    .eq('id', build.reference_card_id)
    .maybeSingle();
  const path = (reference?.seasonal_ai_attempts as { path?: string } | null)?.path;
  if (!path) throw new Error('REFERENCE_MISSING');
  return signed(admin, ATTEMPTS_BUCKET, path, 'REFERENCE_MISSING');
}

/** Baja la imagen de Replicate, la guarda y la deja como el intento elegido de la carta. */
async function storeAttempt(admin: SupabaseClient, card: CardRow, outputUrl: string, quality: SeasonalCardQuality, prompt: string) {
  const image = await fetch(outputUrl);
  if (!image.ok) throw new Error(`descarga del resultado (${image.status})`);
  const attemptId = crypto.randomUUID();
  const path = attemptPath(card.loteria_id, card.id, attemptId);
  const { error: uploadError } = await admin.storage
    .from(ATTEMPTS_BUCKET)
    .upload(path, await image.arrayBuffer(), { contentType: 'image/webp' });
  if (uploadError) throw new Error(`subida del intento: ${uploadError.message}`);
  const { error: insertError } = await admin
    .from('seasonal_ai_attempts')
    .insert({ id: attemptId, card_id: card.id, path, quality, prompt });
  if (insertError) throw new Error(`seasonal_ai_attempts: ${insertError.message}`);
  const { error: chooseError } = await admin.from('seasonal_ai_cards').update({ chosen_attempt_id: attemptId }).eq('id', card.id);
  if (chooseError) throw new Error(`elegir intento: ${chooseError.message}`);
  const prunedIds = await pruneAttempts(admin, card, attemptId);
  return { attempt: { id: attemptId, path, quality }, prunedIds };
}

/**
 * Deja cada carta con sus últimos 5 intentos (US A3): borra los más viejos, nunca el que estaba elegido
 * antes de rehacer ni el nuevo. Si falla, el intento nuevo ya quedó: se avisa en el registro y se sigue.
 */
async function pruneAttempts(admin: SupabaseClient, card: CardRow, newAttemptId: string): Promise<string[]> {
  const { data, error } = await admin
    .from('seasonal_ai_attempts')
    .select('id, path')
    .eq('card_id', card.id)
    .order('created_at');
  if (error) {
    console.error('generate-seasonal-card: no se pudieron revisar los intentos', error.message);
    return [];
  }
  const rows = data as { id: string; path: string }[];
  const protectedIds = [newAttemptId, ...(card.chosen_attempt_id ? [card.chosen_attempt_id] : [])];
  const prunedIds = attemptsToPrune(rows.map((row) => row.id), protectedIds);
  if (prunedIds.length === 0) return [];
  const { error: deleteError } = await admin.from('seasonal_ai_attempts').delete().in('id', prunedIds);
  if (deleteError) {
    console.error('generate-seasonal-card: no se pudieron borrar intentos viejos', deleteError.message);
    return [];
  }
  const paths = rows.filter((row) => prunedIds.includes(row.id)).map((row) => row.path);
  const { error: removeError } = await admin.storage.from(ATTEMPTS_BUCKET).remove(paths);
  if (removeError) console.error('generate-seasonal-card: archivos de intentos huérfanos', paths, removeError.message);
  return prunedIds;
}

Deno.serve(async (req) => {
  const headers = buildCorsHeaders(req.headers.get('Origin'), parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS')));
  const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { error: 'INVALID_REQUEST', message: 'Método no permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  const replicateToken = Deno.env.get('REPLICATE_API_TOKEN');
  if (!serviceRoleKey || !replicateToken) {
    console.error('generate-seasonal-card: falta SERVICE_ROLE_KEY o REPLICATE_API_TOKEN');
    return reply(500, { error: 'CONFIG_ERROR', message: 'Servicio de IA no configurado.' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return reply(401, { error: 'NOT_LOGGED_IN', message: 'Se requiere autenticación.' });
  const { data: { user }, error: userError } = await createClient(supabaseUrl, anonKey)
    .auth.getUser(authHeader.replace('Bearer ', '').trim());
  if (userError || !user) return reply(401, { error: 'NOT_LOGGED_IN', message: 'Sesión inválida o expirada.' });

  const parsed = parseGenerateCardRequest(await req.json().catch(() => null));
  if (!parsed.ok) return reply(400, { error: 'INVALID_REQUEST', message: parsed.message });

  const admin = createClient(supabaseUrl, serviceRoleKey);
  try {
    await requireAdmin(admin, user.id);
    const { card, build } = await loadCard(admin, parsed.value.cardId);
    const prompt = buildSeasonalCardPrompt(build.general_prompt, card);
    const inputImage = await resolveInputImage(admin, card, build);
    const body = buildSeasonalCardPrediction(prompt, build.quality, inputImage);
    const created = await createPrediction(replicateDeps, replicateToken, body, 3, SEASONAL_CARD_MODEL_PATH);
    const finished = await waitForPrediction(replicateDeps, replicateToken, created, WAIT);
    assertPredictionSucceeded(finished);
    const stored = await storeAttempt(admin, card, firstOutput(finished), build.quality, prompt);
    return reply(200, stored);
  } catch (err) {
    const response = seasonalCardErrorResponse(err);
    if (response.internal) console.error('generate-seasonal-card:', err);
    return reply(response.status, response.body);
  }
});
