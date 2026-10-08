import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { SeasonalRepository, type AdminSeasonalLoteria } from '../../../repositories/SeasonalRepository';
import { hasEnoughCards } from '../../../utils/seasonalCards';
import { SeasonalBuilderBoards } from './SeasonalBuilderBoards';
import { SeasonalBuilderCards } from './SeasonalBuilderCards';
import { SeasonalBuilderSave } from './SeasonalBuilderSave';
import { useSeasonalCards, type SeasonalCard } from './useSeasonalCards';
import '../AdminTokenPacks.css';
import './SeasonalBuilder.css';

type LoadState = { status: 'loading' } | { status: 'failed' } | { status: 'missing' } | { status: 'ready'; loteria: AdminSeasonalLoteria };

const STEPS = ['Cartas', 'Tableros', 'Muestras y guardar'] as const;

/** Vuelve al panel de administración, en la pestaña De Temporada. */
const BACK_TO_SEASONAL = { pathname: '/admin', state: { tab: 'temporada' } } as const;

/** A1.7a — Crear una lotería de temporada con cartas ya terminadas (FEAT-23). */
export const SeasonalBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [step, setStep] = useState(0);
  const seasonalCards = useSeasonalCards();
  const [boards, setBoards] = useState<SeasonalCard[][]>([]);

  // Si cambian las cartas, los tableros ya generados dejan de corresponder.
  useEffect(() => {
    setBoards([]);
  }, [seasonalCards.cards]);

  const allowed = !authLoading && !!user && isAdmin;

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) navigate('/dashboard', { replace: true });
  }, [authLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    setLoad({ status: 'loading' });
    SeasonalRepository.getAdminLoterias().then((loterias) => {
      if (cancelled) return;
      if (!loterias) {
        setLoad({ status: 'failed' });
        return;
      }
      const loteria = loterias.find((item) => item.id === id);
      setLoad(loteria ? { status: 'ready', loteria } : { status: 'missing' });
    });
    return () => {
      cancelled = true;
    };
  }, [allowed, id]);

  if (!allowed) return null;

  const backLink = (
    <Link className="seasonal-builder__back" to={BACK_TO_SEASONAL.pathname} state={BACK_TO_SEASONAL.state}>
      ← Volver a Temáticas
    </Link>
  );

  if (load.status !== 'ready') {
    return (
      <div className="seasonal-builder">
        <main className="seasonal-builder__main">
          {backLink}
          {load.status === 'loading' && <p className="admin-packs__loading">Cargando la lotería…</p>}
          {load.status === 'failed' && (
            <p className="admin-packs__error" role="alert">
              No se pudo cargar la lotería. Revisa tu conexión y vuelve a abrir esta página.
            </p>
          )}
          {load.status === 'missing' && (
            <p className="admin-packs__error" role="alert">
              Esta lotería temática no existe o fue borrada.
            </p>
          )}
        </main>
      </div>
    );
  }

  const { loteria } = load;
  const gridSize = loteria.grid_size;
  const canContinue = hasEnoughCards(seasonalCards.cards.length, gridSize) && !seasonalCards.isAdding;

  return (
    <div className="seasonal-builder">
      <main className="seasonal-builder__main">
        {backLink}
        <header className="seasonal-builder__header">
          <h1 className="seasonal-builder__title">Crear el PDF con mis cartas</h1>
          <p className="seasonal-builder__subtitle">
            {loteria.name_es} · {gridSize === 9 ? 'Kids (3×3)' : 'Clásico (4×4)'}
          </p>
        </header>

        <ol className="seasonal-builder__steps">
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={`seasonal-builder__step${index === step ? ' seasonal-builder__step--active' : ''}`}
              aria-current={index === step ? 'step' : undefined}
            >
              <span className="seasonal-builder__step-number">{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <>
            <SeasonalBuilderCards {...seasonalCards} gridSize={gridSize} />
            <div className="seasonal-builder__actions">
              <button
                type="button"
                className="admin-packs__btn admin-packs__btn--primary"
                disabled={!canContinue}
                onClick={() => setStep(1)}
              >
                Siguiente: tableros
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <SeasonalBuilderBoards
              cards={seasonalCards.cards}
              gridSize={gridSize}
              boards={boards}
              onBoardsChange={setBoards}
            />
            <div className="seasonal-builder__actions">
              <button type="button" className="admin-packs__btn admin-packs__btn--secondary" onClick={() => setStep(0)}>
                Volver a las cartas
              </button>
              <button
                type="button"
                className="admin-packs__btn admin-packs__btn--primary"
                disabled={boards.length === 0}
                onClick={() => setStep(2)}
              >
                Siguiente: muestras y guardar
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <SeasonalBuilderSave
            loteria={loteria}
            cards={seasonalCards.cards}
            boards={boards}
            onBack={() => setStep(1)}
          />
        )}
      </main>
    </div>
  );
};
