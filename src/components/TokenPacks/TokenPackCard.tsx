import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { packSummary } from '../../utils/tokenPacks';
import './TokenPackCard.css';

interface TokenPackCardProps {
  pack: { base_tokens: number; bonus_tokens: number; price_cents: number };
  /** Porcentaje de promoción que aplica a quien mira (primera compra o código); 0 si ninguno. */
  promoPercent: number;
  /** «Para probar», «Para una lotería»…; sin nombre no se muestra título. */
  name?: string;
  /** Lleva la etiqueta «El más elegido». */
  highlighted: boolean;
  /** Texto chico bajo el precio, como la referencia en dólares. */
  priceNote?: string;
  /** El botón o enlace de la tarjeta; su aspecto lo pone `.token-pack__action`. */
  children: ReactNode;
}

/**
 * Tarjeta de un paquete de tokens, la misma en Beneficios y en Comprar tokens (FEAT-33): en grande
 * los tokens que se pagan, debajo el regalo y la promoción, el precio y cuántas fotos alcanza.
 */
export const TokenPackCard = ({ pack, promoPercent, name, highlighted, priceNote, children }: TokenPackCardProps) => {
  const { t } = useTranslation();
  const summary = packSummary(pack, promoPercent);

  return (
    <li className={`token-pack ${highlighted ? 'token-pack--highlighted' : ''}`}>
      {highlighted && <span className="token-pack__popular">{t('tokenPacks.popular')}</span>}
      {name && <h3 className="token-pack__name">{name}</h3>}
      <div className="token-pack__tokens">
        {pack.base_tokens} <span className="token-pack__unit">{t('tokenPacks.unit', { count: pack.base_tokens })}</span>
      </div>
      {(pack.bonus_tokens > 0 || summary.promoBonus > 0) && (
        <span className="token-pack__extras">
          {pack.bonus_tokens > 0 && <strong>{t('tokenPacks.bonus', { count: pack.bonus_tokens })}</strong>}
          {pack.bonus_tokens > 0 && summary.promoBonus > 0 && ' '}
          {summary.promoBonus > 0 && <strong>{t('tokenPacks.promo', { count: summary.promoBonus })}</strong>}
        </span>
      )}
      <strong className="token-pack__price">
        {t('tokenPacks.price', { price: summary.price })}
        {priceNote && <span className="token-pack__price-note">{priceNote}</span>}
      </strong>
      <span className="token-pack__per-photo">
        {t('tokenPacks.perPhoto', { count: summary.totalTokens, price: summary.pricePerPhoto })}
      </span>
      {children}
    </li>
  );
};

interface TokenPackListProps {
  children: ReactNode;
}

export const TokenPackList = ({ children }: TokenPackListProps) => <ul className="token-pack-list">{children}</ul>;
