import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders, parseAllowedOrigins } from '../_shared/cors.ts';
import {
  createPrediction, firstOutput, runCharged, waitForPrediction, type ReplicateDeps,
} from '../_shared/replicate.ts';
import {
  assertPredictionSucceeded, buildPredictionBody, mapSpendError, parseTransformRequest, toErrorResponse,
} from '../_shared/transform.ts';

const TOKENS_PER_IMAGE = 1;

const replicateDeps: ReplicateDeps = {
  fetchFn: fetch,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

Deno.serve(async (req) => {
  const headers = buildCorsHeaders(req.headers.get('Origin'), parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS')));
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { error: 'INVALID_REQUEST', message: 'Método no permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  const replicateToken = Deno.env.get('REPLICATE_API_TOKEN');
  if (!serviceRoleKey || !replicateToken) {
    console.error('transform-loteria: falta SERVICE_ROLE_KEY o REPLICATE_API_TOKEN');
    return reply(500, { error: 'CONFIG_ERROR', message: 'Servicio de IA no configurado.' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Se requiere autenticación.' });
  }
  const { data: { user }, error: userError } = await createClient(supabaseUrl, anonKey)
    .auth.getUser(authHeader.replace('Bearer ', '').trim());
  if (userError || !user) {
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Sesión inválida o expirada.' });
  }

  // Validar antes de cobrar: una petición inválida no debe costar un token.
  const parsed = parseTransformRequest(await req.json().catch(() => null));
  if (!parsed.ok) return reply(400, { error: 'INVALID_REQUEST', message: parsed.message });
  const request = parsed.value;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const output = await runCharged({
      spend: async () => {
        const { data, error } = await admin.rpc('spend_tokens_for_user', {
          p_user_id: user.id,
          p_amount: TOKENS_PER_IMAGE,
          p_set_id: request.setId,
        });
        if (error) throw mapSpendError(error.message);
        return data as string;
      },
      refund: async (usageId) => {
        const { error } = await admin.rpc('refund_token_usage', { p_usage_id: usageId });
        if (error) throw new Error(`refund_token_usage: ${error.message}`);
      },
      onRefundError: (usageId, error) => {
        console.error('transform-loteria: no se pudo reembolsar el uso', usageId, error);
      },
      run: async () => {
        const created = await createPrediction(replicateDeps, replicateToken, buildPredictionBody(request));
        const finished = await waitForPrediction(replicateDeps, replicateToken, created);
        assertPredictionSucceeded(finished);
        return firstOutput(finished);
      },
    });
    return reply(200, { output });
  } catch (err) {
    const response = toErrorResponse(err);
    if (response.internal) console.error('transform-loteria:', err);
    return reply(response.status, response.body);
  }
});
