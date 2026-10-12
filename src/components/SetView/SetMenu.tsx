import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaEllipsisV, FaPencilAlt, FaRandom, FaRegTrashAlt, FaRegWindowClose } from 'react-icons/fa';
import type { Card } from '../../types';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { CardThumbnail } from '../Dashboard/CardFan';
// El desplegable y la hoja inferior se ven igual que los del «⋮» de Mi cuenta: son sus mismos estilos
import '../Dashboard/LoteriaMenu.css';
import './SetMenu.css';

interface SetMenuProps {
  name: string;
  /** «30 cartas · 7 tokens usados», para el encabezado de la hoja. */
  details: string;
  /** La carta que ilustra la hoja. */
  thumbnailCard: Card | undefined;
  /** Sin tableros no se ofrece revolverlos ni borrarlos. */
  hasBoards: boolean;
  onRename: () => void;
  onShuffle: () => void;
  onClearBoards: () => void;
  onDelete: () => void;
}

/** El «⋮» de la página de una lotería: lo que se usa poco o borra cosas. Desplegable en computadora, hoja inferior en celular. */
export const SetMenu = ({
  name,
  details,
  thumbnailCard,
  hasBoards,
  onRename,
  onShuffle,
  onClearBoards,
  onDelete,
}: SetMenuProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const close = () => setIsOpen(false);
  useEscapeKey(close, isOpen);

  // En computadora el menú se cierra al pulsar fuera; en celular lo hace el fondo de la hoja
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handlePressOutside = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePressOutside);
    document.addEventListener('touchstart', handlePressOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePressOutside);
      document.removeEventListener('touchstart', handlePressOutside);
    };
  }, [isOpen, isMobile]);

  const choose = (action: () => void) => () => {
    close();
    action();
  };

  const items = (itemClass: string) => (
    <>
      <button type="button" role="menuitem" className={itemClass} onClick={choose(onRename)}>
        <FaPencilAlt aria-hidden="true" />
        {t('dashboard.renameLoteria')}
      </button>
      {hasBoards && (
        <>
          <button type="button" role="menuitem" className={itemClass} onClick={choose(onShuffle)}>
            <FaRandom aria-hidden="true" />
            {t('setView.shuffleBoards')}
          </button>
          <button type="button" role="menuitem" className={itemClass} onClick={choose(onClearBoards)}>
            <FaRegWindowClose aria-hidden="true" />
            {t('setView.clearBoards')}
          </button>
        </>
      )}
      <span className="loteria-menu__divider" aria-hidden="true" />
      <button type="button" role="menuitem" className={`${itemClass} loteria-menu__item--danger`} onClick={choose(onDelete)}>
        <FaRegTrashAlt aria-hidden="true" />
        {t('setView.deleteLoteria')}
      </button>
    </>
  );

  return (
    <div className="set-menu" ref={wrapperRef}>
      <button
        type="button"
        className="set-menu__trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t('dashboard.loterias.moreActions', { name })}
      >
        <FaEllipsisV aria-hidden="true" />
      </button>

      {isOpen && !isMobile && (
        <div className="loteria-menu__dropdown set-menu__dropdown" role="menu">
          {items('loteria-menu__item')}
        </div>
      )}

      {isOpen &&
        isMobile &&
        createPortal(
          <div className="loteria-menu__overlay" onClick={close} role="presentation">
            <div
              className="loteria-menu__sheet"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-label={t('dashboard.loterias.sheetLabel', { name })}
            >
              <span className="loteria-menu__handle" aria-hidden="true" />
              <div className="loteria-menu__sheet-header">
                {thumbnailCard && <CardThumbnail card={thumbnailCard} className="loteria-menu__sheet-thumb" />}
                <div className="loteria-menu__sheet-text">
                  <strong className="loteria-menu__sheet-name">{name}</strong>
                  <span className="loteria-menu__sheet-details">{details}</span>
                </div>
              </div>
              <div className="loteria-menu__sheet-items" role="menu">
                {items('loteria-menu__item loteria-menu__item--sheet')}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
