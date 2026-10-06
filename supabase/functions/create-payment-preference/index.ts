import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { pickInitPoint, resolveAppUrl, resolveCheckoutMode } from '../_shared/checkout.ts';
import { buildCorsHeaders, parseAllowedOrigins } from '../_shared/cors.ts';
import { buildPreference, resolvePurchaseItem, type PackRow } from '../_shared/preference.ts';
import { selectPromotion, type PromotionRow } from '../_shared/promotions.ts';
import { parsePreferenceRequest } from '../_shared/validation.ts';

const MERCADOPAGO_API_BASE = 'https://api.mercadopago.com';
const DEFAULT_APP_URL = 'https://chorroybuenas.com.mx';

Deno.serve(async (req) => {
  const allowedOrigins = parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'));
  const headers = buildCorsHeaders(req.headers.get('Origin'), allowedOrigins);
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { error: 'INVALID_REQUEST', message: 'Método no permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  if (!serviceRoleKey || !mpAccessToken) {
    console.error('create-payment-preference: falta SERVICE_ROLE_KEY o MERCADOPAGO_ACCESS_TOKEN');
    return reply(500, { error: 'CONFIG_ERROR', message: 'Error de configuración del servidor.' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Inicia sesión para comprar tokens.' });
  }
  const { data: { user }, error: userError } = await createClient(supabaseUrl, anonKey)
    .auth.getUser(authHeader.replace('Bearer ', '').trim());
  if (userError || !user) {
    console.error('create-payment-preference: sesión inválida', userError?.message);
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Sesión inválida o expirada. Inicia sesión nuevamente.' });
  }

  const parsed = parsePreferenceRequest(await req.json().catch(() => null));
  if (!parsed.ok) return reply(400, { error: 'INVALID_REQUEST', message: parsed.message });
  const { packId, customTokens, promoCode, appUrl: requestedAppUrl } = parsed.value;

  try {
    // Service role: las lecturas no dependen de RLS (token_purchases solo es visible para su
    // dueño, y con el cliente anon sin JWT de usuario toda compra parecía la primera).
    const admin = createClient(supabaseUrl, serviceRoleKey);

    let pack: PackRow | null = null;
    let pricePerTokenCents: number | null = null;
    if (packId) {
      const { data, error } = await admin
        .from('token_packs')
        .select('id, base_tokens, bonus_tokens, price_cents')
        .eq('id', packId)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw new Error(`token_packs: ${error.message}`);
      if (!data) return reply(400, { error: 'INVALID_PACK', message: 'Pack no encontrado o inactivo.' });
      pack = data as PackRow;
    } else {
      const { data, error } = await admin
        .from('token_pricing')
        .select('price_per_token_cents')
        .eq('currency', 'MXN')
        .maybeSingle();
      if (error) throw new Error(`token_pricing: ${error.message}`);
      pricePerTokenCents = data?.price_per_token_cents ?? null;
    }

    const item = resolvePurchaseItem({ pack, customTokens, pricePerTokenCents });
    if (!item.ok) {
      console.error('create-payment-preference: compra inválida', item.message);
      return reply(400, { error: 'INVALID_AMOUNT', message: item.message });
    }

    const { data: purchases, error: purchasesError } = await admin
      .from('token_purchases')
      .select('promotion_ids')
      .eq('user_id', user.id);
    if (purchasesError) throw new Error(`token_purchases: ${purchasesError.message}`);

    const { data: promos, error: promosError } = await admin
      .from('promotions')
      .select('id, code, type, config, valid_from, valid_until, is_active');
    if (promosError) throw new Error(`promotions: ${promosError.message}`);

    const promotion = selectPromotion({
      promos: (promos ?? []) as PromotionRow[],
      promoCode,
      isFirstPurchase: (purchases ?? []).length === 0,
      usedPromotionIds: (purchases ?? []).flatMap((p) => (p.promotion_ids ?? []) as string[]),
      now: new Date(),
    });

    const mode = resolveCheckoutMode(Deno.env.get('MP_USE_SANDBOX_CHECKOUT'));
    const preference = buildPreference({
      item: item.value,
      promotion,
      userId: user.id,
      userEmail: user.email ?? null,
      appUrl: resolveAppUrl(requestedAppUrl, allowedOrigins, Deno.env.get('APP_URL') || DEFAULT_APP_URL),
      mode,
      notificationUrl: `${supabaseUrl}/functions/v1/webhook-mercadopago`,
    });

    let mpResponse: Response;
    try {
      mpResponse = await fetch(`${MERCADOPAGO_API_BASE}/checkout/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mpAccessToken}` },
        body: JSON.stringify(preference),
      });
    } catch (error) {
      console.error('create-payment-preference: error de red con MP', error);
      return reply(502, { error: 'NETWORK_ERROR', message: 'Error de conexión con Mercado Pago.' });
    }

    const responseText = await mpResponse.text();
    if (!mpResponse.ok) {
      console.error('create-payment-preference: error MP', mpResponse.status, responseText.slice(0, 500));
      return reply(502, { error: 'MP_ERROR', message: 'Mercado Pago rechazó la solicitud. Intenta de nuevo.' });
    }

    let mpData: { id?: string; init_point?: string; sandbox_init_point?: string };
    try {
      mpData = JSON.parse(responseText);
    } catch (error) {
      console.error('create-payment-preference: respuesta MP no es JSON', error);
      return reply(502, { error: 'MP_ERROR', message: 'Respuesta inválida de Mercado Pago.' });
    }

    const initPoint = pickInitPoint(mode, mpData);
    if (!initPoint) {
      console.error('create-payment-preference: MP no devolvió init_point');
      return reply(502, { error: 'MP_ERROR', message: 'No se recibió URL de pago.' });
    }

    return reply(200, { success: true, init_point: initPoint, payment_id: mpData.id ?? '' });
  } catch (err) {
    console.error('create-payment-preference:', err);
    return reply(500, { error: 'INTERNAL', message: 'No se pudo preparar la compra. Intenta de nuevo.' });
  }
});
