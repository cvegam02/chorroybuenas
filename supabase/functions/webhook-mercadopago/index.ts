import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const MERCADOPAGO_API_BASE = 'https://api.mercadopago.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

/** Metadata que enviamos en la preferencia (create-payment-preference). */
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
  const url = new URL(req.url);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  let paymentId: string | null = null;
  let topic: string | null = null;
  let resourceId: string | null = null;

  try {
    const contentType = req.headers.get('Content-Type') || '';

    if (req.method === 'POST') {
      let body: Record<string, unknown> = {};
      if (contentType.includes('application/json')) {
        body = await req.json().catch(() => ({}));
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await req.text();
        body = Object.fromEntries(new URLSearchParams(text));
      }
      topic = (body.topic ?? body.type) as string | undefined;
      const dataId = (body.data as { id?: string })?.id ?? body.id;
      if (topic === 'payment' && dataId != null) {
        paymentId = String(dataId);
      }
      if (topic === 'merchant_order') {
        if (dataId != null) resourceId = String(dataId);
        else if (typeof body.resource === 'string') {
          const match = body.resource.match(/\/(\d+)$/);
          if (match) resourceId = match[1];
        }
      }
    }

    if (!topic && url.searchParams.has('topic')) topic = url.searchParams.get('topic');
    if (!resourceId && url.searchParams.has('id')) resourceId = url.searchParams.get('id');
    if (!paymentId && url.searchParams.has('data.id')) paymentId = url.searchParams.get('data.id');
    if (!paymentId && url.searchParams.has('id') && topic === 'payment') paymentId = url.searchParams.get('id');

    const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpToken) {
      console.error('webhook-mercadopago: MERCADOPAGO_ACCESS_TOKEN no configurado');
      return new Response(JSON.stringify({ error: 'config' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    let payment: Record<string, unknown>;
    let status: string;
    let externalReference: string | undefined;
    let preferenceId: string | undefined;

    if (topic === 'merchant_order' && resourceId) {
      const getOrder = () =>
        fetch(`${MERCADOPAGO_API_BASE}/merchant_orders/${resourceId}`, {
          headers: { Authorization: `Bearer ${mpToken}` },
        }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))));
      let order: { payments?: Array<{ id: number; status?: string }>; external_reference?: string; preference_id?: string };
      try {
        order = await getOrder();
      } catch (e) {
        console.error('webhook-mercadopago: error al obtener orden', resourceId, e);
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
      }
      let payments = order.payments ?? [];
      let approved = payments.find((p: { status?: string }) => p.status === 'approved');
      if (!approved && payments.length === 0) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          order = await getOrder();
          payments = order.payments ?? [];
          approved = payments.find((p: { status?: string }) => p.status === 'approved');
        } catch (_) {}
      }
      if (!approved) {
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
      }
      paymentId = String(approved.id);
      payment = approved;
      status = 'approved';
      externalReference = order.external_reference;
      preferenceId = order.preference_id;
    } else if (paymentId) {
      const paymentRes = await fetch(`${MERCADOPAGO_API_BASE}/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      });
      if (!paymentRes.ok) {
        console.error('webhook-mercadopago: error al obtener pago', paymentId, paymentRes.status);
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
      }
      payment = await paymentRes.json();
      status = payment.status as string;
      externalReference = payment.external_reference as string | undefined;
      preferenceId = (payment.metadata as { preference_id?: string })?.preference_id ?? (payment.preference_id as string | undefined);

      if (status !== 'approved') {
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
      }
    } else {
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
    }

    if (!externalReference) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      console.error('webhook-mercadopago: SERVICE_ROLE_KEY no configurado');
      return new Response(JSON.stringify({ error: 'config' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: existing } = await supabase
      .from('token_purchases')
      .select('id')
      .eq('payment_id', String(paymentId))
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: corsHeaders,
      });
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

    const userId = metadata.user_id ?? externalReference;
    const totalTokens = metadata.total_tokens ?? 0;
    const baseTokens = metadata.base_tokens ?? 0;
    const bonusTokens = (metadata.bonus_tokens ?? 0) + (metadata.promotion_bonus ?? 0);
    const amountCents = metadata.amount_cents ?? 0;
    const packId = metadata.pack_id ?? null;

    if (totalTokens <= 0) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('add_tokens_after_purchase', {
      p_user_id: userId,
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
      console.error('webhook-mercadopago: RPC error', rpcError.message);
      return new Response(JSON.stringify({ error: 'rpc', message: rpcError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ received: true, new_balance: rpcResult }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('webhook-mercadopago:', err);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: corsHeaders,
    });
  }
});
