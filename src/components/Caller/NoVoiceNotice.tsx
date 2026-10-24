import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaVolumeMute } from 'react-icons/fa';

interface NoVoiceNoticeProps {
  setId: string;
}

/**
 * En un navegador sin voz en español no se puede cantar (US A4, pedido por Carlos el 2026-10-24):
 * se dice por qué y en qué navegadores sí funciona.
 */
export const NoVoiceNotice = ({ setId }: NoVoiceNoticeProps) => {
  const { t } = useTranslation();
  return (
    <div className="caller__message caller__no-voice" role="status">
      <FaVolumeMute aria-hidden="true" className="caller__no-voice-icon" />
      <strong>{t('caller.noVoiceTitle')}</strong>
      <p>{t('caller.noVoiceText')}</p>
      <ul>
        <li>{t('caller.noVoiceChrome')}</li>
        <li>{t('caller.noVoiceSafari')}</li>
      </ul>
      <Link to={`/loteria/${setId}`} className="caller__button caller__button--primary">
        {t('caller.backToSet')}
      </Link>
    </div>
  );
};
