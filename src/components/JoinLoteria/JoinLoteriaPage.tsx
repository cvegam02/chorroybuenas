import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaImages, FaLock, FaUsers } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { LoteriaInviteRepository } from '../../repositories/LoteriaInviteRepository';
import type { InvitePreview } from '../../utils/loteriaInvite';
import { logger } from '../../utils/logger';
import { EmailAuthModal } from '../Auth/EmailAuthModal';
import './JoinLoteriaPage.css';

type PageState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; preview: InvitePreview };

/** A dónde llega cada quien: el dueño a su lotería (U2), el invitado a la vista de invitado (U5). */
const loteriaPath = (role: 'owner' | 'guest', setId: string) =>
  role === 'owner' ? `/loteria/${setId}` : `/participo/${setId}`;

/** P9 — «Unirse a una lotería» (`/unirse/:codigo`, FEAT-56, US B2). */
export const JoinLoteriaPage = () => {
  const { codigo = '' } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  /** Pulsó «Entrar» sin sesión: al entrar, se une sin volver a pulsar. */
  const [wantsToJoin, setWantsToJoin] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinFailed, setJoinFailed] = useState(false);
  const userId = user?.id;
  const returnPath = `/unirse/${codigo}`;

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      setState({ kind: 'ready', preview: await LoteriaInviteRepository.preview(codigo) });
    } catch (err) {
      logger.error('Error loading invite:', err);
      setState({ kind: 'error' });
    }
  }, [codigo]);

  // Lo que se ve depende de quién abre el enlace: se vuelve a pedir al entrar o salir
  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, userId, load]);

  // El dueño y quien ya es invitado van directo a la lotería
  useEffect(() => {
    if (state.kind !== 'ready' || state.preview.status !== 'open') return;
    const { role, setId } = state.preview;
    if (role !== 'none' && setId) navigate(loteriaPath(role, setId), { replace: true });
  }, [state, navigate]);

  const join = useCallback(async () => {
    setIsJoining(true);
    setJoinFailed(false);
    try {
      const setId = await LoteriaInviteRepository.join(codigo);
      navigate(loteriaPath('guest', setId), { replace: true });
    } catch (err) {
      logger.error('Error joining loteria:', err);
      if (err instanceof Error && (err.message === 'INVITE_UNAVAILABLE' || err.message === 'INVITEE_REMOVED')) {
        // El enlace cambió mientras tanto: la página lo dice
        load();
      } else {
        setJoinFailed(true);
      }
    } finally {
      setIsJoining(false);
    }
  }, [codigo, navigate, load]);

  useEffect(() => {
    if (!wantsToJoin || !userId || state.kind !== 'ready') return;
    setWantsToJoin(false);
    if (state.preview.status === 'open' && state.preview.role === 'none') join();
  }, [wantsToJoin, userId, state, join]);

  const enter = () => {
    if (userId) {
      join();
    } else {
      setWantsToJoin(true);
      setIsAuthOpen(true);
    }
  };

  const renderBody = () => {
    if (state.kind === 'loading' || (state.kind === 'ready' && state.preview.status === 'open' && state.preview.role !== 'none')) {
      return (
        <div className="join-loteria__loading" aria-live="polite">
          <span className="join-loteria__spinner" aria-hidden="true" />
          {t('common.loading')}
        </div>
      );
    }
    if (state.kind === 'error') {
      return (
        <>
          <h1 className="join-loteria__title">{t('join.errorTitle')}</h1>
          <p className="join-loteria__text">{t('join.errorText')}</p>
          <button type="button" className="join-loteria__button" onClick={load}>
            {t('join.retry')}
          </button>
        </>
      );
    }
    const { preview } = state;
    if (preview.status !== 'open') {
      const isRemoved = preview.status === 'removed';
      return (
        <>
          <span className="join-loteria__badge join-loteria__badge--muted" aria-hidden="true">
            <FaLock />
          </span>
          <h1 className="join-loteria__title">{t(isRemoved ? 'join.removedTitle' : 'join.unavailableTitle')}</h1>
          <p className="join-loteria__text">{t(isRemoved ? 'join.removedText' : 'join.unavailableText')}</p>
          <Link to="/" className="join-loteria__button">
            {t('join.goHome')}
          </Link>
        </>
      );
    }
    return (
      <>
        <span className="join-loteria__badge" aria-hidden="true">
          <FaUsers />
        </span>
        <p className="join-loteria__eyebrow">{t('join.eyebrow')}</p>
        <h1 className="join-loteria__title">{preview.setName}</h1>
        <ul className="join-loteria__facts">
          {preview.organizerName && <li>{t('join.organizer', { name: preview.organizerName })}</li>}
          <li>
            <FaImages aria-hidden="true" />
            {t('join.cardCount', { count: preview.cardCount })}
          </li>
        </ul>
        <p className="join-loteria__text">{t('join.text')}</p>
        {joinFailed && (
          <p className="join-loteria__error" role="alert">
            {t('join.joinError')}
          </p>
        )}
        <button
          type="button"
          className="join-loteria__button join-loteria__button--primary"
          onClick={enter}
          disabled={isJoining}
        >
          {isJoining ? t('common.loading') : t('join.enter')}
        </button>
        {!userId && <p className="join-loteria__hint">{t('join.accountHint')}</p>}
      </>
    );
  };

  return (
    <main className="join-loteria">
      <section className="join-loteria__card">{renderBody()}</section>
      <EmailAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode="signup"
        googleReturnPath={returnPath}
        confirmReturnPath={returnPath}
      />
    </main>
  );
};
