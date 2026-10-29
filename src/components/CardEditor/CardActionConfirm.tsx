import { useTranslation } from 'react-i18next';
import { WarningModal } from '../ConfirmationModal/WarningModal';

export type CardAction = 'regenerate' | 'delete' | 'revert';

interface CardActionConfirmProps {
  action: CardAction;
  /** La carta ya tiene IA: «regenerate» pide otra versión en lugar de la primera transformación. */
  isAiGenerated: boolean;
  /** En cuántos tableros está la carta: al borrarla se borran los tableros y la confirmación lo avisa (FEAT-60). */
  boardsWithCard?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/** La confirmación de transformar, volver a la foto o borrar una carta. La usan la carta y la ventana de editar. */
export const CardActionConfirm = ({ action, isAiGenerated, boardsWithCard = 0, onConfirm, onCancel }: CardActionConfirmProps) => {
  const { t } = useTranslation();
  const keys = {
    regenerate: isAiGenerated ? 'modals.confirmRegenerateCard' : 'modals.confirmConvertCard',
    delete: 'modals.confirmDeleteCard',
    revert: 'modals.confirmRevertCard',
  };
  const key = keys[action];
  const warnsBoards = action === 'delete' && boardsWithCard > 0;

  return (
    <WarningModal
      isOpen
      type={action === 'delete' ? 'danger' : 'warning'}
      title={t(`${key}.title`)}
      message={warnsBoards ? t(`${key}.messageWithBoards`, { count: boardsWithCard }) : t(`${key}.message`)}
      confirmText={t(`${key}.confirm`)}
      cancelText={t(`${key}.cancel`)}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};
