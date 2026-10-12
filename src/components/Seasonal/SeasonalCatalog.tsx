import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCreditCard, FaPrint, FaSearch } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { SeasonalRepository } from '../../repositories/SeasonalRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import type { FaqItem } from '../../utils/faqJsonLd';
import {
  catalogLayout,
  groupCatalog,
  localizedText,
  type CatalogLoteria,
  type CatalogSeason,
} from '../../utils/seasonalCatalog';
import { formatUsdReference } from '../../utils/usdReference';
import { FaqSection } from '../Faq/FaqSection';
import '../LandingPage/LandingPage.css';
import './SeasonalCatalog.css';
import './SeasonalCatalogPage.css';

interface CatalogData {
  seasons: CatalogSeason[];
  loterias: CatalogLoteria[];
}

const PRICE_FORMAT = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const SKELETON_CARDS = [0, 1, 2];
const CATALOG_ID = 'catalogo';

const STEPS = [
  { id: 'choose', Icon: FaSearch },
  { id: 'buy', Icon: FaCreditCard },
  { id: 'print', Icon: FaPrint },
] as const;

const FAQ: { id: string; linkTo?: string }[] = [
  { id: 'receive' },
  { id: 'physical' },
  { id: 'pay' },
  { id: 'account' },
  { id: 'downloads' },
  { id: 'use', linkTo: '/como-se-juega' },
  { id: 'custom', linkTo: '/cards' },
];

// Abanico del héroe: cartas de la Lotería de Halloween, de izquierda a derecha.
const HERO_FAN = [
  { file: 'halloween-01.jpg', name: 'El Catrín' },
  { file: 'halloween-03.jpg', name: 'La Calavera' },
  { file: 'halloween-02.jpg', name: 'El Gato' },
] as const;

/** P5 Catálogo «Temáticas» (FEAT-17; rediseñado en FEAT-33, US A3). */
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

  const faqItems: FaqItem[] = FAQ.map(({ id, linkTo }) => ({
    question: t(`seasonal.catalog.faq.${id}.q`),
    answer: t(`seasonal.catalog.faq.${id}.a`),
    ...(linkTo && { linkLabel: t(`seasonal.catalog.faq.${id}.link`), linkTo }),
  }));

  const renderTags = (loteria: CatalogLoteria) => (
    <ul className="themed-card__tags">
      <li className="themed-card__tag themed-card__tag--mode">
        {t(loteria.grid_size === 9 ? 'seasonal.modeKids' : 'seasonal.modeClassic')}
      </li>
      {loteria.card_count !== null && (
        <li className="themed-card__tag">{t('seasonal.cards', { count: loteria.card_count })}</li>
      )}
      {loteria.board_count !== null && (
        <li className="themed-card__tag">{t('seasonal.boards', { count: loteria.board_count })}</li>
      )}
    </ul>
  );

  const renderPrice = (loteria: CatalogLoteria) => {
    if (ownedIds.includes(loteria.id)) {
      return <p className="themed-card__owned">{t('seasonal.detail.owned')}</p>;
    }
    if (loteria.price_cents === null) return null;
    return (
      <p className="themed-card__price">
        <span className="themed-card__price-label">{t('seasonal.catalog.oneTime')}</span>
        <strong className="themed-card__price-amount">{PRICE_FORMAT.format(loteria.price_cents / 100)} MXN</strong>
        {showUsd && usdRate !== null && (
          <span className="themed-card__price-label">({formatUsdReference(loteria.price_cents, usdRate)})</span>
        )}
      </p>
    );
  };

  const renderCover = (loteria: CatalogLoteria, name: string) =>
    loteria.cover_path ? (
      <img
        className="themed-card__cover"
        src={SeasonalRepository.previewUrl(loteria.cover_path)}
        alt={t('seasonal.coverAlt', { name })}
        loading="lazy"
      />
    ) : (
      <div className="themed-card__cover" aria-hidden="true" />
    );

  const renderLoteria = (loteria: CatalogLoteria, layout: 'feature' | 'grid') => {
    const name = localizedText(loteria.name_es, loteria.name_en, language);
    const description = localizedText(loteria.description_es, loteria.description_en, language);
    return (
      <li key={loteria.id}>
        <article className={`themed-card themed-card--${layout}`}>
          <div className="themed-card__cover-wrap">{renderCover(loteria, name)}</div>
          <div className="themed-card__body">
            <h3 className="themed-card__name">{name}</h3>
            {renderTags(loteria)}
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
              {renderPrice(loteria)}
              <Link to={`/tematicas/${loteria.id}`} className="themed-card__button">
                {t('seasonal.catalog.viewLoteria')} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </article>
      </li>
    );
  };

  const renderCatalog = () => {
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
        {groups.map(({ season, loterias }) => {
          const layout = catalogLayout(loterias.length);
          return (
            <section key={season.id} className="themed-season" aria-labelledby={`season-${season.id}`}>
              <h2 id={`season-${season.id}`} className="landing-section__title">
                {localizedText(season.name_es, season.name_en, language)}
              </h2>
              <ul className={`themed-season__list themed-season__list--${layout}`}>
                {loterias.map((loteria) => renderLoteria(loteria, layout))}
              </ul>
            </section>
          );
        })}
        {showUsd && <p className="seasonal-catalog__disclaimer">{t('buyTokens.disclaimerUsd')}</p>}
      </>
    );
  };

  return (
    <main className="landing-page themed-page">
      <section className="themed-hero">
        <div className="themed-hero__inner">
          <div className="themed-hero__content">
            <h1 className="themed-hero__title">
              {t('seasonal.catalog.title')},{' '}
              <span className="themed-hero__title-highlight">{t('seasonal.catalog.heroHighlight')}</span>
            </h1>
            <p className="themed-hero__description">{t('seasonal.catalog.subtitle')}</p>
            <ul className="themed-hero__tags">
              <li>{t('seasonal.catalog.tags.letter')}</li>
              <li>{t('seasonal.catalog.tags.noWatermark')}</li>
              <li>{t('seasonal.catalog.tags.instant')}</li>
            </ul>
            <a href={`#${CATALOG_ID}`} className="landing-cta-button themed-hero__cta">
              {t('seasonal.catalog.viewCatalog')} <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="themed-hero__fan">
            {HERO_FAN.map(({ file, name }) => (
              <img
                key={file}
                className="themed-hero__fan-card"
                src={`/media/tematicas/${file}`}
                alt={t('seasonal.catalog.fanAlt', { name })}
                width={190}
                height={285}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="seasonal-how-title">
        <div className="landing-section__inner themed-how">
          <h2 id="seasonal-how-title" className="landing-section__title themed-how__title">
            {t('seasonal.catalog.howTitle')}
          </h2>
          <ol className="themed-how__list">
            {STEPS.map(({ id, Icon }, index) => (
              <li key={id} className="themed-how__step">
                <span className="themed-how__icon">
                  <Icon aria-hidden="true" />
                </span>
                <div>
                  <h3 className="themed-how__step-title">
                    <span className="themed-how__number">{index + 1}.</span> {t(`seasonal.catalog.steps.${id}.title`)}
                  </h3>
                  <p className="themed-how__text">{t(`seasonal.catalog.steps.${id}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id={CATALOG_ID} className="landing-section landing-section--band themed-catalog">
        <div className="landing-section__inner themed-catalog__inner">{renderCatalog()}</div>
      </section>

      <section className="landing-section">
        <div className="landing-section__inner">
          <div className="themed-custom">
            <div className="themed-custom__cards" aria-hidden="true">
              <img className="themed-custom__card" src="/media/inicio/cartas/carta-05.jpg" alt="" width={70} height={105} loading="lazy" />
              <img className="themed-custom__card" src="/media/inicio/cartas/carta-03.jpg" alt="" width={70} height={105} loading="lazy" />
            </div>
            <div className="themed-custom__text">
              <h2 className="themed-custom__title">{t('seasonal.catalog.custom.title')}</h2>
              <p className="themed-custom__description">{t('seasonal.catalog.custom.text')}</p>
            </div>
            <Link to="/cards" className="themed-card__button themed-custom__button">
              {t('seasonal.catalog.custom.cta')} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <FaqSection title={t('seasonal.catalog.faqTitle')} items={faqItems} />
    </main>
  );
};
