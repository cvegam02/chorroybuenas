import { describe, expect, it } from 'vitest';
import { activityItem, type UserActivityEvent } from '../../src/utils/userActivity';

// 15 de octubre a las 12:00 en Hermosillo.
const now = new Date('2026-10-15T19:00:00Z');

const event = (overrides: Partial<UserActivityEvent>): UserActivityEvent => ({
  kind: 'signup',
  occurred_at: '2026-10-15T17:42:00Z',
  status: null,
  pack_id: null,
  base_tokens: null,
  total_tokens: null,
  amount_cents: null,
  loteria_name: null,
  method_type: null,
  method_id: null,
  reason: null,
  ai_photos: null,
  ...overrides,
});

describe('activityItem', () => {
  it('una compra de tokens aprobada dice qué compró, cuándo, con qué pagó y cuántos tokens recibió', () => {
    expect(
      activityItem(
        event({
          kind: 'tokens',
          status: 'approved',
          pack_id: 'p',
          base_tokens: 20,
          total_tokens: 25,
          amount_cents: 3500,
          method_type: 'debit_card',
          method_id: 'visa',
        }),
        now,
      ),
    ).toEqual({
      tone: 'buy',
      icon: '$',
      title: 'Compró Pack de 20 tokens',
      detail: 'Hoy, 10:42 · Tarjeta de débito · Visa',
      value: '+25',
    });
  });

  it('una compra pendiente dice que inició el pago y no suma tokens', () => {
    expect(
      activityItem(
        event({
          kind: 'tokens',
          status: 'pending',
          base_tokens: 15,
          total_tokens: 15,
          occurred_at: '2026-10-15T04:03:00Z',
          method_type: 'ticket',
          method_id: 'oxxo',
        }),
        now,
      ),
    ).toMatchObject({ title: 'Inició pago de 15 tokens', detail: 'Ayer, 21:03 · Efectivo · OXXO · pendiente', value: '' });
  });

  it('una temática dice su nombre y lo que costó', () => {
    expect(
      activityItem(
        event({ kind: 'seasonal', status: 'approved', loteria_name: 'Muertos', amount_cents: 10000, occurred_at: '2026-10-05T18:00:00Z' }),
        now,
      ),
    ).toEqual({ tone: 'seasonal', icon: 'T', title: 'Compró Muertos', detail: '5 oct 2026 · $100', value: '' });
    expect(
      activityItem(event({ kind: 'seasonal', status: 'pending', loteria_name: 'Catrinas', amount_cents: 4900 }), now),
    ).toMatchObject({ title: 'Inició pago de Catrinas', detail: 'Hoy, 10:42 · $49 · pendiente' });
  });

  it('un regalo trae su motivo entre comillas, si tiene', () => {
    expect(
      activityItem(event({ kind: 'gift', total_tokens: 15, reason: 'Sorteo', occurred_at: '2026-10-09T18:00:00Z' }), now),
    ).toEqual({ tone: 'gift', icon: '★', title: 'Recibió un regalo', detail: '9 oct 2026 · «Sorteo»', value: '+15' });
    expect(activityItem(event({ kind: 'gift', total_tokens: 1 }), now)).toMatchObject({ detail: 'Hoy, 10:42', value: '+1' });
  });

  it('el uso de IA dice cuántas fotos, el día y la lotería', () => {
    expect(
      activityItem(event({ kind: 'ai', ai_photos: 12, loteria_name: 'Cumple de Sofi', occurred_at: '2026-10-15T06:30:00Z' }), now),
    ).toEqual({ tone: 'ai', icon: 'IA', title: 'Transformó 12 fotos con IA', detail: 'Ayer · lotería «Cumple de Sofi»', value: '−12' });
    expect(activityItem(event({ kind: 'ai', ai_photos: 1 }), now)).toMatchObject({
      title: 'Transformó 1 foto con IA',
      detail: 'Hoy · lotería borrada',
    });
  });

  it('la voz con IA del cantador es su propio renglón, con su lotería y sus tokens (FEAT-55, decisión 28)', () => {
    expect(
      activityItem(event({ kind: 'voice', total_tokens: 10, loteria_name: 'Cumple de Sofi', occurred_at: '2026-10-15T06:30:00Z' }), now),
    ).toEqual({ tone: 'ai', icon: 'IA', title: 'Pagó la voz con IA del cantador', detail: 'Ayer · lotería «Cumple de Sofi»', value: '−10' });
    expect(activityItem(event({ kind: 'voice', total_tokens: 10 }), now)).toMatchObject({ detail: 'Hoy · lotería borrada' });
  });

  it('el registro dice cuándo creó su cuenta, sin los tokens de bienvenida', () => {
    expect(activityItem(event({ kind: 'signup', occurred_at: '2026-09-03T06:00:00Z' }), now)).toEqual({
      tone: 'signup',
      icon: '·',
      title: 'Creó su cuenta',
      detail: '2 sep 2026',
      value: '',
    });
  });
});
