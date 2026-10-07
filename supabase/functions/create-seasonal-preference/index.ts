import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { pickInitPoint, resolveAppUrl, resolveCheckoutMode } from '../_shared/checkout.ts';
import { buildCorsHeaders, parseAllowedOrigins } from '../_shared/cors.ts';
import {
  buildSeasonalPreference, checkSeasonalPurchase, parseSeasonalPreferenceRequest, type SeasonalLoteriaRow,
} from '../_shared/seasonal.ts';

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
    console.error('create-seasonal-preference: falta SERVICE_ROLE_KEY o MERCADOPAGO_ACCESS_TOKEN');
    return reply(500, { error: 'CONFIG_ERROR', message: 'Error de configuración del servidor.' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Inicia sesión para comprar.' });
  }
  const { data: { user }, error: userError } = await createClient(supabaseUrl, anonKey)
    .auth.getUser(authHeader.replace('Bearer ', '').trim());
  if (userError || !user) {
    console.error('create-seasonal-preference: sesión inválida', userError?.message);
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Sesión inválida o expirada. Inicia sesión nuevamente.' });
  }

  const parsed = parseSeasonalPreferenceRequest(await req.json().catch(() => null));
  if (!parsed.ok) return reply(400, { error: 'INVALID_REQUEST', message: parsed.message });
  const { loteriaId, appUrl: requestedAppUrl } = parsed.value;

  try {
    // Service role: la lectura no depende de RLS, y la visibilidad se decide aquí con la hora del servidor.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: loteria, error: loteriaError } = await admin
      .from('seasonal_loterias')
      .select('id, name_es, price_cents, is_published, valid_from, valid_until')
      .eq('id', loteriaId)
      .maybeSingle();
    if (loteriaError) throw new Error(`seasonal_loterias: ${loteriaError.message}`);

    const { count: ownedCount, error: ownedError } = await admin
      .from('seasonal_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('loteria_id', loteriaId)
      .eq('status', 'approved');
    if (ownedError) throw new Error(`seasonal_purchases: ${ownedError.message}`);

    const checked = checkSeasonalPurchase({
      loteria: (loteria ?? null) as SeasonalLoteriaRow | null,
      alreadyOwned: (ownedCount ?? 0) > 0,
      now: new Date(),
    });
    if (!checked.ok) {
      const message = checked.error === 'ALREADY_OWNED'
        ? 'Ya tienes esta lotería.'
        : 'Esta lotería ya no está disponible.';
      return reply(409, { error: checked.error, message });
    }

    const mode = resolveCheckoutMode(Deno.env.get('MP_USE_SANDBOX_CHECKOUT'), mpAccessToken);
    console.log(`create-seasonal-preference: checkout ${mode}`);
    const preference = buildSeasonalPreference({
      item: checked.value,
      userId: user.id,
      appUrl: resolveAppUrl(requestedAppUrl, allowedOrigins, Deno.env.get('APP_URL') || DEFAULT_APP_URL),
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
      console.error('create-seasonal-preference: error de red con MP', error);
      return reply(502, { error: 'NETWORK_ERROR', message: 'Error de conexión con Mercado Pago.' });
    }

    const responseText = await mpResponse.text();
    if (!mpResponse.ok) {
      console.error('create-seasonal-preference: error MP', mpResponse.status, responseText.slice(0, 500));
      return reply(502, { error: 'MP_ERROR', message: 'Mercado Pago rechazó la solicitud. Intenta de nuevo.' });
    }

    let mpData: { id?: string; init_point?: string; sandbox_init_point?: string };
    try {
      mpData = JSON.parse(responseText);
    } catch (error) {
      console.error('create-seasonal-preference: respuesta MP no es JSON', error);
      return reply(502, { error: 'MP_ERROR', message: 'Respuesta inválida de Mercado Pago.' });
    }

    const initPoint = pickInitPoint(mode, mpData);
    if (!initPoint) {
      console.error('create-seasonal-preference: MP no devolvió init_point');
      return reply(502, { error: 'MP_ERROR', message: 'No se recibió URL de pago.' });
    }

    return reply(200, { success: true, init_point: initPoint });
  } catch (err) {
    console.error('create-seasonal-preference:', err);
    return reply(500, { error: 'INTERNAL', message: 'No se pudo preparar la compra. Intenta de nuevo.' });
  }
});
