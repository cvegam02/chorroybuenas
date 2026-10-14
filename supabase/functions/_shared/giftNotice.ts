import { renderEmail, type SendEmail } from './email.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Acceso a la base y al envío. La función real da el de Supabase y Resend; las pruebas, uno de mentira. */
export interface GiftNoticeDeps {
  isAdmin: (userId: string) => Promise<boolean>;
  /** El regalo más reciente de ese administrador a esa cuenta por esa cantidad, o null si no hay. */
  findRecentGift: (params: { adminId: string; recipientId: string; amount: number }) => Promise<{ id: string; amount: number } | null>;
  /** Correo y nombre de la cuenta, o null si no tiene correo. */
  getRecipient: (userId: string) => Promise<{ email: string; name: string | null } | null>;
  send: SendEmail;
  siteUrl: string;
  replyTo?: string;
}

export type GiftNoticeResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_request' | 'forbidden' | 'gift_not_found' | 'no_email' | 'send_failed' };

function parseInput(body: unknown): { recipientId: string; amount: number } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { user_id: recipientId, amount } = body as { user_id?: unknown; amount?: unknown };
  if (typeof recipientId !== 'string' || !UUID.test(recipientId)) return null;
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) return null;
  return { recipientId, amount };
}

/** Correo 2 de la fase 3. Sin el motivo ni quién regaló: el usuario solo ve la cantidad (fase 2, decisión 2). */
export function buildGiftEmail(params: { name: string | null; tokens: number; siteUrl: string }) {
  const name = params.name?.trim();
  return {
    subject: 'Te regalamos tokens',
    ...renderEmail({
      title: 'Te regalamos tokens',
      greeting: name ? `Hola, ${name}:` : 'Hola:',
      paragraphs: [
        `Te regalamos **${params.tokens} tokens**. Ya están en tu cuenta y puedes usarlos cuando quieras para transformar tus cartas con IA.`,
      ],
      button: { label: 'Ir a mi cuenta', url: `${params.siteUrl.replace(/\/$/, '')}/dashboard` },
    }),
  };
}

/**
 * Avisa por correo a quien recibió un regalo de tokens (fase 3, US B1). El regalo ya está hecho:
 * el correo se arma con los datos del registro, no con lo que mande el navegador, y si falla no se deshace nada.
 */
export async function notifyTokenGift(deps: GiftNoticeDeps, callerId: string, body: unknown): Promise<GiftNoticeResult> {
  const parsed = parseInput(body);
  if (!parsed) return { ok: false, reason: 'invalid_request' };
  if (!(await deps.isAdmin(callerId))) return { ok: false, reason: 'forbidden' };

  const gift = await deps.findRecentGift({ adminId: callerId, recipientId: parsed.recipientId, amount: parsed.amount });
  if (!gift) return { ok: false, reason: 'gift_not_found' };

  const recipient = await deps.getRecipient(parsed.recipientId);
  if (!recipient) return { ok: false, reason: 'no_email' };

  const email = buildGiftEmail({ name: recipient.name, tokens: gift.amount, siteUrl: deps.siteUrl });
  try {
    await deps.send({
      to: recipient.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: deps.replyTo,
      idempotencyKey: `token-gift-${gift.id}`,
    });
  } catch (error) {
    console.error('notify-token-gift: no se pudo enviar el correo', error);
    return { ok: false, reason: 'send_failed' };
  }
  return { ok: true };
}
