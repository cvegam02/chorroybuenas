import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaChevronLeft, FaChevronRight, FaMagic, FaPause, FaPlay, FaRandom, FaTimes, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { CardLabelsProvider } from '../../contexts/CardLabelsContext';
import { useCallerGame } from '../../hooks/useCallerGame';
import { useCardVoice } from '../../hooks/useCardVoice';
import { useKeepScreenOn } from '../../hooks/useKeepScreenOn';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  browseBack,
  browseForward,
  callOrderNumbers,
  calledNewestFirst,
  canSing,
  currentCardId,
  isFinished,
  recentBeforeCurrent,
} from '../../utils/callerGame';
import { CALL_INTRO, isManual } from '../../utils/callerAuto';
import { cardLabelsOrDefault } from '../../utils/cardLabels';
import { exitFullscreen } from '../../utils/fullscreen';
import { SetConfirmDialog } from '../SetView/SetConfirmDialog';
import { CallerCard, CallerCardPreload } from './CallerCard';
import { useCallerSet } from './useCallerSet';
import { useAutoCaller } from './useAutoCaller';
import { CallerRhythmPicker } from './CallerRhythmPicker';
import { NoVoiceNotice } from './NoVoiceNotice';
import { CallerCalledPanel, CallerDeckSheet, CallerHistoryStrip } from './CallerHistory';
import { CallerVoiceExpand } from './CallerVoiceExpand';
import { CallerVoicePicker } from './CallerVoicePicker';
import { useAiVoice } from './useAiVoice';
import type { Card } from '../../types';
import './CallerPage.css';

/** Cuántas cantadas anteriores se ven en la tira bajo la carta (US A3). */
const HISTORY_STRIP_SIZE = 5;
/** Desde este ancho, las cantadas van todas a la derecha de la carta en lugar de la tira (FEAT-59, US A1); igual que en CallerPage.css. */
const WIDE_LAYOUT_QUERY = '(min-width: 1024px)';

/** Cantador (U4, FEAT-55): saca las cartas de la lotería una por una, en grande. */
export const CallerPage = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const loaded = useCallerSet(setId);
  const [confirmRestart, setConfirmRestart] = useState(false);
  // «Se va y se corre con…» antes de la primera carta: diciéndolo, o ya dicho y esperando la primera en manual
  const [intro, setIntro] = useState<'off' | 'speaking' | 'waiting'>('off');
  const isIntro = intro === 'speaking';
  const [deckOpen, setDeckOpen] = useState(false);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  useKeepScreenOn();
  const wide = useMediaQuery(WIDE_LAYOUT_QUERY);

  // Sin sesión no hay cantador: igual que la página de la lotería, se regresa a Inicio
  useEffect(() => {
    if (!authLoading && !user) navigate('/', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => exitFullscreen, []);

  const ready = loaded.status === 'ready' ? loaded : null;
  const gridSize = ready?.set.grid_size ?? 16;
  const singable = ready ? canSing(ready.cards.length, gridSize) : false;
  const cardIds = useMemo(() => (ready && singable ? ready.cards.map((c) => c.id) : null), [ready, singable]);
  const { game, draw, restart } = useCallerGame(setId, cardIds);
  const { say, muted, toggleMuted, voiceStatus } = useCardVoice();
  const singableCards = useMemo(() => (ready && singable ? ready.cards : null), [ready, singable]);
  const ai = useAiVoice(setId, singableCards);
  // Mientras se genera la voz con IA no se puede empezar (decisión 26)
  const preparingVoice = ai.status === 'generating';

  const cardsById = useMemo(() => new Map((ready?.cards ?? []).map((c) => [c.id, c])), [ready]);
  const currentId = game && currentCardId(game);
  const current = currentId ? cardsById.get(currentId) : undefined;
  const nextCard = game && !isFinished(game) ? cardsById.get(game.order[game.drawn]) : undefined;
  const finished = game !== null && game.drawn > 0 && isFinished(game);
  const drawnCount = game?.drawn ?? 0;
  // Carta cantada que se está revisando con las flechas (decisión 19); null = la última cantada
  const [view, setView] = useState<number | null>(null);
  useEffect(() => setView(null), [drawnCount]);
  const shown = game && view !== null ? cardsById.get(game.order[view]) ?? current : current;
  const callNumbers = useMemo(() => (game ? callOrderNumbers(game) : new Map<string, number>()), [game]);
  const recentCards = useMemo(
    () => (game ? recentBeforeCurrent(game, HISTORY_STRIP_SIZE).flatMap((id) => cardsById.get(id) ?? []) : []),
    [game, cardsById],
  );
  const calledCards = useMemo(
    () => (game && wide ? calledNewestFirst(game).flatMap((id) => cardsById.get(id) ?? []) : []),
    [game, wide, cardsById],
  );

  /** Saca la siguiente carta y dice su título (US A4). Va dentro del toque, para que Safari de iPhone hable. */
  const drawAndSay = useCallback(
    (onSpoken: () => void) => {
      if (!game || isFinished(game)) return;
      const card = cardsById.get(game.order[game.drawn]);
      draw();
      if (card) say(card.title, onSpoken, ai.urlFor(card));
      else onSpoken();
    },
    [game, cardsById, draw, say, ai],
  );
  const auto = useAutoCaller(game, drawAndSay);
  const manual = isManual(auto.rhythm);

  /**
   * Empieza la partida: dice la frase de arranque y sigue en automático (US A5); en manual, espera la
   * primera carta (FEAT-59, US A2). Va dentro del toque.
   */
  const begin = useCallback(() => {
    setIntro('speaking');
    say(
      CALL_INTRO,
      () => {
        if (manual) {
          setIntro('waiting');
          return;
        }
        setIntro('off');
        auto.start();
      },
      ai.introUrl,
    );
  }, [say, auto, manual, ai.introUrl]);

  /**
   * Manual (FEAT-59, US A2): «Siguiente carta» y → sacan y cantan la siguiente; si se está revisando atrás,
   * primero avanzan por las cantadas hasta la última. No saca otra mientras suena la anterior (decisión 4).
   * Va dentro del toque.
   */
  const nextManual = useCallback(() => {
    if (isIntro || preparingVoice) return;
    if (view !== null) {
      setView(browseForward(view, drawnCount));
      return;
    }
    if (finished || auto.speaking || (drawnCount === 0 && intro !== 'waiting')) return;
    setIntro('off');
    auto.next();
  }, [isIntro, preparingVoice, view, drawnCount, finished, intro, auto]);

  /** Barra espaciadora: lo del botón grande. Pausa o sigue, o en manual saca la siguiente; antes de la primera carta, empieza la partida. */
  const togglePlay = useCallback(() => {
    if (isIntro || finished || preparingVoice) return;
    if (drawnCount === 0 && intro === 'off') begin();
    else if (manual) nextManual();
    else if (auto.running) auto.stop();
    else auto.start();
  }, [isIntro, finished, preparingVoice, auto, drawnCount, intro, manual, begin, nextManual]);

  /** «Anterior» y ←: pausa el automático y muestra la cantada anterior (decisiones 19 y 20). */
  const showPrevious = useCallback(() => {
    auto.stop();
    setView((v) => browseBack(v, drawnCount));
  }, [auto, drawnCount]);

  /** «Siguiente» y →: avanza por las cantadas hasta la última; nunca saca una carta nueva (en manual, sí: `nextManual`). */
  const showNext = useCallback(() => setView((v) => browseForward(v, drawnCount)), [drawnCount]);

  /** Abrir una cantada desde el historial: pausa y la muestra como con «Anterior» (US A3). */
  const openCalled = useCallback(
    (card: Card) => {
      if (!game) return;
      auto.stop();
      const index = game.order.indexOf(card.id);
      setView(index === game.drawn - 1 ? null : index);
    },
    [game, auto],
  );

  /** «Ver todas» pausa el automático, para revisar con calma cuando alguien grita «¡Lotería!». */
  const openDeck = useCallback(() => {
    auto.stop();
    setDeckOpen(true);
  }, [auto]);

  // Teclado (decisión 19): espacio pausa o sigue; ← y → recorren las cantadas, sin sacar cartas nuevas.
  // En manual, → saca la siguiente después de llegar a la última (FEAT-59, US A2)
  useEffect(() => {
    if (!game || confirmRestart || deckOpen || voicePickerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // La lista de ritmo usa sus propias teclas
      if (e.target instanceof HTMLElement && e.target.closest('select, input')) return;
      // Dejar aplastada la tecla no repite: ni pausa y sigue, ni saca cartas en manual (FEAT-59, decisión 4)
      if (e.repeat && (e.key === ' ' || (e.key === 'ArrowRight' && manual))) {
        e.preventDefault();
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (manual) nextManual();
        else showNext();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [game, confirmRestart, deckOpen, voicePickerOpen, togglePlay, showPrevious, showNext, manual, nextManual]);

  const close = () => {
    exitFullscreen();
    navigate(setId ? `/loteria/${setId}` : '/dashboard#mis-loterias');
  };

  if (authLoading || !user) return null;

  const message = (text: string, link: { to: string; label: string }) => (
    <div className="caller__message">
      <p>{text}</p>
      <Link to={link.to} className="caller__button caller__button--primary">
        {link.label}
      </Link>
    </div>
  );

  let body;
  if (
    loaded.status === 'loading' ||
    (ready && singable && (!game || voiceStatus === 'checking' || ai.status === 'loading'))
  ) {
    body = (
      <div className="caller__message" role="status">
        <div className="caller__spinner" aria-hidden="true" />
        <p>{t('caller.loading')}</p>
      </div>
    );
  } else if (loaded.status === 'notFound') {
    body = message(t('caller.notFound'), { to: '/dashboard#mis-loterias', label: t('caller.toMyLoterias') });
  } else if (loaded.status === 'error') {
    body = message(t('caller.loadError'), { to: `/loteria/${setId}`, label: t('caller.backToSet') });
  } else if (!singable || !game) {
    body = message(t('caller.tooFew'), { to: `/loteria/${setId}`, label: t('caller.backToSet') });
  } else if (preparingVoice) {
    body = (
      <div className="caller__message" role="status">
        <div className="caller__spinner" aria-hidden="true" />
        <p>{t('caller.aiVoice.preparing', { done: ai.progress.done, total: ai.progress.total })}</p>
        <p className="caller__ai-note">{t('caller.aiVoice.preparingHint')}</p>
      </div>
    );
  } else if (voiceStatus === 'none' && ai.status !== 'ready') {
    // Con voz con IA se canta aunque el navegador no tenga voz en español (decisión 24)
    body = <NoVoiceNotice setId={setId ?? ''} />;
  } else if (!current || !shown) {
    body = intro !== 'off' ? (
      <div className="caller__message" aria-live="polite">
        <p className="caller__intro">{CALL_INTRO}</p>
        {intro === 'waiting' && (
          <button type="button" className="caller__button caller__button--primary caller__button--large" onClick={nextManual}>
            {t('caller.nextCard')}
            <FaChevronRight aria-hidden="true" />
          </button>
        )}
      </div>
    ) : (
      <div className="caller__message">
        <p className="caller__ready">{t('caller.ready', { count: game.order.length })}</p>
        <button type="button" className="caller__button caller__button--primary caller__button--large" onClick={begin}>
          {t('caller.start')}
        </button>
        <CallerRhythmPicker
          rhythm={auto.rhythm}
          onChange={auto.changeRhythm}
          custom={auto.custom}
          onCustomChange={auto.changeCustom}
        />
        {ai.status === 'none' && (
          <>
            {ai.refunded !== null && (
              <p className="caller__ai-note" role="status">
                {t('caller.aiVoice.refunded', { price: ai.refunded })}
              </p>
            )}
            <button type="button" className="caller__ai-voice" onClick={() => setVoicePickerOpen(true)}>
              <FaMagic aria-hidden="true" />
              {t('caller.aiVoice.open', { price: ai.price })}
            </button>
          </>
        )}
        {ai.status === 'ready' && ai.uncovered > 0 && (
          <CallerVoiceExpand uncovered={ai.uncovered} price={ai.expandPrice} onExpand={ai.expand} />
        )}
      </div>
    );
  } else {
    const playArea = (
      <>
        <div className="caller__stage">
          <CallerCard
            card={shown}
            onTap={finished ? undefined : togglePlay}
            tapLabel={t(manual ? 'caller.nextCardHint' : auto.running ? 'caller.pauseHint' : 'caller.resumeHint')}
          />
          {view !== null && <p className="caller__viewing">{t('caller.viewing', { number: view + 1 })}</p>}
          {nextCard && <CallerCardPreload card={nextCard} />}
          {!wide && (
            <CallerHistoryStrip cards={recentCards} callNumbers={callNumbers} onOpenCard={openCalled} onSeeAll={openDeck} />
          )}
          <p className="caller__sr-only" aria-live="polite">
            {shown.title}
          </p>
        </div>
        {finished && (
          <div className="caller__finished" role="status">
            <strong>{t('caller.finishedTitle')}</strong>
            <span>{t('caller.finishedText', { count: game.order.length })}</span>
          </div>
        )}
        <div className="caller__controls">
          <button type="button" className="caller__button" onClick={showPrevious} disabled={browseBack(view, drawnCount) === view}>
            <FaChevronLeft aria-hidden="true" />
            {t('caller.previous')}
          </button>
          {finished ? (
            <button type="button" className="caller__button caller__button--primary caller__button--large" onClick={() => setConfirmRestart(true)}>
              <FaRandom aria-hidden="true" />
              {t('caller.newGame')}
            </button>
          ) : manual ? (
            <button
              type="button"
              className="caller__button caller__button--primary caller__button--large"
              onClick={nextManual}
              disabled={view === null && auto.speaking}
            >
              {t('caller.nextCard')}
              <FaChevronRight aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="caller__button caller__button--primary caller__button--large" onClick={togglePlay}>
              {auto.running ? <FaPause aria-hidden="true" /> : <FaPlay aria-hidden="true" />}
              {t(auto.running ? 'caller.pause' : 'caller.resume')}
            </button>
          )}
          {/* En manual, «Siguiente carta» ya avanza por las cantadas; al acabar la baraja vuelve «Siguiente» */}
          {(!manual || finished) && (
            <button type="button" className="caller__button" onClick={showNext} disabled={view === null}>
              {t('caller.next')}
              <FaChevronRight aria-hidden="true" />
            </button>
          )}
        </div>
      </>
    );
    body = wide ? (
      <div className="caller__play">
        <div className="caller__main">{playArea}</div>
        <CallerCalledPanel
          cards={calledCards}
          callNumbers={callNumbers}
          total={game.order.length}
          shownId={shown.id}
          onOpenCard={openCalled}
          onSeeAll={openDeck}
        />
      </div>
    ) : (
      playArea
    );
  }

  return (
    <CardLabelsProvider value={cardLabelsOrDefault(ready?.set.card_labels)}>
      <main className="caller">
        <header className="caller__top">
          <button type="button" className="caller__icon-button" onClick={close} aria-label={t('caller.close')} title={t('caller.close')}>
            <FaTimes aria-hidden="true" />
          </button>
          <h1 className="caller__title">{ready?.set.name ?? t('caller.pageTitle')}</h1>
          <div className="caller__top-end">
            <span className="caller__counter">
              {game && game.drawn > 0 ? t('caller.counter', { drawn: game.drawn, total: game.order.length }) : ''}
            </span>
            {game && game.drawn > 0 && !finished && (
              <button
                type="button"
                className="caller__icon-button caller__new-game"
                onClick={() => setConfirmRestart(true)}
                aria-label={t('caller.newGame')}
                title={t('caller.newGame')}
              >
                <FaRandom aria-hidden="true" />
                <span className="caller__new-game-label">{t('caller.newGame')}</span>
              </button>
            )}
            {(voiceStatus === 'ready' || ai.status === 'ready') && (
              <button
                type="button"
                className="caller__icon-button"
                onClick={toggleMuted}
                aria-pressed={muted}
                aria-label={t(muted ? 'caller.unmute' : 'caller.mute')}
                title={t(muted ? 'caller.unmute' : 'caller.mute')}
              >
                {muted ? <FaVolumeMute aria-hidden="true" /> : <FaVolumeUp aria-hidden="true" />}
              </button>
            )}
          </div>
        </header>
        {body}
        {deckOpen && ready && (
          <CallerDeckSheet cards={ready.cards} callNumbers={callNumbers} onClose={() => setDeckOpen(false)} />
        )}
        {voicePickerOpen && (
          <CallerVoicePicker
            price={ai.price}
            cards={singableCards?.length ?? 0}
            coverage={ai.coverage}
            onBuy={ai.buy}
            onClose={() => setVoicePickerOpen(false)}
          />
        )}
        {confirmRestart && (
          <SetConfirmDialog
            icon={<FaRandom />}
            tone="primary"
            title={t('caller.newGameTitle')}
            text={t('caller.newGameText')}
            confirmLabel={t('caller.newGameConfirm')}
            cancelLabel={t('common.cancel')}
            onConfirm={async () => {
              auto.stop();
              restart();
              setIntro('off');
              setConfirmRestart(false);
            }}
            onClose={() => setConfirmRestart(false)}
          />
        )}
      </main>
    </CardLabelsProvider>
  );
};
