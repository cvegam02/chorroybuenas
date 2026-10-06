import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders, parseAllowedOrigins } from '../_shared/cors.ts';
import { createMpGet } from '../_shared/mpClient.ts';
import { creditPayment, findApprovedPayment, type PaymentDeps } from '../_shared/paymentFlow.ts';

Deno.serve(async (req) => {
  const headers = buildCorsHeaders(req.headers.get('Origin'), parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS')));
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { error: 'INVALID_REQUEST', message: 'Método no permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  if (!serviceRoleKey || !mpToken) {
    console.error('credit-payment-on-return: falta SERVICE_ROLE_KEY o MERCADOPAGO_ACCESS_TOKEN');
    return reply(500, { error: 'CONFIG', message: 'Error de configuración.' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Sesión requerida.' });
  }
  const { data: { user }, error: userError } = await createClient(supabaseUrl, anonKey)
    .auth.getUser(authHeader.replace('Bearer ', '').trim());
  if (userError || !user) {
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Sesión inválida o expirada.' });
  }

  const body = (await req.json().catch(() => null)) as { payment_id?: unknown } | null;
  const paymentId = typeof body?.payment_id === 'string' ? body.payment_id.trim() : '';
  if (!/^\d{1,20}$/.test(paymentId)) {
    return reply(400, { error: 'INVALID_REQUEST', message: 'payment_id inválido.' });
  }

  try {
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const deps: PaymentDeps = {
      mpGet: createMpGet(mpToken),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      countPurchases: async (userId) => {
        const { count, error } = await admin
          .from('token_purchases')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (error) throw new Error(`token_purchases: ${error.message}`);
        return count ?? 0;
      },
      credit: async (params) => {
        const { data, error } = await admin.rpc('add_tokens_after_purchase', params);
        if (error) throw new Error(`add_tokens_after_purchase: ${error.message}`);
        return data as number;
      },
    };

    const found = await findApprovedPayment(deps, { topic: 'payment', id: paymentId });
    if (!found.ok) {
      return reply(200, { credited: false, reason: found.reason, status: found.status });
    }
    if (found.value.externalReference !== user.id) {
      return reply(403, { error: 'FORBIDDEN', message: 'Este pago no corresponde a tu cuenta.' });
    }

    // Idempotente: si el webhook ya acreditó este pago, devuelve el saldo actual sin sumar.
    const credited = await creditPayment(deps, found.value);
    if (!credited.ok) return reply(200, { credited: false, reason: credited.reason });

    return reply(200, { credited: true, new_balance: credited.value });
  } catch (err) {
    console.error('credit-payment-on-return:', err);
    return reply(500, { error: 'INTERNAL', message: 'No se pudo acreditar el pago. Intenta de nuevo en unos minutos.' });
  }
});
