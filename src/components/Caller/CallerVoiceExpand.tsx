import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaMagic } from 'react-icons/fa';

interface CallerVoiceExpandProps {
  /** Cartas que pasan de lo pagado. */
  uncovered: number;
  price: number;
  /** Cobra y genera; rechaza con el código del servidor. */
  onExpand: () => Promise<void>;
}

/**
 * «Ampliar la voz» (FEAT-58, US A4, decisión 8): la lotería creció después de pagar la voz con IA. Dice cuántas
 * cartas se cantarán con la voz del navegador y cobra al tocar el botón, que ya dice el precio.
 */
export const CallerVoiceExpand = ({ uncovered, price, onExpand }: CallerVoiceExpandProps) => {
  const { t } = useTranslation();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<'tokens' | 'unavailable' | 'generic' | null>(null);

  const expand = async () => {
    if (isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      await onExpand();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(code === 'INSUFFICIENT_TOKENS' ? 'tokens' : code === 'VOICE_UNAVAILABLE' ? 'unavailable' : 'generic');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <p className="caller__ai-note">{t('caller.aiVoice.expandNote', { count: uncovered })}</p>
      <button type="button" className="caller__ai-voice" onClick={expand} disabled={isBusy}>
        <FaMagic aria-hidden="true" />
        {isBusy ? t('caller.aiVoice.expanding') : t('caller.aiVoice.expand', { price })}
      </button>
      {error && (
        <p className="caller__ai-note" role="alert">
          {error === 'tokens' ? t('caller.aiVoice.errorTokens') : error === 'unavailable'
            ? t('caller.aiVoice.errorUnavailable') : t('caller.aiVoice.errorGeneric')}
          {error === 'tokens' && (
            <>
              {' '}
              <Link to="/comprar-tokens">{t('caller.aiVoice.buyTokens')}</Link>
            </>
          )}
        </p>
      )}
    </>
  );
};
