import { describe, expect, it, vi } from 'vitest';
import type { EmailMessage } from '../../supabase/functions/_shared/email.ts';
import { notifyTokenGift, type GiftNoticeDeps } from '../../supabase/functions/_shared/giftNotice.ts';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const RECIPIENT = '22222222-2222-4222-8222-222222222222';
const GIFT = { id: '33333333-3333-4333-8333-333333333333', amount: 3, reason: 'Motivo secreto del regalo' };

const makeDeps = (over: Partial<GiftNoticeDeps> = {}) => {
  const sent: EmailMessage[] = [];
  const deps: GiftNoticeDeps = {
    isAdmin: vi.fn(async () => true),
    findRecentGift: vi.fn(async () => GIFT),
    getRecipient: vi.fn(async () => ({ email: 'ana@ejemplo.com', name: 'Ana López' })),
    send: vi.fn(async (message: EmailMessage) => { sent.push(message); }),
    siteUrl: 'https://dev.chorroybuenas.com.mx',
    replyTo: 'contacto@ejemplo.com',
    ...over,
  };
  return { deps, sent };
};

const input = { user_id: RECIPIENT, amount: 3 };

describe('notifyTokenGift', () => {
  it('manda el correo 2 a quien recibió el regalo, con la cantidad', async () => {
    const { deps, sent } = makeDeps();
    expect(await notifyTokenGift(deps, ADMIN, input)).toEqual({ ok: true });

    expect(deps.findRecentGift).toHaveBeenCalledWith({ adminId: ADMIN, recipientId: RECIPIENT, amount: 3 });
    expect(sent).toHaveLength(1);
    const [email] = sent;
    expect(email.to).toBe('ana@ejemplo.com');
    expect(email.subject).toBe('Te regalamos tokens');
    expect(email.replyTo).toBe('contacto@ejemplo.com');
    expect(email.text).toContain('Hola, Ana López:');
    expect(email.text).toContain('Te regalamos 3 tokens. Ya están en tu cuenta');
    expect(email.html).toContain('<strong>3 tokens</strong>');
    expect(email.html).toContain('href="https://dev.chorroybuenas.com.mx/dashboard"');
  });

  it('no incluye el motivo ni quién regaló', async () => {
    const { deps, sent } = makeDeps();
    await notifyTokenGift(deps, ADMIN, input);
    const [email] = sent;
    expect(email.html).not.toContain(GIFT.reason);
    expect(email.text).not.toContain(GIFT.reason);
    expect(email.html).not.toContain(ADMIN);
  });

  it('el mismo regalo siempre lleva la misma marca, para que Resend no lo mande dos veces', async () => {
    const { deps, sent } = makeDeps();
    await notifyTokenGift(deps, ADMIN, input);
    await notifyTokenGift(deps, ADMIN, input);
    expect(sent.map((email) => email.idempotencyKey)).toEqual([`token-gift-${GIFT.id}`, `token-gift-${GIFT.id}`]);
  });

  it('sin nombre en el perfil, saluda sin nombre', async () => {
    const { deps, sent } = makeDeps({ getRecipient: vi.fn(async () => ({ email: 'ana@ejemplo.com', name: null })) });
    await notifyTokenGift(deps, ADMIN, input);
    expect(sent[0].text.startsWith('Hola:\n')).toBe(true);
  });

  it('quien no es administrador no puede hacer que se mande', async () => {
    const { deps, sent } = makeDeps({ isAdmin: vi.fn(async () => false) });
    expect(await notifyTokenGift(deps, ADMIN, input)).toEqual({ ok: false, reason: 'forbidden' });
    expect(deps.findRecentGift).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it('un regalo que no existe (o con otra cantidad) no manda nada', async () => {
    const { deps, sent } = makeDeps({ findRecentGift: vi.fn(async () => null) });
    expect(await notifyTokenGift(deps, ADMIN, { user_id: RECIPIENT, amount: 500 })).toEqual({
      ok: false, reason: 'gift_not_found',
    });
    expect(sent).toHaveLength(0);
  });

  it.each([
    ['sin cuerpo', null],
    ['usuario que no es un identificador', { user_id: 'abc', amount: 3 }],
    ['cantidad 0', { user_id: RECIPIENT, amount: 0 }],
    ['cantidad negativa', { user_id: RECIPIENT, amount: -2 }],
    ['cantidad con decimales', { user_id: RECIPIENT, amount: 1.5 }],
    ['cantidad como texto', { user_id: RECIPIENT, amount: '3' }],
  ])('rechaza el pedido mal formado: %s', async (_name, body) => {
    const { deps, sent } = makeDeps();
    expect(await notifyTokenGift(deps, ADMIN, body)).toEqual({ ok: false, reason: 'invalid_request' });
    expect(deps.isAdmin).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it('si la cuenta no tiene correo, no manda nada', async () => {
    const { deps, sent } = makeDeps({ getRecipient: vi.fn(async () => null) });
    expect(await notifyTokenGift(deps, ADMIN, input)).toEqual({ ok: false, reason: 'no_email' });
    expect(sent).toHaveLength(0);
  });

  it('si el envío falla, lo informa sin lanzar: el regalo ya quedó hecho', async () => {
    const { deps } = makeDeps({ send: vi.fn(async () => { throw new Error('Resend 500'); }) });
    expect(await notifyTokenGift(deps, ADMIN, input)).toEqual({ ok: false, reason: 'send_failed' });
  });
});
