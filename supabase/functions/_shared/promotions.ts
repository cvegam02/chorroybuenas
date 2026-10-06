export interface PromotionRow {
  id: string;
  code: string | null;
  type: string;
  config: { percent?: unknown } | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface SelectedPromotion {
  id: string;
  type: 'code' | 'first_purchase';
  percent: number;
}

function isVigente(p: PromotionRow, now: Date): boolean {
  if (!p.is_active) return false;
  if (p.valid_from && new Date(p.valid_from) > now) return false;
  if (p.valid_until && new Date(p.valid_until) < now) return false;
  return true;
}

function percentOf(p: PromotionRow): number {
  const percent = p.config?.percent;
  return typeof percent === 'number' && percent >= 1 && percent <= 100 ? Math.round(percent) : 0;
}

/**
 * Prioridad: 1) código válido que el usuario no haya usado antes; 2) promo de primera compra.
 */
export function selectPromotion(input: {
  promos: PromotionRow[];
  promoCode: string | null;
  isFirstPurchase: boolean;
  usedPromotionIds: string[];
  now: Date;
}): SelectedPromotion | null {
  const candidates = input.promos.filter((p) => isVigente(p, input.now) && percentOf(p) > 0);

  const wanted = input.promoCode?.trim().toUpperCase();
  if (wanted) {
    const byCode = candidates.find(
      (p) => p.type === 'code' && p.code?.trim().toUpperCase() === wanted && !input.usedPromotionIds.includes(p.id),
    );
    if (byCode) return { id: byCode.id, type: 'code', percent: percentOf(byCode) };
  }

  if (input.isFirstPurchase) {
    const first = candidates.find((p) => p.type === 'first_purchase');
    if (first) return { id: first.id, type: 'first_purchase', percent: percentOf(first) };
  }

  return null;
}

export function computePromotionBonus(baseTokens: number, percent: number): number {
  return percent > 0 ? Math.floor(baseTokens * (percent / 100)) : 0;
}
