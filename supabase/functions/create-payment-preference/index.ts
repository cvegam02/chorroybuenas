import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const MERCADOPAGO_API_BASE = 'https://api.mercadopago.com';

interface RequestBody {
  pack_id?: string;
  custom_tokens?: number;
  /** Código de promoción opcional (ej. VERANO2025) */
  promo_code?: string;
  /** URL base de la app para back_urls; el frontend la envía desde VITE_APP_URL (.env). */
  app_url?: string;
}

interface PromotionRow {
  id: string;
  code: string | null;
  type: string;
  config: { percent?: number };
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

function isPromoValid(p: PromotionRow): boolean {
  if (!p.is_active) return false;
  const now = new Date();
  if (p.valid_from && new Date(p.valid_from) > now) return false;
  if (p.valid_until && new Date(p.valid_until) < now) return false;
  return true;
}

function getPercentFromPromo(p: PromotionRow): number {
  const percent = p.config?.percent;
  return typeof percent === 'number' && percent >= 1 && percent <= 100 ? Math.round(percent) : 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({
        error: 'NOT_LOGGED_IN',
        message: 'Solo usuarios registrados y logueados pueden realizar compras de tokens.',
      }),
      { status: 401, headers: corsHeaders }
    );
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    console.error('create-payment-preference: usuario inválido', userError?.message);
    return new Response(
      JSON.stringify({
        error: 'NOT_LOGGED_IN',
        message: userError?.message || 'Sesión inválida o expirada. Por favor, inicia sesión nuevamente.',
      }),
      { status: 401, headers: corsHeaders }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch (e) {
    console.error('create-payment-preference: body inválido', e);
    return new Response(
      JSON.stringify({ error: 'INVALID_REQUEST', message: 'Body inválido.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const { pack_id, custom_tokens, promo_code, app_url: bodyAppUrl } = body;

  if (!pack_id && !custom_tokens) {
    return new Response(
      JSON.stringify({ error: 'INVALID_REQUEST', message: 'Debes proporcionar pack_id o custom_tokens.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  if (custom_tokens && (custom_tokens < 1 || custom_tokens > 500)) {
    return new Response(
      JSON.stringify({ error: 'INVALID_REQUEST', message: 'custom_tokens debe estar entre 1 y 500.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const { data: pricing, error: pricingError } = await supabase
    .from('token_pricing')
    .select('price_per_token_cents')
    .eq('currency', 'MXN')
    .maybeSingle();

  if (pricingError) {
    console.error('Error token_pricing:', pricingError);
  }
  const pricePerTokenCents = pricing?.price_per_token_cents ?? 200;

  // Calcular monto y tokens
  let baseTokens: number;
  let bonusTokens: number;
  let amountCents: number;
  let packId: string | null = null;

  if (pack_id) {
    const { data: pack, error: packError } = await supabase
      .from('token_packs')
      .select('id, base_tokens, bonus_tokens, price_cents')
      .eq('id', pack_id)
      .eq('is_active', true)
      .maybeSingle();

    if (packError || !pack) {
      console.error('Pack no encontrado o error:', packError, 'pack:', pack);
      return new Response(
        JSON.stringify({ error: 'INVALID_PACK', message: 'Pack no encontrado o inactivo.' }),
        { status: 400, headers: corsHeaders }
      );
    }

    baseTokens = pack.base_tokens;
    bonusTokens = pack.bonus_tokens;
    amountCents = pack.price_cents;
    packId = pack.id;
  } else {
    baseTokens = custom_tokens!;
    bonusTokens = 0;
    amountCents = baseTokens * pricePerTokenCents;
  }

  const { count: purchaseCount } = await supabase
    .from('token_purchases')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const isFirstPurchase = (purchaseCount ?? 0) === 0;

  // Obtener promociones activas y vigentes
  const { data: allPromos } = await supabase
    .from('promotions')
    .select('id, code, type, config, valid_from, valid_until, is_active');
  const validPromos = (allPromos ?? []).filter((p) => isPromoValid(p as PromotionRow));

  let promotionBonus = 0;
  let percentToApply = 0;

  // Prioridad 1: código de promoción si el usuario lo envía
  const codeToCheck = typeof promo_code === 'string' ? promo_code.trim().toUpperCase() : null;
  if (codeToCheck) {
    const codePromo = validPromos.find(
      (p) => p.type === 'code' && p.code?.toUpperCase() === codeToCheck
    ) as PromotionRow | undefined;
    if (codePromo) {
      percentToApply = getPercentFromPromo(codePromo);
    }
  }

  // Prioridad 2: primera compra (si no hay código válido)
  if (percentToApply === 0 && isFirstPurchase) {
    const firstPromo = validPromos.find((p) => p.type === 'first_purchase') as PromotionRow | undefined;
    if (firstPromo) {
      percentToApply = getPercentFromPromo(firstPromo);
    }
  }

  if (percentToApply > 0) {
    promotionBonus = Math.floor(baseTokens * (percentToApply / 100));
  }

  const totalTokens = baseTokens + bonusTokens + promotionBonus;

  // Validar que el monto sea válido
  if (amountCents <= 0) {
    console.error('Monto inválido:', amountCents);
    return new Response(
      JSON.stringify({ error: 'INVALID_AMOUNT', message: 'El monto de la compra debe ser mayor a cero.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Validar que el precio unitario sea válido (MP requiere mínimo 0.01)
  const unitPrice = amountCents / 100;
  if (unitPrice < 0.01) {
    console.error('Precio unitario inválido:', unitPrice);
    return new Response(
      JSON.stringify({ error: 'INVALID_AMOUNT', message: 'El precio debe ser al menos $0.01 MXN.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  if (!mpAccessToken) {
    console.error('create-payment-preference: MERCADOPAGO_ACCESS_TOKEN no configurado');
    return new Response(
      JSON.stringify({ error: 'CONFIG_ERROR', message: 'Error de configuración del servidor.' }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Validar formato del token (test y producción de MP usan prefijo APP_USR-)
  if (!mpAccessToken.startsWith('APP_USR-')) {
    console.warn('Token de Mercado Pago no tiene el formato esperado (APP_USR-...).');
  }

  // URL base para back_urls: la envía el frontend desde VITE_APP_URL (.env). Si no viene o no es válida, se usa APP_URL (Supabase) o fallback.
  const isValidAppUrl = (u: unknown): u is string =>
    typeof u === 'string' && u.length > 0 && u.length < 500 && (u.startsWith('https://') || u.startsWith('http://'));
  const appUrl = isValidAppUrl(bodyAppUrl)
    ? bodyAppUrl.replace(/\/$/, '')
    : (Deno.env.get('APP_URL') || 'https://chorroybuenas.com.mx').replace(/\/$/, '');
  const successUrl = `${appUrl}/comprar-tokens?success=1&payment_id={payment_id}`;
  const failureUrl = `${appUrl}/comprar-tokens?cancel=1`;
  const pendingUrl = `${appUrl}/comprar-tokens?pending=1&payment_id={payment_id}`;

  const isTestMode = mpAccessToken.startsWith('APP_USR-');
  const preferenceData = {
    items: [
      {
        title: `Tokens de IA - ${totalTokens} tokens`,
        description: `Pack de ${baseTokens} tokens${bonusTokens > 0 ? ` + ${bonusTokens} de regalo` : ''}${promotionBonus > 0 ? ` + ${promotionBonus} de promoción` : ''}`,
        quantity: 1,
        unit_price: amountCents / 100, // MP espera precio en pesos (no centavos)
        currency_id: 'MXN',
      },
    ],
    payer: !isTestMode && user.email ? { email: user.email } : undefined,
    back_urls: {
      success: successUrl,
      failure: failureUrl,
      pending: pendingUrl,
    },
    auto_return: 'approved',
    external_reference: user.id, // Para identificar al usuario en el webhook
    notification_url: `${supabaseUrl}/functions/v1/webhook-mercadopago`, // Webhook (Paso siguiente)
    metadata: {
      user_id: user.id,
      pack_id: packId,
      base_tokens: baseTokens,
      bonus_tokens: bonusTokens,
      promotion_bonus: promotionBonus,
      total_tokens: totalTokens,
      amount_cents: amountCents,
    },
  };

  try {
    const mpResponse = await fetch(`${MERCADOPAGO_API_BASE}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(preferenceData),
    });

    const responseText = await mpResponse.text();

    if (!mpResponse.ok) {
      console.error('create-payment-preference: error MP', mpResponse.status, responseText.slice(0, 300));
      let errorMessage = 'Error al crear preferencia de pago.';
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
        console.error('create-payment-preference: MP error', errorJson.message ?? errorJson.error);
      } catch (_) {}
      return new Response(
        JSON.stringify({ 
          error: 'MP_ERROR', 
          message: errorMessage,
          details: responseText.substring(0, 500), // Primeros 500 chars para debugging
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    let mpData;
    try {
      mpData = JSON.parse(responseText);
    } catch (e) {
      console.error('create-payment-preference: respuesta MP no es JSON', e);
      return new Response(
        JSON.stringify({ error: 'MP_ERROR', message: 'Respuesta inválida de Mercado Pago.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const forceProduction = Deno.env.get('MP_USE_PRODUCTION_CHECKOUT') === 'true';
    const initPoint = forceProduction
      ? mpData.init_point
      : (mpData.sandbox_init_point || mpData.init_point);

    if (!initPoint) {
      console.error('create-payment-preference: MP no devolvió init_point');
      return new Response(
        JSON.stringify({ error: 'MP_ERROR', message: 'No se recibió URL de pago.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        init_point: initPoint,
        payment_id: mpData.id,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('create-payment-preference:', error);
    return new Response(
      JSON.stringify({ 
        error: 'NETWORK_ERROR', 
        message: 'Error de conexión con Mercado Pago.',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
