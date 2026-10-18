import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SeasonalRepository, type AdminSeasonalLoteria, type Season } from '../../../repositories/SeasonalRepository';
import { validateSeasonalLoteriaForm, type SeasonalLoteriaForm } from '../../../utils/seasonalLoteria';
import { canPublish, wizardSteps, type WizardStepId } from '../../../utils/seasonalWizard';
import { WarningModal } from '../../ConfirmationModal/WarningModal';
import { WizardBasicsStep } from './WizardBasicsStep';
import { WizardBoardsStep } from './WizardBoardsStep';
import { WizardCardUploader } from './WizardCardUploader';
import { WizardAiFooter } from './WizardAiFooter';
import { WizardAiGenerator } from './WizardAiGenerator';
import { buildsOnSite, WizardCardsStep, type CardsMode } from './WizardCardsStep';
import { WizardFooter, WizardHeader, WizardStepsNav } from './WizardChrome';
import { WizardOwnPdf } from './WizardOwnPdf';
import { WizardPublishStep } from './WizardPublishStep';
import { WizardShowcaseStep } from './WizardShowcaseStep';
import { useWizardAi } from './useWizardAi';
import { useWizardCards } from './useWizardCards';
import { useWizardDraft } from './useWizardDraft';
import { useWizardPdf } from './useWizardPdf';
import { useWizardShowcase } from './useWizardShowcase';
import { publishFacts } from './wizardPublishFacts';

interface WizardScreenProps {
  initialSeasons: Season[];
  initialLoteria: AdminSeasonalLoteria | null;
  /** La primera vez que se guarda una lotería nueva. */
  onCreated: (id: string) => void;
}

const BACK_TO_SEASONAL = { pathname: '/admin', state: { tab: 'temporada' } } as const;
const STEP_ORDER: readonly WizardStepId[] = ['basics', 'cards', 'boards', 'showcase', 'publish'];
const CARDS_STEP = STEP_ORDER.indexOf('cards');
const BOARDS_STEP = STEP_ORDER.indexOf('boards');
const PUBLISH_STEP = STEP_ORDER.indexOf('publish');

/** El paso donde está el primer campo que no deja guardar. */
function stepWithErrors(form: SeasonalLoteriaForm): number {
  const fields = Object.keys(validateSeasonalLoteriaForm(form).errors);
  if (fields.some((field) => ['seasonId', 'nameEs', 'nameEn', 'descriptionEs', 'descriptionEn'].includes(field))) return 0;
  if (fields.some((field) => field === 'cardCount' || field === 'boardCount')) return CARDS_STEP;
  return PUBLISH_STEP;
}

const Panel = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
  <section className="seasonal-wizard__panel" aria-labelledby="wizard-step-title">
    <div>
      <h1 id="wizard-step-title" className="seasonal-wizard__step-title">
        {title}
      </h1>
      <p className="seasonal-wizard__muted">{subtitle}</p>
    </div>
    {children}
  </section>
);

/** El asistente ya cargado (FEAT-48, decisiones 7 a 15 y 20). */
export const WizardScreen = ({ initialSeasons, initialLoteria, onCreated }: WizardScreenProps) => {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState(initialSeasons);
  const draft = useWizardDraft(initialLoteria, initialSeasons);
  const { record, form } = draft;
  const cards = useWizardCards(record?.id ?? null, ({ cardCount, boardCount }) => {
    draft.setField('cardCount', cardCount > 0 ? String(cardCount) : '');
    if (boardCount === null) draft.setField('boardCount', '');
  });
  const pdf = useWizardPdf(draft, cards);
  const [chosenMode, setChosenMode] = useState<CardsMode | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const isPublished = record?.is_published ?? false;

  const ai = useWizardAi(record?.id ?? null);
  // Sin elección: con cartas guardadas, «Subir mis cartas»; sin cartas pero con un PDF, «Ya tengo el PDF»;
  // sin cartas pero con cartas para generar, «Generar con IA» (FEAT-50).
  const noCards = cards.status === 'ready' && cards.cards.length === 0;
  const mode: CardsMode =
    chosenMode ?? (noCards && record?.pdf ? 'pdf' : noCards && ai.build.cards.length > 0 ? 'ai' : 'cards');
  const showcase = useWizardShowcase(draft, cards, mode);
  const busy = pdf.stage !== 'idle' || cards.isAdding || showcase.isSaving || showcase.isPreparing || isPublishing;
  // Unos tableros de otro modo (se cambió de Clásico a Kids) ya no sirven.
  const boards = cards.boards.every((board) => board.length === form.gridSize) ? cards.boards : [];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Al salir por otro lado (la barra, el botón de atrás) se guarda lo último, sin esperar.
  const onLeave = useRef({ save: draft.save, isClean: draft.isClean });
  onLeave.current = { save: draft.save, isClean: draft.isClean };
  useEffect(
    () => () => {
      if (!onLeave.current.isClean()) void onLeave.current.save();
    },
    [],
  );

  const save = async (force = false) => {
    const wasNew = !draft.record;
    const id = await draft.save(force);
    if (id && wasNew) onCreated(id);
    return id;
  };

  /**
   * Lo que pasa al terminar el paso actual: en Tableros se arma el PDF; al salir de Cartas o de Vitrina, la
   * portada y las muestras elegidas se protegen y se guardan (decisión 13); en todos, se guarda el borrador.
   * Una publicada no guarda nada hasta «Guardar cambios» (decisión 20).
   */
  const finishStep = async (): Promise<boolean> => {
    const step = steps[stepIndex];
    if (isPublished) return true;
    if (step.id === 'boards' && buildsOnSite(mode) && boards.length > 0 && !cards.pdfIsCurrent) {
      return pdf.generate();
    }
    if (!draft.isClean() && !(await save())) {
      setStepIndex(stepWithErrors(draft.form));
      return false;
    }
    const syncsShowcase = step.id === 'showcase' || (step.id === 'cards' && buildsOnSite(mode));
    return syncsShowcase ? showcase.sync() : true;
  };

  const goTo = async (index: number) => {
    if (index === stepIndex || busy) return;
    if (await finishStep()) setStepIndex(index);
  };

  const backToSeasonal = () => navigate(BACK_TO_SEASONAL.pathname, { state: BACK_TO_SEASONAL.state });

  const leave = async () => {
    if (busy) return;
    // Una publicada sin «Guardar cambios» sale sin tocar el catálogo (decisión 20).
    if (await finishStep()) backToSeasonal();
  };

  /**
   * Lo que «Publicar» y «Guardar cambios» dejan guardado de una vez: el PDF, si las cartas o los tableros
   * cambiaron; la ficha; y la portada y las muestras. Si algo falla, lleva al paso que lo tiene.
   */
  const commitAll = async (): Promise<string | null> => {
    if (buildsOnSite(mode) && boards.length > 0 && !cards.pdfIsCurrent && !(await pdf.generate())) {
      setStepIndex(BOARDS_STEP);
      return null;
    }
    const id = await save(true);
    if (!id) {
      setStepIndex(stepWithErrors(draft.form));
      return null;
    }
    return (await showcase.sync()) ? id : null;
  };

  const runFinal = async (publish: boolean) => {
    if (busy) return;
    setIsPublishing(true);
    setPublishError(null);
    const id = await commitAll();
    const published = id !== null && (!publish || (await SeasonalRepository.setPublished(id, true)));
    setIsPublishing(false);
    if (published) {
      backToSeasonal();
      return;
    }
    if (id) setPublishError('Se guardó, pero no se pudo publicar. Revisa la lista e intenta de nuevo.');
  };

  const steps = wizardSteps({
    name_es: record?.name_es ?? '',
    description_es: record?.description_es ?? null,
    card_count: record?.card_count ?? null,
    board_count: record?.board_count ?? null,
    price_cents: record?.price_cents ?? null,
    hasPdf: !!record?.pdf,
    hasCover: !!record?.cover_path,
  });
  const step = steps[stepIndex];
  const { checks, preview } = publishFacts({
    form,
    record,
    mode,
    cardsLoaded: cards.cards.length,
    boardsGenerated: boards.length,
    pdfIsCurrent: cards.pdfIsCurrent,
    hasCover: buildsOnSite(mode) ? showcase.cover !== null || showcase.ownCover !== null : showcase.pdfCover !== null,
  });

  const renderStep = () => {
    switch (step.id) {
      case 'basics':
        return (
          <WizardBasicsStep
            form={form}
            errors={draft.errors}
            seasons={seasons}
            setField={draft.setField}
            onSeasonCreated={(season) => setSeasons((prev) => [...prev, season])}
          />
        );
      case 'cards':
        return (
          <WizardCardsStep mode={mode} onModeChange={setChosenMode} canUpload={!!record}>
            {mode === 'cards' ? (
              <WizardCardUploader cards={cards} gridSize={form.gridSize} />
            ) : mode === 'ai' ? (
              <WizardAiGenerator ai={ai}>
                <WizardAiFooter
                  ai={ai}
                  gridSize={form.gridSize}
                  siteCardCount={cards.cards.length}
                  usingProgress={cards.progress ?? {}}
                  onUse={cards.replaceAll}
                />
              </WizardAiGenerator>
            ) : (
              <>
                <WizardOwnPdf
                  pdf={record?.pdf ?? null}
                  form={form}
                  errors={draft.errors}
                  setField={draft.setField}
                  isUploading={pdf.stage === 'uploading'}
                  onUpload={(file) => void pdf.uploadOwn(file)}
                />
                {pdf.error && (
                  <p className="seasonal-wizard__field-error" role="alert">
                    {pdf.error}
                  </p>
                )}
              </>
            )}
          </WizardCardsStep>
        );
      case 'boards':
        return (
          <Panel title="Tableros" subtitle="Cuántos tableros trae el PDF que se vende.">
            {buildsOnSite(mode) ? (
              <WizardBoardsStep cards={cards} gridSize={form.gridSize} boards={boards} pdfStage={pdf.stage} pdfError={pdf.error} />
            ) : (
              <p className="seasonal-wizard__muted">
                {form.boardCount.trim() !== ''
                  ? `Tu PDF trae ${form.boardCount.trim()} tableros.`
                  : 'Escribe en el paso 2 cuántos tableros trae tu PDF.'}
              </p>
            )}
          </Panel>
        );
      case 'showcase':
        return <WizardShowcaseStep mode={mode} cards={cards} showcase={showcase} />;
      case 'publish':
        return (
          <WizardPublishStep
            form={form}
            errors={draft.errors}
            setField={draft.setField}
            checks={checks}
            onGoToStep={(id) => goTo(STEP_ORDER.indexOf(id))}
            preview={preview}
            isPublished={isPublished}
          />
        );
    }
  };

  return (
    <div className="seasonal-wizard">
      <WizardHeader
        name={form.nameEs.trim() || 'Sin nombre'}
        isPublished={isPublished}
        saveState={draft.saveState}
        now={now}
        onBack={() => leave()}
      />

      <div className="seasonal-wizard__body">
        <WizardStepsNav steps={steps} current={stepIndex} onGo={goTo} />

        <main className="seasonal-wizard__main">
          {renderStep()}
          {publishError && (
            <p className="seasonal-wizard__field-error" role="alert">
              {publishError}
            </p>
          )}
          <WizardFooter
            isFirst={stepIndex === 0}
            isLast={stepIndex === steps.length - 1}
            isPublished={isPublished}
            busy={busy}
            isReady={canPublish(checks)}
            onPrev={() => goTo(stepIndex - 1)}
            onNext={() => goTo(stepIndex + 1)}
            onSaveDraft={() => leave()}
            onPublish={() => runFinal(true)}
            onSaveChanges={() => runFinal(false)}
          />
        </main>
      </div>

      <WarningModal
        isOpen={pdf.isAsking}
        title="Esta lotería ya se vendió"
        message="Los compradores descargarán la versión nueva del PDF."
        confirmText="Guardar el PDF nuevo"
        cancelText="Cancelar"
        onConfirm={() => pdf.answer(true)}
        onCancel={() => pdf.answer(false)}
        type="warning"
      />
    </div>
  );
};
