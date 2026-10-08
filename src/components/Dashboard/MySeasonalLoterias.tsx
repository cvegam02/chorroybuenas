import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaGift } from 'react-icons/fa';
import { SeasonalRepository, type PurchasedSeasonalLoteria } from '../../repositories/SeasonalRepository';
import { localizedText } from '../../utils/seasonalCatalog';
import { SeasonalDownloadButton } from '../Seasonal/SeasonalDownloadButton';
import '../Seasonal/SeasonalCatalog.css';
import './MySeasonalLoterias.css';

/** Sección de Mi cuenta con las loterías de temporada que compró la cuenta. */
export const MySeasonalLoterias = () => {
  const { t, i18n } = useTranslation();
  const [purchases, setPurchases] = useState<PurchasedSeasonalLoteria[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const language = i18n.language;

  const load = useCallback(async () => {
    setIsLoading(true);
    setPurchases(await SeasonalRepository.getPurchasedLoterias());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dateFormat = new Intl.DateTimeFormat(language?.startsWith('en') ? 'en-US' : 'es-MX', { dateStyle: 'medium' });

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="dashboard__loading-inline" role="status">
          <div className="dashboard__spinner dashboard__spinner--small" />
          <span>{t('common.loading')}</span>
        </div>
      );
    }
    if (purchases === null) {
      return (
        <div className="dashboard__empty-state" role="alert">
          <p className="dashboard__empty-text">{t('dashboard.seasonal.error')}</p>
          <button type="button" className="seasonal-catalog__button" onClick={load}>
            {t('seasonal.retry')}
          </button>
        </div>
      );
    }
    if (purchases.length === 0) {
      return (
        <div className="dashboard__empty-state">
          <p className="dashboard__empty-text">{t('dashboard.seasonal.empty')}</p>
          <Link to="/tematicas" className="seasonal-catalog__button">
            {t('dashboard.seasonal.toCatalog')}
          </Link>
        </div>
      );
    }
    return (
      <ul className="my-seasonal__list">
        {purchases.map((purchase) => {
          const name = localizedText(purchase.name_es, purchase.name_en, language);
          return (
            <li key={purchase.purchaseId} className="my-seasonal__row">
              {purchase.cover_path ? (
                <img
                  className="my-seasonal__cover"
                  src={SeasonalRepository.previewUrl(purchase.cover_path)}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="my-seasonal__cover" aria-hidden="true" />
              )}
              <div className="my-seasonal__info">
                <Link to={`/tematicas/${purchase.loteriaId}`} className="my-seasonal__name">
                  {name}
                </Link>
                <span className="my-seasonal__meta">
                  {localizedText(purchase.season_es, purchase.season_en, language)}
                  {' · '}
                  {t(purchase.status === 'pending' ? 'dashboard.seasonal.startedOn' : 'dashboard.seasonal.boughtOn', {
                    date: dateFormat.format(new Date(purchase.purchasedAt)),
                  })}
                </span>
              </div>
              {purchase.status === 'pending' ? (
                <span className="my-seasonal__pending">{t('dashboard.seasonal.pending')}</span>
              ) : (
                <SeasonalDownloadButton loteriaId={purchase.loteriaId} loteriaName={name} />
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section className="my-seasonal" aria-labelledby="my-seasonal-title">
      <h2 className="dashboard__section-title" id="my-seasonal-title">
        <FaGift />
        {t('dashboard.seasonal.title')}
      </h2>
      <div className="dashboard__loterias-card">{renderBody()}</div>
    </section>
  );
};
