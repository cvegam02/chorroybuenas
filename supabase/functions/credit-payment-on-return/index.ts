import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const MERCADOPAGO_API_BASE = 'https://api.mercadopago.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface PreferenceMetadata {
  user_id?: string;
  pack_id?: string | null;
  base_tokens?: number;
  bonus_tokens?: number;
  promotion_bonus?: number;
  total_tokens?: number;
  amount_cents?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'NOT_LOGGED_IN', message: 'Sesion requerida.' }),
      { status: 401, headers: corsHeaders }
    );
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: 'NOT_LOGGED_IN', message: userError?.message ?? 'Sesion invalida.' }),
      { status: 401, headers: corsHeaders }
    );
  }

  let body: { payment_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'INVALID_REQUEST', message: 'Body invalido.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const paymentId = body.payment_id?.trim();
  if (!paymentId) {
    return new Response(
      JSON.stringify({ error: 'INVALID_REQUEST', message: 'payment_id es requerido.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  if (!mpToken) {
    return new Response(
      JSON.stringify({ error: 'CONFIG', message: 'Error de configuracion.' }),
      { status: 500, headers: corsHeaders }
    );
  }

  const paymentRes = await fetch(`${MERCADOPAGO_API_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpToken}` },
  });

  if (!paymentRes.ok) {
    return new Response(
      JSON.stringify({ credited: false, error: 'payment_not_found' }),
      { status: 200, headers: corsHeaders }
    );
  }

  const payment = await paymentRes.json();
  const status = payment.status;
  const externalReference = payment.external_reference;
  const preferenceId = payment.metadata?.preference_id ?? payment.preference_id;

  if (status !== 'approved') {
    return new Response(
      JSON.stringify({ credited: false, reason: 'not_approved', status }),
      { status: 200, headers: corsHeaders }
    );
  }

  if (externalReference !== user.id) {
    return new Response(
      JSON.stringify({ error: 'FORBIDDEN', message: 'Este pago no corresponde a tu cuenta.' }),
      { status: 403, headers: corsHeaders }
    );
  }

  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  if (!serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'CONFIG', message: 'Error de configuracion.' }),
      { status: 500, headers: corsHeaders }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data: existing } = await supabaseAdmin
    .from('token_purchases')
    .select('id')
    .eq('payment_id', String(paymentId))
    .maybeSingle();

  if (existing) {
    return new Response(
      JSON.stringify({ credited: true, already_processed: true }),
      { status: 200, headers: corsHeaders }
    );
  }

  let metadata: PreferenceMetadata = {
    user_id: externalReference,
    base_tokens: 0,
    bonus_tokens: 0,
    promotion_bonus: 0,
    total_tokens: 0,
    amount_cents: 0,
    pack_id: null,
  };

  if (preferenceId) {
    const prefRes = await fetch(`${MERCADOPAGO_API_BASE}/checkout/preferences/${preferenceId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    if (prefRes.ok) {
      const pref = await prefRes.json();
      if (pref.metadata && typeof pref.metadata === 'object') {
        metadata = { ...metadata, ...pref.metadata };
      }
    }
  }

  const baseTokens = metadata.base_tokens ?? 0;
  const packBonus = metadata.bonus_tokens ?? 0;
  const promotionBonus = metadata.promotion_bonus ?? 0;
  const amountCents = metadata.amount_cents ?? 0;
  const packId = metadata.pack_id ?? null;

  const { count: purchaseCount } = await supabaseAdmin
    .from('token_purchases')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const isFirstPurchase = (purchaseCount ?? 0) === 0;
  const effectivePromoBonus = isFirstPurchase ? promotionBonus : 0;
  const totalTokens = baseTokens + packBonus + effectivePromoBonus;
  const bonusTokens = packBonus + effectivePromoBonus;

  if (totalTokens <= 0) {
    return new Response(
      JSON.stringify({ credited: false, reason: 'invalid_metadata' }),
      { status: 200, headers: corsHeaders }
    );
  }

  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('add_tokens_after_purchase', {
    p_user_id: user.id,
    p_tokens_to_add: totalTokens,
    p_pack_id: packId,
    p_base_tokens: baseTokens,
    p_bonus_tokens: bonusTokens,
    p_total_tokens: totalTokens,
    p_amount_cents: amountCents,
    p_payment_provider: 'mercadopago',
    p_payment_id: String(paymentId),
    p_payment_status: status,
    p_payment_metadata: payment,
  });

  if (rpcError) {
    return new Response(
      JSON.stringify({ error: 'RPC', message: rpcError.message }),
      { status: 500, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({ credited: true, new_balance: rpcResult }),
    { status: 200, headers: corsHeaders }
  );
});
