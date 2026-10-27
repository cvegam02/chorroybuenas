import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaPlay, FaStop, FaTimes } from 'react-icons/fa';
import { useTokenBalance } from '../../contexts/TokenContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { AI_VOICES, type AiVoiceOption } from '../../utils/callerAiVoice';
// El fondo y los botones son los de las ventanas de Mi cuenta
import '../Dashboard/LoteriaDialogs.css';
import './CallerVoicePicker.css';

interface CallerVoicePickerProps {
  /** Lo que cuesta según las cartas de la lotería, cuántas son y cuántas cubre (FEAT-58, decisión 8). */
  price: number;
  cards: number;
  coverage: number;
  /** Paga la voz escogida; rechaza con el código del servidor. */
  onBuy: (voiceId: string) => Promise<void>;
  onClose: () => void;
}

const GROUPS: AiVoiceOption['group'][] = ['men', 'women'];

/**
 * «Mejorar la voz» (FEAT-55, US A6): las voces en tarjetas agrupadas por hombre y mujer, cada una con su
 * muestra; el pie con el costo, el saldo y «Pagar» queda fijo para no tener que bajar a buscarlo.
 */
export const CallerVoicePicker = ({ price, cards, coverage, onBuy, onClose }: CallerVoicePickerProps) => {
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

  const voiceName = (voice: AiVoiceOption) => t(`caller.aiVoice.voices.${voice.name}.name`);
  const chosenVoice = AI_VOICES.find((voice) => voice.id === chosen) ?? AI_VOICES[0];

  /** ▶ escucha la muestra y escoge esa voz; ■ la detiene. */
  const toggleSample = (voice: AiVoiceOption) => {
    const audio = sampleRef.current ?? new Audio();
    sampleRef.current = audio;
    audio.pause();
    if (isBusy) return;
    setChosen(voice.id);
    if (playing === voice.id) {
      setPlaying(null);
      return;
    }
    audio.src = voice.sample;
    audio.onended = () => setPlaying(null);
    audio.play().then(() => setPlaying(voice.id)).catch(() => setPlaying(null));
  };

  const enough = balance !== null && balance >= price;

  const pay = async () => {
    if (isBusy) return;
    sampleRef.current?.pause();
    setPlaying(null);
    setIsBusy(true);
    setError(null);
    try {
      await onBuy(chosen);
      onClose();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      const key = code === 'INSUFFICIENT_TOKENS' ? 'errorTokens' : code === 'VOICE_UNAVAILABLE' ? 'errorUnavailable' : 'errorGeneric';
      setError(t(`caller.aiVoice.${key}`));
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
      <div className="voice-picker" role="dialog" aria-modal="true" aria-labelledby="voice-picker-title">
        <header className="voice-picker__head">
          <div>
            <h2 className="voice-picker__title" id="voice-picker-title">
              {t('caller.aiVoice.title')}
            </h2>
            <p className="voice-picker__subtitle">{t('caller.aiVoice.subtitle')}</p>
          </div>
          <button
            type="button"
            className="voice-picker__close"
            onClick={closeIfIdle}
            disabled={isBusy}
            aria-label={t('common.close')}
          >
            <FaTimes aria-hidden="true" />
          </button>
        </header>

        <div className="voice-picker__body">
          {GROUPS.map((group) => (
            <fieldset key={group} className="voice-picker__group" disabled={isBusy}>
              <legend className="voice-picker__group-title">{t(`caller.aiVoice.group.${group}`)}</legend>
              <div className="voice-picker__grid">
                {AI_VOICES.filter((voice) => voice.group === group).map((voice) => {
                  const isChosen = chosen === voice.id;
                  const isPlaying = playing === voice.id;
                  return (
                    <div key={voice.id} className={`voice-picker__card${isChosen ? ' voice-picker__card--chosen' : ''}`}>
                      <button
                        type="button"
                        className="voice-picker__play"
                        onClick={() => toggleSample(voice)}
                        aria-label={t(isPlaying ? 'caller.aiVoice.stopSample' : 'caller.aiVoice.listenTo', {
                          name: voiceName(voice),
                        })}
                      >
                        {isPlaying ? <FaStop aria-hidden="true" /> : <FaPlay aria-hidden="true" />}
                      </button>
                      <label className="voice-picker__option">
                        <input
                          type="radio"
                          name="caller-voice"
                          value={voice.id}
                          checked={isChosen}
                          onChange={() => setChosen(voice.id)}
                          className="voice-picker__radio"
                        />
                        <span className="voice-picker__name">
                          {voiceName(voice)}
                          {isPlaying && (
                            <span className="voice-picker__bars" aria-hidden="true">
                              <span />
                              <span />
                              <span />
                            </span>
                          )}
                        </span>
                        <span className="voice-picker__description">
                          {t(`caller.aiVoice.voices.${voice.name}.description`)}
                        </span>
                      </label>
                      {isChosen && <FaCheck className="voice-picker__check" aria-hidden="true" />}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <footer className="voice-picker__foot">
          <p className="voice-picker__cost">
            {t('caller.aiVoice.cost', { price, count: cards })}
            {balance !== null && ` · ${t('caller.aiVoice.balance', { count: balance })}`}
          </p>
          <p className="voice-picker__final">{t('caller.aiVoice.final', { coverage })}</p>
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
                {isBusy
                  ? t('caller.aiVoice.paying')
                  : t('caller.aiVoice.payWith', { price, name: voiceName(chosenVoice) })}
              </button>
            ) : (
              <Link to="/comprar-tokens" className="loteria-dialog__button loteria-dialog__button--primary">
                {t('caller.aiVoice.buyTokens')}
              </Link>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
