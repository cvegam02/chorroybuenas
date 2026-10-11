import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGift, FaPlus, FaTimes } from 'react-icons/fa';
import type { LoteriaSet } from '../../repositories/SetRepository';
import type { SetSummary } from '../../services/setSummaries';
import { isNewAccount } from '../../utils/setSummary';
import { LoteriaCard } from './LoteriaCard';
import './MyLoterias.css';

// El menú de usuario (UserMenuPanel) enlaza a esta sección con el mismo ancla
export const LOTERIAS_SECTION_ID = 'mis-loterias';

/** Cartas de muestra del sitio para la cuenta que aún no tiene las suyas (las mismas de Temáticas). */
const SAMPLE_CARDS = ['/media/inicio/cartas/carta-05.jpg', '/media/inicio/cartas/carta-03.jpg'];

interface MyLoteriasProps {
  sectionRef: RefObject<HTMLElement>;
  sets: readonly LoteriaSet[];
  summaries: ReadonlyMap<string, SetSummary> | null;
  isLoading: boolean;
  /** No se pudo cargar el resumen: las loterías se listan igual, sin cartas ni estado. */
  hasError: boolean;
  onRetry: () => void;
  tokensSpentBySet: Readonly<Record<string, number>>;
  /** Tokens de regalo por crear la cuenta; con 0 no se promete nada. */
  giftTokens: number;
  isCreating: boolean;
  onCreate: () => void;
  onEditCards: (set: LoteriaSet) => void;
  onMakeBoards: (set: LoteriaSet) => void;
  /** La lotería cuyo PDF se está armando, si hay alguno. */
  downloadingSet: { id: string; name: string } | null;
  /** Aviso si el último PDF no se pudo armar. */
  pdfError: string | null;
  onDismissPdfError: () => void;
  onDownload: (set: LoteriaSet) => void;
  onRename: (set: LoteriaSet) => void;
  onDelete: (set: LoteriaSet) => void;
}

/** «Mis loterías» de Mi cuenta: una tarjeta por lotería guardada y la forma de crear otra. */
export const MyLoterias = ({
  sectionRef,
  sets,
  summaries,
  isLoading,
  hasError,
  onRetry,
  tokensSpentBySet,
  giftTokens,
  isCreating,
  onCreate,
  onEditCards,
  onMakeBoards,
  downloadingSet,
  pdfError,
  onDismissPdfError,
  onDownload,
  onRename,
  onDelete,
}: MyLoteriasProps) => {
  const { t } = useTranslation();
  const title = t('dashboard.loterias.title');

  if (isLoading) {
    return (
      <section className="my-loterias" id={LOTERIAS_SECTION_ID} ref={sectionRef}>
        <h2 className="my-loterias__title">{title}</h2>
        <div className="dashboard__loading-inline" role="status">
          <div className="dashboard__spinner dashboard__spinner--small" />
          <span>{t('common.loading')}</span>
        </div>
      </section>
    );
  }

  if (isNewAccount(sets, summaries)) {
    return (
      <section className="my-loterias" id={LOTERIAS_SECTION_ID} ref={sectionRef}>
        {giftTokens > 0 && (
          <p className="my-loterias__gift">
            <FaGift aria-hidden="true" />
            <span>{t('dashboard.loterias.gift', { count: giftTokens })}</span>
          </p>
        )}
        <h2 className="my-loterias__title">{title}</h2>
        <div className="my-loterias__welcome">
          <div className="my-loterias__welcome-cards" aria-hidden="true">
            {SAMPLE_CARDS.map((src) => (
              <img key={src} src={src} alt="" width={70} height={105} loading="lazy" />
            ))}
          </div>
          <h3 className="my-loterias__welcome-title">{t('dashboard.loterias.welcomeTitle')}</h3>
          <p className="my-loterias__welcome-text">{t('dashboard.loterias.welcomeText')}</p>
          <button type="button" className="my-loterias__create" onClick={() => onEditCards(sets[0])}>
            <FaPlus aria-hidden="true" />
            {t('dashboard.loterias.createFirst')}
          </button>
        </div>
      </section>
    );
  }

  const createLabel = isCreating ? t('common.loading') : t('dashboard.createNew');

  return (
    <section className="my-loterias" id={LOTERIAS_SECTION_ID} ref={sectionRef}>
      <div className="my-loterias__header">
        <div className="my-loterias__heading">
          <h2 className="my-loterias__title">{title}</h2>
          <span className="my-loterias__count">{sets.length}</span>
        </div>
        <button type="button" className="my-loterias__create" onClick={onCreate} disabled={isCreating}>
          <FaPlus aria-hidden="true" />
          {createLabel}
        </button>
      </div>

      {hasError && (
        <div className="my-loterias__error" role="alert">
          <span>{t('dashboard.loterias.error')}</span>
          <button type="button" className="my-loterias__retry" onClick={onRetry}>
            {t('seasonal.retry')}
          </button>
        </div>
      )}

      {downloadingSet && (
        <p className="my-loterias__notice" role="status">
          <span className="my-loterias__spinner" aria-hidden="true" />
          {t('dashboard.loterias.pdfPreparing', { name: downloadingSet.name })}
        </p>
      )}

      {pdfError && (
        <div className="my-loterias__error" role="alert">
          <span>{pdfError}</span>
          <button
            type="button"
            className="my-loterias__dismiss"
            onClick={onDismissPdfError}
            aria-label={t('common.close')}
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="my-loterias__grid">
        {sets.map((set) => (
          <LoteriaCard
            key={set.id}
            set={set}
            summary={summaries?.get(set.id)}
            tokensSpent={tokensSpentBySet[set.id] ?? 0}
            onEditCards={() => onEditCards(set)}
            onMakeBoards={() => onMakeBoards(set)}
            isDownloading={downloadingSet?.id === set.id}
            onDownload={() => onDownload(set)}
            onRename={() => onRename(set)}
            onDelete={() => onDelete(set)}
          />
        ))}
        <button type="button" className="my-loterias__new" onClick={onCreate} disabled={isCreating}>
          <span className="my-loterias__new-icon" aria-hidden="true">
            <FaPlus />
          </span>
          <strong>{createLabel}</strong>
          <span className="my-loterias__new-hint">{t('dashboard.loterias.createHint')}</span>
        </button>
      </div>
    </section>
  );
};
