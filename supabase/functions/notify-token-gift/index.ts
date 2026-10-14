import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders, parseAllowedOrigins } from '../_shared/cors.ts';
import { createResendSender } from '../_shared/email.ts';
import { notifyTokenGift, type GiftNoticeDeps, type GiftNoticeResult } from '../_shared/giftNotice.ts';

const DEFAULT_APP_URL = 'https://chorroybuenas.com.mx';
/** Ventana para encontrar el regalo recién hecho: el panel llama justo después de regalar. */
const GIFT_LOOKBACK_MS = 10 * 60 * 1000;

const STATUS: Record<Exclude<GiftNoticeResult, { ok: true }>['reason'], number> = {
  invalid_request: 400,
  forbidden: 403,
  gift_not_found: 404,
  no_email: 422,
  send_failed: 502,
};

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
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!serviceRoleKey || !resendKey) {
    console.error('notify-token-gift: falta SERVICE_ROLE_KEY o RESEND_API_KEY');
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

  const body = await req.json().catch(() => null);

  try {
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const deps: GiftNoticeDeps = {
      isAdmin: async (userId) => {
        const { data, error } = await admin.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
        if (error) throw new Error(`admin_users: ${error.message}`);
        return data !== null;
      },
      findRecentGift: async ({ adminId, recipientId, amount }) => {
        const { data, error } = await admin
          .from('token_gifts')
          .select('id, amount')
          .eq('admin_id', adminId)
          .eq('recipient_id', recipientId)
          .eq('amount', amount)
          .gte('created_at', new Date(Date.now() - GIFT_LOOKBACK_MS).toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw new Error(`token_gifts: ${error.message}`);
        return data;
      },
      getRecipient: async (userId) => {
        const { data: profile, error } = await admin.from('profiles').select('email, full_name').eq('id', userId).maybeSingle();
        if (error) throw new Error(`profiles: ${error.message}`);
        let email: string | null = profile?.email ?? null;
        if (!email) {
          const { data: authUser } = await admin.auth.admin.getUserById(userId);
          email = authUser?.user?.email ?? null;
        }
        return email ? { email, name: profile?.full_name ?? null } : null;
      },
      send: createResendSender({ apiKey: resendKey }),
      siteUrl: Deno.env.get('APP_URL') || allowedOrigins[0] || DEFAULT_APP_URL,
      replyTo: Deno.env.get('EMAIL_REPLY_TO') || undefined,
    };

    const result = await notifyTokenGift(deps, user.id, body);
    if (result.ok) return reply(200, { sent: true });
    if (result.reason !== 'invalid_request' && result.reason !== 'forbidden') {
      console.error(`notify-token-gift: no se envió (${result.reason})`);
    }
    return reply(STATUS[result.reason], { error: result.reason });
  } catch (err) {
    console.error('notify-token-gift:', err);
    return reply(500, { error: 'internal' });
  }
});
