import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaCopy, FaLock, FaRedo, FaUsers, FaWhatsapp } from 'react-icons/fa';
import { usePageScrollLock } from '../../hooks/usePageScrollLock';
import { LoteriaInviteRepository } from '../../repositories/LoteriaInviteRepository';
import { inviteLink, whatsAppShareLink, type LoteriaInvite } from '../../utils/loteriaInvite';
import { logger } from '../../utils/logger';
import { AuthDialog } from '../Auth/AuthDialog';
import { InviteesList } from './InviteesList';
import './InviteDialog.css';

interface InviteDialogProps {
  setId: string;
  setName: string;
  /** La lotería ya tiene enlace: es «Colectiva». */
  onInviteReady: (invite: LoteriaInvite) => void;
  /** Cambió el enlace o los invitados: el botón «Compartida · N» se vuelve a leer. */
  onSharingChange: () => void;
  /** Se borraron las fotos de un invitado (FEAT-58, US A5): las cartas de la lotería se vuelven a leer. */
  onGuestCardsDeleted: () => void;
  onClose: () => void;
}

/**
 * M18 — «Invitar a subir fotos» (FEAT-56, US B1): el enlace de la lotería, compartirlo, cerrarlo o cambiarlo. En una
 * lotería que ya es colectiva dice si se está compartiendo e incluye quiénes participan, con «Quitar» (FEAT-57, US A4).
 * Usa el cascarón de las ventanas de cuenta: caja centrada en computadora y hoja desde abajo en celular.
 */
export const InviteDialog = ({
  setId, setName, onInviteReady, onSharingChange, onGuestCardsDeleted, onClose,
}: InviteDialogProps) => {
  const { t } = useTranslation();
  const [invite, setInvite] = useState<LoteriaInvite | null>(null);
  const [isBusy, setIsBusy] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  usePageScrollLock();

  const closeIfIdle = () => {
    if (!isBusy && !isRemoving) onClose();
  };

  const run = async (action: () => Promise<LoteriaInvite>) => {
    setIsBusy(true);
    setHasError(false);
    setCopied(false);
    try {
      const next = await action();
      setInvite(next);
      onInviteReady(next);
      onSharingChange();
    } catch (err) {
      logger.error('Error with loteria invite:', err);
      setHasError(true);
    } finally {
      setIsBusy(false);
    }
  };

  // Ya tenía enlace al abrir: se muestra lo compartido y quiénes participan (FEAT-57, US A4). Se decide con el
  // enlace de la base, no con lo que la página sabía, para no mostrar la versión de primera vez a una colectiva.
  const [isCollective, setIsCollective] = useState(false);

  useEffect(() => {
    run(async () => {
      const existing = await LoteriaInviteRepository.get(setId);
      setIsCollective(existing !== null);
      return existing ?? LoteriaInviteRepository.open(setId);
    });
    // Solo al abrir la ventana
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId]);

  const link = invite ? inviteLink(window.location.origin, invite.code) : '';
  // Primera vez: invitar. Ya colectiva: «Compartir lotería», con su estado (abierto o cerrado).
  const showsSharing = isCollective && invite !== null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch (err) {
      logger.error('Error copying invite link:', err);
      setHasError(true);
    }
  };

  return (
    <AuthDialog titleId="invite-dialog-title" onClose={closeIfIdle} focusKey={invite ? 'ready' : 'loading'}>
      <div className="share-dialog__head">
        {!showsSharing && (
          <span className="share-dialog__badge" aria-hidden="true">
            <FaUsers />
          </span>
        )}
        <h2 id="invite-dialog-title">{t(showsSharing ? 'invite.shareTitle' : 'invite.title')}</h2>
        {showsSharing && invite && (
          <span className={`share-dialog__status${invite.isOpen ? '' : ' share-dialog__status--closed'}`}>
            {invite.isOpen ? <span className="share-dialog__dot" aria-hidden="true" /> : <FaLock aria-hidden="true" />}
            {t(invite.isOpen ? 'invite.sharingStatus' : 'invite.closedStatus')}
          </span>
        )}
        <p>{t(!showsSharing ? 'invite.titleText' : invite?.isOpen ? 'invite.sharingText' : 'invite.closedText')}</p>
      </div>

      {!invite && !hasError && (
        <div className="invite-dialog__loading" aria-live="polite">
          <span className="invite-dialog__spinner" aria-hidden="true" />
          {t('common.loading')}
        </div>
      )}

      {invite?.isOpen && (
        <div className="share-dialog__share">
          <div className="share-dialog__link">
            <span className="share-dialog__url" aria-label={t('invite.linkLabel')}>
              {link.replace(/^https?:\/\//, '')}
            </span>
            <button type="button" className="share-dialog__copy" onClick={copy} disabled={isBusy}>
              {copied ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />}
              <span aria-live="polite">{copied ? t('invite.copied') : t('invite.copyShort')}</span>
            </button>
          </div>
          <a
            className="share-dialog__whatsapp"
            href={whatsAppShareLink(t('invite.whatsAppMessage', { name: setName, link }))}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaWhatsapp aria-hidden="true" />
            {t('invite.whatsApp')}
          </a>
        </div>
      )}

      {invite && !invite.isOpen && (
        <button
          type="button"
          className="share-dialog__whatsapp"
          onClick={() => run(() => LoteriaInviteRepository.regenerate(setId))}
          disabled={isBusy}
        >
          <FaRedo aria-hidden="true" />
          {t('invite.shareAgain')}
        </button>
      )}

      {hasError && (
        <p className="invite-dialog__error" role="alert">
          {t('invite.error')}
        </p>
      )}

      {showsSharing && (
        <InviteesList
          setId={setId}
          onChange={onSharingChange}
          onPhotosDeleted={onGuestCardsDeleted}
          onBusyChange={setIsRemoving}
        />
      )}

      {invite?.isOpen && (
        <div className="share-dialog__footer">
          <button
            type="button"
            className="share-dialog__quiet"
            onClick={() => run(() => LoteriaInviteRepository.regenerate(setId))}
            disabled={isBusy}
            title={t('invite.newLinkHint')}
          >
            <FaRedo aria-hidden="true" />
            {t('invite.newLink')}
          </button>
          <button
            type="button"
            className="share-dialog__quiet share-dialog__quiet--danger"
            onClick={() => run(() => LoteriaInviteRepository.close(setId))}
            disabled={isBusy}
          >
            <FaLock aria-hidden="true" />
            {t('invite.stopSharing')}
          </button>
        </div>
      )}
    </AuthDialog>
  );
};
