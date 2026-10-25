import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaCopy, FaLock, FaRedo, FaUsers, FaWhatsapp } from 'react-icons/fa';
import { usePageScrollLock } from '../../hooks/usePageScrollLock';
import { LoteriaInviteRepository } from '../../repositories/LoteriaInviteRepository';
import { inviteLink, whatsAppShareLink, type LoteriaInvite } from '../../utils/loteriaInvite';
import { logger } from '../../utils/logger';
import { AuthDialog } from '../Auth/AuthDialog';
import './InviteDialog.css';

interface InviteDialogProps {
  setId: string;
  setName: string;
  /** La lotería ya tiene enlace: es «Colectiva». */
  onInviteReady: (invite: LoteriaInvite) => void;
  onClose: () => void;
}

/**
 * M18 — «Invitar a subir fotos»: el enlace de la lotería, compartirlo, cerrarlo o cambiarlo (FEAT-56, US B1).
 * Usa el cascarón de las ventanas de cuenta: caja centrada en computadora y hoja desde abajo en celular.
 */
export const InviteDialog = ({ setId, setName, onInviteReady, onClose }: InviteDialogProps) => {
  const { t } = useTranslation();
  const [invite, setInvite] = useState<LoteriaInvite | null>(null);
  const [isBusy, setIsBusy] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);
  usePageScrollLock();

  const closeIfIdle = () => {
    if (!isBusy) onClose();
  };

  const run = async (action: () => Promise<LoteriaInvite>) => {
    setIsBusy(true);
    setHasError(false);
    setCopied(false);
    try {
      const next = await action();
      setInvite(next);
      onInviteReady(next);
    } catch (err) {
      logger.error('Error with loteria invite:', err);
      setHasError(true);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    run(() => LoteriaInviteRepository.open(setId));
    // Solo al abrir la ventana
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId]);

  const link = invite ? inviteLink(window.location.origin, invite.code) : '';

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
      <div className="invite-dialog__lead">
        <span className="invite-dialog__badge" aria-hidden="true">
          <FaUsers />
        </span>
        <h2 id="invite-dialog-title">{t('invite.title')}</h2>
        <p>{t('invite.text')}</p>
      </div>

      {!invite && !hasError && (
        <div className="invite-dialog__loading" aria-live="polite">
          <span className="invite-dialog__spinner" aria-hidden="true" />
          {t('common.loading')}
        </div>
      )}

      {invite?.isOpen && (
        <>
          <div className="invite-dialog__link-box">
            <span className="invite-dialog__state">{t('invite.openBadge')}</span>
            <p className="invite-dialog__url" aria-label={t('invite.linkLabel')}>
              {link.replace(/^https?:\/\//, '')}
            </p>
          </div>
          <div className="invite-dialog__share">
            <a
              className="invite-dialog__action invite-dialog__action--primary"
              href={whatsAppShareLink(t('invite.whatsAppMessage', { name: setName, link }))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp aria-hidden="true" />
              {t('invite.whatsApp')}
            </a>
            <button type="button" className="invite-dialog__action" onClick={copy} disabled={isBusy}>
              {copied ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />}
              <span aria-live="polite">{copied ? t('invite.copied') : t('invite.copy')}</span>
            </button>
          </div>
        </>
      )}

      {invite && !invite.isOpen && (
        <div className="invite-dialog__closed">
          <FaLock aria-hidden="true" />
          <p>{t('invite.statusClosed')}</p>
        </div>
      )}

      {hasError && (
        <p className="invite-dialog__error" role="alert">
          {t('invite.error')}
        </p>
      )}

      {invite && (
        <div className="invite-dialog__manage">
          <div className="invite-dialog__manage-buttons">
            {invite.isOpen && (
              <button
                type="button"
                className="invite-dialog__manage-button"
                onClick={() => run(() => LoteriaInviteRepository.close(setId))}
                disabled={isBusy}
              >
                <FaLock aria-hidden="true" />
                {t('invite.closeLink')}
              </button>
            )}
            <button
              type="button"
              className="invite-dialog__manage-button"
              onClick={() => run(() => LoteriaInviteRepository.regenerate(setId))}
              disabled={isBusy}
            >
              <FaRedo aria-hidden="true" />
              {t('invite.newLink')}
            </button>
          </div>
          <p className="invite-dialog__hint">{t('invite.newLinkHint')}</p>
        </div>
      )}
    </AuthDialog>
  );
};
