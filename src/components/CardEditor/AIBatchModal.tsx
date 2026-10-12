import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaCheckCircle, FaCoins, FaExclamationTriangle, FaMagic, FaTimes } from 'react-icons/fa';
import { AIService } from '../../services/AIService';
import { Card } from '../../types';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { aiBatchPlan, batchCardState } from '../../utils/aiBatchPlan';
import './CardUploadModal.css';
import './CardForm.css';
import './AIBatchModal.css';

type AIBatchStatus = 'idle' | 'processing' | 'complete' | 'error';

/** Miniaturas que se dibujan antes de resumir el resto en «+N». */
const MAX_THUMBS = 8;

interface AIBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Llamado al cerrar la ventana mientras el lote sigue en segundo plano. */
  onCloseAndContinue?: () => void;
  /** Cartas sin IA: las que transforma el lote. */
  cards: Card[];
  /** Toda la baraja, con la imagen actual de cada carta. */
  allCards: Card[];
  /** Cartas del lote en curso, en su orden. Se fija al empezar, aunque `cards` se vaya vaciando. */
  batchCardIds: string[];
  /** Empieza el lote. Con `limit`, solo las primeras `limit` cartas sin IA. */
  onStart: (limit?: number) => void;
  /** El lote corre en el componente padre, para que siga aunque esta ventana se cierre. */
  status: AIBatchStatus;
  currentIndex: number;
  skippedCount: number;
  error: string | null;
  tokenBalance: number | null;
}

interface ThumbsProps {
  cards: Card[];
  moreLabel: (count: number) => string;
}

const Thumbs = ({ cards, moreLabel }: ThumbsProps) => {
  const shown = cards.slice(0, MAX_THUMBS);
  const more = cards.length - shown.length;

  return (
    <div className="ai-batch__thumbs" aria-hidden="true">
      {shown.map((card) =>
        card.image ? (
          <img key={card.id} src={card.image} alt="" className="ai-batch__thumb" />
        ) : (
          <span key={card.id} className="ai-batch__thumb" />
        )
      )}
      {more > 0 && <span className="ai-batch__thumbs-more">{moreLabel(more)}</span>}
    </div>
  );
};

export const AIBatchModal = ({
  isOpen,
  onClose,
  onCloseAndContinue,
  cards,
  allCards,
  batchCardIds,
  onStart,
  status,
  currentIndex,
  skippedCount,
  error,
  tokenBalance,
}: AIBatchModalProps) => {
  const { t } = useTranslation();
  /** «Transformar solo N cartas»: cuántas, si el usuario eligió transformar solo las que alcanzan. */
  const [partialLimit, setPartialLimit] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) setPartialLimit(undefined);
  }, [isOpen]);

  /** Mientras el lote corre, cerrar la ventana no lo detiene: sigue en segundo plano. */
  const handleClose = () => {
    if (status === 'processing') onCloseAndContinue?.();
    onClose();
  };
  useEscapeKey(handleClose, isOpen);

  if (!isOpen) return null;

  const fullPlan = aiBatchPlan(cards.length, tokenBalance);
  const plan = partialLimit === undefined ? fullPlan : aiBatchPlan(cards.length, tokenBalance, partialLimit);
  const alreadyTransformed = allCards.length - cards.length;
  const minutes = Math.ceil(AIService.getEstimation(plan.photos).estimatedSeconds / 60);
  const moreLabel = (count: number) => t('aiBatchModal.moreCards', { count });

  const batchCards = batchCardIds.flatMap((id) => {
    const card = allCards.find((c) => c.id === id);
    return card ? [card] : [];
  });
  const batchTotal = batchCardIds.length;
  const transformedCount = Math.max(0, batchTotal - skippedCount);
  // Sin saldo suficiente no se ofrece empezar el lote completo: se dice cuánto falta y qué se puede hacer.
  const showMissingTokens =
    status === 'idle' && tokenBalance !== null && !fullPlan.hasEnough && partialLimit === undefined;

  return (
    <div className="card-modal__overlay">
      <div className="card-modal__content ai-batch" role="dialog" aria-modal="true" aria-labelledby="ai-batch-title">
        <div className="card-modal__header">
          <h2 id="ai-batch-title" className="card-modal__title">{t('aiBatchModal.title')}</h2>
          <button type="button" className="card-modal__close" onClick={handleClose} aria-label={t('common.close')}>
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <div className="card-modal__body ai-batch__body">
          {showMissingTokens && (
            <>
              <div className="ai-batch__missing">
                <span className="ai-batch__missing-icon">
                  <FaCoins aria-hidden="true" />
                </span>
                <div>
                  <strong className="ai-batch__missing-title">
                    {t('aiBatchModal.missing', { count: fullPlan.missing })}
                  </strong>
                  <span className="ai-batch__muted">
                    {t('aiBatchModal.needHave', { needed: fullPlan.tokens, have: tokenBalance })}
                  </span>
                </div>
              </div>
              <div className="ai-batch__stack">
                <Link to="/comprar-tokens" className="card-form__button card-form__button--primary">
                  {t('aiBatchModal.buy')}
                </Link>
                {fullPlan.affordable > 0 && (
                  <button
                    type="button"
                    className="card-form__button card-form__button--secondary"
                    onClick={() => setPartialLimit(fullPlan.affordable)}
                  >
                    <FaMagic aria-hidden="true" />
                    {t('aiBatchModal.partialStart', { count: fullPlan.affordable })}
                  </button>
                )}
              </div>
              <span className="ai-batch__muted ai-batch__muted--small">{t('aiBatchModal.oneByOne')}</span>
            </>
          )}

          {status === 'idle' && !showMissingTokens && (
            <>
              <div className="ai-batch__intro">
                <Thumbs cards={cards.slice(0, plan.photos)} moreLabel={moreLabel} />
                <span className="ai-batch__muted">
                  {partialLimit === undefined
                    ? t('aiBatchModal.pending', { count: cards.length })
                    : t('aiBatchModal.partial', { count: plan.photos })}
                  {alreadyTransformed > 0 && ` ${t('aiBatchModal.untouched', { count: alreadyTransformed })}`}
                </span>
              </div>

              <dl className="ai-batch__table">
                <div className="ai-batch__row">
                  <dt>{t('aiBatchModal.rows.photos')}</dt>
                  <dd>{plan.photos}</dd>
                </div>
                <div className="ai-batch__row">
                  <dt>{t('aiBatchModal.rows.tokens')}</dt>
                  <dd className="ai-batch__tokens">{plan.tokens}</dd>
                </div>
                <div className="ai-batch__row">
                  <dt>{t('aiBatchModal.rows.balanceAfter')}</dt>
                  <dd>
                    {plan.balanceAfter === null ? '—' : t('aiBatchModal.balanceValue', { count: plan.balanceAfter })}
                  </dd>
                </div>
                <div className="ai-batch__row">
                  <dt>{t('aiBatchModal.rows.time')}</dt>
                  <dd>{t('aiBatchModal.timeValue', { time: minutes })}</dd>
                </div>
              </dl>

              <p className="ai-batch__refund">
                <FaCheckCircle aria-hidden="true" />
                <span>{t('aiBatchModal.refundNote')}</span>
              </p>

              <div className="ai-batch__actions">
                <button type="button" className="card-form__button card-form__button--ghost" onClick={onClose}>
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="card-form__button ai-batch__start"
                  onClick={() => onStart(partialLimit)}
                  disabled={!plan.hasEnough || plan.photos === 0}
                >
                  <FaMagic aria-hidden="true" />
                  {t('aiBatchModal.start', { count: plan.photos })}
                </button>
              </div>
            </>
          )}

          {status === 'processing' && (
            <>
              <div className="ai-batch__progress-head" role="status">
                <strong>{t('aiBatchModal.painting')}</strong>
                <span className="ai-batch__progress-count">
                  {t('aiBatchModal.progressCount', { current: Math.min(currentIndex + 1, batchTotal), total: batchTotal })}
                </span>
              </div>
              <div className="ai-batch__bar" aria-hidden="true">
                <span style={{ width: `${batchTotal > 0 ? Math.min(100, ((currentIndex + 1) / batchTotal) * 100) : 0}%` }} />
              </div>
              <div className="ai-batch__grid" aria-hidden="true">
                {batchCards.map((card, index) => {
                  const state = batchCardState(index, currentIndex, card.isAiGenerated === true);
                  return (
                    <div key={card.id} className={`ai-batch__cell ai-batch__cell--${state}`}>
                      {card.image && <img src={card.image} alt="" />}
                      {state === 'current' && (
                        <span className="ai-batch__cell-working">
                          <span className="ai-batch__cell-spinner" />
                        </span>
                      )}
                      {state === 'done' && (
                        <span className="ai-batch__cell-check">
                          <FaCheck />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <span className="ai-batch__muted ai-batch__muted--small">{t('aiBatchModal.processingInfo')}</span>
              <button type="button" className="card-form__button card-form__button--secondary" onClick={handleClose}>
                {t('aiBatchModal.closeAndContinue')}
              </button>
            </>
          )}

          {status === 'complete' && (
            <div className="ai-batch__result">
              <span className="ai-batch__result-icon">
                <FaCheck aria-hidden="true" />
              </span>
              <h3 className="ai-batch__result-title">
                {transformedCount > 0 ? t('aiBatchModal.done', { count: transformedCount }) : t('aiBatchModal.doneNone')}
              </h3>
              <Thumbs cards={batchCards.filter((card) => card.isAiGenerated)} moreLabel={moreLabel} />
              {skippedCount > 0 && (
                <p className="ai-batch__rejected">
                  {t('aiBatchModal.rejected', { count: skippedCount })}{' '}
                  <strong>{t('aiBatchModal.refunded', { count: skippedCount })}</strong>{' '}
                  {t('aiBatchModal.rejectedHint')}
                </p>
              )}
              {transformedCount > 0 && <span className="ai-batch__muted">{t('aiBatchModal.revertHint')}</span>}
              <button type="button" className="card-form__button card-form__button--primary" onClick={onClose}>
                {t('aiBatchModal.seeCards')}
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="ai-batch__result">
              <FaExclamationTriangle className="ai-batch__error-icon" aria-hidden="true" />
              <p className="ai-batch__error-text" role="alert">
                {error || t('cardEditor.errors.genericContactAdmin')}
              </p>
              <button type="button" className="card-form__button card-form__button--secondary" onClick={onClose}>
                {t('common.close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
