import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaMagic, FaPlay, FaStop } from 'react-icons/fa';
import { useTokenBalance } from '../../contexts/TokenContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { AI_VOICE_PRICE, AI_VOICES } from '../../utils/callerAiVoice';
// Misma ventana que las de Mi cuenta y la página de la lotería: son sus estilos
import '../Dashboard/LoteriaDialogs.css';
import '../SetView/SetConfirmDialog.css';

interface CallerVoicePickerProps {
  /** Paga la voz escogida; rechaza con el código del servidor. */
  onBuy: (voiceId: string) => Promise<void>;
  onClose: () => void;
}

/** «Mejorar la voz» (FEAT-55, US A6): escuchar las cuatro voces, escoger una y pagarla. */
export const CallerVoicePicker = ({ onBuy, onClose }: CallerVoicePickerProps) => {
  const { t } = useTranslation();
  const { balance } = useTokenBalance();
  const [chosen, setChosen] = useState(AI_VOICES[0].id);
  const [playing, setPlaying] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sampleRef = useRef<HTMLAudioElement | null>(null);

  const closeIfIdle = () => {
    if (!isBusy) onClose();
  };
  useEscapeKey(closeIfIdle);
  useEffect(() => () => sampleRef.current?.pause(), []);

  const toggleSample = (voiceId: string, sample: string) => {
    const audio = sampleRef.current ?? new Audio();
    sampleRef.current = audio;
    audio.pause();
    if (playing === voiceId) {
      setPlaying(null);
      return;
    }
    audio.src = sample;
    audio.onended = () => setPlaying(null);
    audio.play().then(() => setPlaying(voiceId)).catch(() => setPlaying(null));
    setChosen(voiceId);
  };

  const enough = balance !== null && balance >= AI_VOICE_PRICE;

  const pay = async () => {
    if (isBusy) return;
    sampleRef.current?.pause();
    setIsBusy(true);
    setError(null);
    try {
      await onBuy(chosen);
      onClose();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(t(code === 'INSUFFICIENT_TOKENS' ? 'caller.aiVoice.errorTokens' : 'caller.aiVoice.errorGeneric'));
      setIsBusy(false);
    }
  };

  return (
    <div
      className="loteria-dialog__overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeIfIdle();
      }}
      role="presentation"
    >
      <div className="loteria-dialog" role="dialog" aria-modal="true" aria-labelledby="caller-voice-title">
        <span className="loteria-dialog__icon set-confirm__icon--primary" aria-hidden="true">
          <FaMagic />
        </span>
        <h2 className="loteria-dialog__title" id="caller-voice-title">
          {t('caller.aiVoice.title')}
        </h2>
        <fieldset className="caller-voices">
          <legend className="caller__sr-only">{t('caller.aiVoice.title')}</legend>
          {AI_VOICES.map((voice) => (
            <div key={voice.id} className={`caller-voices__row${chosen === voice.id ? ' caller-voices__row--chosen' : ''}`}>
              <label className="caller-voices__option">
                <input
                  type="radio"
                  name="caller-voice"
                  value={voice.id}
                  checked={chosen === voice.id}
                  onChange={() => setChosen(voice.id)}
                  disabled={isBusy}
                />
                <span>
                  <strong>{t(`caller.aiVoice.voices.${voice.name}.name`)}</strong>
                  <small>{t(`caller.aiVoice.voices.${voice.name}.description`)}</small>
                </span>
              </label>
              <button
                type="button"
                className="caller-voices__listen"
                onClick={() => toggleSample(voice.id, voice.sample)}
                aria-label={t(playing === voice.id ? 'caller.aiVoice.stopSample' : 'caller.aiVoice.listenTo', {
                  name: t(`caller.aiVoice.voices.${voice.name}.name`),
                })}
              >
                {playing === voice.id ? <FaStop aria-hidden="true" /> : <FaPlay aria-hidden="true" />}
                <span>{t(playing === voice.id ? 'caller.aiVoice.stop' : 'caller.aiVoice.listen')}</span>
              </button>
            </div>
          ))}
        </fieldset>
        <p className="loteria-dialog__text">
          {t('caller.aiVoice.cost', { price: AI_VOICE_PRICE })}
          {balance !== null && ` · ${t('caller.aiVoice.balance', { count: balance })}`}
        </p>
        <p className="loteria-dialog__hint">{t('caller.aiVoice.final')}</p>
        {error && (
          <p className="loteria-dialog__error" role="alert">
            {error}
          </p>
        )}
        <div className="loteria-dialog__actions">
          <button type="button" className="loteria-dialog__button" onClick={closeIfIdle} disabled={isBusy}>
            {t('common.cancel')}
          </button>
          {enough ? (
            <button type="button" className="loteria-dialog__button loteria-dialog__button--primary" onClick={pay} disabled={isBusy}>
              {t(isBusy ? 'caller.aiVoice.paying' : 'caller.aiVoice.pay', { price: AI_VOICE_PRICE })}
            </button>
          ) : (
            <Link to="/comprar-tokens" className="loteria-dialog__button loteria-dialog__button--primary">
              {t('caller.aiVoice.buyTokens')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
