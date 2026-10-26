import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUserFriends } from 'react-icons/fa';
import { usePageScrollLock } from '../../hooks/usePageScrollLock';
import { LoteriaInviteRepository, type LoteriaInvitee } from '../../repositories/LoteriaInviteRepository';
import { logger } from '../../utils/logger';
import { AuthDialog } from '../Auth/AuthDialog';
import './InviteDialog.css';

interface InviteesDialogProps {
  setId: string;
  /** Regresa a M18. */
  onBack: () => void;
  onClose: () => void;
}

/**
 * M19 — «Invitados»: quiénes se unieron a la lotería, cuántas fotos subió cada uno y «Quitar» (FEAT-56, US B4).
 * Al quitar a alguien pierde el acceso y sus fotos se quedan. Se abre desde M18, con el mismo cascarón.
 */
export const InviteesDialog = ({ setId, onBack, onClose }: InviteesDialogProps) => {
  const { t } = useTranslation();
  const [invitees, setInvitees] = useState<LoteriaInvitee[] | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [hasError, setHasError] = useState(false);
  usePageScrollLock();

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
    setHasError(false);
    try {
      await LoteriaInviteRepository.removeInvitee(setId, userId);
      setInvitees((prev) => prev?.filter((invitee) => invitee.userId !== userId) ?? null);
      setConfirmingId(null);
    } catch (err) {
      logger.error('Error removing loteria invitee:', err);
      setHasError(true);
    } finally {
      setIsBusy(false);
    }
  };

  const closeIfIdle = () => {
    if (!isBusy) onClose();
  };

  return (
    <AuthDialog
      titleId="invitees-dialog-title"
      onClose={closeIfIdle}
      onBack={isBusy ? undefined : onBack}
      variant="back"
      focusKey={invitees ? 'ready' : 'loading'}
    >
      <div className="invite-dialog__lead">
        <span className="invite-dialog__badge" aria-hidden="true">
          <FaUserFriends />
        </span>
        <h2 id="invitees-dialog-title">{t('invite.inviteesTitle')}</h2>
        <p>{t('invite.inviteesText')}</p>
      </div>

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
                    className="invite-dialog__manage-button"
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
    </AuthDialog>
  );
};
