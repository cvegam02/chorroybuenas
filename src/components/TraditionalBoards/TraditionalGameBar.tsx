import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaPen, FaPlus } from 'react-icons/fa';
import { RenameLoteriaDialog } from '../Dashboard/LoteriaDialogs';
import { TRADITIONAL_PATH } from '../../hooks/useTraditionalStore';

export const MY_TRADITIONAL_GAMES_PATH = '/dashboard#mis-tableros-de-la-suerte';

interface TraditionalGameBarProps {
  /** El juego abierto; `null` mientras es uno nuevo que aún no se guarda. */
  game: { id: string; name: string } | null;
  saveFailed: boolean;
  onRename: (name: string) => Promise<void>;
}

/** Con sesión (FEAT-53, US A5): el nombre del juego, cambiarlo, «Nuevo juego» y el enlace a los guardados. */
export const TraditionalGameBar = ({ game, saveFailed, onRename }: TraditionalGameBarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isRenaming, setIsRenaming] = useState(false);

  return (
    <div className="traditional-game">
      <div className="traditional-game__name-row">
        <h2 className="traditional-game__name">{game ? game.name : t('traditional.game.unsaved')}</h2>
        {game && (
          <button
            type="button"
            className="traditional-game__icon"
            onClick={() => setIsRenaming(true)}
            aria-label={t('traditional.game.rename')}
          >
            <FaPen aria-hidden="true" />
          </button>
        )}
      </div>
      <p className={`traditional-game__status${saveFailed ? ' traditional-game__status--error' : ''}`} role="status">
        {saveFailed ? t('traditional.game.saveFailed') : t(game ? 'traditional.game.saved' : 'traditional.game.willSave')}
      </p>
      <div className="traditional-game__actions">
        {game && (
          <button type="button" className="traditional-boards__secondary" onClick={() => navigate(TRADITIONAL_PATH)}>
            <FaPlus aria-hidden="true" /> {t('traditional.game.new')}
          </button>
        )}
        <Link to={MY_TRADITIONAL_GAMES_PATH} className="traditional-game__link">
          {t('traditional.game.myGames')} <span aria-hidden="true">→</span>
        </Link>
      </div>

      {isRenaming && game && (
        <RenameLoteriaDialog
          currentName={game.name}
          onSave={async (name) => {
            await onRename(name);
            setIsRenaming(false);
          }}
          onClose={() => setIsRenaming(false)}
        />
      )}
    </div>
  );
};
