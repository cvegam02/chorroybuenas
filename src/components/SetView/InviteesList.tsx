import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

interface InviteesListProps {
  setId: string;
  /** Se quitó a alguien: la ventana y el botón del encabezado se actualizan. */
  onChange: () => void;
  /** Está quitando a alguien: la ventana no se cierra a medias. */
  onBusyChange: (isBusy: boolean) => void;
}

/**
 * «Quiénes participan» dentro de M18 (FEAT-57, US A4; antes la ventana M19 de FEAT-56): cada invitado con
 * cuántas fotos subió y «Quitar», que se confirma en el mismo renglón. Al quitarlo pierde el acceso y sus fotos se quedan.
 */
export const InviteesList = ({ setId, onChange, onBusyChange }: InviteesListProps) => {
  const { t } = useTranslation();
  const [invitees, setInvitees] = useState<LoteriaInvitee[] | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
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

  const remove = async (userId: string) => {
    setIsBusy(true);
    onBusyChange(true);
    setHasError(false);
    try {
      await LoteriaInviteRepository.removeInvitee(setId, userId);
      setInvitees((prev) => prev?.filter((invitee) => invitee.userId !== userId) ?? null);
      setConfirmingId(null);
      onChange();
    } catch (err) {
      logger.error('Error removing loteria invitee:', err);
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
          {invitees.map((invitee) => {
            const name = invitee.name ?? t('invite.inviteeNoName');
            const isConfirming = confirmingId === invitee.userId;
            return (
              <li key={invitee.userId} className="invitees-dialog__row">
                <span className="invitees-list__avatar" aria-hidden="true">
                  {initialsOf(invitee.name)}
                </span>
                <div className="invitees-dialog__who">
                  <span className="invitees-dialog__name">{name}</span>
                  <span className="invitees-dialog__count">
                    {t('invite.inviteePhotos', { count: invitee.cardCount })}
                  </span>
                </div>
                {isConfirming ? (
                  <div className="invitees-dialog__confirm">
                    <p>{t('invite.removeConfirm', { name })}</p>
                    <div className="invite-dialog__manage-buttons">
                      <button
                        type="button"
                        className="invite-dialog__manage-button invitees-dialog__remove"
                        onClick={() => remove(invitee.userId)}
                        disabled={isBusy}
                      >
                        {t('invite.remove')}
                      </button>
                      <button
                        type="button"
                        className="invite-dialog__manage-button"
                        onClick={() => setConfirmingId(null)}
                        disabled={isBusy}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="share-dialog__quiet share-dialog__quiet--danger"
                    onClick={() => setConfirmingId(invitee.userId)}
                    disabled={isBusy}
                    aria-label={t('invite.removeLabel', { name })}
                  >
                    {t('invite.remove')}
                  </button>
                )}
              </li>
            );
          })}
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
