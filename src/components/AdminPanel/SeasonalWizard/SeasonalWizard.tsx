import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  SeasonalRepository,
  type AdminSeasonalLoteria,
  type Season,
} from '../../../repositories/SeasonalRepository';
import { WizardScreen } from './WizardScreen';
import './SeasonalWizard.css';

/** La ruta de una lotería que todavía no existe. */
export const NEW_LOTERIA_PARAM = 'nueva';

type LoadState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'missing' }
  | { status: 'ready'; seasons: Season[]; loteria: AdminSeasonalLoteria | null };

/** A1.7a — Asistente de lotería temática (FEAT-48). Solo administradores; fuera del panel con pestañas. */
export const SeasonalWizard = () => {
  const { id = NEW_LOTERIA_PARAM } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  // Al guardar una nueva, la dirección cambia a su id: eso no debe volver a cargarla.
  const createdId = useRef<string | null>(null);
  const allowed = !authLoading && !!user && isAdmin;

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) navigate('/dashboard', { replace: true });
  }, [authLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (!allowed || id === createdId.current) return;
    let cancelled = false;
    setLoad({ status: 'loading' });
    Promise.all([
      SeasonalRepository.getAdminSeasons(),
      id === NEW_LOTERIA_PARAM ? Promise.resolve([]) : SeasonalRepository.getAdminLoterias(),
    ]).then(([seasons, loterias]) => {
      if (cancelled) return;
      if (!seasons || !loterias) {
        setLoad({ status: 'failed' });
        return;
      }
      const loteria = id === NEW_LOTERIA_PARAM ? null : (loterias.find((item) => item.id === id) ?? undefined);
      if (loteria === undefined) {
        setLoad({ status: 'missing' });
        return;
      }
      setLoad({ status: 'ready', seasons, loteria });
    });
    return () => {
      cancelled = true;
    };
  }, [allowed, id]);

  if (!allowed) return null;

  if (load.status !== 'ready') {
    return (
      <div className="seasonal-wizard">
        <main className="seasonal-wizard__message">
          <Link to="/admin" state={{ tab: 'temporada' }} className="seasonal-wizard__back-link">
            ← Volver a Temáticas
          </Link>
          {load.status === 'loading' && <p className="seasonal-wizard__muted">Cargando la lotería…</p>}
          {load.status === 'failed' && (
            <p className="seasonal-wizard__field-error" role="alert">
              No se pudo cargar la lotería. Revisa tu conexión y vuelve a abrir esta página.
            </p>
          )}
          {load.status === 'missing' && (
            <p className="seasonal-wizard__field-error" role="alert">
              Esta lotería temática no existe o fue borrada.
            </p>
          )}
        </main>
      </div>
    );
  }

  return (
    <WizardScreen
      initialSeasons={load.seasons}
      initialLoteria={load.loteria}
      onCreated={(newId) => {
        createdId.current = newId;
        navigate(`/admin/tematicas/${newId}`, { replace: true });
      }}
    />
  );
};
