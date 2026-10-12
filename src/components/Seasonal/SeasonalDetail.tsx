import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaRegClock } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { SeasonalRepository, type SeasonalDetailResult } from '../../repositories/SeasonalRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { creditPaymentOnReturn } from '../../services/PurchaseService';
import { createSeasonalPreference } from '../../services/SeasonalPurchaseService';
import { localizedText, showsSampleNote } from '../../utils/seasonalCatalog';
import { seasonalStatus } from '../../utils/seasonalPublishing';
import { readSeasonalReturn } from '../../utils/seasonalPurchase';
import { seasonalBuyStateOf, type SeasonalReturnNotice } from '../../utils/seasonalBuyState';
import { applyPageMeta, seasonalDetailMeta } from '../../utils/pageMeta';
import { formatUsdReference } from '../../utils/usdReference';
import { EmailAuthModal } from '../Auth/EmailAuthModal';
import { CardPreviewModal } from '../SetView/CardPreviewModal';
import { SeasonalBuyPanel, SeasonalGuarantees } from './SeasonalBuyBox';
import { SeasonalDetailLinks, SeasonalIncludes } from './SeasonalDetailExtras';
import { SeasonalDetailNotice } from './SeasonalDetailNotice';
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
  const [openSampleIndex, setOpenSampleIndex] = useState<number | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOwned, setIsOwned] = useState(false);
  /** Pago en efectivo o transferencia que Mercado Pago aún no confirma. */
  const [isPending, setIsPending] = useState(false);
  /** Falso hasta saber si la cuenta tiene esta lotería: evita decir «no disponible» a quien la compró. */
  const [ownedChecked, setOwnedChecked] = useState(false);
  const [notice, setNotice] = useState<SeasonalReturnNotice | null>(null);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [buyFailed, setBuyFailed] = useState(false);
  const returnHandled = useRef(false);
  const userId = user?.id ?? null;

  const language = i18n.language;
  const showUsd = language?.startsWith('en') ?? false;

  const load = useCallback(async () => {
    setResult(null);
    setResult(await SeasonalRepository.getLoteriaDetail(id));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Solo una lotería publicada presenta su nombre a los buscadores.
  useEffect(() => {
    if (result?.status !== 'found' || seasonalStatus(result.loteria, new Date()) !== 'published') return;
    const { loteria } = result;
    const name = localizedText(loteria.name_es, loteria.name_en, language);
    const description = localizedText(loteria.description_es, loteria.description_en, language);
    applyPageMeta(document, seasonalDetailMeta(id, name, description, t));
  }, [result, language, id, t]);

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

  const closeSample = useCallback(() => setOpenSampleIndex(null), []);

  /**
   * Pregunta a la base si la cuenta ya tiene esta lotería o un pago en proceso por ella.
   * Si no se puede saber, se ofrece comprar: el servidor no cobra dos veces.
   */
  const refreshOwned = useCallback(async (): Promise<boolean> => {
    const ownership = (await SeasonalRepository.getMyOwnership())?.get(id) ?? null;
    setIsOwned(ownership === 'approved');
    setIsPending(ownership === 'pending');
    setOwnedChecked(true);
    return ownership === 'approved';
  }, [id]);

  useEffect(() => {
    refreshOwned();
  }, [refreshOwned, userId]);

  // Regreso de Mercado Pago: se lee una sola vez y se limpia la dirección.
  useEffect(() => {
    if (returnHandled.current) return;
    const returned = readSeasonalReturn(searchParams);
    if (!returned) return;
    returnHandled.current = true;
    setSearchParams({}, { replace: true });

    if (returned.kind === 'cancel') {
      setNotice('cancel');
      return;
    }
    if (returned.kind === 'pending') {
      setNotice('pending');
      // Se le avisa al servidor para que anote el pago en proceso sin esperar a Mercado Pago.
      if (returned.paymentId) creditPaymentOnReturn(returned.paymentId).then(() => refreshOwned());
      return;
    }
    setNotice('confirming');
    // Solo se dice «ya es tuya» si la base lo confirma; si no, el aviso de Mercado Pago la entregará.
    creditPaymentOnReturn(returned.paymentId)
      .then(() => refreshOwned())
      .then((owned) => setNotice(owned ? 'success' : 'pending'));
  }, [searchParams, setSearchParams, refreshOwned]);

  const handleBuy = async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setBuyFailed(false);
    setIsStartingPayment(true);
    const result = await createSeasonalPreference(id);
    if (result.success) {
      window.location.href = result.init_point;
      return;
    }
    setIsStartingPayment(false);
    if (result.error === 'NOT_LOGGED_IN') setIsAuthOpen(true);
    else if (result.error === 'ALREADY_OWNED') setIsOwned(true);
    else if (result.error === 'PAYMENT_PENDING') setIsPending(true);
    else if (result.error === 'NOT_AVAILABLE') load();
    else setBuyFailed(true);
  };

  const backLink = (
    <Link to="/tematicas" className="seasonal-detail__back">
      {t('seasonal.detail.back')}
    </Link>
  );

  const renderBody = () => {
    if (result === null) {
      return (
        <div className="seasonal-detail__skeleton" role="status" aria-label={t('common.loading')}>
          <div className="seasonal-detail__skeleton-cover" />
          <div className="seasonal-detail__skeleton-lines">
            <div className="seasonal-catalog__skeleton-line seasonal-catalog__skeleton-line--short" />
            <div className="seasonal-catalog__skeleton-line" />
            <div className="seasonal-catalog__skeleton-line" />
          </div>
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
    const isVisible = result.status === 'found' && seasonalStatus(result.loteria, new Date()) === 'published';
    if (result.status === 'found' && !isVisible && !ownedChecked) {
      return <div className="seasonal-detail__skeleton" role="status" aria-label={t('common.loading')} />;
    }
    // Un administrador recibe también los borradores: aquí se ve lo mismo que ve cualquiera.
    // Quien la compró, o tiene un pago en proceso, la sigue viendo aunque ya no esté en el catálogo.
    if (result.status === 'missing' || (!isVisible && !isOwned && !isPending)) {
      return (
        <div className="seasonal-detail__unavailable">
          <span className="seasonal-detail__unavailable-icon" aria-hidden="true">
            <FaRegClock />
          </span>
          <h1 className="seasonal-detail__unavailable-title">{t('seasonal.detail.unavailable')}</h1>
          <p className="seasonal-detail__unavailable-text">{t('seasonal.detail.unavailableText')}</p>
          <div className="seasonal-detail__unavailable-actions">
            <Link to="/tematicas" className="seasonal-catalog__button">
              {t('seasonal.detail.toCatalog')}
            </Link>
            {user && (
              <Link to="/dashboard" className="seasonal-detail__unavailable-link">
                {t('seasonal.detail.myAccount')}
              </Link>
            )}
          </div>
        </div>
      );
    }

    const { loteria, season } = result;
    const name = localizedText(loteria.name_es, loteria.name_en, language);
    const description = localizedText(loteria.description_es, loteria.description_en, language);
    const mode = t(loteria.grid_size === 9 ? 'dashboard.loterias.typeKids' : 'dashboard.loterias.typeClassic');
    const sampleCount = loteria.sample_paths.length;
    const buyState = seasonalBuyStateOf({ isOwned, isPending, isStartingPayment, buyFailed, notice });
    const buyPanel = {
      state: buyState,
      loteriaId: loteria.id,
      loteriaName: name,
      price: loteria.price_cents !== null ? `${PRICE_FORMAT.format(loteria.price_cents / 100)} MXN` : null,
      usdReference:
        showUsd && usdRate !== null && loteria.price_cents !== null
          ? formatUsdReference(loteria.price_cents, usdRate)
          : null,
      isLoggedIn: user !== null,
      onBuy: handleBuy,
      onLogin: () => setIsAuthOpen(true),
    };

    return (
      <>
        <div className="seasonal-detail__product">
          {loteria.cover_path && (
            <img
              className="seasonal-detail__cover"
              src={SeasonalRepository.previewUrl(loteria.cover_path)}
              alt={t('seasonal.coverAlt', { name })}
            />
          )}

          <aside className={`seasonal-detail__box ${buyState === 'owned' ? 'seasonal-detail__box--owned' : ''}`}>
            <p className="seasonal-detail__season">{localizedText(season.name_es, season.name_en, language)}</p>
            <h1 className="seasonal-detail__title">{name}</h1>
            {description !== '' && <p className="seasonal-detail__description">{description}</p>}
            <ul className="seasonal-detail__tags">
              <li className="seasonal-detail__tag seasonal-detail__tag--mode">{mode}</li>
              {loteria.card_count !== null && (
                <li className="seasonal-detail__tag">{t('seasonal.cards', { count: loteria.card_count })}</li>
              )}
              {loteria.board_count !== null && (
                <li className="seasonal-detail__tag">{t('seasonal.boards', { count: loteria.board_count })}</li>
              )}
            </ul>
            <SeasonalBuyPanel variant="box" {...buyPanel} />
            {showUsd && !isOwned && <p className="seasonal-detail__disclaimer">{t('buyTokens.disclaimerUsd')}</p>}
            <SeasonalGuarantees placement="box" />
          </aside>

          {sampleCount > 0 && (
            <section className="seasonal-detail__samples-section" aria-labelledby="seasonal-detail-samples">
              <div className="seasonal-detail__samples-head">
                <h2 id="seasonal-detail-samples" className="seasonal-detail__heading">
                  {t('seasonal.detail.samplesTitle')}
                </h2>
                {showsSampleNote(sampleCount, loteria.card_count) && (
                  <span className="seasonal-detail__note">
                    {t('seasonal.detail.samplesCount', { shown: sampleCount, count: loteria.card_count ?? 0 })}
                  </span>
                )}
              </div>
              <ul className="seasonal-detail__samples">
                {loteria.sample_paths.map((path, index) => {
                  return (
                    <li key={path}>
                      <button
                        type="button"
                        className="seasonal-detail__sample"
                        onClick={() => setOpenSampleIndex(index)}
                        aria-label={t('seasonal.detail.sampleOpen', { number: index + 1 })}
                      >
                        <img src={SeasonalRepository.previewUrl(path)} alt="" loading="lazy" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <SeasonalIncludes mode={mode} cardCount={loteria.card_count} boardCount={loteria.board_count} />
        <SeasonalGuarantees placement="flow" />
        <SeasonalDetailLinks />
        <SeasonalBuyPanel variant="bar" {...buyPanel} />
      </>
    );
  };

  // Carta de muestra abierta en grande; con más de una muestra se puede pasar de una a otra.
  const samplePaths = result?.status === 'found' ? result.loteria.sample_paths : [];
  const openSamplePath = openSampleIndex !== null ? samplePaths[openSampleIndex] : undefined;
  const openSample: Card | null =
    openSampleIndex !== null && openSamplePath !== undefined
      ? {
          id: openSamplePath,
          title: t('seasonal.detail.sampleTitle', { number: openSampleIndex + 1 }),
          image: SeasonalRepository.previewUrl(openSamplePath),
        }
      : null;
  const sampleNavigation =
    openSampleIndex !== null && samplePaths.length > 1
      ? {
          index: openSampleIndex,
          total: samplePaths.length,
          onChange: setOpenSampleIndex,
          labels: {
            previous: t('seasonal.detail.samplePrevious'),
            next: t('seasonal.detail.sampleNext'),
            position: t('seasonal.detail.samplePosition', { current: openSampleIndex + 1, total: samplePaths.length }),
          },
        }
      : undefined;

  return (
    <div className="seasonal-detail">
      <main className="seasonal-detail__main">
        {backLink}
        <SeasonalDetailNotice notice={notice} onClose={() => setNotice(null)} />
        {renderBody()}
      </main>
      <CardPreviewModal
        card={openSample}
        isOpen={openSample !== null}
        onClose={closeSample}
        navigation={sampleNavigation}
        finishedCard
      />
      <EmailAuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} initialMode="login" />
    </div>
  );
};
