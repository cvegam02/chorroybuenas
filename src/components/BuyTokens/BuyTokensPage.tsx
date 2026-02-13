import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { FaCoins } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useTokenBalance } from '../../contexts/TokenContext';
import { TokenPricingRepository, TokenPack, type ActivePromotion } from '../../repositories/TokenPricingRepository';
import { createPaymentPreference } from '../../services/PurchaseService';
import { EmailAuthModal } from '../Auth/EmailAuthModal';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import './BuyTokensPage.css';

/** Redondea a valor amigable para USD (ej. 0.43 → 0.50). */
function roundUsdFriendly(value: number): number {
  if (value >= 1) return Math.round(value * 100) / 100;
  if (value >= 0.1) return Math.ceil(value * 20) / 20;
  return Math.ceil(value * 100) / 100;
}

export const BuyTokensPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, isLoading } = useAuth();
  const { refreshBalance } = useTokenBalance();
  const [searchParams, setSearchParams] = useSearchParams();
  const [packs, setPacks] = useState<TokenPack[]>([]);
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [pricePerTokenCents, setPricePerTokenCents] = useState<number>(200);
  const [isFirstPurchase, setIsFirstPurchase] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isNotLoggedInModalOpen, setIsNotLoggedInModalOpen] = useState(false);
  const [customTokens, setCustomTokens] = useState<number>(10);
  const [promoCode, setPromoCode] = useState('');
  const [promotions, setPromotions] = useState<ActivePromotion[]>([]);
  const [buyLoading, setBuyLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancel' | 'pending' | null>(null);

  const CUSTOM_MIN = 1;
  const CUSTOM_MAX = 500;

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
    const paymentId = searchParams.get('payment_id');

    if (success === '1' && paymentId) {
      setPaymentStatus('success');
      refreshBalance();
      // Limpiar query params después de procesar
      setSearchParams({}, { replace: true });
    } else if (cancel === '1') {
      setPaymentStatus('cancel');
      setSearchParams({}, { replace: true });
    } else if (pending === '1' && paymentId) {
      setPaymentStatus('pending');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refreshBalance]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [packsData, rate, pricePerToken, promos] = await Promise.all([
        TokenPricingRepository.getPacks(),
        showUsd ? TokenPricingRepository.getExchangeRateMxnUsd() : Promise.resolve(null),
        TokenPricingRepository.getPricing('MXN'),
        TokenPricingRepository.getActivePromotions(),
      ]);
      if (cancelled) return;
      setPacks(packsData);
      setUsdRate(rate ?? null);
      setPricePerTokenCents(pricePerToken);
      setPromotions(promos);

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
        console.error('Error al crear preferencia:', result);
        alert(errorMsg);
      } else {
        alert(t('buyTokens.errors.createPreferenceFailed'));
      }
    } catch (error) {
      setBuyLoading(false);
      console.error('Error al crear preferencia:', error);
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
        console.error('Error al crear preferencia:', result);
        alert(errorMsg);
      } else {
        alert(t('buyTokens.errors.createPreferenceFailed'));
      }
    } catch (error) {
      setBuyLoading(false);
      console.error('Error al crear preferencia:', error);
      alert(t('buyTokens.errors.networkError'));
    }
  };

  const customTokensClamped = Math.max(CUSTOM_MIN, Math.min(CUSTOM_MAX, customTokens));
  const customPriceCents = customTokensClamped * pricePerTokenCents;
  const customValid = customTokens >= CUSTOM_MIN && customTokens <= CUSTOM_MAX;

  const firstPurchasePromo = promotions.find((p) => p.type === 'first_purchase');
  const codePromos = promotions.filter((p) => p.type === 'code');
  const promoCodeTrimmed = promoCode.trim().toUpperCase();
  const codePromoApplied = codePromos.find((p) => p.code === promoCodeTrimmed);
  const appliedPromoPercent =
    codePromoApplied?.percent ?? (isFirstPurchase && firstPurchasePromo ? firstPurchasePromo.percent : 0);

  const getTotalTokensWithPromo = (baseTokens: number, bonusTokens: number) => {
    const promoBonus = appliedPromoPercent > 0 ? Math.floor(baseTokens * (appliedPromoPercent / 100)) : 0;
    return baseTokens + bonusTokens + promoBonus;
  };

  if (isLoading || loading) {
    return (
      <div className="buy-tokens-page">
        <div className="buy-tokens-page__loading">{t('common.loading')}</div>
      </div>
    );
  }

  const isLoggedIn = !!user;

  return (
    <div className="buy-tokens-page">
      {paymentStatus === 'success' && (
        <div className="buy-tokens-page__payment-message buy-tokens-page__payment-message--success">
          <FaCoins />
          <div>
            <h3>{t('buyTokens.paymentSuccess.title')}</h3>
            <p>{t('buyTokens.paymentSuccess.message')}</p>
          </div>
          <button type="button" onClick={() => setPaymentStatus(null)}>
            {t('common.close')}
          </button>
        </div>
      )}
      {paymentStatus === 'cancel' && (
        <div className="buy-tokens-page__payment-message buy-tokens-page__payment-message--cancel">
          <div>
            <h3>{t('buyTokens.paymentCancel.title')}</h3>
            <p>{t('buyTokens.paymentCancel.message')}</p>
          </div>
          <button type="button" onClick={() => setPaymentStatus(null)}>
            {t('common.close')}
          </button>
        </div>
      )}
      {paymentStatus === 'pending' && (
        <div className="buy-tokens-page__payment-message buy-tokens-page__payment-message--pending">
          <div>
            <h3>{t('buyTokens.paymentPending.title')}</h3>
            <p>{t('buyTokens.paymentPending.message')}</p>
          </div>
          <button type="button" onClick={() => setPaymentStatus(null)}>
            {t('common.close')}
          </button>
        </div>
      )}
      <header className="buy-tokens-page__header">
        <div className="buy-tokens-page__container">
          <h1 className="buy-tokens-page__title">{t('buyTokens.title')}</h1>
          <p className="buy-tokens-page__subtitle">{t('buyTokens.subtitle')}</p>
          {!isLoggedIn && (
            <div className="buy-tokens-page__login-cta buy-tokens-page__login-cta--banner">
              <p>{t('buyTokens.loginRequired.description')}</p>
              <button
                type="button"
                className="buy-tokens-page__login-btn"
                onClick={() => setIsEmailModalOpen(true)}
              >
                {t('common.auth.titleLogin')}
              </button>
            </div>
          )}
          {isLoggedIn && isFirstPurchase && firstPurchasePromo && (
            <div className="buy-tokens-page__first-purchase-badge">
              <FaCoins />
              {t('buyTokens.firstPurchaseBadge', { percent: firstPurchasePromo.percent })}
            </div>
          )}
        </div>
      </header>

      <main className="buy-tokens-page__main">
        <div className="buy-tokens-page__container">
          <section className="buy-tokens-page__info" aria-labelledby="buy-tokens-how">
            <h2 id="buy-tokens-how" className="buy-tokens-page__info-title">
              {t('buyTokens.howItWorksTitle')}
            </h2>
            <p className="buy-tokens-page__info-intro">{t('buyTokens.howItWorksIntro')}</p>
            <div className="buy-tokens-page__highlight">
              <FaCoins className="buy-tokens-page__highlight-icon" />
              <strong>{t('buyTokens.oneTokenPerImage')}</strong>
            </div>
            <p className="buy-tokens-page__info-price">
              {t('buyTokens.pricePerToken')}: <strong>{formatPriceMxn(pricePerTokenCents)}</strong>
              {showUsd && usdRate != null && (
                <span className="buy-tokens-page__info-price-usd">{formatPriceUsdRef(pricePerTokenCents)}</span>
              )}
            </p>
            <p className="buy-tokens-page__info-detail">{t('buyTokens.oneTokenPerImageDetail')}</p>
            <p className="buy-tokens-page__info-where">{t('buyTokens.useInEditor')}</p>
            <p className="buy-tokens-page__info-example">{t('buyTokens.examplePack')}</p>
          </section>

          <section className="buy-tokens-page__benefits" aria-labelledby="buy-tokens-why">
            <h2 id="buy-tokens-why" className="buy-tokens-page__benefits-title">
              {t('buyTokens.benefitsTitle')}
            </h2>
            <ul className="buy-tokens-page__benefits-list">
              <li>{t('buyTokens.benefit1')}</li>
              <li>{t('buyTokens.benefit2')}</li>
              <li>{t('buyTokens.benefit3')}</li>
            </ul>
          </section>

          {showUsd && (
            <p className="buy-tokens-page__disclaimer">{t('buyTokens.disclaimerUsd')}</p>
          )}

          <h2 className="buy-tokens-page__packs-title">{t('buyTokens.choosePack')}</h2>

          {codePromos.length > 0 && isLoggedIn && (
            <div className="buy-tokens-page__promo-code-section">
              <label htmlFor="buy-tokens-promo-code" className="buy-tokens-page__promo-label">
                {t('buyTokens.promoCodeLabel')}
              </label>
              <input
                id="buy-tokens-promo-code"
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder={t('buyTokens.promoCodePlaceholder')}
                className="buy-tokens-page__promo-input"
                maxLength={32}
              />
              {codePromoApplied && (
                <span className="buy-tokens-page__promo-applied">
                  ✓ {t('buyTokens.promoCodeApplied', { percent: codePromoApplied.percent })}
                </span>
              )}
            </div>
          )}

          <div className="buy-tokens-page__grid">
            {packs.map((pack) => {
              const totalWithPromo = getTotalTokensWithPromo(pack.base_tokens, pack.bonus_tokens);
              const promoBonus = totalWithPromo - (pack.base_tokens + pack.bonus_tokens);
              return (
                <div key={pack.id} className="buy-tokens-page__card">
                  <div className="buy-tokens-page__card-tokens">
                    {totalWithPromo} {t('buyTokens.tokens')}
                  </div>
                  <div className="buy-tokens-page__card-you-pay-gift">
                    {t('buyTokens.youPay', { base: pack.base_tokens })} · {t('buyTokens.weGift', { bonus: pack.bonus_tokens })}
                    {promoBonus > 0 && (
                      <span className="buy-tokens-page__card-promo"> · {t('buyTokens.promoBonus', { bonus: promoBonus })}</span>
                    )}
                  </div>
                  <div className="buy-tokens-page__card-price">
                    {formatPriceMxn(pack.price_cents)}
                  </div>
                  {showUsd && (
                    <div className="buy-tokens-page__card-price-usd">
                      {formatPriceUsdRef(pack.price_cents)}
                    </div>
                  )}
                  <button
                    type="button"
                    className="buy-tokens-page__card-buy"
                    onClick={() => handleBuy(pack)}
                    disabled={!isLoggedIn || buyLoading}
                  >
                    {t('buyTokens.buyButton')}
                  </button>
                </div>
              );
            })}
            <div className="buy-tokens-page__card buy-tokens-page__card--custom">
              <label className="buy-tokens-page__custom-label" htmlFor="buy-tokens-custom-input">
                {t('buyTokens.customAmountLabel')}
              </label>
              <input
                id="buy-tokens-custom-input"
                type="number"
                min={CUSTOM_MIN}
                max={CUSTOM_MAX}
                value={customTokens}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) setCustomTokens(v);
                  else if (e.target.value === '') setCustomTokens(0);
                }}
                onBlur={() => setCustomTokens((prev) => Math.max(CUSTOM_MIN, Math.min(CUSTOM_MAX, prev)))}
                className="buy-tokens-page__custom-input"
                placeholder={t('buyTokens.customAmountPlaceholder')}
                aria-describedby="buy-tokens-custom-hint"
              />
              <p id="buy-tokens-custom-hint" className="buy-tokens-page__custom-hint">
                {t('buyTokens.customAmountMin')} · {t('buyTokens.customAmountMax')}
              </p>
              <p className="buy-tokens-page__custom-price-per-token">
                {t('buyTokens.pricePerToken')}: {formatPriceMxn(pricePerTokenCents)}
                {showUsd && <span className="buy-tokens-page__card-price-usd">{formatPriceUsdRef(pricePerTokenCents)}</span>}
              </p>
              {appliedPromoPercent > 0 && (
                <p className="buy-tokens-page__custom-bonus">
                  {codePromoApplied
                    ? t('buyTokens.promoCodeBonus', { percent: codePromoApplied.percent })
                    : t('buyTokens.customBonus', { percent: appliedPromoPercent })}
                </p>
              )}
              <div className="buy-tokens-page__card-price">
                {t('buyTokens.customTotal')}: {formatPriceMxn(customPriceCents)}
              </div>
              {showUsd && (
                <div className="buy-tokens-page__card-price-usd">
                  {formatPriceUsdRef(customPriceCents)}
                </div>
              )}
              <button
                type="button"
                className="buy-tokens-page__card-buy"
                onClick={handleBuyCustom}
                disabled={!customValid || !isLoggedIn || buyLoading}
              >
                {t('buyTokens.buyButton')}
              </button>
            </div>
          </div>
        </div>
      </main>
      <EmailAuthModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} initialMode="login" />
      <WarningModal
        isOpen={isNotLoggedInModalOpen}
        title={t('buyTokens.notLoggedInModal.title')}
        message={t('buyTokens.notLoggedInModal.message')}
        confirmText={t('buyTokens.notLoggedInModal.close')}
        onConfirm={() => setIsNotLoggedInModalOpen(false)}
        onCancel={() => setIsNotLoggedInModalOpen(false)}
        singleButton
      />
    </div>
  );
};
