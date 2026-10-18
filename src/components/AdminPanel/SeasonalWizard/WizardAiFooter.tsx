import { useState } from 'react';
import { AiCardsRepository } from '../../../repositories/AiCardsRepository';
import type { GridSize } from '../../../types';
import { cardsToGenerate, cardsToUse } from '../../../utils/aiCardBatch';
import { cardCountMessage } from '../../../utils/seasonalBuild';
import { hasEnoughCards } from '../../../utils/seasonalCards';
import { WarningModal } from '../../ConfirmationModal/WarningModal';
import type { WizardAiState } from './useWizardAi';
import { BusyLabel, ProgressBar } from './WizardBusy';

interface UseProgress {
  done?: number;
  total?: number;
}

interface WizardAiFooterProps {
  ai: WizardAiState;
  gridSize: GridSize;
  /** Cartas que la lotería ya tiene: «Usar estas cartas» las reemplaza. */
  siteCardCount: number;
  /** Cuántas van al pasarlas a la lotería; mientras se bajan, sin cuenta. */
  usingProgress: UseProgress;
  onUse: (images: { blob: Blob; fileName: string }[]) => Promise<boolean>;
}

type Pending = 'generate' | 'use' | null;

/**
 * Abajo del modo «Generar con IA» (FEAT-50, US A4): «Generar las que faltan», con confirmación y avance, y
 * «Usar estas cartas», que pasa los intentos elegidos a las cartas de la lotería en el orden de la lista.
 */
export const WizardAiFooter = ({ ai, gridSize, siteCardCount, usingProgress, onUse }: WizardAiFooterProps) => {
  const [pending, setPending] = useState<Pending>(null);
  const [isUsing, setIsUsing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const { cards } = ai.build;
  const missing = cardsToGenerate(cards, ai.generating);
  const { items, missing: notReady } = cardsToUse(cards);
  const enough = hasEnoughCards(items.length, gridSize);
  const busy = ai.generating.size > 0 || isUsing;

  const use = async () => {
    setIsUsing(true);
    setResult(null);
    const blobs = await AiCardsRepository.downloadAttempts(items.map((item) => item.path));
    const ok =
      !!blobs &&
      (await onUse(blobs.map((blob, index) => ({ blob, fileName: `${items[index].card.number} ${items[index].card.name}.webp` }))));
    setIsUsing(false);
    setResult(
      ok
        ? { ok, message: `Listo: la lotería ya tiene estas ${items.length} cartas. Sigue a Tableros.` }
        : { ok, message: 'No se pudieron pasar las cartas a la lotería. Intenta de nuevo.' },
    );
  };

  return (
    <div className="wizard-ai__footer">
      <div className="seasonal-wizard__counter-row">
        <b>
          {cards.length - notReady} de {cards.length} listas
          {ai.isBatchRunning && ' · generando…'}
        </b>
        <button
          type="button"
          className="seasonal-wizard__btn"
          disabled={missing.length === 0 || ai.isBatchRunning}
          onClick={() => setPending('generate')}
        >
          {missing.length > 0 ? `Generar las que faltan (${missing.length})` : 'No falta ninguna'}
        </button>
      </div>
      <div className="wizard-ai__loader-actions">
        <button
          type="button"
          className="seasonal-wizard__btn seasonal-wizard__btn--primary"
          disabled={!enough || busy}
          onClick={() => (siteCardCount > 0 ? setPending('use') : void use())}
        >
          <BusyLabel busy={isUsing} text={isUsing ? 'Pasando las cartas…' : 'Usar estas cartas'} />
        </button>
        <span className="seasonal-wizard__muted">
          {cardCountMessage(items.length, gridSize)}
          {notReady > 0 && enough && `. Las ${notReady} sin generar se quedan fuera`}.
        </span>
      </div>
      {ai.isBatchRunning && <ProgressBar label="Generando las que faltan" done={cards.length - notReady} total={cards.length} />}
      {isUsing && <ProgressBar label="Pasando las cartas a la lotería" {...usingProgress} />}
      {result && (
        <p className={result.ok ? 'seasonal-wizard__muted' : 'seasonal-wizard__field-error'} role={result.ok ? 'status' : 'alert'}>
          {result.message}
        </p>
      )}

      <WarningModal
        isOpen={pending === 'generate'}
        title="Generar las que faltan"
        message={`Se van a generar ${missing.length} ${missing.length === 1 ? 'carta' : 'cartas'}, 8 a la vez. Las que ya están no se tocan. ¿Seguir?`}
        confirmText={`Generar ${missing.length}`}
        cancelText="Cancelar"
        onConfirm={() => {
          setPending(null);
          void ai.generateMissing();
        }}
        onCancel={() => setPending(null)}
        type="warning"
      />
      <WarningModal
        isOpen={pending === 'use'}
        title="Usar estas cartas"
        message={`La lotería ya tiene ${siteCardCount} cartas: se reemplazan por estas ${items.length} y se borran sus tableros. ¿Seguir?`}
        confirmText="Reemplazar"
        cancelText="Cancelar"
        onConfirm={() => {
          setPending(null);
          void use();
        }}
        onCancel={() => setPending(null)}
        type="danger"
      />
    </div>
  );
};
