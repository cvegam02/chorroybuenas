import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSetContext } from '../../contexts/SetContext';

/**
 * Ruta /loteria/:setId: actualiza el set activo en contexto y redirige a /cards
 * para que el usuario vea las cartas de ese set.
 */
export const SetRedirect = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { setCurrentSetId } = useSetContext();

  useEffect(() => {
    if (setId) {
      setCurrentSetId(setId);
      navigate('/cards', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [setId, setCurrentSetId, navigate]);

  return null;
};
