import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSetContext } from '../../contexts/SetContext';
import { SetRepository } from '../../repositories/SetRepository';
import { nextNewLoteriaName } from '../../utils/newLoteriaName';
import { RenameLoteriaDialog } from './LoteriaDialogs';

interface NewLoteriaDialogProps {
  onClose: () => void;
}

/**
 * «Crear nueva lotería» (FEAT-57): pide el nombre, con uno ya puesto, y solo al confirmar crea la lotería y
 * abre su página. Así un clic sin querer no deja una lotería vacía.
 */
export const NewLoteriaDialog = ({ onClose }: NewLoteriaDialogProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sets, setSets, setCurrentSetId } = useSetContext();

  const create = async (name: string) => {
    if (!user) return;
    const newSet = await SetRepository.createSet(user.id, name);
    setSets((previous) => [...previous, newSet]);
    setCurrentSetId(newSet.id);
    onClose();
    navigate(`/loteria/${newSet.id}`);
  };

  return (
    <RenameLoteriaDialog
      mode="create"
      currentName={nextNewLoteriaName(sets.map((set) => set.name), t('navbar.newLoteriaName'))}
      onSave={create}
      onClose={onClose}
    />
  );
};
