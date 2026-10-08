import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { SeasonalRepository } from '../../repositories/SeasonalRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { groupCatalog, localizedText, type CatalogLoteria, type CatalogSeason } from '../../utils/seasonalCatalog';
import { formatUsdReference } from '../../utils/usdReference';
import './SeasonalCatalog.css';

interface CatalogData {
  seasons: CatalogSeason[];
  loterias: CatalogLoteria[];
}

const PRICE_FORMAT = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const SKELETON_CARDS = [0, 1, 2];
const STEPS = ['choose', 'buy', 'print'] as const;
const FAQ: { id: string; linkTo?: string }[] = [
  { id: 'receive' },
  { id: 'physical' },
  { id: 'pay' },
  { id: 'account' },
  { id: 'downloads' },
  { id: 'use', linkTo: '/como-se-juega' },
  { id: 'custom', linkTo: '/cards' },
];

export const SeasonalCatalog = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [data, setData] = useState<CatalogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);

  const language = i18n.language;
  const showUsd = language?.startsWith('en') ?? false;

  const load = useCallback(async () => {
    setIsLoading(true);
    const catalog = await SeasonalRepository.getCatalog();
    setLoadFailed(catalog === null);
    setData(catalog);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Si no se puede saber qué compró la cuenta, las tarjetas muestran el precio; el servidor no cobra dos veces.
  useEffect(() => {
    let cancelled = false;
    SeasonalRepository.getOwnedLoteriaIds().then((ids) => {
      if (!cancelled) setOwnedIds(ids ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!showUsd) return;
    let cancelled = false;
    TokenPricingRepository.getExchangeRateMxnUsd().then((rate) => {
      if (!cancelled) setUsdRate(rate);
    });
    return () => {
      cancelled = true;
    };
  }, [showUsd]);

  const groups = useMemo(() => (data ? groupCatalog(data.seasons, data.loterias, new Date()) : []), [data]);

  const renderCard = (loteria: CatalogLoteria) => {
    const name = localizedText(loteria.name_es, loteria.name_en, language);
    const summary = [
      t(loteria.grid_size === 9 ? 'seasonal.modeKids' : 'seasonal.modeClassic'),
      loteria.card_count !== null ? t('seasonal.cards', { count: loteria.card_count }) : null,
      loteria.board_count !== null ? t('seasonal.boards', { count: loteria.board_count }) : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <li key={loteria.id}>
        <Link to={`/tematicas/${loteria.id}`} className="seasonal-catalog__card">
          {loteria.cover_path ? (
            <img
              className="seasonal-catalog__cover"
              src={SeasonalRepository.previewUrl(loteria.cover_path)}
              alt={t('seasonal.coverAlt', { name })}
              loading="lazy"
            />
          ) : (
            <div className="seasonal-catalog__cover" aria-hidden="true" />
          )}
          <div className="seasonal-catalog__card-body">
            <h3 className="seasonal-catalog__card-name">{name}</h3>
            <p className="seasonal-catalog__card-summary">{summary}</p>
            {ownedIds.includes(loteria.id) ? (
              <p className="seasonal-catalog__card-owned">{t('seasonal.detail.owned')}</p>
            ) : loteria.price_cents !== null && (
              <p className="seasonal-catalog__card-price">
                {PRICE_FORMAT.format(loteria.price_cents / 100)} MXN
                {showUsd && usdRate !== null && (
                  <span className="seasonal-catalog__card-price-usd">
                    {' '}
                    ({formatUsdReference(loteria.price_cents, usdRate)})
                  </span>
                )}
              </p>
            )}
          </div>
        </Link>
      </li>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="seasonal-catalog__grid" role="status" aria-label={t('common.loading')}>
          {SKELETON_CARDS.map((index) => (
            <div key={index} className="seasonal-catalog__card seasonal-catalog__card--skeleton" aria-hidden="true">
              <div className="seasonal-catalog__cover" />
              <div className="seasonal-catalog__card-body">
                <div className="seasonal-catalog__skeleton-line" />
                <div className="seasonal-catalog__skeleton-line seasonal-catalog__skeleton-line--short" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (loadFailed) {
      return (
        <div className="seasonal-catalog__notice" role="alert">
          <p>{t('seasonal.catalog.error')}</p>
          <button type="button" className="seasonal-catalog__button" onClick={load}>
            {t('seasonal.retry')}
          </button>
        </div>
      );
    }
    if (groups.length === 0) {
      return (
        <div className="seasonal-catalog__notice">
          <p>{t('seasonal.catalog.empty')}</p>
          <Link to="/cards" className="seasonal-catalog__button">
            {t('seasonal.catalog.emptyCta')}
          </Link>
        </div>
      );
    }
    return (
      <>
        {groups.map(({ season, loterias }) => (
          <section key={season.id} className="seasonal-catalog__season" aria-labelledby={`season-${season.id}`}>
            <h2 id={`season-${season.id}`} className="seasonal-catalog__season-title">
              {localizedText(season.name_es, season.name_en, language)}
            </h2>
            <ul className="seasonal-catalog__grid">{loterias.map(renderCard)}</ul>
          </section>
        ))}
        {showUsd && <p className="seasonal-catalog__disclaimer">{t('buyTokens.disclaimerUsd')}</p>}
      </>
    );
  };

  return (
    <div className="seasonal-catalog">
      <header className="seasonal-catalog__header">
        <h1 className="seasonal-catalog__title">{t('seasonal.catalog.title')}</h1>
        <p className="seasonal-catalog__subtitle">{t('seasonal.catalog.subtitle')}</p>
      </header>
      <main className="seasonal-catalog__main">
        <section className="seasonal-catalog__how" aria-labelledby="seasonal-how-title">
          <h2 id="seasonal-how-title" className="seasonal-catalog__section-title">
            {t('seasonal.catalog.howTitle')}
          </h2>
          <ol className="seasonal-catalog__steps">
            {STEPS.map((step, index) => (
              <li key={step} className="seasonal-catalog__step">
                <span className="seasonal-catalog__step-number" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="seasonal-catalog__step-title">{t(`seasonal.catalog.steps.${step}.title`)}</h3>
                <p className="seasonal-catalog__step-text">{t(`seasonal.catalog.steps.${step}.text`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {renderContent()}

        <section className="seasonal-catalog__faq" aria-labelledby="seasonal-faq-title">
          <h2 id="seasonal-faq-title" className="seasonal-catalog__section-title">
            {t('seasonal.catalog.faqTitle')}
          </h2>
          <div className="seasonal-catalog__faq-list">
            {FAQ.map(({ id, linkTo }) => (
              <details key={id} className="seasonal-catalog__faq-item">
                <summary className="seasonal-catalog__faq-question">{t(`seasonal.catalog.faq.${id}.q`)}</summary>
                <p className="seasonal-catalog__faq-answer">
                  {t(`seasonal.catalog.faq.${id}.a`)}
                  {linkTo && (
                    <>
                      {' '}
                      <Link to={linkTo} className="seasonal-catalog__faq-link">
                        {t(`seasonal.catalog.faq.${id}.link`)}
                      </Link>
                    </>
                  )}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
