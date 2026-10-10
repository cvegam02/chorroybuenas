import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { FaArrowDown, FaCoins, FaGift, FaLock, FaStore, FaUndo } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useTokenBalance } from '../../contexts/TokenContext';
import { TokenPricingRepository, TokenPack, type PromoSummary } from '../../repositories/TokenPricingRepository';
import { usePromoCode } from '../../hooks/usePromoCode';
import { MAX_CUSTOM_TOKENS, MIN_CUSTOM_TOKENS } from '../../utils/purchaseRules';
import { createPaymentPreference, creditPaymentOnReturn } from '../../services/PurchaseService';
import { TokenRepository } from '../../repositories/TokenRepository';
import { readReturnedPaymentId } from '../../services/creditOnReturn';
import { AuthChoice } from '../Auth/AuthChoice';
import { TokenPackCard, TokenPackList } from '../TokenPacks/TokenPackCard';
import { EmailAuthModal } from '../Auth/EmailAuthModal';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { useWelcomeTokens } from '../../hooks/useWelcomeTokens';
import '../LandingPage/LandingPage.css';
import './BuyTokensPage.css';
import { logger } from '../../utils/logger';
import { PACK_NAME_KEYS } from '../../utils/tokenPackNames';
import { clampCustomTokens, highlightedPackIndex, stepCustomTokens } from '../../utils/tokenPacks';
import { roundUsdFriendly } from '../../utils/usdReference';

/** Al entrar desde aquí, con Google o con correo, se regresa aquí (FEAT-33, decisión de Carlos). */
const RETURN_PATH = '/comprar-tokens';
const CUSTOM_SHORTCUTS = [5, 15, 30, 100];

export const BuyTokensPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, isLoading } = useAuth();
  const { balance, refreshBalance } = useTokenBalance();
  const welcomeTokens = useWelcomeTokens();
  const [searchParams, setSearchParams] = useSearchParams();
  const [packs, setPacks] = useState<TokenPack[]>([]);
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [pricePerTokenCents, setPricePerTokenCents] = useState<number>(200);
  const [isFirstPurchase, setIsFirstPurchase] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isNotLoggedInModalOpen, setIsNotLoggedInModalOpen] = useState(false);
  const [customTokens, setCustomTokens] = useState<number>(15);
  const [promoCode, setPromoCode] = useState('');
  const [promoSummary, setPromoSummary] = useState<PromoSummary>({ firstPurchasePercent: 0, hasCodePromos: false });
  const codePromoPercent = usePromoCode(promoCode, !!user);
  const [buyLoading, setBuyLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'crediting' | 'success' | 'cancel' | 'pending' | null>(null);
  const handledPaymentRef = useRef<string | null>(null);

  const CUSTOM_MIN = MIN_CUSTOM_TOKENS;
  const CUSTOM_MAX = MAX_CUSTOM_TOKENS;

  const showUsd = i18n.language?.startsWith('en') ?? false;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${t('buyTokens.title')} | Lotería Personalizada`;
  }, [t]);

  // Manejar URLs de retorno de Mercado Pago (success/cancel/pending)
  useEffect(() => {
    const success = searchParams.get('success');
    const cancel = searchParams.get('cancel');
    const pending = searchParams.get('pending');
    // No basta con get('payment_id'): el primero es nuestro marcador sin sustituir.
    const paymentId = readReturnedPaymentId(searchParams);

    if (success === '1' && paymentId) {
      // Limpiar query params después de leerlos, para que recargar la página no repita el flujo
      setSearchParams({}, { replace: true });
      // El efecto puede dispararse dos veces con los mismos parámetros: un pago se procesa una vez.
      if (handledPaymentRef.current === paymentId) return;
      handledPaymentRef.current = paymentId;

      setPaymentStatus('crediting');
      // Acreditar ahora, sin esperar al aviso de Mercado Pago (contexto-negocio §8).
      creditPaymentOnReturn(paymentId).then((outcome) => {
        // 'processing': el servidor aún no confirma el pago; llegará por el aviso de Mercado Pago.
        setPaymentStatus(outcome === 'credited' ? 'success' : 'pending');
      });
    } else if (cancel === '1') {
      setPaymentStatus('cancel');
      setSearchParams({}, { replace: true });
    } else if (pending === '1' || success === '1') {
      // Pago pendiente, o regreso de éxito sin identificador legible: los tokens llegan por el aviso.
      setPaymentStatus('pending');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Al terminar de acreditar, volver a pedir el saldo al servidor. Va en su propio efecto porque,
  // al regresar del pago, la sesión del usuario suele cargarse después de que arranca la acreditación.
  const userId = user?.id;
  useEffect(() => {
    if (!userId || (paymentStatus !== 'success' && paymentStatus !== 'pending')) return;
    TokenRepository.invalidateBalance(userId);
    refreshBalance();
  }, [paymentStatus, userId, refreshBalance]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [packsData, rate, pricePerToken, promos] = await Promise.all([
        TokenPricingRepository.getPacks(),
        showUsd ? TokenPricingRepository.getExchangeRateMxnUsd() : Promise.resolve(null),
        TokenPricingRepository.getPricing('MXN'),
        TokenPricingRepository.getPromoSummary(),
      ]);
      if (cancelled) return;
      setPacks(packsData);
      setUsdRate(rate ?? null);
      setPricePerTokenCents(pricePerToken);
      setPromoSummary(promos);

      if (user?.id) {
        const count = await TokenPricingRepository.getPurchaseCount(user.id);
        if (!cancelled) setIsFirstPurchase(count === 0);
      } else {
        if (!cancelled) setIsFirstPurchase(false);
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, showUsd]);

  const formatPriceMxn = (cents: number): string => {
    return `$${(cents / 100).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN`;
  };

  const formatPriceUsdRef = (cents: number): string => {
    if (usdRate == null) return '';
    const usd = (cents / 100) * usdRate;
    const friendly = roundUsdFriendly(usd);
    return ` ($${friendly.toFixed(2)} USD)`;
  };

  const handleBuy = async (pack: TokenPack) => {
    setBuyLoading(true);
    try {
      const result = await createPaymentPreference({
        packId: pack.id,
        promoCode: promoCodeTrimmed || undefined,
      });
      setBuyLoading(false);
      if (!result.success && result.error === 'NOT_LOGGED_IN') {
        setIsNotLoggedInModalOpen(true);
        return;
      }
      if (result.success && result.init_point) {
        // Redirigir a Mercado Pago
        window.location.href = result.init_point;
      } else if (!result.success) {
        const errorMsg = result.message || t('buyTokens.errors.createPreferenceFailed');
        logger.error('Error al crear preferencia:', result);
        alert(errorMsg);
      } else {
        alert(t('buyTokens.errors.createPreferenceFailed'));
      }
    } catch (error) {
      setBuyLoading(false);
      logger.error('Error al crear preferencia:', error);
      alert(t('buyTokens.errors.networkError'));
    }
  };

  const handleBuyCustom = async () => {
    if (!customValid) return;
    setBuyLoading(true);
    try {
      const result = await createPaymentPreference({
        customTokens: customTokensClamped,
        promoCode: promoCodeTrimmed || undefined,
      });
      setBuyLoading(false);
      if (!result.success && result.error === 'NOT_LOGGED_IN') {
        setIsNotLoggedInModalOpen(true);
        return;
      }
      if (result.success && result.init_point) {
        // Redirigir a Mercado Pago
        window.location.href = result.init_point;
      } else if (!result.success) {
        const errorMsg = result.message || t('buyTokens.errors.createPreferenceFailed');
        logger.error('Error al crear preferencia:', result);
        alert(errorMsg);
      } else {
        alert(t('buyTokens.errors.createPreferenceFailed'));
      }
    } catch (error) {
      setBuyLoading(false);
      logger.error('Error al crear preferencia:', error);
      alert(t('buyTokens.errors.networkError'));
    }
  };

  const customTokensClamped = clampCustomTokens(customTokens);
  const customPriceCents = customTokensClamped * pricePerTokenCents;
  const customValid = customTokens >= CUSTOM_MIN && customTokens <= CUSTOM_MAX;

  const promoCodeTrimmed = promoCode.trim().toUpperCase();
  // Mismo orden que el servidor: un código válido tiene prioridad sobre la promo de primera compra.
  const firstPurchasePercent = isFirstPurchase ? promoSummary.firstPurchasePercent : 0;
  const appliedPromoPercent = codePromoPercent > 0 ? codePromoPercent : firstPurchasePercent;

  if (isLoading || loading) {
    return (
      <main className="landing-page buy-tokens">
        <p className="buy-tokens__loading" role="status">
          {t('common.loading')}
        </p>
      </main>
    );
  }

  const isLoggedIn = !!user;
  const highlightedPack = highlightedPackIndex(packs.length);
  const showPackNames = packs.length === PACK_NAME_KEYS.length;
  const openSignUp = () => setIsEmailModalOpen(true);

  return (
    <main className="landing-page buy-tokens">
      {paymentStatus === 'crediting' && (
        <div className="buy-tokens__message buy-tokens__message--pending" role="status">
          <div>
            <h2>{t('buyTokens.paymentCrediting.title')}</h2>
            <p>{t('buyTokens.paymentCrediting.message')}</p>
          </div>
        </div>
      )}
      {paymentStatus === 'success' && (
        <div className="buy-tokens__message buy-tokens__message--success" role="status">
          <FaCoins aria-hidden="true" />
          <div>
            <h2>{t('buyTokens.paymentSuccess.title')}</h2>
            <p>{t('buyTokens.paymentSuccess.message')}</p>
          </div>
          <button type="button" onClick={() => setPaymentStatus(null)}>
            {t('common.close')}
          </button>
        </div>
      )}
      {paymentStatus === 'cancel' && (
        <div className="buy-tokens__message buy-tokens__message--cancel" role="status">
          <div>
            <h2>{t('buyTokens.paymentCancel.title')}</h2>
            <p>{t('buyTokens.paymentCancel.message')}</p>
          </div>
          <button type="button" onClick={() => setPaymentStatus(null)}>
            {t('common.close')}
          </button>
        </div>
      )}
      {paymentStatus === 'pending' && (
        <div className="buy-tokens__message buy-tokens__message--pending" role="status">
          <div>
            <h2>{t('buyTokens.paymentPending.title')}</h2>
            <p>{t('buyTokens.paymentPending.message')}</p>
          </div>
          <button type="button" onClick={() => setPaymentStatus(null)}>
            {t('common.close')}
          </button>
        </div>
      )}

      <section className="buy-tokens__hero">
        <div className="buy-tokens__hero-inner">
          <div className="buy-tokens__hero-text">
            <h1 className="buy-tokens__title">{t('buyTokens.title')}</h1>
            <p className="buy-tokens__subtitle">{t('buyTokens.subtitle')}</p>
          </div>
          {isLoggedIn ? (
            <div className="buy-tokens__balance">
              <span className="buy-tokens__balance-icon">
                <FaCoins aria-hidden="true" />
              </span>
              <div className="buy-tokens__balance-text">
                <span className="buy-tokens__balance-label">{t('buyTokens.balanceLabel')}</span>
                <strong className="buy-tokens__balance-amount">
                  {balance !== null ? t('navbar.tokensBalance', { count: balance }) : '—'}
                </strong>
              </div>
            </div>
          ) : (
            <div className="buy-tokens__guest">
              <p className="buy-tokens__guest-text">
                <FaGift aria-hidden="true" />
                <span>
                  {welcomeTokens !== null && <>{t('buyTokens.guestGift', { count: welcomeTokens })} </>}
                  {t('buyTokens.guestNeedAccount')}
                </span>
              </p>
              <AuthChoice tone="onLight" showLogin returnPath={RETURN_PATH} />
            </div>
          )}
        </div>
      </section>

      {isLoggedIn && firstPurchasePercent > 0 && (
        <div className="buy-tokens__block">
          <p className="buy-tokens__first-purchase">
            <FaGift aria-hidden="true" />
            {t('buyTokens.firstPurchaseBadge', { percent: firstPurchasePercent })}
          </p>
        </div>
      )}

      <section className="buy-tokens__block buy-tokens__packs" aria-labelledby="buy-tokens-packs-title">
        <h2 id="buy-tokens-packs-title" className="buy-tokens__section-title">
          {t('buyTokens.choosePack')}
        </h2>
        <TokenPackList>
          {packs.map((pack, index) => (
            <TokenPackCard
              key={pack.id}
              pack={pack}
              promoPercent={appliedPromoPercent}
              name={showPackNames ? t(PACK_NAME_KEYS[index]) : undefined}
              highlighted={index === highlightedPack}
              priceNote={showUsd ? formatPriceUsdRef(pack.price_cents) : undefined}
            >
              {isLoggedIn ? (
                <button
                  type="button"
                  className="token-pack__action"
                  onClick={() => handleBuy(pack)}
                  disabled={buyLoading}
                >
                  {t('tokenPacks.buy')}
                </button>
              ) : (
                <button type="button" className="token-pack__action" onClick={openSignUp}>
                  {t('buyTokens.guestBuy')}
                </button>
              )}
            </TokenPackCard>
          ))}
        </TokenPackList>
      </section>

      <section className="buy-tokens__block buy-tokens__extras">
        <div className="buy-tokens__custom">
          <div>
            <h2 className="buy-tokens__custom-title">{t('buyTokens.customTitle')}</h2>
            <p className="buy-tokens__custom-range">
              {t('buyTokens.customRange', { min: CUSTOM_MIN, max: CUSTOM_MAX, price: formatPriceMxn(pricePerTokenCents) })}
              {showUsd && <span className="buy-tokens__usd">{formatPriceUsdRef(pricePerTokenCents)}</span>}
            </p>
          </div>
          <div className="buy-tokens__stepper">
            <button
              type="button"
              className="buy-tokens__step"
              aria-label={t('buyTokens.less')}
              onClick={() => setCustomTokens((current) => stepCustomTokens(current, -1))}
              disabled={customTokensClamped <= CUSTOM_MIN}
            >
              −
            </button>
            <label className="buy-tokens__amount">
              <input
                type="number"
                min={CUSTOM_MIN}
                max={CUSTOM_MAX}
                value={customTokens}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) setCustomTokens(v);
                  else if (e.target.value === '') setCustomTokens(0);
                }}
                onBlur={() => setCustomTokens((prev) => clampCustomTokens(prev))}
                className="buy-tokens__amount-input"
                aria-label={t('buyTokens.customTitle')}
              />
              <span className="buy-tokens__amount-unit">{t('buyTokens.tokens')}</span>
            </label>
            <button
              type="button"
              className="buy-tokens__step"
              aria-label={t('buyTokens.more')}
              onClick={() => setCustomTokens((current) => stepCustomTokens(current, 1))}
              disabled={customTokensClamped >= CUSTOM_MAX}
            >
              +
            </button>
          </div>
          <div className="buy-tokens__shortcuts">
            {CUSTOM_SHORTCUTS.map((amount) => (
              <button
                key={amount}
                type="button"
                className={`buy-tokens__shortcut ${customTokens === amount ? 'buy-tokens__shortcut--current' : ''}`}
                aria-pressed={customTokens === amount}
                onClick={() => setCustomTokens(clampCustomTokens(amount))}
              >
                {amount}
              </button>
            ))}
          </div>
          {isLoggedIn && appliedPromoPercent > 0 && (
            <p className="buy-tokens__custom-bonus">
              {codePromoPercent > 0
                ? t('buyTokens.promoCodeBonus', { percent: codePromoPercent })
                : t('buyTokens.customBonus', { percent: appliedPromoPercent })}
            </p>
          )}
          <div className="buy-tokens__custom-footer">
            <div className="buy-tokens__custom-total">
              <span className="buy-tokens__custom-total-label">{t('buyTokens.customTotal')}</span>
              <strong className="buy-tokens__custom-total-amount">
                {formatPriceMxn(customPriceCents)}
                {showUsd && <span className="buy-tokens__usd">{formatPriceUsdRef(customPriceCents)}</span>}
              </strong>
            </div>
            {isLoggedIn ? (
              <button
                type="button"
                className="buy-tokens__custom-buy"
                onClick={handleBuyCustom}
                disabled={!customValid || buyLoading}
              >
                {t('buyTokens.customBuy', { count: customTokensClamped })}
              </button>
            ) : (
              <button type="button" className="buy-tokens__custom-buy" onClick={openSignUp}>
                {t('buyTokens.guestBuy')}
              </button>
            )}
          </div>
        </div>

        <div className="buy-tokens__side">
          {promoSummary.hasCodePromos && isLoggedIn && (
            <details className="buy-tokens__promo" open>
              <summary className="buy-tokens__promo-title">{t('buyTokens.promoCodeLabel')}</summary>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder={t('buyTokens.promoCodePlaceholder')}
                className="buy-tokens__promo-input"
                maxLength={32}
                aria-label={t('buyTokens.promoCodeLabel')}
              />
              {codePromoPercent > 0 && (
                <span className="buy-tokens__promo-applied" role="status">
                  ✓ {t('buyTokens.promoCodeApplied', { percent: codePromoPercent })}
                </span>
              )}
            </details>
          )}
          <ul className="buy-tokens__trust">
            <li>
              <FaLock aria-hidden="true" />
              {t('buyTokens.trustSecure')}
            </li>
            <li>
              <FaStore aria-hidden="true" />
              {t('buyTokens.trustCash')}
            </li>
            <li>
              <FaUndo aria-hidden="true" />
              {t('buyTokens.trustRefund')}
            </li>
          </ul>
        </div>
      </section>

      <section className="landing-section--band">
        <div className="buy-tokens__block buy-tokens__how">
          <div className="buy-tokens__how-images">
            <img
              className="buy-tokens__how-before"
              src="/media/beneficios/antes-la-chata.jpg"
              alt={t('buyTokens.beforeAlt')}
              width={150}
              height={200}
              loading="lazy"
            />
            <span className="buy-tokens__how-arrow">
              {t('buyTokens.oneToken')}
              <FaArrowDown aria-hidden="true" />
            </span>
            <img
              className="buy-tokens__how-after"
              src="/media/beneficios/ia-la-chata.jpg"
              alt={t('landing.benefitsPage.gallery.cardAlt', { name: 'La Chata' })}
              width={140}
              height={210}
              loading="lazy"
            />
          </div>
          <div className="buy-tokens__how-text">
            <h2 className="buy-tokens__section-title">{t('buyTokens.howTitle')}</h2>
            <p>{t('buyTokens.howText')}</p>
            <Link to="/beneficios" className="buy-tokens__how-link">
              {t('buyTokens.examplesLink')} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <p className="buy-tokens__currency-note">{t('buyTokens.currencyNote')}</p>

      <EmailAuthModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        initialMode="signup"
        googleReturnPath={RETURN_PATH}
      />
      <WarningModal
        isOpen={isNotLoggedInModalOpen}
        title={t('buyTokens.notLoggedInModal.title')}
        message={t('buyTokens.notLoggedInModal.message')}
        confirmText={t('buyTokens.notLoggedInModal.close')}
        onConfirm={() => setIsNotLoggedInModalOpen(false)}
        onCancel={() => setIsNotLoggedInModalOpen(false)}
        singleButton
      />
    </main>
  );
};
