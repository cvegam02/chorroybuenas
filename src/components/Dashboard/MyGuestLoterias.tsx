import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaLock, FaUpload } from 'react-icons/fa';
import { GuestLoteriaRepository, type MyGuestLoteria } from '../../repositories/GuestLoteriaRepository';
import { logger } from '../../utils/logger';
import './MySeasonalLoterias.css';
import './MyGuestLoterias.css';

/**
 * «Loterías donde participo» de Mi cuenta (FEAT-56, US B5): las loterías colectivas de otras personas a las que
 * se unió. Cada una abre la vista de invitado (U5). Sin invitaciones, la sección no sale.
 */
export const MyGuestLoterias = () => {
  const { t } = useTranslation();
  const [loterias, setLoterias] = useState<MyGuestLoteria[]>([]);

  useEffect(() => {
    let cancelled = false;
    GuestLoteriaRepository.listMine()
      .then((list) => {
        if (!cancelled) setLoterias(list);
      })
      // Si no carga, la sección no sale: el resto de Mi cuenta sigue igual
      .catch((error) => logger.error('[MyGuestLoterias] No se pudieron leer las loterías:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loterias.length === 0) return null;

  const renderRow = (loteria: MyGuestLoteria) => {
    const path = `/participo/${loteria.id}`;
    const cards = t('dashboard.loterias.cards', { count: loteria.cardCount });
    return (
      <li key={loteria.id} className="my-seasonal__row">
        <div className="my-seasonal__info">
          <Link to={path} className="my-seasonal__name">
            {loteria.name}
          </Link>
          <span className="my-seasonal__meta">
            {loteria.organizerName
              ? t('dashboard.guestLoterias.meta', { name: loteria.organizerName, cards })
              : cards}
          </span>
        </div>
        {loteria.canUpload ? (
          <Link to={path} className="my-guest-loterias__upload">
            <FaUpload aria-hidden="true" />
            {t('guest.uploadPhotos')}
          </Link>
        ) : (
          <span className="my-guest-loterias__closed">
            <FaLock aria-hidden="true" />
            {t('dashboard.guestLoterias.closed')}
          </span>
        )}
      </li>
    );
  };

  return (
    <section className="my-seasonal" id="loterias-donde-participo" aria-labelledby="my-guest-loterias-title">
      <div className="dashboard__column-header">
        <h2 className="dashboard__column-title" id="my-guest-loterias-title">
          {t('dashboard.guestLoterias.title')}
        </h2>
      </div>
      <div className="my-seasonal__card">
        <ul className="my-seasonal__list">{loterias.map(renderRow)}</ul>
      </div>
    </section>
  );
};
