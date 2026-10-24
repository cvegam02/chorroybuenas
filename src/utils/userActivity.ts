import { saleItemLabel, saleStatus } from './adminSales';
import { activityDay, lastActivityLabel, paidLabel } from './adminUsers';
import { paymentMethodLabel } from './mercadoPagoLabels';

/** Un movimiento de la actividad de la ficha (FEAT-45, US A3), como lo devuelve la base. */
export interface UserActivityEvent {
  kind: 'tokens' | 'seasonal' | 'gift' | 'ai' | 'voice' | 'signup';
  occurred_at: string;
  status: string | null;
  pack_id: string | null;
  base_tokens: number | null;
  /** Tokens recibidos en compras y regalos; gastados en la voz del cantador. */
  total_tokens: number | null;
  amount_cents: number | null;
  /** Temática, o lotería del uso de IA o de la voz (nulo si se borró). */
  loteria_name: string | null;
  method_type: string | null;
  method_id: string | null;
  reason: string | null;
  ai_photos: number | null;
}

/** Color del ícono (decisión 10): compra en primario, regalo, IA, temática y registro. */
export type ActivityTone = 'buy' | 'gift' | 'ai' | 'seasonal' | 'signup';

export interface ActivityItem {
  tone: ActivityTone;
  icon: string;
  title: string;
  detail: string;
  /** Tokens que entraron o salieron del saldo («+25», «−12»), o vacío. */
  value: string;
}

const joinDetail = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ');

/** «pendiente», «devuelta»…; nada si está aprobada. */
const statusNote = (status: string | null) =>
  status === 'approved' ? null : saleStatus(status).label.toLocaleLowerCase('es-MX');

const purchaseTitle = (status: string | null, item: string) =>
  status === 'approved' ? `Compró ${item}` : `Inició pago de ${item}`;

/** Cómo se lee un movimiento en la línea de tiempo. */
export function activityItem(event: UserActivityEvent, now: Date = new Date()): ActivityItem {
  const when = lastActivityLabel(event.occurred_at, now);
  switch (event.kind) {
    case 'tokens': {
      const item = saleItemLabel({ kind: 'tokens', pack_id: event.pack_id, base_tokens: event.base_tokens, loteria_name: null });
      return {
        tone: 'buy',
        icon: '$',
        title: purchaseTitle(event.status, item),
        detail: joinDetail(when, paymentMethodLabel(event.method_type, event.method_id), statusNote(event.status)),
        value: event.status === 'approved' ? `+${event.total_tokens ?? 0}` : '',
      };
    }
    case 'seasonal':
      return {
        tone: 'seasonal',
        icon: 'T',
        title: purchaseTitle(event.status, event.loteria_name || 'una lotería temática'),
        detail: joinDetail(when, paidLabel(event.amount_cents ?? 0), statusNote(event.status)),
        value: '',
      };
    case 'gift':
      return {
        tone: 'gift',
        icon: '★',
        title: 'Recibió un regalo',
        detail: joinDetail(when, event.reason && `«${event.reason}»`),
        value: `+${event.total_tokens ?? 0}`,
      };
    case 'ai': {
      const photos = event.ai_photos ?? 0;
      return {
        tone: 'ai',
        icon: 'IA',
        title: `Transformó ${photos} ${photos === 1 ? 'foto' : 'fotos'} con IA`,
        detail: joinDetail(
          activityDay(event.occurred_at, now),
          event.loteria_name ? `lotería «${event.loteria_name}»` : 'lotería borrada',
        ),
        value: `−${photos}`,
      };
    }
    case 'voice':
      return {
        tone: 'ai',
        icon: 'IA',
        title: 'Pagó la voz con IA del cantador',
        detail: joinDetail(
          activityDay(event.occurred_at, now),
          event.loteria_name ? `lotería «${event.loteria_name}»` : 'lotería borrada',
        ),
        value: `−${event.total_tokens ?? 0}`,
      };
    default:
      return { tone: 'signup', icon: '·', title: 'Creó su cuenta', detail: activityDay(event.occurred_at, now), value: '' };
  }
}
