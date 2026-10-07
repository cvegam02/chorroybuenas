import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { SeasonalRepository, type SeasonalDetailResult } from '../../repositories/SeasonalRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { localizedText, showsSampleNote } from '../../utils/seasonalCatalog';
import { seasonalStatus } from '../../utils/seasonalPublishing';
import { formatUsdReference } from '../../utils/usdReference';
import { EmailAuthModal } from '../Auth/EmailAuthModal';
import { CardPreviewModal } from '../SetView/CardPreviewModal';
import type { Card } from '../../types';
import './SeasonalCatalog.css';
import './SeasonalDetail.css';

const PRICE_FORMAT = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export const SeasonalDetail = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [result, setResult] = useState<SeasonalDetailResult | null>(null);
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [openSample, setOpenSample] = useState<Card | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const language = i18n.language;
  const showUsd = language?.startsWith('en') ?? false;

  const load = useCallback(async () => {
    setResult(null);
    setResult(await SeasonalRepository.getLoteriaDetail(id));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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

  const closeSample = useCallback(() => setOpenSample(null), []);

  // La compra real llega en la historia C1; por ahora solo se pide sesión.
  const handleBuy = () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setShowComingSoon(true);
  };

  const backLink = (
    <Link to="/temporada" className="seasonal-detail__back">
      {t('seasonal.detail.back')}
    </Link>
  );

  const renderBody = () => {
    if (result === null) {
      return (
        <div className="seasonal-detail__skeleton" role="status" aria-label={t('common.loading')}>
          <div className="seasonal-detail__cover" />
          <div className="seasonal-catalog__skeleton-line" />
          <div className="seasonal-catalog__skeleton-line seasonal-catalog__skeleton-line--short" />
        </div>
      );
    }
    if (result.status === 'error') {
      return (
        <div className="seasonal-catalog__notice" role="alert">
          <p>{t('seasonal.detail.error')}</p>
          <button type="button" className="seasonal-catalog__button" onClick={load}>
            {t('seasonal.retry')}
          </button>
        </div>
      );
    }
    // Un administrador recibe también los borradores: aquí se ve lo mismo que ve cualquiera.
    if (result.status === 'missing' || seasonalStatus(result.loteria, new Date()) !== 'published') {
      return (
        <div className="seasonal-catalog__notice">
          <p>{t('seasonal.detail.unavailable')}</p>
          <Link to="/temporada" className="seasonal-catalog__button">
            {t('seasonal.detail.toCatalog')}
          </Link>
        </div>
      );
    }

    const { loteria, season } = result;
    const name = localizedText(loteria.name_es, loteria.name_en, language);
    const description = localizedText(loteria.description_es, loteria.description_en, language);
    const mode = t(loteria.grid_size === 9 ? 'seasonal.modeKids' : 'seasonal.modeClassic');

    return (
      <>
        <header className="seasonal-detail__header">
          <p className="seasonal-detail__season">{localizedText(season.name_es, season.name_en, language)}</p>
          <h1 className="seasonal-detail__title">{name}</h1>
        </header>

        <div className="seasonal-detail__layout">
          <div className="seasonal-detail__content">
            {loteria.cover_path && (
              <img
                className="seasonal-detail__cover"
                src={SeasonalRepository.previewUrl(loteria.cover_path)}
                alt={t('seasonal.coverAlt', { name })}
              />
            )}

            {loteria.sample_paths.length > 0 && (
              <section aria-labelledby="seasonal-detail-samples">
                <h2 id="seasonal-detail-samples" className="seasonal-detail__heading">
                  {t('seasonal.detail.samplesTitle')}
                </h2>
                <ul className="seasonal-detail__samples">
                  {loteria.sample_paths.map((path, index) => {
                    const image = SeasonalRepository.previewUrl(path);
                    const title = t('seasonal.detail.sampleTitle', { number: index + 1 });
                    return (
                      <li key={path}>
                        <button
                          type="button"
                          className="seasonal-detail__sample"
                          onClick={() => setOpenSample({ id: path, title, image })}
                          aria-label={t('seasonal.detail.sampleOpen', { number: index + 1 })}
                        >
                          <img src={image} alt="" loading="lazy" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {showsSampleNote(loteria.sample_paths.length, loteria.card_count) && (
                  <p className="seasonal-detail__note">
                    {t('seasonal.detail.samplesNote', { count: loteria.card_count ?? 0 })}
                  </p>
                )}
              </section>
            )}

            <section aria-labelledby="seasonal-detail-includes">
              <h2 id="seasonal-detail-includes" className="seasonal-detail__heading">
                {t('seasonal.detail.includesTitle')}
              </h2>
              <ul className="seasonal-detail__includes">
                <li>{t('seasonal.detail.includesMode', { mode })}</li>
                {loteria.card_count !== null && <li>{t('seasonal.cards', { count: loteria.card_count })}</li>}
                {loteria.board_count !== null && <li>{t('seasonal.boards', { count: loteria.board_count })}</li>}
                <li>{t('seasonal.detail.includesPdf')}</li>
              </ul>
            </section>

            {description !== '' && (
              <section aria-labelledby="seasonal-detail-description">
                <h2 id="seasonal-detail-description" className="seasonal-detail__heading">
                  {t('seasonal.detail.descriptionTitle')}
                </h2>
                <p className="seasonal-detail__description">{description}</p>
              </section>
            )}
          </div>

          <aside className="seasonal-detail__buy">
            {loteria.price_cents !== null && (
              <p className="seasonal-detail__price">
                {PRICE_FORMAT.format(loteria.price_cents / 100)} MXN
                {showUsd && usdRate !== null && (
                  <span className="seasonal-detail__price-usd">
                    {' '}
                    ({formatUsdReference(loteria.price_cents, usdRate)})
                  </span>
                )}
              </p>
            )}
            <button type="button" className="seasonal-catalog__button seasonal-detail__buy-button" onClick={handleBuy}>
              {t('seasonal.detail.buy')}
            </button>
            {showComingSoon && (
              <p className="seasonal-detail__coming-soon" role="status">
                {t('seasonal.detail.comingSoon')}
              </p>
            )}
            <p className="seasonal-detail__digital">{t('seasonal.detail.digitalNote')}</p>
            {showUsd && <p className="seasonal-detail__digital">{t('buyTokens.disclaimerUsd')}</p>}
          </aside>
        </div>
      </>
    );
  };

  return (
    <div className="seasonal-detail">
      <main className="seasonal-detail__main">
        {backLink}
        {renderBody()}
      </main>
      <CardPreviewModal card={openSample} isOpen={openSample !== null} onClose={closeSample} />
      <EmailAuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} initialMode="login" />
    </div>
  );
};
