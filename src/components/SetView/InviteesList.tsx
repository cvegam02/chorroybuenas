import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { BoardRepository } from '../../repositories/BoardRepository';
import { CardRepository } from '../../repositories/CardRepository';
import { LoteriaInviteRepository, type LoteriaInvitee } from '../../repositories/LoteriaInviteRepository';
import { logger } from '../../utils/logger';

/** Las iniciales del círculo de cada invitado: hasta dos letras de su nombre. */
const initialsOf = (name: string | null): string =>
  name
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('')
    : '?';

type RowAction = 'remove' | 'deletePhotos';

interface InviteeRowProps {
  invitee: LoteriaInvitee;
  /** La acción que se está confirmando en este renglón, si hay. */
  confirming: RowAction | null;
  isBusy: boolean;
  onAsk: (action: RowAction | null) => void;
  onConfirm: (action: RowAction) => void;
}

/** Un invitado: nombre, cuántas fotos subió, «Borrar fotos» (FEAT-58, US A5) y «Quitar», cada uno con su confirmación. */
const InviteeRow = ({ invitee, confirming, isBusy, onAsk, onConfirm }: InviteeRowProps) => {
  const { t } = useTranslation();
  const name = invitee.name ?? t('invite.inviteeNoName');
  const confirmText = confirming === 'deletePhotos'
    ? t('invite.deletePhotosConfirm', { name, count: invitee.cardCount })
    : t('invite.removeConfirm', { name });
  const confirmLabel = confirming === 'deletePhotos' ? t('invite.deletePhotos') : t('invite.remove');

  return (
    <li className="invitees-dialog__row">
      <span className="invitees-list__avatar" aria-hidden="true">
        {initialsOf(invitee.name)}
      </span>
      <div className="invitees-dialog__who">
        <span className="invitees-dialog__name">{name}</span>
        <span className="invitees-dialog__count">{t('invite.inviteePhotos', { count: invitee.cardCount })}</span>
      </div>
      {confirming ? (
        <div className="invitees-dialog__confirm">
          <p>{confirmText}</p>
          <div className="invite-dialog__manage-buttons">
            <button
              type="button"
              className="invite-dialog__manage-button invitees-dialog__remove"
              onClick={() => onConfirm(confirming)}
              disabled={isBusy}
            >
              {confirmLabel}
            </button>
            <button type="button" className="invite-dialog__manage-button" onClick={() => onAsk(null)} disabled={isBusy}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="invitees-list__actions">
          {invitee.cardCount > 0 && (
            <button
              type="button"
              className="share-dialog__quiet share-dialog__quiet--danger"
              onClick={() => onAsk('deletePhotos')}
              disabled={isBusy}
              aria-label={t('invite.deletePhotosLabel', { name })}
            >
              {t('invite.deletePhotos')}
            </button>
          )}
          <button
            type="button"
            className="share-dialog__quiet share-dialog__quiet--danger"
            onClick={() => onAsk('remove')}
            disabled={isBusy}
            aria-label={t('invite.removeLabel', { name })}
          >
            {t('invite.remove')}
          </button>
        </div>
      )}
    </li>
  );
};

interface InviteesListProps {
  setId: string;
  /** Se quitó a alguien: la ventana y el botón del encabezado se actualizan. */
  onChange: () => void;
  /** Se borraron las fotos de un invitado: las cartas de la lotería se vuelven a leer. */
  onPhotosDeleted: () => void;
  /** Está quitando a alguien o borrando sus fotos: la ventana no se cierra a medias. */
  onBusyChange: (isBusy: boolean) => void;
}

/**
 * «Quiénes participan» dentro de M18 (FEAT-57, US A4; antes la ventana M19 de FEAT-56): cada invitado con
 * cuántas fotos subió, «Borrar fotos» (FEAT-58, US A5) y «Quitar», que se confirman en el mismo renglón. Al
 * quitarlo pierde el acceso y sus fotos se quedan; al borrar sus fotos, sigue participando.
 */
export const InviteesList = ({ setId, onChange, onPhotosDeleted, onBusyChange }: InviteesListProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [invitees, setInvitees] = useState<LoteriaInvitee[] | null>(null);
  const [confirming, setConfirming] = useState<{ userId: string; action: RowAction } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    LoteriaInviteRepository.listInvitees(setId)
      .then((list) => {
        if (!cancelled) setInvitees(list);
      })
      .catch((err) => {
        logger.error('Error loading loteria invitees:', err);
        if (!cancelled) setHasError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setId]);

  const run = async (userId: string, action: RowAction) => {
    if (!user) return;
    setIsBusy(true);
    onBusyChange(true);
    setHasError(false);
    try {
      if (action === 'remove') {
        await LoteriaInviteRepository.removeInvitee(setId, userId);
        setInvitees((prev) => prev?.filter((invitee) => invitee.userId !== userId) ?? null);
        onChange();
      } else {
        await CardRepository.deleteGuestCards(user.id, setId, userId);
        // Si alguna estaba en un tablero, se borran los tableros de la lotería (FEAT-60, §21)
        await BoardRepository.deleteIncompleteBoards(user.id, setId).catch((err) =>
          logger.error('Error deleting boards after deleting guest photos:', err));
        setInvitees((prev) => prev?.map((i) => (i.userId === userId ? { ...i, cardCount: 0 } : i)) ?? null);
        onPhotosDeleted();
      }
      setConfirming(null);
    } catch (err) {
      logger.error(`Error in loteria invitee action ${action}:`, err);
      setHasError(true);
    } finally {
      setIsBusy(false);
      onBusyChange(false);
    }
  };

  return (
    <section className="invitees-list" aria-labelledby="invitees-list-title">
      <h3 id="invitees-list-title" className="invitees-list__title">
        {t('invite.participantsLoading')}
        {invitees && <span className="invitees-list__count">{invitees.length}</span>}
      </h3>

      {!invitees && !hasError && (
        <div className="invite-dialog__loading" aria-live="polite">
          <span className="invite-dialog__spinner" aria-hidden="true" />
          {t('common.loading')}
        </div>
      )}

      {invitees?.length === 0 && <p className="invite-dialog__hint">{t('invite.inviteesEmpty')}</p>}

      {invitees && invitees.length > 0 && (
        <ul className="invitees-dialog__list">
          {invitees.map((invitee) => (
            <InviteeRow
              key={invitee.userId}
              invitee={invitee}
              confirming={confirming?.userId === invitee.userId ? confirming.action : null}
              isBusy={isBusy}
              onAsk={(action) => setConfirming(action ? { userId: invitee.userId, action } : null)}
              onConfirm={(action) => run(invitee.userId, action)}
            />
          ))}
        </ul>
      )}

      {hasError && (
        <p className="invite-dialog__error" role="alert">
          {t('invite.error')}
        </p>
      )}
    </section>
  );
};
