import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createMpGet } from '../_shared/mpClient.ts';
import { verifyMpSignature } from '../_shared/mpSignature.ts';
import {
  creditPayment, findApprovedPayment, parseNotification, trackUnapprovedSeasonal, type PaymentDeps,
} from '../_shared/paymentFlow.ts';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
/** Notificación atendida: no hay nada (más) que acreditar y MP no debe reintentar. */
const ack = () => reply(200, { received: true });

// Lo llama Mercado Pago de servidor a servidor: no emite cabeceras CORS.
Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return reply(405, { error: 'method_not_allowed' });
  }

  const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!mpToken || !serviceRoleKey) {
    console.error('webhook-mercadopago: falta MERCADOPAGO_ACCESS_TOKEN o SERVICE_ROLE_KEY');
    return reply(500, { error: 'config' });
  }

  try {
    const notification = parseNotification({
      method: req.method,
      url: new URL(req.url),
      contentType: req.headers.get('Content-Type') ?? '',
      bodyText: req.method === 'POST' ? await req.text() : '',
    });

    // Las notificaciones webhook vienen firmadas; las IPN antiguas no. Una firma presente
    // debe ser válida. Sin firma se continúa: el pago siempre se consulta en la API de MP.
    const signatureHeader = req.headers.get('x-signature');
    const webhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
    if (signatureHeader && webhookSecret) {
      const valid = await verifyMpSignature({
        signatureHeader,
        requestId: req.headers.get('x-request-id'),
        dataId: notification.signedDataId,
        secret: webhookSecret,
      });
      if (!valid) {
        console.error('webhook-mercadopago: firma inválida');
        return reply(401, { error: 'invalid_signature' });
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const deps: PaymentDeps = {
      mpGet: createMpGet(mpToken),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      countPurchases: async (userId) => {
        const { count, error } = await supabase
          .from('token_purchases')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (error) throw new Error(`token_purchases: ${error.message}`);
        return count ?? 0;
      },
      credit: async (params) => {
        const { data, error } = await supabase.rpc('add_tokens_after_purchase', params);
        if (error) throw new Error(`add_tokens_after_purchase: ${error.message}`);
        return data as number;
      },
      deliverSeasonal: async (params) => {
        const { data, error } = await supabase.rpc('deliver_seasonal_purchase', params);
        if (error) throw new Error(`deliver_seasonal_purchase: ${error.message}`);
        if (data !== 'approved' && data !== 'repeated') {
          throw new Error(`deliver_seasonal_purchase: estado inesperado (${String(data)})`);
        }
        return data;
      },
      recordPendingSeasonal: async (params) => {
        const { data, error } = await supabase.rpc('record_pending_seasonal_purchase', params);
        if (error) throw new Error(`record_pending_seasonal_purchase: ${error.message}`);
        return String(data);
      },
      releasePendingSeasonal: async (paymentId) => {
        const { data, error } = await supabase.rpc('release_pending_seasonal_purchase', {
          p_payment_provider: 'mercadopago',
          p_payment_id: paymentId,
        });
        if (error) throw new Error(`release_pending_seasonal_purchase: ${error.message}`);
        return data === true;
      },
    };

    const found = await findApprovedPayment(deps, notification);
    if (!found.ok) {
      if (found.reason === 'missing_reference') {
        console.error('webhook-mercadopago: pago aprobado sin external_reference o preference_id', notification.id);
      }
      if (found.reason === 'not_approved') {
        console.log(`webhook-mercadopago: ${notification.topic} ${notification.id} sin pago aprobado (${found.status})`);
        // Efectivo o transferencia: el pago de una lotería de temporada se anota como «en proceso»,
        // o se quita esa nota si se rechazó o caducó. Los pagos de tokens no se tocan.
        if (notification.topic === 'payment') {
          const tracking = await trackUnapprovedSeasonal(deps, { paymentId: notification.id });
          if (tracking.tracked !== 'none') {
            console.log(`webhook-mercadopago: pago de temporada ${notification.id} ${tracking.tracked}`);
          }
        }
      }
      return ack();
    }

    const credited = await creditPayment(deps, found.value);
    if (!credited.ok) {
      console.error('webhook-mercadopago: metadata o monto inválido, no se acredita el pago', found.value.paymentId);
    } else if (credited.value.kind === 'seasonal' && credited.value.status === 'repeated') {
      // La cuenta ya tenía esa lotería: el pago queda guardado para devolverlo a mano.
      console.error('webhook-mercadopago: pago repetido de una lotería de temporada', found.value.paymentId);
    }
    return ack();
  } catch (err) {
    // 500 para que Mercado Pago reintente; la acreditación es idempotente.
    console.error('webhook-mercadopago:', err);
    return reply(500, { error: 'internal' });
  }
});
