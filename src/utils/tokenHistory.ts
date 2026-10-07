import type { TokenPurchase } from '../repositories/TokenPricingRepository';

/** Regalo de tokens tal como lo ve quien lo recibe: sin motivo ni quién lo dio. */
export interface TokenGift {
  id: string;
  amount: number;
  created_at: string;
}

/** Compra de una lotería de temporada, para el historial de quien la compró. */
export interface SeasonalHistoryPurchase {
  id: string;
  name_es: string;
  name_en: string | null;
  amount_cents: number;
  payment_provider: string;
  status: string;
  created_at: string;
}

export type TokenHistoryEntry =
  | { kind: 'purchase'; id: string; created_at: string; purchase: TokenPurchase }
  | { kind: 'seasonal'; id: string; created_at: string; seasonal: SeasonalHistoryPurchase }
  | { kind: 'gift'; id: string; created_at: string; gift: TokenGift };

/** Acepta tanto ISO como el formato de Postgres ("2026-10-06 18:00:00+00"). */
const toTime = (value: string): number => {
  const iso = value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
};

/**
 * Une compras de tokens, compras de loterías de temporada y regalos en una sola lista, del más
 * reciente al más antiguo. De las de temporada solo entran las aprobadas: una pendiente, repetida o
 * devuelta no es una compra hecha. En empate de fecha van primero los tokens, luego la temporada y
 * al final el regalo. No modifica las listas recibidas.
 */
export const buildTokenHistory = (
  purchases: readonly TokenPurchase[],
  gifts: readonly TokenGift[],
  seasonalPurchases: readonly SeasonalHistoryPurchase[] = [],
): TokenHistoryEntry[] => {
  const entries: TokenHistoryEntry[] = [
    ...purchases.map((purchase) => ({
      kind: 'purchase' as const,
      id: purchase.id,
      created_at: purchase.created_at,
      purchase,
    })),
    ...seasonalPurchases
      .filter((seasonal) => seasonal.status === 'approved')
      .map((seasonal) => ({
        kind: 'seasonal' as const,
        id: seasonal.id,
        created_at: seasonal.created_at,
        seasonal,
      })),
    ...gifts.map(({ id, amount, created_at }) => ({
      kind: 'gift' as const,
      id,
      created_at,
      gift: { id, amount, created_at },
    })),
  ];

  return entries
    .map((entry, index) => ({ entry, index, time: toTime(entry.created_at) }))
    .sort((a, b) => b.time - a.time || a.index - b.index)
    .map(({ entry }) => entry);
};

export const sumGiftTokens = (gifts: readonly TokenGift[]): number =>
  gifts.reduce((sum, gift) => sum + gift.amount, 0);

interface TokenSummaryInput {
  /** Tokens de bienvenida. */
  initial: number;
  /** Tokens acreditados por compras. */
  purchased: number;
  /** Tokens regalados por un administrador. */
  gifted: number;
  /** Tokens gastados según el registro de uso de la IA. */
  spentRecorded: number;
  /** Saldo actual; null mientras no ha cargado. */
  balance: number | null;
}

/**
 * Resumen de Mi cuenta: tokens recibidos (bienvenida + compras + regalos) y gastados.
 * Lo gastado es el mayor entre lo registrado y la diferencia entre recibidos y saldo.
 */
export const summarizeTokens = ({
  initial,
  purchased,
  gifted,
  spentRecorded,
  balance,
}: TokenSummaryInput): { received: number; spent: number } => {
  const received = initial + purchased + gifted;
  const spentFromBalance = balance === null ? 0 : Math.max(0, received - balance);
  return { received, spent: Math.max(spentRecorded, spentFromBalance) };
};
