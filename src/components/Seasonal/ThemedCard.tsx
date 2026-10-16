import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SeasonalRepository } from '../../repositories/SeasonalRepository';
import { localizedText, type CatalogLoteria } from '../../utils/seasonalCatalog';
import { formatUsdReference } from '../../utils/usdReference';
import './ThemedCard.css';

const PRICE_FORMAT = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

/** Lo que la tarjeta muestra de una lotería. */
export type ThemedCardLoteria = Pick<
  CatalogLoteria,
  | 'id'
  | 'name_es'
  | 'name_en'
  | 'description_es'
  | 'description_en'
  | 'grid_size'
  | 'card_count'
  | 'board_count'
  | 'price_cents'
  | 'cover_path'
  | 'sample_paths'
>;

interface ThemedCardProps {
  loteria: ThemedCardLoteria;
  layout: 'feature' | 'grid';
  isOwned?: boolean;
  /** Tipo de cambio para la referencia en dólares; null para no mostrarla. */
  usdRate?: number | null;
  /** false en la vista previa del asistente: el botón se ve igual pero no lleva a ningún lado. */
  linked?: boolean;
}

/** Tarjeta de una lotería temática (P5). La vista previa del asistente usa esta misma (FEAT-48, decisión 14). */
export const ThemedCard = ({ loteria, layout, isOwned = false, usdRate = null, linked = true }: ThemedCardProps) => {
  const { t, i18n } = useTranslation();
  const name = localizedText(loteria.name_es, loteria.name_en, i18n.language);
  const description = localizedText(loteria.description_es, loteria.description_en, i18n.language);
  const buttonContent = (
    <>
      {t('seasonal.catalog.viewLoteria')} <span aria-hidden="true">→</span>
    </>
  );

  const renderPrice = () => {
    if (isOwned) return <p className="themed-card__owned">{t('seasonal.detail.owned')}</p>;
    if (loteria.price_cents === null) return null;
    return (
      <p className="themed-card__price">
        <span className="themed-card__price-label">{t('seasonal.catalog.oneTime')}</span>
        <strong className="themed-card__price-amount">{PRICE_FORMAT.format(loteria.price_cents / 100)} MXN</strong>
        {usdRate !== null && (
          <span className="themed-card__price-label">({formatUsdReference(loteria.price_cents, usdRate)})</span>
        )}
      </p>
    );
  };

  return (
    <article className={`themed-card themed-card--${layout}`}>
      <div className="themed-card__cover-wrap">
        {loteria.cover_path ? (
          <img
            className="themed-card__cover"
            src={SeasonalRepository.previewUrl(loteria.cover_path)}
            alt={t('seasonal.coverAlt', { name })}
            loading="lazy"
          />
        ) : (
          <div className="themed-card__cover" aria-hidden="true" />
        )}
      </div>
      <div className="themed-card__body">
        <h3 className="themed-card__name">{name}</h3>
        <ul className="themed-card__tags">
          <li className="themed-card__tag themed-card__tag--mode">
            {t(loteria.grid_size === 9 ? 'seasonal.modeKids' : 'seasonal.modeClassic')}
          </li>
          {loteria.card_count !== null && <li className="themed-card__tag">{t('seasonal.cards', { count: loteria.card_count })}</li>}
          {loteria.board_count !== null && (
            <li className="themed-card__tag">{t('seasonal.boards', { count: loteria.board_count })}</li>
          )}
        </ul>
        {description && <p className="themed-card__description">{description}</p>}
        {layout === 'feature' && loteria.sample_paths.length > 0 && (
          <ul className="themed-card__samples" tabIndex={0} aria-label={t('seasonal.catalog.samplesLabel', { name })}>
            {loteria.sample_paths.map((path, index) => (
              <li key={path}>
                <img
                  className="themed-card__sample"
                  src={SeasonalRepository.previewUrl(path)}
                  alt={t('seasonal.catalog.sampleAlt', { number: index + 1, name })}
                  width={84}
                  height={126}
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
        )}
        <div className="themed-card__footer">
          {renderPrice()}
          {linked ? (
            <Link to={`/tematicas/${loteria.id}`} className="themed-card__button">
              {buttonContent}
            </Link>
          ) : (
            <span className="themed-card__button" aria-hidden="true">
              {buttonContent}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
