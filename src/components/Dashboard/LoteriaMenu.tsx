import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowRight, FaDownload, FaEllipsisV, FaPencilAlt, FaRegTrashAlt } from 'react-icons/fa';
import type { Card } from '../../types';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { CardThumbnail } from './CardFan';
import './LoteriaMenu.css';

/** Tras abrir la hoja, el toque que la abrió todavía llega al fondo: se ignora ese rato para que no la cierre. */
const SHEET_OPEN_GUARD_MS = 350;

interface LoteriaMenuProps {
  name: string;
  /** «30 cartas · 7 tokens usados», para el encabezado de la hoja; null si no se conoce. */
  details: string | null;
  /** La carta que ilustra la hoja. */
  thumbnailCard: Card | undefined;
  /** Solo las loterías listas ofrecen su PDF. */
  canDownload: boolean;
  isDownloading: boolean;
  onOpen: () => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
}

/** El «⋮» de una lotería: menú desplegable en computadora y hoja inferior en celular. */
export const LoteriaMenu = ({
  name,
  details,
  thumbnailCard,
  canDownload,
  isDownloading,
  onOpen,
  onDownload,
  onRename,
  onDelete,
}: LoteriaMenuProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sheetOpenedAt = useRef(0);

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

  const toggle = () => {
    if (!isOpen) sheetOpenedAt.current = Date.now();
    setIsOpen((open) => !open);
  };

  const choose = (action: () => void) => () => {
    close();
    action();
  };

  const items = (itemClass: string) => (
    <>
      <button type="button" role="menuitem" className={itemClass} onClick={choose(onOpen)}>
        <FaArrowRight aria-hidden="true" />
        {t('dashboard.loterias.open')}
      </button>
      {canDownload && (
        <button type="button" role="menuitem" className={itemClass} onClick={choose(onDownload)} disabled={isDownloading}>
          <FaDownload aria-hidden="true" />
          {isDownloading ? t('boardGenerator.status.generatingPDF') : t('setView.downloadPDF')}
        </button>
      )}
      <button type="button" role="menuitem" className={itemClass} onClick={choose(onRename)}>
        <FaPencilAlt aria-hidden="true" />
        {t('dashboard.renameLoteria')}
      </button>
      <span className="loteria-menu__divider" aria-hidden="true" />
      <button type="button" role="menuitem" className={`${itemClass} loteria-menu__item--danger`} onClick={choose(onDelete)}>
        <FaRegTrashAlt aria-hidden="true" />
        {t('common.delete')}
      </button>
    </>
  );

  return (
    <div className="loteria-card__menu" ref={wrapperRef}>
      <button
        type="button"
        className="loteria-card__menu-trigger"
        // Se abre al presionar (ratón o dedo); el clic que llega después solo cuenta si vino del teclado
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggle();
        }}
        onTouchStart={(event) => {
          event.stopPropagation();
          toggle();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.detail === 0) toggle();
        }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t('dashboard.loterias.moreActions', { name })}
      >
        <FaEllipsisV aria-hidden="true" />
      </button>

      {isOpen && !isMobile && (
        <div className="loteria-menu__dropdown" role="menu">
          {items('loteria-menu__item')}
        </div>
      )}

      {isOpen &&
        isMobile &&
        createPortal(
          <div
            className="loteria-menu__overlay"
            onClick={() => {
              if (Date.now() - sheetOpenedAt.current < SHEET_OPEN_GUARD_MS) return;
              close();
            }}
            role="presentation"
          >
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
                  {details && <span className="loteria-menu__sheet-details">{details}</span>}
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
