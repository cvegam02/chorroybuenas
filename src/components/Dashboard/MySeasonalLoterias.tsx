import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SeasonalRepository, type PurchasedSeasonalLoteria } from '../../repositories/SeasonalRepository';
import { localizedText } from '../../utils/seasonalCatalog';
import { SeasonalDownloadButton } from '../Seasonal/SeasonalDownloadButton';
import '../Seasonal/SeasonalCatalog.css';
import './MySeasonalLoterias.css';

/** «Mis temáticas» de Mi cuenta: las loterías de temporada que compró la cuenta. */
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
        <div className="dashboard__loading-inline my-seasonal__state" role="status">
          <div className="dashboard__spinner dashboard__spinner--small" />
          <span>{t('common.loading')}</span>
        </div>
      );
    }
    if (purchases === null) {
      return (
        <div className="my-seasonal__state" role="alert">
          <p className="my-seasonal__state-text">{t('dashboard.seasonal.error')}</p>
          <button type="button" className="seasonal-catalog__button" onClick={load}>
            {t('seasonal.retry')}
          </button>
        </div>
      );
    }
    if (purchases.length === 0) {
      return (
        <div className="my-seasonal__state">
          <p className="my-seasonal__state-text">{t('dashboard.seasonal.empty')}</p>
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
          const isPending = purchase.status === 'pending';
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
                  {t(isPending ? 'dashboard.seasonal.startedOn' : 'dashboard.seasonal.boughtOn', {
                    date: dateFormat.format(new Date(purchase.purchasedAt)),
                  })}
                </span>
              </div>
              {isPending ? (
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
      <div className="dashboard__column-header">
        <h2 className="dashboard__column-title" id="my-seasonal-title">
          {t('dashboard.seasonal.title')}
        </h2>
        <Link to="/tematicas" className="dashboard__column-link">
          {t('dashboard.seasonal.catalogLink')} <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="my-seasonal__card">{renderBody()}</div>
      <p className="my-seasonal__note">{t('dashboard.seasonal.keepNote')}</p>
    </section>
  );
};
